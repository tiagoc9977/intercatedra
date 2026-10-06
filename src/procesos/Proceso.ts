import { EventoESInvalidoError, ProcesoInvalidoError, TransicionInvalidaError } from '../errores';
import { esEnteroPositivo } from '../validaciones';
import { EstadoProceso } from './EstadoProceso';
import type { EventoES } from './EventoES';
import type { InfoProceso } from './InfoProceso';
import type { IProcesoAdmisible, IProcesoEjecutable } from './IProceso';

export class Proceso implements IProcesoAdmisible, IProcesoEjecutable {
  readonly #pid: number;
  readonly #memoriaRequerida: number;
  readonly #cpuTotal: number;
  #cpuRestante: number;
  #estado: EstadoProceso = EstadoProceso.Nuevo;
  #quantumConsumido = 0;
  #bloqueoRestante = 0;
  #eventosES: EventoES[] = [];

  constructor(pid: number, memoriaRequerida: number, cpuTotal: number) {
    Proceso.#exigirEnteroPositivo('PID', pid);
    Proceso.#exigirEnteroPositivo('La memoria requerida', memoriaRequerida);
    Proceso.#exigirEnteroPositivo('El tiempo total de CPU', cpuTotal);
    this.#pid = pid;
    this.#memoriaRequerida = memoriaRequerida;
    this.#cpuTotal = cpuTotal;
    this.#cpuRestante = cpuTotal;
  }

  get pid(): number {
    return this.#pid;
  }

  get memoriaRequerida(): number {
    return this.#memoriaRequerida;
  }

  get cpuTotal(): number {
    return this.#cpuTotal;
  }

  get cpuRestante(): number {
    return this.#cpuRestante;
  }

  get cpuConsumida(): number {
    return this.#cpuTotal - this.#cpuRestante;
  }

  get estado(): EstadoProceso {
    return this.#estado;
  }

  get quantumConsumido(): number {
    return this.#quantumConsumido;
  }

  get bloqueoRestante(): number {
    return this.#bloqueoRestante;
  }

  info(): InfoProceso {
    return Object.freeze({
      pid: this.#pid,
      memoriaRequerida: this.#memoriaRequerida,
      cpuTotal: this.#cpuTotal,
      cpuRestante: this.#cpuRestante,
      cpuConsumida: this.cpuConsumida,
      estado: this.#estado,
      quantumConsumido: this.#quantumConsumido,
      bloqueoRestante: this.#bloqueoRestante,
      eventosESPendientes: this.#eventosES.length,
    });
  }

  esperarMemoria(): void {
    this.#exigirEstado('esperar memoria', EstadoProceso.Nuevo, EstadoProceso.EsperandoMemoria);
    this.#estado = EstadoProceso.EsperandoMemoria;
  }

  admitir(): void {
    this.#exigirEstado('admitir', EstadoProceso.Nuevo, EstadoProceso.EsperandoMemoria);
    this.#estado = EstadoProceso.Listo;
  }

  despachar(): void {
    this.#exigirEstado('despachar', EstadoProceso.Listo);
    this.#estado = EstadoProceso.Ejecutando;
    this.#quantumConsumido = 0;
  }

  ejecutarUnidad(): void {
    this.#exigirEstado('ejecutar', EstadoProceso.Ejecutando);
    if (this.#cpuRestante === 0) {
      throw new TransicionInvalidaError(`El proceso ${this.#pid} ya no tiene CPU restante`);
    }
    this.#cpuRestante--;
    this.#quantumConsumido++;
  }

  terminar(): void {
    this.#exigirEstado('terminar', EstadoProceso.Ejecutando);
    if (this.#cpuRestante > 0) {
      throw new TransicionInvalidaError(`El proceso ${this.#pid} todavía tiene CPU restante`);
    }
    this.#estado = EstadoProceso.Terminado;
  }

  expulsar(): void {
    this.#exigirEstado('expulsar', EstadoProceso.Ejecutando);
    this.#estado = EstadoProceso.Listo;
  }

  renovarQuantum(): void {
    this.#exigirEstado('renovar quantum', EstadoProceso.Ejecutando);
    this.#quantumConsumido = 0;
  }

  programarES(evento: EventoES): void {
    if (this.#estado === EstadoProceso.Terminado) {
      throw new EventoESInvalidoError(`El proceso ${this.#pid} ya terminó`);
    }
    if (evento.trasCpu <= this.cpuConsumida) {
      throw new EventoESInvalidoError(
        `El proceso ${this.#pid} ya consumió ${this.cpuConsumida} ticks de CPU; el disparo debe ser posterior`,
      );
    }
    if (evento.trasCpu >= this.#cpuTotal) {
      throw new EventoESInvalidoError(
        `El disparo (${evento.trasCpu}) debe ser menor que la CPU total (${this.#cpuTotal})`,
      );
    }
    if (this.#eventosES.some((e) => e.trasCpu === evento.trasCpu)) {
      throw new EventoESInvalidoError(`Ya hay un evento de E/S tras ${evento.trasCpu} ticks de CPU`);
    }
    this.#eventosES = [...this.#eventosES, evento].sort((a, b) => a.trasCpu - b.trasCpu);
  }

  debeBloquearse(): boolean {
    return (
      this.#estado === EstadoProceso.Ejecutando &&
      this.#cpuRestante > 0 &&
      this.#eventosES[0]?.trasCpu === this.cpuConsumida
    );
  }

  bloquear(): void {
    if (!this.debeBloquearse()) {
      throw new TransicionInvalidaError(`El proceso ${this.#pid} no tiene una E/S para disparar ahora`);
    }
    const [evento, ...resto] = this.#eventosES as [EventoES, ...EventoES[]];
    this.#eventosES = resto;
    this.#estado = EstadoProceso.Bloqueado;
    this.#bloqueoRestante = evento.duracion;
  }

  avanzarBloqueo(): boolean {
    this.#exigirEstado('avanzar el bloqueo', EstadoProceso.Bloqueado);
    this.#bloqueoRestante--;
    if (this.#bloqueoRestante > 0) {
      return false;
    }
    this.#estado = EstadoProceso.Listo;
    return true;
  }

  #exigirEstado(operacion: string, ...permitidos: EstadoProceso[]): void {
    if (!permitidos.includes(this.#estado)) {
      throw new TransicionInvalidaError(
        `No se puede ${operacion} el proceso ${this.#pid} en estado ${this.#estado}`,
      );
    }
  }

  static #exigirEnteroPositivo(campo: string, valor: number): void {
    if (!esEnteroPositivo(valor)) {
      throw new ProcesoInvalidoError(`${campo} debe ser un entero positivo (recibido: ${String(valor)})`);
    }
  }
}
