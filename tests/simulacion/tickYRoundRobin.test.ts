import { describe, expect, it } from 'vitest';
import { ConfiguracionInvalidaError } from '../../src/errores';
import { EventoCpu } from '../../src/planificacion/EventoCpu';
import { Simulador } from '../../src/simulacion/Simulador';
import { ejecuciones, simuladorReferencia } from './ayudas';

describe('RF06 Avanzar un tick de forma determinista', () => {
  it('cada invocación avanza exactamente una unidad', () => {
    const sim = simuladorReferencia();
    expect(sim.avanzarTick().tick).toBe(1);
    expect(sim.avanzarTick().tick).toBe(2);
    expect(sim.tick).toBe(2);
    expect(sim.avanzar(3).map((r) => r.tick)).toEqual([3, 4, 5]);
  });

  it('sin procesos la CPU queda ociosa', () => {
    expect(simuladorReferencia().avanzarTick()).toMatchObject({ pidEjecutado: null, eventoCpu: EventoCpu.Ociosa });
  });

  it('rechaza avanzar una cantidad inválida de ticks', () => {
    expect(() => simuladorReferencia().avanzar(0)).toThrow(ConfiguracionInvalidaError);
  });

  it('es reproducible: dos simulaciones iguales dan el mismo resultado', () => {
    const armar = () => {
      const sim = new Simulador({ memoriaTotal: 300, quantum: 2 });
      sim.registrarProceso(1, 200, 4);
      sim.registrarProceso(2, 150, 3);
      sim.registrarProceso(3, 100, 2);
      sim.programarES(1, 1, 2);
      return sim.avanzar(15);
    };
    expect(armar()).toEqual(armar());
  });

  it('orden de fases: un desbloqueado vuelve en la fase 2 y se despacha en la fase 3 del mismo tick', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 3);
    sim.programarES(1, 1, 1);
    expect(ejecuciones(sim, 3)).toEqual([1, 1, 1]);
    expect(sim.obtenerMetricas().cambiosDeContexto).toBe(1);
  });
});

describe('RF07 Planificar la CPU con Round Robin', () => {
  it('caso de la consigna: Q=2, P1(3), P2(2) → P1, P1, P2, P2, P1 y un cambio de contexto', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 3);
    sim.registrarProceso(2, 100, 2);
    const ticks = sim.avanzar(5);
    expect(ticks.map((t) => t.pidEjecutado)).toEqual([1, 1, 2, 2, 1]);
    expect(ticks.map((t) => t.eventoCpu)).toEqual([
      EventoCpu.Continua,
      EventoCpu.Expulsado,
      EventoCpu.Continua,
      EventoCpu.Terminado,
      EventoCpu.Terminado,
    ]);
    expect(sim.obtenerMetricas().cambiosDeContexto).toBe(1);
  });

  it('un único proceso renueva el quantum sin cambio de contexto', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 5);
    expect(ejecuciones(sim, 5)).toEqual([1, 1, 1, 1, 1]);
    expect(sim.obtenerMetricas().cambiosDeContexto).toBe(0);
  });

  it('finalizar en el límite del quantum no lo reencola', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 2);
    sim.registrarProceso(2, 100, 2);
    expect(ejecuciones(sim, 4)).toEqual([1, 1, 2, 2]);
    expect(sim.obtenerMetricas().cambiosDeContexto).toBe(0);
    expect(sim.obtenerEstado().listos).toEqual([]);
  });

  it('a lo sumo un proceso consume CPU por tick', () => {
    const sim = simuladorReferencia();
    [1, 2, 3].forEach((pid) => sim.registrarProceso(pid, 100, 3));
    for (let i = 0; i < 9; i++) {
      const antes = sim.obtenerProcesos().reduce((s, p) => s + p.cpuConsumida, 0);
      sim.avanzarTick();
      const despues = sim.obtenerProcesos().reduce((s, p) => s + p.cpuConsumida, 0);
      expect(despues - antes).toBe(1);
    }
  });
});
