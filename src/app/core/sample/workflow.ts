import { Tone } from '../models';

/** Sample data for Workflow (design P-02.1 Solicitudes, P-02.2 Nueva solicitud). */

export type EstadoSolicitud = 'Pendiente' | 'Aprobada' | 'Rechazada';
export const ESTADO_SOLICITUD_TONE: Record<EstadoSolicitud, Tone> = { Pendiente: 'warning', Aprobada: 'success', Rechazada: 'danger' };

/** Workflow request (GET /api/workflow/solicitudes). */
export interface SolicitudWf {
  id: number;
  titulo: string;
  estado: EstadoSolicitud;
  tipo: string;
  solicitante: string;
  afectado: string;
  afectadoId: number | null;
  documento: string;
  progreso: number;
  creada: string;
  actualizada: string;
  detalle: string;
  monto: number | null;
  comentario: string;
  resueltaPor: string;
  /** Mi Portal process (constancia, quinta, adelanto, datos, activo) or null for template requests. */
  proceso: string | null;
  plantilla: string | null;
  esMia: boolean;
  puedoResolver: boolean;
  /** 'me' = I must act on it, 'mine' = I created it, 'all' = visible only in "Todas". */
  grupo: 'me' | 'mine' | 'all';
}

export interface PlantillaWf { nombre: string; tipo: string; }

export const PLANTILLAS_WF: PlantillaWf[] = [
  { nombre: 'Alta simple', tipo: 'Alta' }, { nombre: 'Alta con documentos', tipo: 'Alta' },
  { nombre: 'Solicitud bono', tipo: 'Flexible' }, { nombre: 'Solicitud de Pre Ingreso', tipo: 'Pre-Ingreso' },
  { nombre: 'Cambio de cargo', tipo: 'Movimiento' }, { nombre: 'Cambio de sueldo', tipo: 'Movimiento' },
  { nombre: 'Baja voluntaria', tipo: 'Baja' }, { nombre: 'Solicitud de activo', tipo: 'Flexible' },
];
