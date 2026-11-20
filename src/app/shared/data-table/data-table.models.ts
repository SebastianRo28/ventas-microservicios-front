import { Tone } from '../../core/models';

export type ColumnType = 'text' | 'number' | 'date' | 'money' | 'link' | 'badge' | 'progress' | 'check' | 'actions';
export type ColumnFilter = 'text' | 'select' | 'date' | 'none';
export type RowAction = 'ver' | 'editar' | 'eliminar' | 'descargar' | 'historial' | 'firmar' | 'ocultar' | 'cerrar' | 'mas' | 'info' | 'pausa' | 'duplicar' | 'cambiar' | 'aprobar' | 'rechazar' | 'cargar' | 'emparejar' | 'observar';

export interface Column {
  key: string;
  label: string;
  type?: ColumnType;
  filter?: ColumnFilter;
  /** CSS grid track, e.g. `minmax(180px, 1.7fr)`. */
  w?: string;
  sortable?: boolean;
  options?: string[];
  /** Text for `check` cells (yes, no); defaults to Completado / Pendiente. */
  checkLabels?: [string, string];
}

/** A cell value: plain, or rich (badge tone, link target, chip, progress). `check` cells use 'si' | 'no' | 'na'. */
export interface CellValue {
  text: string;
  tone?: Tone;
  link?: string;
  chip?: string;
  /** progress: 0–100 */
  pct?: number;
}

export type Row = { id: number | string } & Record<string, string | number | CellValue | undefined>;

export const cellText = (v: unknown): string =>
  v == null ? '' : typeof v === 'object' ? (v as CellValue).text ?? '' : String(v);
