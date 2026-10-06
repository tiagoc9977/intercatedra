import type { EstadoProceso } from './EstadoProceso';

export interface InfoProceso {
  readonly pid: number;
  readonly memoriaRequerida: number;
  readonly cpuTotal: number;
  readonly cpuRestante: number;
  readonly cpuConsumida: number;
  readonly estado: EstadoProceso;
  readonly quantumConsumido: number;
  readonly bloqueoRestante: number;
  readonly eventosESPendientes: number;
}
