import type { InfoBloque } from '../memoria/InfoBloque';
import type { EventoCpu } from '../planificacion/EventoCpu';
import type { InfoProceso } from '../procesos/InfoProceso';
import type { Metricas } from './Metricas';

export interface EstadoSistema {
  readonly tick: number;
  readonly enCpu: InfoProceso | null;
  readonly listos: readonly InfoProceso[];
  readonly nuevos: readonly InfoProceso[];
  readonly esperandoMemoria: readonly InfoProceso[];
  readonly bloqueados: readonly InfoProceso[];
  readonly terminados: readonly InfoProceso[];
  readonly mapaMemoria: readonly InfoBloque[];
  readonly metricas: Metricas;
}

export interface ResultadoTick {
  readonly tick: number;

  readonly admitidos: readonly number[];

  readonly pidEjecutado: number | null;
  readonly eventoCpu: EventoCpu;
}
