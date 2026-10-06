import { describe, expect, it } from 'vitest';
import { EventoESInvalidoError, ProcesoInvalidoError, TransicionInvalidaError } from '../../src/errores';
import { EstadoProceso } from '../../src/procesos/EstadoProceso';
import { EventoES } from '../../src/procesos/EventoES';
import { Proceso } from '../../src/procesos/Proceso';

function enEjecucion(cpu = 5): Proceso {
  const p = new Proceso(1, 100, cpu);
  p.admitir();
  p.despachar();
  return p;
}

describe('RF02 Proceso: creación', () => {
  it('arranca Nuevo, con CPU restante igual a la total y contadores en cero', () => {
    const p = new Proceso(7, 128, 4);
    expect(p.info()).toEqual({
      pid: 7,
      memoriaRequerida: 128,
      cpuTotal: 4,
      cpuRestante: 4,
      cpuConsumida: 0,
      estado: EstadoProceso.Nuevo,
      quantumConsumido: 0,
      bloqueoRestante: 0,
      eventosESPendientes: 0,
    });
    expect([p.pid, p.memoriaRequerida, p.cpuTotal, p.bloqueoRestante]).toEqual([7, 128, 4, 0]);
  });

  it.each([
    [0, 10, 1],
    [-1, 10, 1],
    [1.5, 10, 1],
    [1, 0, 1],
    [1, 10.2, 1],
    [1, 10, 0],
    [1, 10, -3],
  ])('rechaza datos no enteros positivos (pid %s, mem %s, cpu %s)', (pid, mem, cpu) => {
    expect(() => new Proceso(pid, mem, cpu)).toThrow(ProcesoInvalidoError);
  });

  it('info() devuelve una copia congelada que no altera al proceso', () => {
    const p = new Proceso(1, 10, 3);
    const info = p.info();
    expect(Object.isFrozen(info)).toBe(true);
    expect(() => {
      (info as { cpuRestante: number }).cpuRestante = 0;
    }).toThrow(TypeError);
    expect(p.cpuRestante).toBe(3);
  });
});

describe('RF03 Proceso: transiciones de admisión', () => {
  it('Nuevo → Esperando Memoria → Listo', () => {
    const p = new Proceso(1, 10, 3);
    p.esperarMemoria();
    expect(p.estado).toBe(EstadoProceso.EsperandoMemoria);
    p.esperarMemoria();
    expect(p.estado).toBe(EstadoProceso.EsperandoMemoria);
    p.admitir();
    expect(p.estado).toBe(EstadoProceso.Listo);
  });

  it('no se puede admitir un proceso ya Listo', () => {
    const p = new Proceso(1, 10, 3);
    p.admitir();
    expect(() => p.admitir()).toThrow(TransicionInvalidaError);
    expect(() => p.esperarMemoria()).toThrow(TransicionInvalidaError);
  });

  it('no se puede despachar un proceso que no está Listo', () => {
    expect(() => new Proceso(1, 10, 3).despachar()).toThrow(TransicionInvalidaError);
  });
});

describe('RF07 Proceso: ejecución', () => {
  it('despachar reinicia el quantum y cada unidad descuenta CPU', () => {
    const p = enEjecucion(3);
    p.ejecutarUnidad();
    p.ejecutarUnidad();
    expect(p.cpuRestante).toBe(1);
    expect(p.cpuConsumida).toBe(2);
    expect(p.quantumConsumido).toBe(2);
    p.expulsar();
    expect(p.estado).toBe(EstadoProceso.Listo);
    p.despachar();
    expect(p.quantumConsumido).toBe(0);
  });

  it('renovar quantum lo pone en cero sin cambiar de estado', () => {
    const p = enEjecucion();
    p.ejecutarUnidad();
    p.renovarQuantum();
    expect(p.quantumConsumido).toBe(0);
    expect(p.estado).toBe(EstadoProceso.Ejecutando);
  });

  it('termina solo cuando la CPU restante llega a cero', () => {
    const p = enEjecucion(1);
    p.ejecutarUnidad();
    expect(() => p.ejecutarUnidad()).toThrow(TransicionInvalidaError);
    p.terminar();
    expect(p.estado).toBe(EstadoProceso.Terminado);
  });

  it('no puede terminar con CPU restante', () => {
    expect(() => enEjecucion(2).terminar()).toThrow(TransicionInvalidaError);
  });

  it('un proceso Terminado no admite más transiciones', () => {
    const p = enEjecucion(1);
    p.ejecutarUnidad();
    p.terminar();
    expect(() => p.admitir()).toThrow(TransicionInvalidaError);
    expect(() => p.despachar()).toThrow(TransicionInvalidaError);
    expect(() => p.expulsar()).toThrow(TransicionInvalidaError);
    expect(() => p.renovarQuantum()).toThrow(TransicionInvalidaError);
  });

  it('no se puede ejecutar fuera de la CPU', () => {
    const p = new Proceso(1, 10, 3);
    expect(() => p.ejecutarUnidad()).toThrow(TransicionInvalidaError);
  });
});

describe('RF08 Proceso: entrada/salida', () => {
  it('se bloquea al alcanzar la CPU consumida del evento y retorna al vencer', () => {
    const p = enEjecucion(5);
    p.programarES(new EventoES(2, 2));
    p.ejecutarUnidad();
    expect(p.debeBloquearse()).toBe(false);
    p.ejecutarUnidad();
    expect(p.debeBloquearse()).toBe(true);
    p.bloquear();
    expect(p.estado).toBe(EstadoProceso.Bloqueado);
    expect(p.bloqueoRestante).toBe(2);
    expect(p.info().eventosESPendientes).toBe(0);
    expect(p.avanzarBloqueo()).toBe(false);
    expect(p.avanzarBloqueo()).toBe(true);
    expect(p.estado).toBe(EstadoProceso.Listo);
    expect(p.cpuRestante).toBe(3);
  });

  it('soporta varios eventos y los ordena por disparo', () => {
    const p = enEjecucion(5);
    p.programarES(new EventoES(3, 1));
    p.programarES(new EventoES(1, 1));
    p.ejecutarUnidad();
    expect(p.debeBloquearse()).toBe(true);
    expect(p.info().eventosESPendientes).toBe(2);
  });

  it('no se puede bloquear sin un evento pendiente en ese momento', () => {
    const p = enEjecucion(5);
    expect(() => p.bloquear()).toThrow(TransicionInvalidaError);
  });

  it('no se puede avanzar el bloqueo de un proceso que no está Bloqueado', () => {
    expect(() => enEjecucion().avanzarBloqueo()).toThrow(TransicionInvalidaError);
  });

  it('rechaza un disparo igual o mayor a la CPU total', () => {
    const p = new Proceso(1, 10, 3);
    expect(() => p.programarES(new EventoES(3, 1))).toThrow(EventoESInvalidoError);
    expect(() => p.programarES(new EventoES(4, 1))).toThrow(EventoESInvalidoError);
  });

  it('rechaza un disparo que ya pasó', () => {
    const p = enEjecucion(5);
    p.ejecutarUnidad();
    p.ejecutarUnidad();
    expect(() => p.programarES(new EventoES(2, 1))).toThrow(EventoESInvalidoError);
  });

  it('rechaza dos eventos con el mismo disparo', () => {
    const p = new Proceso(1, 10, 5);
    p.programarES(new EventoES(2, 1));
    expect(() => p.programarES(new EventoES(2, 3))).toThrow(EventoESInvalidoError);
  });

  it('rechaza eventos sobre un proceso Terminado', () => {
    const p = enEjecucion(1);
    p.ejecutarUnidad();
    p.terminar();
    expect(() => p.programarES(new EventoES(1, 1))).toThrow(EventoESInvalidoError);
  });
});
