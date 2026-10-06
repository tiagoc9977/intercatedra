import { describe, expect, it } from 'vitest';
import { ConfiguracionInvalidaError, OperacionInvalidaError } from '../../src/errores';
import { GestorMemoria } from '../../src/memoria/GestorMemoria';
import type { InfoBloque } from '../../src/memoria/InfoBloque';
import { BestFit } from '../../src/memoria/politicas/BestFit';
import { FirstFit } from '../../src/memoria/politicas/FirstFit';
import type { IPoliticaAsignacion } from '../../src/memoria/politicas/IPoliticaAsignacion';
import { WorstFit } from '../../src/memoria/politicas/WorstFit';
import { verificarInvariantes } from './invariantes';

const resumen = (m: readonly InfoBloque[]) => m.map((b) => [b.inicio, b.tamanio, b.pid]);

function conCuatroProcesos(politica: IPoliticaAsignacion = new FirstFit()): GestorMemoria {
  const g = new GestorMemoria(1000, politica);
  [1, 2, 3, 4].forEach((pid) => g.asignar(pid, 100));
  return g;
}

describe('RF01 GestorMemoria: estado inicial', () => {
  it('arranca con un único bloque libre del tamaño total', () => {
    const g = new GestorMemoria(1024, new FirstFit());
    expect(resumen(g.mapa())).toEqual([[0, 1024, null]]);
    expect(g.memoriaLibreTotal).toBe(1024);
    expect(g.memoriaOcupada).toBe(0);
    expect(g.mayorBloqueLibre).toBe(1024);
    expect(g.nombrePolitica).toBe('First-Fit');
  });

  it.each([0, -1, 10.5])('rechaza memoria total %s', (total) => {
    expect(() => new GestorMemoria(total, new FirstFit())).toThrow(ConfiguracionInvalidaError);
  });
});

describe('RF04 GestorMemoria: asignación contigua', () => {
  it('partición parcial: divide el bloque', () => {
    const g = new GestorMemoria(1024, new FirstFit());
    expect(g.asignar(1, 200)).toBe(true);
    expect(resumen(g.mapa())).toEqual([
      [0, 200, 1],
      [200, 824, null],
    ]);
    verificarInvariantes(g.mapa(), 1024);
  });

  it('ajuste exacto: no deja bloques de tamaño cero', () => {
    const g = new GestorMemoria(1024, new FirstFit());
    expect(g.asignar(1, 1024)).toBe(true);
    expect(resumen(g.mapa())).toEqual([[0, 1024, 1]]);
    expect(g.mayorBloqueLibre).toBe(0);
  });

  it('fracaso sin modificación aunque la suma libre alcance', () => {
    const g = conCuatroProcesos();
    g.liberar(1);
    g.liberar(3);
    g.asignar(5, 600);
    const antes = resumen(g.mapa());
    expect(g.memoriaLibreTotal).toBe(200);
    expect(g.asignar(6, 150)).toBe(false);
    expect(resumen(g.mapa())).toEqual(antes);
  });

  it('rechaza tamaños inválidos y PIDs que ya tienen memoria', () => {
    const g = new GestorMemoria(100, new FirstFit());
    expect(() => g.asignar(1, 0)).toThrow(OperacionInvalidaError);
    g.asignar(1, 10);
    expect(() => g.asignar(1, 10)).toThrow(OperacionInvalidaError);
    expect(g.contiene(1)).toBe(true);
    expect(g.contiene(2)).toBe(false);
  });

  it('selección según política sobre el mismo escenario', () => {
    const crear = (p: IPoliticaAsignacion) => {
      const g = conCuatroProcesos(p);
      g.liberar(1);
      g.liberar(3);
      g.asignar(5, 50);
      return g.mapa().find((b) => b.pid === 5)?.inicio;
    };
    expect(crear(new FirstFit())).toBe(0);
    expect(crear(new BestFit())).toBe(0);
    expect(crear(new WorstFit())).toBe(400);
  });

  it('detecta una política que devuelve un bloque inválido (test double)', () => {
    const tramposa: IPoliticaAsignacion = {
      nombre: 'Tramposa',
      seleccionar: () => ({ inicio: 0, tamanio: 10, pid: null, libre: true }),
    };
    const g = new GestorMemoria(100, tramposa);
    g.asignar(1, 10);
    expect(() => g.asignar(2, 10)).toThrow(OperacionInvalidaError);
  });

  it('el mapa es una copia congelada', () => {
    const g = new GestorMemoria(100, new FirstFit());
    const mapa = g.mapa();
    expect(Object.isFrozen(mapa)).toBe(true);
    expect(() => (mapa as InfoBloque[]).push({ inicio: 0, tamanio: 1, pid: 1, libre: false })).toThrow(TypeError);
    expect(g.mapa()).toHaveLength(1);
  });
});

describe('RF05 GestorMemoria: liberación y coalescencia', () => {
  it('fusión con el vecino izquierdo', () => {
    const g = conCuatroProcesos();
    g.liberar(2);
    g.liberar(3);
    expect(resumen(g.mapa())).toEqual([
      [0, 100, 1],
      [100, 200, null],
      [300, 100, 4],
      [400, 600, null],
    ]);
    verificarInvariantes(g.mapa(), 1000);
  });

  it('fusión con el vecino derecho', () => {
    const g = conCuatroProcesos();
    g.liberar(3);
    g.liberar(2);
    expect(resumen(g.mapa())[1]).toEqual([100, 200, null]);
    verificarInvariantes(g.mapa(), 1000);
  });

  it('fusión con ambos vecinos', () => {
    const g = conCuatroProcesos();
    g.liberar(2);
    g.liberar(4);
    g.liberar(3);
    expect(resumen(g.mapa())).toEqual([
      [0, 100, 1],
      [100, 900, null],
    ]);
  });

  it('no mueve bloques ocupados (no es compactación)', () => {
    const g = conCuatroProcesos();
    g.liberar(1);
    g.liberar(3);
    expect(g.mapa().find((b) => b.pid === 2)?.inicio).toBe(100);
    expect(g.mapa().find((b) => b.pid === 4)?.inicio).toBe(300);
  });

  it('al liberar todos queda un único bloque libre del tamaño total', () => {
    const g = conCuatroProcesos();
    [3, 1, 4, 2].forEach((pid) => g.liberar(pid));
    expect(resumen(g.mapa())).toEqual([[0, 1000, null]]);
  });

  it('rechaza liberar un PID sin memoria', () => {
    expect(() => new GestorMemoria(100, new FirstFit()).liberar(1)).toThrow(OperacionInvalidaError);
  });
});

describe('RF09 GestorMemoria: consultas para métricas', () => {
  it('huecos no contiguos de 100 y 300: libre 400 y mayor hueco 300', () => {
    const g = new GestorMemoria(1000, new FirstFit());
    g.asignar(1, 100);
    g.asignar(2, 200);
    g.asignar(3, 300);
    g.asignar(4, 400);
    g.liberar(1);
    g.liberar(3);
    expect(g.memoriaLibreTotal).toBe(400);
    expect(g.mayorBloqueLibre).toBe(300);
    expect(g.memoriaOcupada).toBe(600);
  });
});
