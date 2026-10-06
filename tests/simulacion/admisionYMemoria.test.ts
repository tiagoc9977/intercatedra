import { describe, expect, it } from 'vitest';
import { BestFit } from '../../src/memoria/politicas/BestFit';
import { FirstFit } from '../../src/memoria/politicas/FirstFit';
import type { IPoliticaAsignacion } from '../../src/memoria/politicas/IPoliticaAsignacion';
import { WorstFit } from '../../src/memoria/politicas/WorstFit';
import { EstadoProceso } from '../../src/procesos/EstadoProceso';
import { Simulador } from '../../src/simulacion/Simulador';
import { verificarInvariantes } from '../memoria/invariantes';
import { simuladorReferencia } from './ayudas';

describe('RF03 Gestionar estados y admisión', () => {
  it('admite en la fase 1 del tick, asigna memoria y encola como Listo', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 5);
    sim.registrarProceso(2, 200, 5);
    const resultado = sim.avanzarTick();
    expect(resultado.admitidos).toEqual([1, 2]);
    const estado = sim.obtenerEstado();
    expect(estado.enCpu?.pid).toBe(1);
    expect(estado.listos.map((p) => p.pid)).toEqual([2]);
    expect(estado.mapaMemoria.filter((b) => !b.libre).map((b) => b.pid)).toEqual([1, 2]);
  });

  it('si no hay hueco queda Esperando Memoria sin bloquear a los que sí caben', () => {
    const sim = new Simulador({ memoriaTotal: 100, quantum: 2 });
    sim.registrarProceso(1, 60, 1);
    sim.registrarProceso(2, 60, 1);
    sim.registrarProceso(3, 40, 1);
    expect(sim.avanzarTick().admitidos).toEqual([1, 3]);
    expect(sim.obtenerProceso(2).estado).toBe(EstadoProceso.EsperandoMemoria);
    expect(sim.obtenerEstado().esperandoMemoria.map((p) => p.pid)).toEqual([2]);
  });

  it('reintenta en orden de registro al inicio de cada tick', () => {
    const sim = new Simulador({ memoriaTotal: 100, quantum: 5 });
    sim.registrarProceso(1, 100, 2);
    sim.registrarProceso(2, 50, 1);
    sim.registrarProceso(3, 50, 1);
    sim.avanzar(2);
    expect(sim.obtenerEstado().esperandoMemoria.map((p) => p.pid)).toEqual([2, 3]);
    expect(sim.avanzarTick().admitidos).toEqual([2, 3]);
  });

  it('un proceso Terminado no vuelve a ninguna cola', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 1);
    sim.avanzar(3);
    const estado = sim.obtenerEstado();
    expect(estado.terminados.map((p) => p.pid)).toEqual([1]);
    expect([...estado.listos, ...estado.bloqueados, ...estado.esperandoMemoria]).toHaveLength(0);
    expect(estado.enCpu).toBeNull();
  });
});

describe('RF04/RF05 Memoria a través del simulador', () => {
  it.each<[IPoliticaAsignacion, number]>([
    [new FirstFit(), 0],
    [new BestFit(), 400],
    [new WorstFit(), 600],
  ])('%s ubica al proceso nuevo según su política', (politica, inicioEsperado) => {
    const sim = new Simulador({ memoriaTotal: 1000, quantum: 1, politica });
    sim.registrarProceso(1, 300, 1);
    sim.registrarProceso(2, 100, 50);
    sim.registrarProceso(3, 150, 1);
    sim.registrarProceso(4, 50, 50);

    expect(sim.avanzar(3).map((t) => t.pidEjecutado)).toEqual([1, 2, 3]);

    sim.registrarProceso(5, 120, 1);
    sim.avanzarTick();
    expect(sim.obtenerEstado().mapaMemoria.find((b) => b.pid === 5)?.inicio).toBe(inicioEsperado);
    verificarInvariantes(sim.obtenerEstado().mapaMemoria, 1000);
  });

  it('una liberación al final del tick habilita la admisión en el siguiente', () => {
    const sim = new Simulador({ memoriaTotal: 100, quantum: 2 });
    sim.registrarProceso(1, 100, 1);
    sim.registrarProceso(2, 100, 1);
    const t1 = sim.avanzarTick();
    expect(t1.admitidos).toEqual([1]);
    expect(sim.obtenerProceso(2).estado).toBe(EstadoProceso.EsperandoMemoria);
    expect(sim.obtenerEstado().mapaMemoria).toEqual([{ inicio: 0, tamanio: 100, pid: null, libre: true }]);
    const t2 = sim.avanzarTick();
    expect(t2.admitidos).toEqual([2]);
    expect(t2.pidEjecutado).toBe(2);
  });

  it('al terminar todos los procesos queda un único bloque libre del tamaño total', () => {
    const sim = simuladorReferencia();
    [1, 2, 3, 4].forEach((pid) => sim.registrarProceso(pid, 100 * pid, pid));
    sim.avanzar(20);
    expect(sim.obtenerEstado().terminados).toHaveLength(4);
    expect(sim.obtenerEstado().mapaMemoria).toEqual([{ inicio: 0, tamanio: 1024, pid: null, libre: true }]);
  });
});
