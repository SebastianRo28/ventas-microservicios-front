import { Tone } from '../models';

/** Sample data for Remuneraciones (design P-03.2 Procesos, P-03.4 Archivos y Pagos). */

export type EstadoArchivo = 'Actualizado' | 'Desactualizado' | 'No generado';

export const ESTADO_TONE: Record<EstadoArchivo, Tone> = {
  'Actualizado': 'success', 'Desactualizado': 'orange', 'No generado': 'gray',
};

export interface ArchivoProceso { nombre: string; detalle: string; estado: EstadoArchivo; }

export interface ProcesoRem {
  nombre: string;
  responsable: string;
  colaboradores: number;
  fechaPago: string;
}

export interface PeriodoProcesos {
  label: string;
  abierto: boolean;
  procesos: ProcesoRem[];
  /** Only the open period has a "Proceso general" with output files. */
  archivos?: ArchivoProceso[];
  boletasSinProceso?: number;
}

const p = (nombre: string, colaboradores: number, fechaPago: string): ProcesoRem =>
  ({ nombre, responsable: 'Rodrigo Paredes', colaboradores, fechaPago });

export const PERIODOS_PROCESOS: PeriodoProcesos[] = [
  {
    label: 'Marzo ’26', abierto: true, boletasSinProceso: 13,
    procesos: [p('Pago Proceso Marzo 2026', 13, '31/03/2026')],
    archivos: [
      { nombre: 'Otros pagos', detalle: 'Pagos fuera de planilla', estado: 'Actualizado' },
      { nombre: 'Sueldos', detalle: 'Transferencia bancaria', estado: 'No generado' },
      { nombre: 'Boletas de Pago PDF', detalle: 'Boletas individuales', estado: 'Actualizado' },
      { nombre: 'Boletas de Pago Parciales', detalle: 'Adelantos y pagos parciales', estado: 'No generado' },
      { nombre: 'Libros', detalle: 'Libro de Remuneraciones', estado: 'Desactualizado' },
      { nombre: 'Libros PDF', detalle: 'Libro de Remuneraciones en PDF', estado: 'Desactualizado' },
      { nombre: 'PLAME', detalle: 'TXT para subir a SUNAT', estado: 'Desactualizado' },
      { nombre: 'AFPnet', detalle: 'Archivo de aportes AFP', estado: 'Actualizado' },
      { nombre: 'Contabilidad', detalle: 'Asientos contables', estado: 'No generado' },
    ],
  },
  { label: 'Febrero ’26', abierto: false, procesos: [p('Pago Proceso Febrero 2026', 13, '27/02/2026')] },
  { label: 'Enero ’26', abierto: false, procesos: [p('Pago Proceso Enero 2026', 12, '30/01/2026')] },
  { label: 'Diciembre ’25', abierto: false, procesos: [p('Pago Proceso Diciembre 2025', 12, '22/12/2025'), p('Gratificación Diciembre 2025', 12, '15/12/2025')] },
  { label: 'Noviembre ’25', abierto: false, procesos: [p('Pago Proceso Noviembre 2025', 12, '28/11/2025')] },
];

export interface ArchivoPago {
  id: number;
  nombre: string;
  tipo: string;
  comprobantes: string;
  cantidad: number;
  mes: string;
  estado: EstadoArchivo;
  creadoPor: string;
  origen: string;
  fecha: string;
  haberes: number;
  descuentos: number;
}

type Raw = [string, string, number, string, EstadoArchivo, string, string, number, number];
const L = 'Lucía Cáceres', R = 'Rodrigo Paredes', BP = 'Boleta de Pago', LQ = 'Liquidación', AMB = 'Boleta de Pago, Liquidación';
const RAW: Raw[] = [
  ['PLAME', BP, 13, '03-2026', 'Desactualizado', L, '13/03/2026', 213645, 35892.36],
  ['Transfer bancario', BP, 13, '03-2026', 'Actualizado', R, '13/03/2026', 213607.5, 35886.06],
  ['AFPnet', BP, 13, '03-2026', 'Desactualizado', R, '13/03/2026', 213570, 35879.76],
  ['Libro de Remuneraciones', BP, 13, '03-2026', 'Actualizado', L, '13/03/2026', 213532.5, 35873.46],
  ['Transfer bancario', LQ, 1, '03-2026', 'Desactualizado', R, '13/03/2026', 9690, 1627.92],
  ['Contabilidad', AMB, 13, '03-2026', 'Actualizado', R, '13/03/2026', 213457.5, 35860.86],
  ['PLAME', BP, 13, '02-2026', 'Actualizado', L, '27/02/2026', 213420, 35854.56],
  ['Transfer bancario', BP, 13, '02-2026', 'Actualizado', R, '27/02/2026', 213382.5, 35848.26],
  ['AFPnet', BP, 13, '02-2026', 'Actualizado', R, '27/02/2026', 213345, 35841.96],
  ['Libro de Remuneraciones', BP, 13, '02-2026', 'Actualizado', L, '27/02/2026', 213307.5, 35835.66],
  ['Transfer bancario', LQ, 1, '02-2026', 'Actualizado', R, '27/02/2026', 9465, 1590.12],
  ['Contabilidad', AMB, 13, '02-2026', 'Actualizado', R, '27/02/2026', 213232.5, 35823.06],
  ['PLAME', BP, 13, '01-2026', 'Actualizado', L, '30/01/2026', 213195, 35816.76],
  ['Transfer bancario', BP, 13, '01-2026', 'Actualizado', R, '30/01/2026', 213157.5, 35810.46],
  ['AFPnet', BP, 13, '01-2026', 'Actualizado', R, '30/01/2026', 213120, 35804.16],
  ['Libro de Remuneraciones', BP, 13, '01-2026', 'Actualizado', L, '30/01/2026', 213082.5, 35797.86],
  ['Transfer bancario', LQ, 1, '01-2026', 'Actualizado', R, '30/01/2026', 9240, 1552.32],
  ['Contabilidad', AMB, 13, '01-2026', 'Actualizado', R, '30/01/2026', 213007.5, 35785.26],
  ['PLAME', BP, 13, '12-2025', 'Actualizado', L, '22/12/2025', 212970, 35778.96],
  ['Transfer bancario', BP, 13, '12-2025', 'Actualizado', R, '22/12/2025', 212932.5, 35772.66],
  ['AFPnet', BP, 13, '12-2025', 'Actualizado', R, '22/12/2025', 212895, 35766.36],
  ['Libro de Remuneraciones', BP, 13, '12-2025', 'Actualizado', L, '22/12/2025', 212857.5, 35760.06],
  ['Transfer bancario', LQ, 1, '12-2025', 'Actualizado', R, '22/12/2025', 9015, 1514.52],
];

export const ARCHIVOS_PAGOS: ArchivoPago[] = RAW.map(([tipo, comprobantes, cantidad, mes, estado, creadoPor, fecha, haberes, descuentos], id) =>
  ({ id, nombre: `${tipo} ${mes}`, tipo, comprobantes, cantidad, mes, estado, creadoPor, origen: 'Manual', fecha, haberes, descuentos }));

/** Months whose payroll period is still open (Marzo 2026). */
export const MESES_ABIERTOS = new Set(['03-2026']);
