import { EventoESInvalidoError } from '../errores';
import { esEnteroPositivo } from '../validaciones';

export class EventoES {
  readonly #trasCpu: number;
  readonly #duracion: number;

  constructor(trasCpu: number, duracion: number) {
    if (!esEnteroPositivo(trasCpu)) {
      throw new EventoESInvalidoError('El disparo de E/S debe ser un entero positivo de ticks de CPU');
    }
    if (!esEnteroPositivo(duracion)) {
      throw new EventoESInvalidoError('La duración de E/S debe ser un entero positivo');
    }
    this.#trasCpu = trasCpu;
    this.#duracion = duracion;
  }

  get trasCpu(): number {
    return this.#trasCpu;
  }

  get duracion(): number {
    return this.#duracion;
  }
}
