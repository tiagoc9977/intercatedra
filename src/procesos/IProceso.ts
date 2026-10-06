import type { EstadoProceso } from './EstadoProceso';
import type { InfoProceso } from './InfoProceso';

export interface IProcesoConsulta {
  readonly pid: number;
  readonly estado: EstadoProceso;
  info(): InfoProceso;
}

export interface IProcesoAdmisible extends IProcesoConsulta {
  readonly memoriaRequerida: number;
  esperarMemoria(): void;
  admitir(): void;
}

export interface IProcesoEjecutable extends IProcesoConsulta {
  readonly cpuRestante: number;
  readonly quantumConsumido: number;
  despachar(): void;
  ejecutarUnidad(): void;
  terminar(): void;
  debeBloquearse(): boolean;
  bloquear(): void;

  avanzarBloqueo(): boolean;
  expulsar(): void;
  renovarQuantum(): void;
}
