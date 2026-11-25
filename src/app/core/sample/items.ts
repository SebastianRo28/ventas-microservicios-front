import { Tone } from '../models';

export type ClaseItem = 'Haber' | 'Descuento' | 'Aporte empleador';
export const CLASE_TONE: Record<ClaseItem, Tone> = { Haber: 'success', Descuento: 'danger', 'Aporte empleador': 'info' };

/** Payroll concept. `plame` is the SUNAT PLAME code (Tabla 22). */
export interface TipoItem {
  id: number;
  codigo: string;
  nombre: string;
  clase: ClaseItem;
  plame: string;
  /** Affected by EsSalud, pension (AFP/ONP) and 5th-category income tax. */
  essalud: boolean;
  pension: boolean;
  quinta: boolean;
  /** Items computed by Nexo RH from other modules cannot be assigned by hand. */
  automatico: boolean;
  activo: boolean;
  /** Computed by the payroll (basic pay, overtime, pension, taxes): never assigned by hand. */
  calculado?: boolean;
}

/** Assignment of an item to a collaborator for a range of periods (MM/YYYY). */
export interface AsignacionItem {
  id: number;
  colaboradorId: number;
  tipoId: number;
  monto: number;
  desde: string;
  /** '' = no end date. */
  hasta: string;
  observacion: string;
}

const a = (id: number, colaboradorId: number, tipoId: number, monto: number, desde: string, hasta = '', observacion = ''): AsignacionItem =>
  ({ id, colaboradorId, tipoId, monto, desde, hasta, observacion });
