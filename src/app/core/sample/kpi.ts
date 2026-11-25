export type UnidadKpi = '%' | 'S/' | 'Unidades';
export type SentidoKpi = 'Mayor es mejor' | 'Menor es mejor';

/** KPI that pays a variable bonus: nothing below `umbralPct` of the goal, proportional above it, capped at `topePct`. */
export interface TipoKpi {
  id: number;
  codigo: string;
  nombre: string;
  unidad: UnidadKpi;
  sentido: SentidoKpi;
  meta: number;
  /** Bonus paid at 100 % achievement, in soles. */
  bono: number;
  umbralPct: number;
  topePct: number;
  activo: boolean;
  colaboradores: number[];
}

/** Actual value of a KPI for a collaborator in a period (MM/YYYY). */
export interface DatoKpi { id: number; kpiId: number; colaboradorId: number; periodo: string; real: number; }
