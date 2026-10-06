import { describe, expect, it } from 'vitest';
import type { InfoBloque } from '../../src/memoria/InfoBloque';
import { BestFit } from '../../src/memoria/politicas/BestFit';
import { FirstFit } from '../../src/memoria/politicas/FirstFit';
import type { IPoliticaAsignacion } from '../../src/memoria/politicas/IPoliticaAsignacion';
import { PoliticaAsignacionBase } from '../../src/memoria/politicas/PoliticaAsignacionBase';
import { WorstFit } from '../../src/memoria/politicas/WorstFit';

const libre = (inicio: number, tamanio: number): InfoBloque => ({ inicio, tamanio, pid: null, libre: true });
const ocupado = (inicio: number, tamanio: number): InfoBloque => ({ inicio, tamanio, pid: 9, libre: false });

const mapa = [libre(0, 100), ocupado(100, 300), libre(400, 150), ocupado(550, 50), libre(600, 400)];

describe('RF04 Políticas de asignación (polimorfismo)', () => {
  it.each<[IPoliticaAsignacion, string, number]>([
    [new FirstFit(), 'First-Fit', 0],
    [new BestFit(), 'Best-Fit', 0],
    [new WorstFit(), 'Worst-Fit', 600],
  ])('%s elige según su criterio para 80 KB', (politica, nombre, inicioEsperado) => {
    expect(politica.nombre).toBe(nombre);
    expect(politica).toBeInstanceOf(PoliticaAsignacionBase);
    expect(politica.seleccionar(mapa, 80)?.inicio).toBe(inicioEsperado);
  });

  it('para 120 KB: First-Fit 400, Best-Fit 400 (150), Worst-Fit 600 (400)', () => {
    expect(new FirstFit().seleccionar(mapa, 120)?.inicio).toBe(400);
    expect(new BestFit().seleccionar(mapa, 120)?.inicio).toBe(400);
    expect(new WorstFit().seleccionar(mapa, 120)?.inicio).toBe(600);
  });

  it('ignora bloques ocupados aunque sean más grandes', () => {
    expect(new WorstFit().seleccionar([ocupado(0, 900), libre(900, 100)], 50)?.inicio).toBe(900);
  });

  it.each([new FirstFit(), new BestFit(), new WorstFit()])('%s devuelve null si ningún hueco alcanza', (p) => {
    expect(p.seleccionar(mapa, 401)).toBeNull();
    expect(p.seleccionar([], 1)).toBeNull();
  });

  it.each([new FirstFit(), new BestFit(), new WorstFit()])('%s desempata por menor dirección', (p) => {
    const empate = [libre(500, 200), ocupado(700, 10), libre(0, 200)];
    expect(p.seleccionar(empate, 100)?.inicio).toBe(0);
  });
});
