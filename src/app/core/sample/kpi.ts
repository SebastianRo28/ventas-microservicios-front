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

export const TIPOS_KPI: TipoKpi[] = [
  { id: 1, codigo: 'VTA-MEN', nombre: 'Ventas mensuales', unidad: 'S/', sentido: 'Mayor es mejor', meta: 120000, bono: 800, umbralPct: 80, topePct: 120, activo: true, colaboradores: [4, 9] },
  { id: 2, codigo: 'NPS-CLI', nombre: 'Satisfacción de clientes (NPS)', unidad: '%', sentido: 'Mayor es mejor', meta: 60, bono: 300, umbralPct: 80, topePct: 110, activo: true, colaboradores: [9, 10] },
  { id: 3, codigo: 'TKT-SLA', nombre: 'Tickets resueltos dentro del SLA', unidad: '%', sentido: 'Mayor es mejor', meta: 95, bono: 250, umbralPct: 90, topePct: 105, activo: true, colaboradores: [3, 15] },
  { id: 4, codigo: 'INV-DIF', nombre: 'Diferencias de inventario', unidad: '%', sentido: 'Menor es mejor', meta: 0.5, bono: 400, umbralPct: 80, topePct: 120, activo: true, colaboradores: [1, 7] },
];

/** Actual value of a KPI for a collaborator in a period (MM/YYYY). */
export interface DatoKpi { id: number; kpiId: number; colaboradorId: number; periodo: string; real: number; }

let n = 0;
const d = (kpiId: number, colaboradorId: number, periodo: string, real: number): DatoKpi => ({ id: ++n, kpiId, colaboradorId, periodo, real });

export const DATOS_KPI: DatoKpi[] = [
  d(1, 4, '02/2026', 131500), d(1, 9, '02/2026', 92400), d(2, 9, '02/2026', 64), d(2, 10, '02/2026', 47),
  d(3, 3, '02/2026', 97.2), d(3, 15, '02/2026', 93.1), d(4, 1, '02/2026', 0.42), d(4, 7, '02/2026', 0.71),
  d(1, 4, '03/2026', 108300), d(2, 10, '03/2026', 58), d(3, 3, '03/2026', 96), d(4, 1, '03/2026', 0.38),
];
