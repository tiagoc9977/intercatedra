import { OperacionInvalidaError } from '../errores';
import { esEnteroPositivo } from '../validaciones';
import type { InfoBloque } from './InfoBloque';

export class BloqueMemoria {
  readonly #inicio: number;
  #tamanio: number;
  #pid: number | null = null;

  constructor(inicio: number, tamanio: number) {
    if (!Number.isInteger(inicio) || inicio < 0) {
      throw new OperacionInvalidaError('El inicio de un bloque debe ser un entero no negativo');
    }
    if (!esEnteroPositivo(tamanio)) {
      throw new OperacionInvalidaError('El tamaño de un bloque debe ser un entero positivo');
    }
    this.#inicio = inicio;
    this.#tamanio = tamanio;
  }

  get inicio(): number {
    return this.#inicio;
  }

  get tamanio(): number {
    return this.#tamanio;
  }

  get fin(): number {
    return this.#inicio + this.#tamanio;
  }

  get pid(): number | null {
    return this.#pid;
  }

  get estaLibre(): boolean {
    return this.#pid === null;
  }

  ocupar(pid: number, tamanio: number): BloqueMemoria | null {
    if (!this.estaLibre) {
      throw new OperacionInvalidaError(`El bloque en ${this.#inicio} ya está ocupado`);
    }
    if (!esEnteroPositivo(tamanio) || tamanio > this.#tamanio) {
      throw new OperacionInvalidaError(`El bloque en ${this.#inicio} no puede alojar ${tamanio} KB`);
    }
    const sobrante = this.#tamanio - tamanio;
    this.#pid = pid;
    this.#tamanio = tamanio;
    return sobrante > 0 ? new BloqueMemoria(this.fin, sobrante) : null;
  }

  liberar(): void {
    if (this.estaLibre) {
      throw new OperacionInvalidaError(`El bloque en ${this.#inicio} ya está libre`);
    }
    this.#pid = null;
  }

  absorber(siguiente: BloqueMemoria): void {
    if (!this.estaLibre || !siguiente.estaLibre) {
      throw new OperacionInvalidaError('Solo se pueden fusionar bloques libres');
    }
    if (this.fin !== siguiente.inicio) {
      throw new OperacionInvalidaError('Solo se pueden fusionar bloques adyacentes');
    }
    this.#tamanio += siguiente.tamanio;
  }

  info(): InfoBloque {
    return Object.freeze({
      inicio: this.#inicio,
      tamanio: this.#tamanio,
      pid: this.#pid,
      libre: this.estaLibre,
    });
  }
}
