import type { InfoBloque } from '../InfoBloque';
import { PoliticaAsignacionBase } from './PoliticaAsignacionBase';

export class WorstFit extends PoliticaAsignacionBase {
  readonly nombre = 'Worst-Fit';

  protected esPreferible(candidato: InfoBloque, actual: InfoBloque): boolean {
    return candidato.tamanio > actual.tamanio;
  }
}
