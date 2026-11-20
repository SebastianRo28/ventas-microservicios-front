import { Tone } from '../models';

/** Sample data for Workflow (design P-02.1 Solicitudes, P-02.2 Nueva solicitud). */

export type EstadoSolicitud = 'Pendiente' | 'Aprobada' | 'Rechazada';
export const ESTADO_SOLICITUD_TONE: Record<EstadoSolicitud, Tone> = { Pendiente: 'warning', Aprobada: 'success', Rechazada: 'danger' };

export interface SolicitudWf {
  id: string;
  titulo: string;
  estado: EstadoSolicitud;
  tipo: string;
  solicitante: string;
  afectado: string;
  documento: string;
  progreso: number;
  creada: string;
  actualizada: string;
  /** 'me' = I must act on it, 'mine' = I created it, 'all' = visible only in "Todas". */
  grupo: 'me' | 'mine' | 'all';
}

export interface PlantillaWf { nombre: string; tipo: string; }

const s = (id: string, titulo: string, estado: EstadoSolicitud, tipo: string, solicitante: string, afectado: string,
  documento: string, progreso: number, creada: string, actualizada: string, grupo: SolicitudWf['grupo']): SolicitudWf =>
  ({ id, titulo, estado, tipo, solicitante, afectado, documento, progreso, creada, actualizada, grupo });

export const SOLICITUDES_WF: SolicitudWf[] = [
  s('18747', 'Aporte Patronal', 'Pendiente', 'Flexible', 'Navarro Ríos, Gonzalo', 'Alamos Ruiz, Florencia', '72458193', 33, '12/03/2026', '12/03/2026', 'me'),
  s('18741', 'Alta simple – Ortiz Ramírez', 'Aprobada', 'Alta', 'Rodrigo Paredes', 'Ortiz Ramírez, Daniela', '75236981', 100, '24/02/2026', '01/03/2026', 'mine'),
  s('18733', 'Solicitud bono – cierre de planillas', 'Pendiente', 'Flexible', 'Cáceres Huamán, Lucía', 'Chávez Quispe, Renato', '72011548', 50, '10/03/2026', '11/03/2026', 'me'),
  s('18720', 'Cambio de cargo – Analista Finanzas', 'Aprobada', 'Movimiento', 'Navarro Ríos, Gonzalo', 'Alamos Ruiz, Florencia', '72458193', 100, '15/12/2024', '01/01/2025', 'all'),
  s('18712', 'Solicitud de Pre Ingreso', 'Pendiente', 'Pre-Ingreso', 'Rodrigo Paredes', 'Salas Cornejo, Mateo', '76321458', 20, '09/03/2026', '09/03/2026', 'mine'),
  s('18698', 'Cambio de sueldo – Supervisor de Ventas', 'Rechazada', 'Movimiento', 'Huertas León, Paolo', 'Huertas León, Paolo', '47896521', 100, '02/02/2026', '05/02/2026', 'all'),
  s('18690', 'Solicitud de activo – Laptop', 'Aprobada', 'Flexible', 'Herrera Castillo, Valeria', 'Herrera Castillo, Valeria', '74120369', 100, '07/02/2025', '10/02/2025', 'all'),
  s('18744', 'Constancia de trabajo – Entidad bancaria', 'Pendiente', 'Documento', 'Medina Torres, Sofía', 'Medina Torres, Sofía', '72589634', 0, '13/03/2026', '13/03/2026', 'me'),
  s('18675', 'Baja voluntaria', 'Pendiente', 'Baja', 'Benavides Rojas, Diego', 'Gutiérrez Paredes, Javier', '70458812', 66, '05/03/2026', '08/03/2026', 'me'),
];

export const PLANTILLAS_WF: PlantillaWf[] = [
  { nombre: 'Alta simple', tipo: 'Alta' }, { nombre: 'Alta con documentos', tipo: 'Alta' },
  { nombre: 'Solicitud bono', tipo: 'Flexible' }, { nombre: 'Solicitud de Pre Ingreso', tipo: 'Pre-Ingreso' },
  { nombre: 'Cambio de cargo', tipo: 'Movimiento' }, { nombre: 'Cambio de sueldo', tipo: 'Movimiento' },
  { nombre: 'Baja voluntaria', tipo: 'Baja' }, { nombre: 'Solicitud de activo', tipo: 'Flexible' },
];
