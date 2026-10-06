import { ConfiguracionInvalidaError, OperacionInvalidaError } from '../errores';
import { esEnteroPositivo } from '../validaciones';
import { BloqueMemoria } from './BloqueMemoria';
import type { IGestorMemoria } from './IGestorMemoria';
import type { InfoBloque } from './InfoBloque';
import type { IPoliticaAsignacion } from './politicas/IPoliticaAsignacion';

export class GestorMemoria implements IGestorMemoria {
  readonly #memoriaTotal: number;
  readonly #politica: IPoliticaAsignacion;
  #bloques: BloqueMemoria[];

  constructor(memoriaTotal: number, politica: IPoliticaAsignacion) {
    if (!esEnteroPositivo(memoriaTotal)) {
      throw new ConfiguracionInvalidaError('La memoria total debe ser un entero positivo');
    }
    this.#memoriaTotal = memoriaTotal;
    this.#politica = politica;
    this.#bloques = [new BloqueMemoria(0, memoriaTotal)];
  }

  get memoriaTotal(): number {
    return this.#memoriaTotal;
  }

  get nombrePolitica(): string {
    return this.#politica.nombre;
  }

  get memoriaLibreTotal(): number {
    return this.#libres().reduce((suma, b) => suma + b.tamanio, 0);
  }

  get memoriaOcupada(): number {
    return this.#memoriaTotal - this.memoriaLibreTotal;
  }

  get mayorBloqueLibre(): number {
    return this.#libres().reduce((mayor, b) => Math.max(mayor, b.tamanio), 0);
  }

  mapa(): readonly InfoBloque[] {
    return Object.freeze(this.#bloques.map((b) => b.info()));
  }

  contiene(pid: number): boolean {
    return this.#bloques.some((b) => b.pid === pid);
  }

  asignar(pid: number, tamanio: number): boolean {
    if (!esEnteroPositivo(tamanio)) {
      throw new OperacionInvalidaError('El tamaño a asignar debe ser un entero positivo');
    }
    if (this.contiene(pid)) {
      throw new OperacionInvalidaError(`El proceso ${pid} ya tiene memoria asignada`);
    }
    const elegido = this.#politica.seleccionar(this.mapa(), tamanio);
    if (elegido === null) {
      return false;
    }
    const indice = this.#bloques.findIndex((b) => b.inicio === elegido.inicio);
    const bloque = this.#bloques[indice];
    if (bloque === undefined || !bloque.estaLibre || bloque.tamanio < tamanio) {
      throw new OperacionInvalidaError(`La política ${this.#politica.nombre} eligió un bloque inválido`);
    }
    const resto = bloque.ocupar(pid, tamanio);
    if (resto !== null) {
      this.#bloques.splice(indice + 1, 0, resto);
    }
    return true;
  }

  liberar(pid: number): void {
    const indice = this.#bloques.findIndex((b) => b.pid === pid);
    if (indice === -1) {
      throw new OperacionInvalidaError(`El proceso ${pid} no tiene memoria asignada`);
    }
    this.#bloques[indice]!.liberar();
    this.#coalescer(indice);
  }

  #coalescer(indice: number): void {
    let actual = indice;
    const izquierdo = this.#bloques[actual - 1];
    if (izquierdo?.estaLibre) {
      izquierdo.absorber(this.#bloques[actual]!);
      this.#bloques.splice(actual, 1);
      actual--;
    }
    const derecho = this.#bloques[actual + 1];
    if (derecho?.estaLibre) {
      this.#bloques[actual]!.absorber(derecho);
      this.#bloques.splice(actual + 1, 1);
    }
  }

  #libres(): BloqueMemoria[] {
    return this.#bloques.filter((b) => b.estaLibre);
  }
}
