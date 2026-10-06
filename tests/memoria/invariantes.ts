import { expect } from 'vitest';
import type { InfoBloque } from '../../src/memoria/InfoBloque';

export function verificarInvariantes(mapa: readonly InfoBloque[], total: number): void {
  let esperado = 0;
  mapa.forEach((bloque, i) => {
    expect(bloque.inicio).toBe(esperado);
    expect(bloque.tamanio).toBeGreaterThan(0);
    esperado += bloque.tamanio;
    if (i > 0) {
      expect(bloque.libre && mapa[i - 1]!.libre).toBe(false);
    }
  });
  expect(esperado).toBe(total);
}
