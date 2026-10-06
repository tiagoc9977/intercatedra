import type { InfoBloque } from '../InfoBloque';
import type { IPoliticaAsignacion } from './IPoliticaAsignacion';

export abstract class PoliticaAsignacionBase implements IPoliticaAsignacion {
  abstract readonly nombre: string;

  seleccionar(bloques: readonly InfoBloque[], tamanio: number): InfoBloque | null {
    const porDireccion = [...bloques].sort((a, b) => a.inicio - b.inicio);
    let elegido: InfoBloque | null = null;
    for (const bloque of porDireccion) {
      if (!bloque.libre || bloque.tamanio < tamanio) {
        continue;
      }
      if (elegido === null || this.esPreferible(bloque, elegido)) {
        elegido = bloque;
      }
    }
    return elegido;
  }

  protected abstract esPreferible(candidato: InfoBloque, actual: InfoBloque): boolean;
}
