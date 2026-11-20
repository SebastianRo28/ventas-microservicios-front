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
}

const t = (id: number, codigo: string, nombre: string, clase: ClaseItem, plame: string, [essalud, pension, quinta]: boolean[], automatico = false, activo = true): TipoItem =>
  ({ id, codigo, nombre, clase, plame, essalud, pension, quinta, automatico, activo });
const SI = [true, true, true], NO = [false, false, false];

export const TIPOS_ITEM: TipoItem[] = [
  t(1, 'SUE-BAS', 'Remuneración básica', 'Haber', '0121', SI, true),
  t(2, 'ASI-FAM', 'Asignación familiar', 'Haber', '0201', SI),
  t(3, 'HEX-25', 'Horas extras 25 %', 'Haber', '0105', SI),
  t(4, 'HEX-35', 'Horas extras 35 %', 'Haber', '0106', SI),
  t(5, 'REC-DOM', 'Trabajo en día de descanso o feriado', 'Haber', '0107', SI, true),
  t(6, 'VAC-REM', 'Remuneración vacacional', 'Haber', '0118', SI, true),
  t(7, 'GRA-FPN', 'Gratificación Fiestas Patrias y Navidad', 'Haber', '0406', [false, false, true], true),
  t(8, 'BON-EXT', 'Bonificación extraordinaria Ley 29351', 'Haber', '0312', [false, false, true], true),
  t(9, 'MOV-ASI', 'Movilidad supeditada a asistencia', 'Haber', '0909', NO),
  t(10, 'ADE-SUE', 'Adelanto de sueldo', 'Descuento', '0701', NO),
  t(11, 'DSC-INA', 'Inasistencias', 'Descuento', '0705', NO, true),
  t(12, 'RET-5TA', 'Retención renta de quinta categoría', 'Descuento', '0605', NO, true),
  t(13, 'APO-ESS', 'EsSalud', 'Aporte empleador', '0804', NO, true),
  t(14, 'BON-KPI', 'Bonificación por cumplimiento de KPI', 'Haber', '0303', SI, true),
];

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

/** Asignación familiar = 10 % of the RMV (S/ 1,130) = S/ 113.00. */
export const ASIGNACIONES_ITEM: AsignacionItem[] = [
  a(1, 1, 2, 113, '01/2025'), a(2, 3, 2, 113, '01/2025'), a(3, 5, 2, 113, '01/2025'), a(4, 9, 2, 113, '01/2025'), a(5, 13, 2, 113, '06/2025'),
  a(6, 1, 9, 250, '01/2026', '', 'Traslado a almacén Lurín'), a(7, 9, 9, 200, '01/2026', '06/2026', 'Supervisión de tiendas'),
  a(8, 7, 10, 500, '03/2026', '03/2026', 'Solicitado el 05/03/2026'),
  a(11, 4, 10, 800, '02/2026', '02/2026'),
];
