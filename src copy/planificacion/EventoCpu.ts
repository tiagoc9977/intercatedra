export enum EventoCpu {
  Ociosa = 'OCIOSA',

  Continua = 'CONTINUA',

  QuantumRenovado = 'QUANTUM_RENOVADO',

  Expulsado = 'EXPULSADO',

  Bloqueado = 'BLOQUEADO',

  Terminado = 'TERMINADO',
}

export interface ResultadoEjecucion {
  readonly pid: number | null;
  readonly evento: EventoCpu;
}
