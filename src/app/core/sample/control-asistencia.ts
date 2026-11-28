import { Tone } from '../models';

/** Clock time of the sample "now" on FECHA_CORTE (16/03/2026, a Monday). */
export const HORA_CORTE = '11:45';
/** First day with punches in the sample data. */
export const INICIO_MARCAS = '01/02/2026';

/** Workplace (recinto). Collaborators belong to one main recinto; users may administer several. */
export interface Recinto {
  id: number;
  nombre: string;
  empresa: string;
  ruc: string;
  codigoInterno: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  clave: string;
  info: string;
  jefaturaId: number | null;
  administrativoId: number | null;
  lat: number;
  lng: number;
  /** Punches from the app farther than this are rejected (marca fallida). */
  radio: number;
  /** Up to 5 addresses that receive the recinto alerts. */
  emails: string[];
  activo: boolean;
  /** Collaborators (users) with access to this recinto in Control de Asistencia. */
  usuarios: number[];
}

export type TipoContrato = 'Indefinido' | 'Plazo fijo' | 'Convenio de prácticas';

export type TipoTurno = 'Permanente' | 'Transitorio' | 'Flexible' | 'Rotativo';
export type JornadaTurno = 'Diurno' | 'Nocturno' | 'Mixto';
export interface Turno {
  id: number;
  nombre: string;
  sigla: string;
  tipo: TipoTurno;
  jornada: JornadaTurno;
  entrada: string;
  salida: string;
  /** Unpaid meal break, minutes. */
  colacion: number;
  /** Working weekdays (0 = Sunday). Rotating shifts use the cycle instead. */
  dias: number[];
  /** Late arrival tolerance, minutes. */
  tolerancia: number;
  color: string;
  /** Rotating shifts: days on and days off. */
  ciclo?: { trabajo: number; descanso: number };
  activo: boolean;
}

export const COLORES_TURNO = ['#D6E4FF', '#C7F1AF', '#FFE8A3', '#E9DDFF', '#FFDDE7', '#CDEFF2', '#ECEEF2'];

/** Base shift of a collaborator for a date range ('' = permanent). */
export interface AsignacionTurno {
  id: number;
  colaboradorId: number;
  turnoId: number;
  desde: string;
  hasta: string;
  /** Rotating shifts: first day of the cycle. */
  cicloInicio?: string;
  creadoPor: string;
}

/** One-day change on top of the base shift: another shift or a rest code. */
export type CodigoDia = 'DES' | 'LIB' | 'COMP';
export const CODIGOS_DIA: Record<CodigoDia, string> = { DES: 'Descanso', LIB: 'Libre', COMP: 'Compensado' };
export interface CambioTurno { colaboradorId: number; fecha: string; valor: number | CodigoDia; creadoPor: string; }

export type MetodoMarca = 'Web' | 'App' | 'QR' | 'Foto' | 'Manual';
export interface Marca {
  id: number;
  colaboradorId: number;
  recintoId: number;
  fecha: string;
  hora: string;
  tipo: 'Entrada' | 'Salida';
  metodo: MetodoMarca;
  lat: number;
  lng: number;
  dentroRadio: boolean;
  foto: boolean;
  observacion: string;
  /** Who registered a manual mark, and why. */
  creadoPor?: string;
  motivo?: string;
  /** Meters from the site and GPS accuracy, for punches with the real device location. */
  distancia?: number | null;
  precision?: number | null;
}

export type MotivoFallida = 'Fuera del radio' | 'Sin foto' | 'Sin turno asignado' | 'Método no permitido';
export interface MarcaFallida {
  id: number; colaboradorId: number; recintoId: number; fecha: string; hora: string; tipo: 'Entrada' | 'Salida'; metodo: MetodoMarca;
  motivo: MotivoFallida; distancia?: number;
}

export type EstadoJornada = 'Asistencia' | 'Inasistencia' | 'Descanso' | 'Permiso' | 'Licencia' | 'Vacaciones' | 'Feriado' | 'Incompleta';
export const ESTADO_JORNADA_TONE: Record<EstadoJornada, Tone> = {
  Asistencia: 'success', Inasistencia: 'orange', Descanso: 'gray', Permiso: 'info', Licencia: 'info', Vacaciones: 'info', Feriado: 'gray', Incompleta: 'warning',
};

export type EstadoHhee = 'En espera' | 'Aprobado' | 'Aprobado parcial' | 'Rechazado';
export const ESTADO_HHEE_TONE: Record<EstadoHhee, Tone> = { 'En espera': 'info', Aprobado: 'success', 'Aprobado parcial': 'orange', Rechazado: 'danger' };
export type TipoHhee = 25 | 35 | 100;
export interface LineaHhee { minutos: number; tipo: TipoHhee; }
export interface AprobacionHhee {
  estado: EstadoHhee;
  lineas: LineaHhee[];
  observacion: string;
  aprobadoPor: string;
  enviado: boolean;
}

export interface NotaSupervisor { id: number; colaboradorId: number; fecha: string; texto: string; autor: string; }
