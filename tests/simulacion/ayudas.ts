import { Simulador } from '../../src/simulacion/Simulador';
import type { ConfiguracionSimulacion } from '../../src/simulacion/ConfiguracionSimulacion';

export function simuladorReferencia(extra: Partial<ConfiguracionSimulacion> = {}): Simulador {
  return new Simulador({ memoriaTotal: 1024, quantum: 2, ...extra });
}

export function ejecuciones(sim: Simulador, n: number): (number | null)[] {
  return sim.avanzar(n).map((r) => r.pidEjecutado);
}
