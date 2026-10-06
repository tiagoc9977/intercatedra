import {
  ConfiguracionInvalidaError,
  MemoriaInsuficienteError,
  PidDuplicadoError,
  ProcesoNoEncontradoError,
} from '../errores';
import { GestorMemoria } from '../memoria/GestorMemoria';
import type { IGestorMemoria } from '../memoria/IGestorMemoria';
import { FirstFit } from '../memoria/politicas/FirstFit';
import { EventoCpu } from '../planificacion/EventoCpu';
import type { IPlanificador } from '../planificacion/IPlanificador';
import { PlanificadorRoundRobin } from '../planificacion/PlanificadorRoundRobin';
import { EstadoProceso } from '../procesos/EstadoProceso';
import { EventoES } from '../procesos/EventoES';
import type { InfoProceso } from '../procesos/InfoProceso';
import { Proceso } from '../procesos/Proceso';
import { esEnteroPositivo } from '../validaciones';
import type { ConfiguracionSimulacion } from './ConfiguracionSimulacion';
import type { EstadoSistema, ResultadoTick } from './EstadoSistema';
import type { ISimulador } from './ISimulador';
import { Metricas } from './Metricas';

export class Simulador implements ISimulador {
  readonly #memoria: IGestorMemoria;
  readonly #planificador: IPlanificador;
  readonly #procesos = new Map<number, Proceso>();
  #pendientes: Proceso[] = [];
  #tick = 0;
  #metricas: Metricas;

  constructor(configuracion: ConfiguracionSimulacion) {
    Simulador.#validar(configuracion);
    this.#memoria = new GestorMemoria(configuracion.memoriaTotal, configuracion.politica ?? new FirstFit());
    this.#planificador = new PlanificadorRoundRobin(configuracion.quantum);
    this.#metricas = Metricas.calcular(this.#memoria, this.#planificador, 0);
  }

  get tick(): number {
    return this.#tick;
  }

  get memoriaTotal(): number {
    return this.#memoria.memoriaTotal;
  }

  get quantum(): number {
    return this.#planificador.quantum;
  }

  get nombrePolitica(): string {
    return this.#memoria.nombrePolitica;
  }

  obtenerProceso(pid: number): InfoProceso {
    return this.#buscar(pid).info();
  }

  obtenerProcesos(): readonly InfoProceso[] {
    return Object.freeze([...this.#procesos.values()].map((p) => p.info()));
  }

  obtenerMetricas(): Metricas {
    return this.#metricas;
  }

  obtenerEstado(): EstadoSistema {
    return Object.freeze({
      tick: this.#tick,
      enCpu: this.#planificador.enCpu(),
      listos: this.#planificador.listos(),
      nuevos: this.#pendientesEn(EstadoProceso.Nuevo),
      esperandoMemoria: this.#pendientesEn(EstadoProceso.EsperandoMemoria),
      bloqueados: this.#planificador.bloqueados(),
      terminados: this.#planificador.terminados(),
      mapaMemoria: this.#memoria.mapa(),
      metricas: this.#metricas,
    });
  }

  registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number): InfoProceso {
    const proceso = new Proceso(pid, memoriaRequerida, cpuTotal);
    if (this.#procesos.has(pid)) {
      throw new PidDuplicadoError(pid);
    }
    if (memoriaRequerida > this.#memoria.memoriaTotal) {
      throw new MemoriaInsuficienteError(memoriaRequerida, this.#memoria.memoriaTotal);
    }
    this.#procesos.set(pid, proceso);
    this.#pendientes.push(proceso);
    return proceso.info();
  }

  programarES(pid: number, trasCpu: number, duracion: number): void {
    this.#buscar(pid).programarES(new EventoES(trasCpu, duracion));
  }

  avanzarTick(): ResultadoTick {
    const admitidos = this.#faseAdmision();
    this.#planificador.actualizarBloqueados();
    const ejecucion = this.#planificador.ejecutarTick();
    if (ejecucion.evento === EventoCpu.Terminado && ejecucion.pid !== null) {
      this.#memoria.liberar(ejecucion.pid);
    }
    this.#tick++;
    this.#metricas = Metricas.calcular(this.#memoria, this.#planificador, this.#tick);
    return Object.freeze({
      tick: this.#tick,
      admitidos,
      pidEjecutado: ejecucion.pid,
      eventoCpu: ejecucion.evento,
    });
  }

  avanzar(ticks: number): readonly ResultadoTick[] {
    if (!esEnteroPositivo(ticks)) {
      throw new ConfiguracionInvalidaError('La cantidad de ticks a avanzar debe ser un entero positivo');
    }
    return Object.freeze(Array.from({ length: ticks }, () => this.avanzarTick()));
  }

  #faseAdmision(): readonly number[] {
    const admitidos: number[] = [];
    const siguenEsperando: Proceso[] = [];
    for (const proceso of this.#pendientes) {
      if (this.#memoria.asignar(proceso.pid, proceso.memoriaRequerida)) {
        proceso.admitir();
        this.#planificador.encolar(proceso);
        admitidos.push(proceso.pid);
      } else {
        if (proceso.estado === EstadoProceso.Nuevo) {
          proceso.esperarMemoria();
        }
        siguenEsperando.push(proceso);
      }
    }
    this.#pendientes = siguenEsperando;
    return Object.freeze(admitidos);
  }

  #pendientesEn(estado: EstadoProceso): readonly InfoProceso[] {
    return Object.freeze(this.#pendientes.filter((p) => p.estado === estado).map((p) => p.info()));
  }

  #buscar(pid: number): Proceso {
    const proceso = this.#procesos.get(pid);
    if (proceso === undefined) {
      throw new ProcesoNoEncontradoError(pid);
    }
    return proceso;
  }

  static #validar(configuracion: ConfiguracionSimulacion | undefined | null): void {
    if (configuracion === undefined || configuracion === null) {
      throw new ConfiguracionInvalidaError('Falta la configuración de la simulación');
    }
    if (!esEnteroPositivo(configuracion.memoriaTotal)) {
      throw new ConfiguracionInvalidaError('La memoria total debe ser un entero positivo');
    }
    if (!esEnteroPositivo(configuracion.quantum)) {
      throw new ConfiguracionInvalidaError('El quantum debe ser un entero positivo');
    }
    const politica = configuracion.politica;
    if (politica !== undefined && typeof politica?.seleccionar !== 'function') {
      throw new ConfiguracionInvalidaError('La política de asignación no es válida');
    }
  }
}
