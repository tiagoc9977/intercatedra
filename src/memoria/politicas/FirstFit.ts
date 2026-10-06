import type { InfoBloque } from '../InfoBloque';
import { PoliticaAsignacionBase } from './PoliticaAsignacionBase';

export class FirstFit extends PoliticaAsignacionBase {
  readonly nombre = 'First-Fit';

  protected esPreferible(_candidato: InfoBloque, _actual: InfoBloque): boolean {
    return false;
  }
}
