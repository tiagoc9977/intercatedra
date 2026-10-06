import { ConfiguracionInvalidaError, OperacionInvalidaError, TransicionInvalidaError } from '../errores';
import { EstadoProceso } from '../procesos/EstadoProceso';
import type { InfoProceso } from '../procesos/InfoProceso';
import type { IProcesoEjecutable } from '../procesos/IProceso';
import { esEnteroPositivo } from '../validaciones';
import { EventoCpu, type ResultadoEjecucion } from './EventoCpu';
import type { IPlanificador } from './IPlanificador';

export class PlanificadorRoundRobin implements IPlanificador {
  readonly #quantum: number;
  #listos: IProcesoEjecutable[] = [];
  #bloqueados: IProcesoEjecutable[] = [];
  readonly #terminados: IProcesoEjecutable[] = [];
  #enCpu: IProcesoEjecutable | null = null;
  #cambiosDeContexto = 0;
  #ticksCpuOcupada = 0;

  constructor(quantum: number) {
    if (!esEnteroPositivo(quantum)) {
      throw new ConfiguracionInvalidaError('El quantum debe ser un entero positivo');
    }
    this.#quantum = quantum;
  }

  get quantum(): number {
    return this.#quantum;
  }

  get cambiosDeContexto(): number {
    return this.#cambiosDeContexto;
  }

  get ticksCpuOcupada(): number {
    return this.#ticksCpuOcupada;
  }

  enCpu(): InfoProceso | null {
    return this.#enCpu?.info() ?? null;
  }

  listos(): readonly InfoProceso[] {
    return Object.freeze(this.#listos.map((p) => p.info()));
  }

  bloqueados(): readonly InfoProceso[] {
    return Object.freeze(this.#bloqueados.map((p) => p.info()));
  }

  terminados(): readonly InfoProceso[] {
    return Object.freeze(this.#terminados.map((p) => p.info()));
  }

  encolar(proceso: IProcesoEjecutable): void {
    if (proceso.estado !== EstadoProceso.Listo) {
      throw new TransicionInvalidaError(`Solo se encolan procesos Listos (PID ${proceso.pid} está ${proceso.estado})`);
    }
    if (this.#conoce(proceso.pid)) {
      throw new OperacionInvalidaError(`El proceso ${proceso.pid} ya está en el planificador`);
    }
    this.#listos.push(proceso);
  }

  actualizarBloqueados(): void {
    const siguenBloqueados: IProcesoEjecutable[] = [];
    for (const proceso of this.#bloqueados) {
      if (proceso.avanzarBloqueo()) {
        this.#listos.push(proceso);
      } else {
        siguenBloqueados.push(proceso);
      }
    }
    this.#bloqueados = siguenBloqueados;
  }

  ejecutarTick(): ResultadoEjecucion {
    if (this.#enCpu === null) {
      this.#despacharSiguiente();
    }
    const proceso = this.#enCpu;
    if (proceso === null) {
      return Object.freeze({ pid: null, evento: EventoCpu.Ociosa });
    }

    proceso.ejecutarUnidad();
    this.#ticksCpuOcupada++;

    return Object.freeze({ pid: proceso.pid, evento: this.#resolverTrasEjecutar(proceso) });
  }

  #despacharSiguiente(): void {
    const siguiente = this.#listos.shift();
    if (siguiente !== undefined) {
      siguiente.despachar();
      this.#enCpu = siguiente;
    }
  }

  #resolverTrasEjecutar(proceso: IProcesoEjecutable): EventoCpu {
    if (proceso.cpuRestante === 0) {
      proceso.terminar();
      this.#terminados.push(proceso);
      this.#enCpu = null;
      return EventoCpu.Terminado;
    }
    if (proceso.debeBloquearse()) {
      proceso.bloquear();
      this.#bloqueados.push(proceso);
      this.#enCpu = null;
      this.#cambiosDeContexto++;
      return EventoCpu.Bloqueado;
    }
    if (proceso.quantumConsumido < this.#quantum) {
      return EventoCpu.Continua;
    }
    if (this.#listos.length === 0) {
      proceso.renovarQuantum();
      return EventoCpu.QuantumRenovado;
    }
    proceso.expulsar();
    this.#listos.push(proceso);
    this.#enCpu = null;
    this.#cambiosDeContexto++;
    return EventoCpu.Expulsado;
  }

  #conoce(pid: number): boolean {
    return (
      this.#enCpu?.pid === pid ||
      [...this.#listos, ...this.#bloqueados, ...this.#terminados].some((p) => p.pid === pid)
    );
  }
}
