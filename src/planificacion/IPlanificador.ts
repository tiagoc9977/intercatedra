import type { InfoProceso } from '../procesos/InfoProceso';
import type { IProcesoEjecutable } from '../procesos/IProceso';
import type { ResultadoEjecucion } from './EventoCpu';

export interface IConsultaCpu {
  readonly ticksCpuOcupada: number;
  readonly cambiosDeContexto: number;
}

export interface IConsultaPlanificador extends IConsultaCpu {
  readonly quantum: number;
  enCpu(): InfoProceso | null;
  listos(): readonly InfoProceso[];
  bloqueados(): readonly InfoProceso[];
  terminados(): readonly InfoProceso[];
}

export interface IPlanificador extends IConsultaPlanificador {
  encolar(proceso: IProcesoEjecutable): void;

  actualizarBloqueados(): void;

  ejecutarTick(): ResultadoEjecucion;
}
