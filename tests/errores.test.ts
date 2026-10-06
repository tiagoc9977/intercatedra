import { describe, expect, it } from 'vitest';
import {
  ConfiguracionInvalidaError,
  EventoESInvalidoError,
  MemoriaInsuficienteError,
  OperacionInvalidaError,
  PidDuplicadoError,
  ProcesoInvalidoError,
  ProcesoNoEncontradoError,
  SimuladorError,
  TransicionInvalidaError,
} from '../src/errores';
import { esEnteroPositivo } from '../src/validaciones';

describe('Jerarquía de errores', () => {
  it.each([
    ['ConfiguracionInvalidaError', new ConfiguracionInvalidaError('x')],
    ['ProcesoInvalidoError', new ProcesoInvalidoError('x')],
    ['PidDuplicadoError', new PidDuplicadoError(1)],
    ['ProcesoNoEncontradoError', new ProcesoNoEncontradoError(1)],
    ['MemoriaInsuficienteError', new MemoriaInsuficienteError(2048, 1024)],
    ['EventoESInvalidoError', new EventoESInvalidoError('x')],
    ['TransicionInvalidaError', new TransicionInvalidaError('x')],
    ['OperacionInvalidaError', new OperacionInvalidaError('x')],
  ])('%s es un SimuladorError y un Error, con su nombre', (nombre, error) => {
    expect(error).toBeInstanceOf(SimuladorError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(nombre);
  });

  it('los mensajes incluyen los datos del rechazo', () => {
    expect(new PidDuplicadoError(7).message).toContain('7');
    expect(new ProcesoNoEncontradoError(9).message).toContain('9');
    const e = new MemoriaInsuficienteError(2048, 1024);
    expect(e.message).toContain('2048');
    expect(e.message).toContain('1024');
  });
});

describe('esEnteroPositivo', () => {
  it.each([1, 2, 1024])('acepta %d', (v) => {
    expect(esEnteroPositivo(v)).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '5', null, undefined])('rechaza %s', (v) => {
    expect(esEnteroPositivo(v)).toBe(false);
  });
});
