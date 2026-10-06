import { describe, expect, it } from 'vitest';
import { EventoESInvalidoError, ProcesoNoEncontradoError } from '../../src/errores';
import { EventoCpu } from '../../src/planificacion/EventoCpu';
import { EstadoProceso } from '../../src/procesos/EstadoProceso';
import { ejecuciones, simuladorReferencia } from './ayudas';

describe('RF08 Simular Entrada y Salida', () => {
  it('bloquea, conserva la memoria, deja de consumir CPU y retorna a Listos al vencer', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 300, 4);
    sim.programarES(1, 1, 2);

    expect(sim.avanzarTick().eventoCpu).toBe(EventoCpu.Bloqueado);
    let estado = sim.obtenerEstado();
    expect(estado.bloqueados.map((p) => p.pid)).toEqual([1]);
    expect(estado.bloqueados[0]?.bloqueoRestante).toBe(2);
    expect(estado.mapaMemoria.find((b) => b.pid === 1)?.tamanio).toBe(300);
    expect(estado.metricas.cambiosDeContexto).toBe(1);

    expect(sim.avanzarTick().pidEjecutado).toBeNull();
    expect(sim.obtenerProceso(1).cpuRestante).toBe(3);

    expect(sim.avanzarTick().pidEjecutado).toBe(1);
    estado = sim.obtenerEstado();
    expect(estado.bloqueados).toEqual([]);
    expect(estado.enCpu?.pid).toBe(1);
  });

  it('el bloqueo tiene prioridad sobre la rotación por quantum (un solo cambio de contexto)', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 4);
    sim.registrarProceso(2, 100, 4);
    sim.programarES(1, 2, 3);
    sim.avanzar(2);
    expect(sim.obtenerProceso(1).estado).toBe(EstadoProceso.Bloqueado);
    expect(sim.obtenerEstado().listos.map((p) => p.pid)).toEqual([2]);
    expect(sim.obtenerMetricas().cambiosDeContexto).toBe(1);
  });

  it('el proceso desbloqueado vuelve al final de la cola de Listos', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 3);
    sim.registrarProceso(2, 100, 5);
    sim.registrarProceso(3, 100, 5);
    sim.programarES(1, 1, 1);
    expect(ejecuciones(sim, 1)).toEqual([1]);
    sim.avanzarTick();
    expect(sim.obtenerEstado().listos.map((p) => p.pid)).toEqual([3, 1]);
  });

  it('rechaza eventos inválidos', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 3);
    expect(() => sim.programarES(1, 0, 1)).toThrow(EventoESInvalidoError);
    expect(() => sim.programarES(1, 1, 0)).toThrow(EventoESInvalidoError);
    expect(() => sim.programarES(1, 3, 1)).toThrow(EventoESInvalidoError);
    expect(() => sim.programarES(99, 1, 1)).toThrow(ProcesoNoEncontradoError);
    expect(sim.obtenerProceso(1).eventosESPendientes).toBe(0);
  });
});
