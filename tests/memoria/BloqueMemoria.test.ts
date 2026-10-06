import { describe, expect, it } from 'vitest';
import { OperacionInvalidaError } from '../../src/errores';
import { BloqueMemoria } from '../../src/memoria/BloqueMemoria';

describe('RF04/RF05 BloqueMemoria', () => {
  it('arranca libre con inicio, tamaño y fin', () => {
    const b = new BloqueMemoria(100, 50);
    expect(b.info()).toEqual({ inicio: 100, tamanio: 50, pid: null, libre: true });
    expect(b.fin).toBe(150);
  });

  it.each([
    [-1, 10],
    [1.5, 10],
    [0, 0],
    [0, -5],
  ])('rechaza inicio %s / tamaño %s', (inicio, tamanio) => {
    expect(() => new BloqueMemoria(inicio, tamanio)).toThrow(OperacionInvalidaError);
  });

  it('partición parcial: se queda con lo pedido y devuelve el sobrante libre', () => {
    const b = new BloqueMemoria(0, 100);
    const resto = b.ocupar(1, 30);
    expect(b.info()).toEqual({ inicio: 0, tamanio: 30, pid: 1, libre: false });
    expect(resto?.info()).toEqual({ inicio: 30, tamanio: 70, pid: null, libre: true });
  });

  it('ajuste exacto: no genera un bloque de tamaño cero', () => {
    const b = new BloqueMemoria(0, 100);
    expect(b.ocupar(1, 100)).toBeNull();
    expect(b.tamanio).toBe(100);
  });

  it('rechaza ocupar un bloque ocupado o pedir más de lo que tiene', () => {
    const b = new BloqueMemoria(0, 100);
    expect(() => b.ocupar(1, 101)).toThrow(OperacionInvalidaError);
    expect(() => b.ocupar(1, 0)).toThrow(OperacionInvalidaError);
    b.ocupar(1, 50);
    expect(() => b.ocupar(2, 10)).toThrow(OperacionInvalidaError);
  });

  it('libera y no permite liberar dos veces', () => {
    const b = new BloqueMemoria(0, 100);
    b.ocupar(1, 100);
    b.liberar();
    expect(b.estaLibre).toBe(true);
    expect(() => b.liberar()).toThrow(OperacionInvalidaError);
  });

  it('absorbe solo bloques libres y adyacentes', () => {
    const a = new BloqueMemoria(0, 40);
    const b = new BloqueMemoria(40, 60);
    a.absorber(b);
    expect(a.tamanio).toBe(100);

    expect(() => new BloqueMemoria(0, 10).absorber(new BloqueMemoria(20, 5))).toThrow(OperacionInvalidaError);

    const ocupado = new BloqueMemoria(10, 10);
    ocupado.ocupar(1, 10);
    expect(() => new BloqueMemoria(0, 10).absorber(ocupado)).toThrow(OperacionInvalidaError);
  });
});
