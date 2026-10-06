export interface InfoBloque {
  readonly inicio: number;
  readonly tamanio: number;

  readonly pid: number | null;
  readonly libre: boolean;
}
