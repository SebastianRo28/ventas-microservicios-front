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
