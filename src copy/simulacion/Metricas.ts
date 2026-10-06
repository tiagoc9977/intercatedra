import type { IConsultaMemoria } from '../memoria/IGestorMemoria';
import type { IConsultaCpu } from '../planificacion/IPlanificador';

export class Metricas {
  private constructor(
    readonly ocupacionMemoria: number,
    readonly utilizacionCpu: number,
    readonly cambiosDeContexto: number,
    readonly memoriaLibreTotal: number,
    readonly mayorBloqueLibre: number,
    readonly fragmentacionExterna: number,
  ) {
    Object.freeze(this);
  }

  static calcular(memoria: IConsultaMemoria, cpu: IConsultaCpu, ticksTranscurridos: number): Metricas {
    const libreTotal = memoria.memoriaLibreTotal;
    const mayorLibre = memoria.mayorBloqueLibre;
    return new Metricas(
      (100 * memoria.memoriaOcupada) / memoria.memoriaTotal,
      ticksTranscurridos === 0 ? 0 : (100 * cpu.ticksCpuOcupada) / ticksTranscurridos,
      cpu.cambiosDeContexto,
      libreTotal,
      mayorLibre,
      libreTotal === 0 ? 0 : 100 * (1 - mayorLibre / libreTotal),
    );
  }
}
