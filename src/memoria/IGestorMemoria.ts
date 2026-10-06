import type { InfoBloque } from './InfoBloque';

export interface IConsultaMemoria {
  readonly memoriaTotal: number;
  readonly memoriaOcupada: number;
  readonly memoriaLibreTotal: number;
  readonly mayorBloqueLibre: number;
  readonly nombrePolitica: string;
  mapa(): readonly InfoBloque[];
}

export interface IGestorMemoria extends IConsultaMemoria {
  asignar(pid: number, tamanio: number): boolean;

  liberar(pid: number): void;
  contiene(pid: number): boolean;
}
