import { describe, expect, it } from 'vitest';
import {
  ConfiguracionInvalidaError,
  MemoriaInsuficienteError,
  PidDuplicadoError,
  ProcesoInvalidoError,
  ProcesoNoEncontradoError,
} from '../../src/errores';
import { BestFit } from '../../src/memoria/politicas/BestFit';
import type { IPoliticaAsignacion } from '../../src/memoria/politicas/IPoliticaAsignacion';
import { EstadoProceso } from '../../src/procesos/EstadoProceso';
import type { ConfiguracionSimulacion } from '../../src/simulacion/ConfiguracionSimulacion';
import { Simulador } from '../../src/simulacion/Simulador';
import { simuladorReferencia } from './ayudas';

describe('RF01 Configurar e iniciar la simulación', () => {
  it('estado inicial: tick 0, un bloque libre total, colas vacías y contadores en cero', () => {
    const sim = simuladorReferencia();
    const estado = sim.obtenerEstado();
    expect(sim.memoriaTotal).toBe(1024);
    expect(sim.quantum).toBe(2);
    expect(sim.nombrePolitica).toBe('First-Fit');
    expect(estado.tick).toBe(0);
    expect(estado.enCpu).toBeNull();
    expect(estado.listos).toEqual([]);
    expect(estado.nuevos).toEqual([]);
    expect(estado.esperandoMemoria).toEqual([]);
    expect(estado.bloqueados).toEqual([]);
    expect(estado.terminados).toEqual([]);
    expect(estado.mapaMemoria).toEqual([{ inicio: 0, tamanio: 1024, pid: null, libre: true }]);
    expect(estado.metricas.cambiosDeContexto).toBe(0);
    expect(estado.metricas.utilizacionCpu).toBe(0);
  });

  it('la memoria y el quantum son configurables, igual que la política', () => {
    const sim = new Simulador({ memoriaTotal: 512, quantum: 4, politica: new BestFit() });
    expect(sim.memoriaTotal).toBe(512);
    expect(sim.quantum).toBe(4);
    expect(sim.nombrePolitica).toBe('Best-Fit');
  });

  it.each<[string, unknown]>([
    ['sin configuración', undefined],
    ['null', null],
    ['memoria 0', { memoriaTotal: 0, quantum: 2 }],
    ['memoria negativa', { memoriaTotal: -1, quantum: 2 }],
    ['memoria decimal', { memoriaTotal: 10.5, quantum: 2 }],
    ['quantum 0', { memoriaTotal: 1024, quantum: 0 }],
    ['quantum decimal', { memoriaTotal: 1024, quantum: 1.5 }],
    ['política inválida', { memoriaTotal: 1024, quantum: 2, politica: {} as IPoliticaAsignacion }],
  ])('rechaza configuración inválida: %s', (_caso, config) => {
    expect(() => new Simulador(config as ConfiguracionSimulacion)).toThrow(ConfiguracionInvalidaError);
  });
});

describe('RF02 Registrar y consultar procesos', () => {
  it('registra un proceso en estado Nuevo con sus contadores', () => {
    const sim = simuladorReferencia();
    const info = sim.registrarProceso(1, 200, 3);
    expect(info).toMatchObject({ pid: 1, memoriaRequerida: 200, cpuTotal: 3, cpuRestante: 3 });
    expect(info.estado).toBe(EstadoProceso.Nuevo);
    expect(sim.obtenerEstado().nuevos.map((p) => p.pid)).toEqual([1]);
  });

  it('rechaza PID duplicado sin alterar el registro', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 1);
    expect(() => sim.registrarProceso(1, 50, 2)).toThrow(PidDuplicadoError);
    expect(sim.obtenerProcesos()).toHaveLength(1);
    expect(sim.obtenerProceso(1).memoriaRequerida).toBe(100);
  });

  it('rechaza procesos que piden más que la memoria total; acepta exactamente la total', () => {
    const sim = simuladorReferencia();
    expect(() => sim.registrarProceso(1, 1025, 1)).toThrow(MemoriaInsuficienteError);
    expect(sim.registrarProceso(2, 1024, 1).memoriaRequerida).toBe(1024);
  });

  it.each([
    [0, 10, 1],
    [1, 0, 1],
    [1, 10, 0],
    [1, -10, 1],
  ])('rechaza datos inválidos (pid %s, mem %s, cpu %s)', (pid, mem, cpu) => {
    const sim = simuladorReferencia();
    expect(() => sim.registrarProceso(pid, mem, cpu)).toThrow(ProcesoInvalidoError);
    expect(sim.obtenerProcesos()).toHaveLength(0);
  });

  it('las consultas no permiten modificar el dominio desde afuera', () => {
    const sim = simuladorReferencia();
    sim.registrarProceso(1, 100, 3);
    const procesos = sim.obtenerProcesos();
    expect(Object.isFrozen(procesos)).toBe(true);
    expect(Object.isFrozen(procesos[0])).toBe(true);
    expect(() => {
      (procesos[0] as { estado: EstadoProceso }).estado = EstadoProceso.Terminado;
    }).toThrow(TypeError);
    expect(sim.obtenerProceso(1).estado).toBe(EstadoProceso.Nuevo);
  });

  it('consultar un PID inexistente lanza ProcesoNoEncontradoError', () => {
    expect(() => simuladorReferencia().obtenerProceso(99)).toThrow(ProcesoNoEncontradoError);
  });
});
