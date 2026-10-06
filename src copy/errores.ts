export abstract class SimuladorError extends Error {
  protected constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ConfiguracionInvalidaError extends SimuladorError {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class ProcesoInvalidoError extends SimuladorError {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class PidDuplicadoError extends SimuladorError {
  constructor(pid: number) {
    super(`El PID ${pid} ya está registrado`);
  }
}

export class ProcesoNoEncontradoError extends SimuladorError {
  constructor(pid: number) {
    super(`No existe un proceso con PID ${pid}`);
  }
}

export class MemoriaInsuficienteError extends SimuladorError {
  constructor(requerida: number, total: number) {
    super(`El proceso requiere ${requerida} KB y la memoria total es ${total} KB`);
  }
}

export class EventoESInvalidoError extends SimuladorError {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class TransicionInvalidaError extends SimuladorError {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class OperacionInvalidaError extends SimuladorError {
  constructor(mensaje: string) {
    super(mensaje);
  }
}
