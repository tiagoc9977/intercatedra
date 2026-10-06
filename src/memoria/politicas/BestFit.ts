import type { InfoBloque } from '../InfoBloque';
import { PoliticaAsignacionBase } from './PoliticaAsignacionBase';

export class BestFit extends PoliticaAsignacionBase {
  readonly nombre = 'Best-Fit';

  protected esPreferible(candidato: InfoBloque, actual: InfoBloque): boolean {
    return candidato.tamanio < actual.tamanio;
  }
}
