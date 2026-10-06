import type { InfoBloque } from '../InfoBloque';

export interface IPoliticaAsignacion {
  readonly nombre: string;

  seleccionar(bloques: readonly InfoBloque[], tamanio: number): InfoBloque | null;
}
