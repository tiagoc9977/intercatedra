import { describe, expect, it } from 'vitest';
import { EventoESInvalidoError } from '../../src/errores';
import { EventoES } from '../../src/procesos/EventoES';

describe('RF08 EventoES', () => {
  it('guarda disparo y duración', () => {
    const evento = new EventoES(2, 3);
    expect(evento.trasCpu).toBe(2);
    expect(evento.duracion).toBe(3);
  });

  it.each([0, -1, 1.5, Number.NaN])('rechaza disparo inválido %s', (v) => {
    expect(() => new EventoES(v, 1)).toThrow(EventoESInvalidoError);
  });

  it.each([0, -2, 2.5])('rechaza duración inválida %s', (v) => {
    expect(() => new EventoES(1, v)).toThrow(EventoESInvalidoError);
  });
});
