import { describe, expect, it } from 'vitest';
import { ConfiguracionInvalidaError, OperacionInvalidaError, TransicionInvalidaError } from '../../src/errores';
import { EventoCpu } from '../../src/planificacion/EventoCpu';
import { PlanificadorRoundRobin } from '../../src/planificacion/PlanificadorRoundRobin';
import { EstadoProceso } from '../../src/procesos/EstadoProceso';
import { EventoES } from '../../src/procesos/EventoES';
import { Proceso } from '../../src/procesos/Proceso';

function listo(pid: number, cpu: number): Proceso {
  const p = new Proceso(pid, 10, cpu);
  p.admitir();
  return p;
}

function correr(rr: PlanificadorRoundRobin, n: number): (number | null)[] {
  return Array.from({ length: n }, () => {
    rr.actualizarBloqueados();
    return rr.ejecutarTick().pid;
  });
}

describe('RF07 PlanificadorRoundRobin', () => {
  it.each([0, -1, 1.5])('rechaza quantum %s', (q) => {
    expect(() => new PlanificadorRoundRobin(q)).toThrow(ConfiguracionInvalidaError);
  });

  it('con la cola vacía la CPU queda ociosa', () => {
    const rr = new PlanificadorRoundRobin(2);
    expect(rr.ejecutarTick()).toEqual({ pid: null, evento: EventoCpu.Ociosa });
    expect(rr.ticksCpuOcupada).toBe(0);
    expect(rr.enCpu()).toBeNull();
  });

  it('caso de la consigna: Q=2, P1(3) y P2(2) → P1 P1 P2 P2 P1 con un cambio de contexto', () => {
    const rr = new PlanificadorRoundRobin(2);
    rr.encolar(listo(1, 3));
    rr.encolar(listo(2, 2));
    expect(correr(rr, 6)).toEqual([1, 1, 2, 2, 1, null]);
    expect(rr.cambiosDeContexto).toBe(1);
    expect(rr.ticksCpuOcupada).toBe(5);
    expect(rr.terminados().map((p) => p.pid)).toEqual([2, 1]);
  });

  it('expulsión: vuelve al final de la cola y libera la CPU', () => {
    const rr = new PlanificadorRoundRobin(1);
    rr.encolar(listo(1, 2));
    rr.encolar(listo(2, 2));
    expect(rr.ejecutarTick()).toEqual({ pid: 1, evento: EventoCpu.Expulsado });
    expect(rr.enCpu()).toBeNull();
    expect(rr.listos().map((p) => p.pid)).toEqual([2, 1]);
  });

  it('un único proceso renueva el quantum sin cambio de contexto', () => {
    const rr = new PlanificadorRoundRobin(2);
    rr.encolar(listo(1, 5));
    const eventos = Array.from({ length: 5 }, () => rr.ejecutarTick().evento);
    expect(eventos).toEqual([
      EventoCpu.Continua,
      EventoCpu.QuantumRenovado,
      EventoCpu.Continua,
      EventoCpu.QuantumRenovado,
      EventoCpu.Terminado,
    ]);
    expect(rr.cambiosDeContexto).toBe(0);
  });

  it('finalizar justo en el límite del quantum no lo reencola ni cuenta cambio de contexto', () => {
    const rr = new PlanificadorRoundRobin(2);
    rr.encolar(listo(1, 2));
    rr.encolar(listo(2, 1));
    rr.ejecutarTick();
    expect(rr.ejecutarTick()).toEqual({ pid: 1, evento: EventoCpu.Terminado });
    expect(rr.listos().map((p) => p.pid)).toEqual([2]);
    expect(rr.cambiosDeContexto).toBe(0);
  });

  it('el proceso que termina libera la CPU: el siguiente ejecuta recién en el próximo tick', () => {
    const rr = new PlanificadorRoundRobin(2);
    rr.encolar(listo(1, 1));
    rr.encolar(listo(2, 1));
    expect(rr.ejecutarTick()).toEqual({ pid: 1, evento: EventoCpu.Terminado });
    expect(rr.enCpu()).toBeNull();
    expect(rr.ejecutarTick().pid).toBe(2);
  });

  it('rechaza encolar procesos no Listos o repetidos', () => {
    const rr = new PlanificadorRoundRobin(2);
    expect(() => rr.encolar(new Proceso(1, 10, 1))).toThrow(TransicionInvalidaError);
    const p = listo(2, 3);
    rr.encolar(p);
    expect(() => rr.encolar(p)).toThrow(OperacionInvalidaError);
    const otroConMismoPid = listo(2, 3);
    expect(() => rr.encolar(otroConMismoPid)).toThrow(OperacionInvalidaError);
  });

  it('las consultas devuelven copias congeladas', () => {
    const rr = new PlanificadorRoundRobin(2);
    rr.encolar(listo(1, 3));
    const listos = rr.listos();
    expect(Object.isFrozen(listos)).toBe(true);
    expect(rr.quantum).toBe(2);
  });
});

describe('RF08 PlanificadorRoundRobin: E/S', () => {
  it('bloquea con prioridad sobre el quantum, cuenta cambio de contexto y retorna al vencer', () => {
    const rr = new PlanificadorRoundRobin(2);
    const p1 = listo(1, 4);
    p1.programarES(new EventoES(2, 1));
    rr.encolar(p1);
    rr.encolar(listo(2, 3));

    rr.ejecutarTick();
    expect(rr.ejecutarTick()).toEqual({ pid: 1, evento: EventoCpu.Bloqueado });
    expect(rr.bloqueados().map((p) => p.pid)).toEqual([1]);
    expect(rr.cambiosDeContexto).toBe(1);

    rr.actualizarBloqueados();
    expect(p1.estado).toBe(EstadoProceso.Listo);
    expect(rr.listos().map((p) => p.pid)).toEqual([2, 1]);
  });

  it('la finalización tiene prioridad sobre el bloqueo', () => {
    const rr = new PlanificadorRoundRobin(5);
    const p = listo(1, 2);
    p.programarES(new EventoES(1, 1));
    rr.encolar(p);
    expect(rr.ejecutarTick().evento).toBe(EventoCpu.Bloqueado);
    rr.actualizarBloqueados();
    expect(rr.ejecutarTick().evento).toBe(EventoCpu.Terminado);
  });

  it('durante el bloqueo no consume CPU y puede despacharse en el tick que retorna', () => {
    const rr = new PlanificadorRoundRobin(3);
    const p = listo(1, 3);
    p.programarES(new EventoES(1, 2));
    rr.encolar(p);
    expect(correr(rr, 4)).toEqual([1, null, 1, 1]);
    expect(rr.ticksCpuOcupada).toBe(3);
  });
});
