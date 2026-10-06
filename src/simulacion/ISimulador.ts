import type { InfoProceso } from '../procesos/InfoProceso';
import type { EstadoSistema, ResultadoTick } from './EstadoSistema';
import type { Metricas } from './Metricas';

export interface IConsultaSimulador {
  readonly tick: number;
  readonly memoriaTotal: number;
  readonly quantum: number;
  readonly nombrePolitica: string;
  obtenerProceso(pid: number): InfoProceso;
  obtenerProcesos(): readonly InfoProceso[];
  obtenerMetricas(): Metricas;
  obtenerEstado(): EstadoSistema;
}

export interface ISimulador extends IConsultaSimulador {
  registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number): InfoProceso;
  programarES(pid: number, trasCpu: number, duracion: number): void;
  avanzarTick(): ResultadoTick;
  avanzar(ticks: number): readonly ResultadoTick[];
}
