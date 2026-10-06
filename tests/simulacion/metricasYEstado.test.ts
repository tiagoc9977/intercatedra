import { describe, expect, it } from 'vitest';
import { EstadoProceso } from '../../src/procesos/EstadoProceso';
import { Metricas } from '../../src/simulacion/Metricas';
import { Simulador } from '../../src/simulacion/Simulador';
import { verificarInvariantes } from '../memoria/invariantes';
import { simuladorReferencia } from './ayudas';

describe('RF09 Exponer métricas consultables', () => {
  it('en el tick 0: utilización 0 %, memoria libre total y sin fragmentación', () => {
    const m = simuladorReferencia().obtenerMetricas();
    expect(m).toBeInstanceOf(Metricas);
    expect(m.utilizacionCpu).toBe(0);
    expect(m.ocupacionMemoria).toBe(0);
    expect(m.memoriaLibreTotal).toBe(1024);
    expect(m.mayorBloqueLibre).toBe(1024);
    expect(m.fragmentacionExterna).toBe(0);
    expect(m.cambiosDeContexto).toBe(0);
  });

  it('huecos no contiguos de 100 y 300 KB: libre 400, mayor 300 y fragmentación 25 %', () => {
    const sim = new Simulador({ memoriaTotal: 1000, quantum: 10 });
    sim.registrarProceso(1, 100, 1);
    sim.registrarProceso(2, 200, 20);
    sim.registrarProceso(3, 300, 1);
    sim.registrarProceso(4, 400, 20);

    sim.avanzar(12);
    expect(sim.obtenerProceso(1).estado).toBe(EstadoProceso.Terminado);
    expect(sim.obtenerProceso(3).estado).toBe(EstadoProceso.Terminado);
    const m = sim.obtenerMetricas();
    expect(m.memoriaLibreTotal).toBe(400);
    expect(m.mayorBloqueLibre).toBe(300);
    expect(m.fragmentacionExterna).toBeCloseTo(25);
    expect(m.ocupacionMemoria).toBeCloseTo(60);
  });

  it('memoria llena: ocupación 100 %, mayor bloque 0 y fragmentación 0 %', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 1024, 5);
    sim.avanzarTick();
    const m = sim.obtenerMetricas();
    expect(m.ocupacionMemoria).toBe(100);
    expect(m.memoriaLibreTotal).toBe(0);
    expect(m.mayorBloqueLibre).toBe(0);
    expect(m.fragmentacionExterna).toBe(0);
  });

  it('utilización de CPU = ticks ocupados / ticks transcurridos', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 2);
    sim.avanzar(4);
    expect(sim.obtenerMetricas().utilizacionCpu).toBe(50);
  });

  it('las métricas son una instantánea inmutable recalculada al final de cada tick', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 512, 3);
    const antes = sim.obtenerMetricas();
    expect(Object.isFrozen(antes)).toBe(true);
    sim.avanzarTick();
    expect(antes.ocupacionMemoria).toBe(0);
    expect(sim.obtenerMetricas().ocupacionMemoria).toBe(50);
  });
});

describe('RF10 Consultar el estado del sistema', () => {
  it('expone tick, CPU, colas, terminados y mapa de memoria', () => {
    const sim = new Simulador({ memoriaTotal: 300, quantum: 2 });
    sim.registrarProceso(1, 100, 1);
    sim.registrarProceso(2, 100, 5);
    sim.registrarProceso(3, 100, 5);
    sim.registrarProceso(4, 200, 1);
    sim.programarES(3, 1, 5);

    sim.avanzar(5);
    const e = sim.obtenerEstado();
    expect(e.tick).toBe(5);
    expect(e.terminados.map((p) => p.pid)).toEqual([1]);
    expect(e.bloqueados.map((p) => p.pid)).toEqual([3]);
    expect(e.enCpu?.pid).toBe(2);
    expect(e.esperandoMemoria.map((p) => p.pid)).toEqual([4]);
    expect(e.mapaMemoria.map((b) => b.pid)).toEqual([null, 2, 3]);
  });

  it('el estado es una copia: modificarlo no afecta al simulador', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 3);
    sim.registrarProceso(2, 100, 3);
    sim.avanzarTick();
    const e = sim.obtenerEstado();
    expect(Object.isFrozen(e)).toBe(true);
    expect(Object.isFrozen(e.listos)).toBe(true);
    expect(Object.isFrozen(e.mapaMemoria)).toBe(true);
    expect(() => (e.listos as unknown[]).pop()).toThrow(TypeError);
    expect(sim.obtenerEstado().listos).toHaveLength(1);
  });

  it('invariantes a lo largo de una simulación: sin duplicados, solapamientos ni dos en CPU', () => {
    const sim = new Simulador({ memoriaTotal: 500, quantum: 2 });
    [
      [1, 200, 5],
      [2, 150, 3],
      [3, 250, 4],
      [4, 100, 2],
      [5, 300, 3],
    ].forEach(([pid, mem, cpu]) => sim.registrarProceso(pid!, mem!, cpu!));
    sim.programarES(1, 2, 2);
    sim.programarES(3, 1, 3);

    for (let i = 0; i < 30; i++) {
      sim.avanzarTick();
      const e = sim.obtenerEstado();
      const pids = [
        ...(e.enCpu ? [e.enCpu.pid] : []),
        ...e.listos,
        ...e.nuevos,
        ...e.esperandoMemoria,
        ...e.bloqueados,
        ...e.terminados,
      ].map((p) => (typeof p === 'number' ? p : p.pid));
      expect(new Set(pids).size).toBe(pids.length);
      expect(pids).toHaveLength(5);
      expect(sim.obtenerProcesos().filter((p) => p.estado === EstadoProceso.Ejecutando).length).toBeLessThanOrEqual(1);
      verificarInvariantes(e.mapaMemoria, 500);
    }
    expect(sim.obtenerEstado().terminados).toHaveLength(5);
  });
});
