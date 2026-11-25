import { Tone } from '../models';

/** Today (dd/MM/yyyy) until the API sends the company's cut-off date (the real date outside development). */
export const FECHA_CORTE = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Peru: 30 calendar days of vacation per full year of service (D. Leg. 713). */
export const DIAS_VACACIONES_ANUALES = 30;

/** Nexo RH started tracking vacations on this date; earlier history came in as an opening balance (Importador). */
export const FECHA_SALDO_INICIAL = '01/01/2025';

export interface Vacacion {
  id: number;
  colaboradorId: number;
  /** dd/MM/yyyy */
  desde: string;
  hasta: string;
  /** Calendar days. */
  dias: number;
  origen: 'Solicitud' | 'Registro manual' | 'Importador';
  observacion: string;
}

export type TipoAusencia =
  | 'Descanso médico' | 'Licencia por paternidad' | 'Licencia por maternidad' | 'Licencia por fallecimiento'
  | 'Permiso con goce' | 'Permiso sin goce' | 'Falta injustificada';

export const TIPOS_AUSENCIA: TipoAusencia[] = [
  'Descanso médico', 'Licencia por paternidad', 'Licencia por maternidad', 'Licencia por fallecimiento',
  'Permiso con goce', 'Permiso sin goce', 'Falta injustificada',
];

/** Whether the absence is paid by the employer (affects payroll). */
export const AUSENCIA_CON_GOCE: Record<TipoAusencia, boolean> = {
  'Descanso médico': true, 'Licencia por paternidad': true, 'Licencia por maternidad': true, 'Licencia por fallecimiento': true,
  'Permiso con goce': true, 'Permiso sin goce': false, 'Falta injustificada': false,
};

export interface Ausencia {
  id: number;
  colaboradorId: number;
  tipo: TipoAusencia;
  desde: string;
  hasta: string;
  dias: number;
  observacion: string;
}

export type EstadoLicencia = 'Recibida' | 'Validada' | 'Observada' | 'Rechazada';
export const ESTADO_LICENCIA_TONE: Record<EstadoLicencia, Tone> = { Recibida: 'info', Validada: 'success', Observada: 'warning', Rechazada: 'danger' };

/** Electronic medical certificate (CITT EsSalud or private clinic). */
export interface LicenciaMedica {
  id: number;
  folio: string;
  colaboradorId: number;
  emisor: string;
  diagnostico: string;
  desde: string;
  hasta: string;
  dias: number;
  estado: EstadoLicencia;
  recibida: string;
  /** Absence created in Gestión de Ausencia once validated. */
  ausenciaId?: number;
}

export type TipoSolicitudAsistencia = 'Vacaciones' | 'Permiso con goce' | 'Permiso sin goce';
export type EstadoSolicitudAsistencia = 'Pendiente' | 'Aprobada' | 'Rechazada';
export const ESTADO_SOL_ASIS_TONE: Record<EstadoSolicitudAsistencia, Tone> = { Pendiente: 'warning', Aprobada: 'success', Rechazada: 'danger' };

export interface SolicitudAsistencia {
  id: number;
  colaboradorId: number;
  tipo: TipoSolicitudAsistencia;
  desde: string;
  hasta: string;
  dias: number;
  motivo: string;
  creada: string;
  estado: EstadoSolicitudAsistencia;
  aprobador: string;
  comentario: string;
}

export interface Feriado { fecha: string; nombre: string; }

/** Peru national holidays 2026 (Ley 31788 & calendario oficial). */
export const FERIADOS_2026: Feriado[] = [
  { fecha: '01/01/2026', nombre: 'Año Nuevo' },
  { fecha: '02/04/2026', nombre: 'Jueves Santo' },
  { fecha: '03/04/2026', nombre: 'Viernes Santo' },
  { fecha: '01/05/2026', nombre: 'Día del Trabajo' },
  { fecha: '07/06/2026', nombre: 'Batalla de Arica y Día de la Bandera' },
  { fecha: '29/06/2026', nombre: 'San Pedro y San Pablo' },
  { fecha: '23/07/2026', nombre: 'Día de la Fuerza Aérea del Perú' },
  { fecha: '28/07/2026', nombre: 'Fiestas Patrias' },
  { fecha: '29/07/2026', nombre: 'Fiestas Patrias' },
  { fecha: '06/08/2026', nombre: 'Batalla de Junín' },
  { fecha: '30/08/2026', nombre: 'Santa Rosa de Lima' },
  { fecha: '08/10/2026', nombre: 'Combate de Angamos' },
  { fecha: '01/11/2026', nombre: 'Todos los Santos' },
  { fecha: '08/12/2026', nombre: 'Inmaculada Concepción' },
  { fecha: '09/12/2026', nombre: 'Batalla de Ayacucho' },
  { fecha: '25/12/2026', nombre: 'Navidad' },
];

const v = (id: number, colaboradorId: number, desde: string, hasta: string, dias: number, origen: Vacacion['origen'] = 'Solicitud', observacion = ''): Vacacion =>
  ({ id, colaboradorId, desde, hasta, dias, origen, observacion });

/** Vacations taken or scheduled since FECHA_SALDO_INICIAL. */

const a = (id: number, colaboradorId: number, tipo: TipoAusencia, desde: string, hasta: string, dias: number, observacion = ''): Ausencia =>
  ({ id, colaboradorId, tipo, desde, hasta, dias, observacion });

/** Settings edited in Asistencia › Configuraciones; the other attendance screens read them. */
export interface ConfigAsistencia {
  /** Balance above which a collaborator is flagged in Vacaciones. */
  umbralSaldo: number;
  /** Allow registering vacations beyond the accrued balance (adelanto de vacaciones by agreement). */
  permitirAdelanto: boolean;
  /** Minimum days in advance for a new request. */
  anticipacionDias: number;
  /** Surcharge for working on the weekly rest day or a holiday without a substitute rest day, in %. */
  sobretasaDomingo: number;
  /** Hours of the daily shift, used for the hourly value. */
  horasJornada: number;
}

/** A rest day (Sunday) or holiday worked. */
export interface RecargoDomingo {
  id: number;
  colaboradorId: number;
  fecha: string;
  horas: number;
  /** When the company grants another rest day instead, there is no surcharge. */
  descansoSustitutorio: boolean;
  observacion: string;
}
