import type { IPoliticaAsignacion } from '../memoria/politicas/IPoliticaAsignacion';

export interface ConfiguracionSimulacion {
  readonly memoriaTotal: number;
  readonly quantum: number;

  readonly politica?: IPoliticaAsignacion;
}
