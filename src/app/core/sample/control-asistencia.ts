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

const EMP = 'Comercial Andina S.A.C.';
const RUC = '20601234571';
export const RECINTOS: Recinto[] = [
  { id: 1, nombre: 'Sede Central · San Isidro', empresa: EMP, ruc: RUC, codigoInterno: 'CA-001', pais: 'Perú', departamento: 'Lima', provincia: 'Lima', distrito: 'San Isidro',
    direccion: 'Av. Javier Prado Este 1234', clave: 'SC-01', info: 'Ingreso por recepción, piso 8. Estacionamiento en sótano 2.', jefaturaId: 11, administrativoId: 2,
    lat: -12.0912, lng: -77.0225, radio: 150, emails: ['asistencia@comercialandina.pe'], activo: true, usuarios: [2, 11, 5] },
  { id: 2, nombre: 'Almacén Lurín', empresa: EMP, ruc: RUC, codigoInterno: 'CA-002', pais: 'Perú', departamento: 'Lima', provincia: 'Lima', distrito: 'Lurín',
    direccion: 'Mz. B Lt. 5, Parque Industrial', clave: 'AL-02', info: 'Turno de mañana. Uso obligatorio de EPP.', jefaturaId: 1, administrativoId: 2,
    lat: -12.2745, lng: -76.871, radio: 250, emails: ['almacen@comercialandina.pe', 'd.benavides@comercialandina.pe'], activo: true, usuarios: [1, 2, 13] },
  { id: 3, nombre: 'Tienda Miraflores', empresa: EMP, ruc: RUC, codigoInterno: 'CA-003', pais: 'Perú', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores',
    direccion: 'Av. Larco 455', clave: 'TM-03', info: 'Horario de tienda de 10:00 a 21:00.', jefaturaId: 9, administrativoId: 2,
    lat: -12.1218, lng: -77.0302, radio: 80, emails: ['miraflores@comercialandina.pe'], activo: true, usuarios: [9, 2] },
  { id: 4, nombre: 'Centro de distribución Callao', empresa: EMP, ruc: RUC, codigoInterno: 'CA-004', pais: 'Perú', departamento: 'Callao', provincia: 'Callao', distrito: 'Callao',
    direccion: 'Av. Néstor Gambetta 3450', clave: 'CD-04', info: 'Cerrado temporalmente desde enero de 2026.', jefaturaId: null, administrativoId: null,
    lat: -12.013, lng: -77.118, radio: 200, emails: [], activo: false, usuarios: [2] },
];

/** Main recinto of each collaborator (job.location_id). */
export const RECINTO_PRINCIPAL: Record<number, number> = {
  0: 1, 2: 1, 3: 1, 5: 1, 6: 1, 8: 1, 10: 1, 11: 1, 12: 1, 14: 1, 15: 1, 1: 2, 7: 2, 13: 2, 4: 3, 9: 3,
};

export type TipoContrato = 'Indefinido' | 'Plazo fijo' | 'Convenio de prácticas';
export const CONTRATOS: Record<number, TipoContrato> = { 7: 'Plazo fijo', 8: 'Plazo fijo', 10: 'Plazo fijo', 15: 'Plazo fijo', 12: 'Convenio de prácticas' };
/** Collaborators allowed to punch from the mobile app. */
export const USA_APP = new Set([1, 4, 7, 9, 13, 15]);

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
const LV = [1, 2, 3, 4, 5];
export const TURNOS: Turno[] = [
  { id: 1, nombre: 'Administrativo', sigla: 'ADM', tipo: 'Permanente', jornada: 'Diurno', entrada: '08:30', salida: '18:00', colacion: 60, dias: LV, tolerancia: 10, color: '#D6E4FF', activo: true },
  { id: 2, nombre: 'Almacén mañana', sigla: 'ALM', tipo: 'Permanente', jornada: 'Diurno', entrada: '07:00', salida: '15:30', colacion: 45, dias: [1, 2, 3, 4, 5, 6], tolerancia: 5, color: '#C7F1AF', activo: true },
  { id: 3, nombre: 'Tienda rotativo', sigla: 'TR', tipo: 'Rotativo', jornada: 'Diurno', entrada: '11:00', salida: '20:00', colacion: 60, dias: [0, 1, 2, 3, 4, 5, 6], tolerancia: 10, color: '#FFE8A3', ciclo: { trabajo: 5, descanso: 2 }, activo: true },
  { id: 4, nombre: 'Flexible tecnología', sigla: 'FLX', tipo: 'Flexible', jornada: 'Diurno', entrada: '09:00', salida: '18:00', colacion: 60, dias: LV, tolerancia: 30, color: '#E9DDFF', activo: true },
  { id: 5, nombre: 'Prácticas', sigla: 'PRA', tipo: 'Permanente', jornada: 'Diurno', entrada: '09:00', salida: '15:00', colacion: 0, dias: LV, tolerancia: 10, color: '#FFDDE7', activo: true },
  { id: 6, nombre: 'Nocturno almacén', sigla: 'NOC', tipo: 'Permanente', jornada: 'Nocturno', entrada: '22:00', salida: '06:00', colacion: 45, dias: LV, tolerancia: 5, color: '#ECEEF2', activo: false },
];

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
const at = (id: number, colaboradorId: number, turnoId: number, desde: string, cicloInicio?: string): AsignacionTurno =>
  ({ id, colaboradorId, turnoId, desde, hasta: '', cicloInicio, creadoPor: 'Lucía Cáceres' });
export const ASIGNACIONES_TURNO: AsignacionTurno[] = [
  ...[0, 2, 5, 6, 10, 11, 14].map((c, i) => at(i + 1, c, 1, '01/01/2026')),
  ...[3, 8, 15].map((c, i) => at(i + 10, c, 4, '01/01/2026')),
  ...[1, 7, 13].map((c, i) => at(i + 20, c, 2, '01/01/2026')),
  at(30, 4, 3, '01/01/2026', '29/12/2025'), at(31, 9, 3, '01/01/2026', '31/12/2025'),
  at(40, 12, 5, '03/03/2026'),
];

/** One-day change on top of the base shift: another shift or a rest code. */
export type CodigoDia = 'DES' | 'LIB' | 'COMP';
export const CODIGOS_DIA: Record<CodigoDia, string> = { DES: 'Descanso', LIB: 'Libre', COMP: 'Compensado' };
export interface CambioTurno { colaboradorId: number; fecha: string; valor: number | CodigoDia; creadoPor: string; }
export const CAMBIOS_TURNO: CambioTurno[] = [
  { colaboradorId: 1, fecha: '04/03/2026', valor: 'COMP', creadoPor: 'Lucía Cáceres' },
];

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
}

export type MotivoFallida = 'Fuera del radio' | 'Sin foto' | 'Sin turno asignado' | 'Método no permitido';
export interface MarcaFallida {
  id: number; colaboradorId: number; recintoId: number; fecha: string; hora: string; tipo: 'Entrada' | 'Salida'; metodo: MetodoMarca;
  motivo: MotivoFallida; distancia?: number;
}
export const MARCAS_FALLIDAS: MarcaFallida[] = [
  { id: 1, colaboradorId: 7, recintoId: 2, fecha: '12/03/2026', hora: '06:58', tipo: 'Entrada', metodo: 'App', motivo: 'Fuera del radio', distancia: 412 },
  { id: 2, colaboradorId: 4, recintoId: 3, fecha: '14/03/2026', hora: '10:55', tipo: 'Entrada', metodo: 'App', motivo: 'Sin foto' },
  { id: 3, colaboradorId: 12, recintoId: 1, fecha: '02/03/2026', hora: '08:57', tipo: 'Entrada', metodo: 'Web', motivo: 'Sin turno asignado' },
  { id: 4, colaboradorId: 15, recintoId: 1, fecha: '16/03/2026', hora: '08:41', tipo: 'Entrada', metodo: 'App', motivo: 'Fuera del radio', distancia: 6830 },
  { id: 5, colaboradorId: 13, recintoId: 2, fecha: '10/03/2026', hora: '15:41', tipo: 'Salida', metodo: 'Foto', motivo: 'Método no permitido' },
];

/** Manual marks registered by RR.HH. (they replace the generated punch of that day and type). */
export const MARCAS_MANUALES: Omit<Marca, 'id' | 'lat' | 'lng' | 'dentroRadio' | 'foto' | 'recintoId'>[] = [
  { colaboradorId: 6, fecha: '11/03/2026', hora: '18:05', tipo: 'Salida', metodo: 'Manual', observacion: '', creadoPor: 'Lucía Cáceres', motivo: 'Olvidó marcar la salida' },
  { colaboradorId: 11, fecha: '04/03/2026', hora: '08:20', tipo: 'Entrada', metodo: 'Manual', observacion: '', creadoPor: 'Lucía Cáceres', motivo: 'Reunión externa a primera hora' },
  { colaboradorId: 13, fecha: '10/03/2026', hora: '15:40', tipo: 'Salida', metodo: 'Manual', observacion: '', creadoPor: 'Diego Benavides', motivo: 'Marca con foto rechazada (método no permitido)' },
];

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
export const NOTAS_SUPERVISOR: NotaSupervisor[] = [
  { id: 1, colaboradorId: 7, fecha: '12/03/2026', texto: 'La app marcó fuera del radio en la puerta 2; se pidió ampliar el radio del almacén.', autor: 'Benavides Rojas, Diego' },
  { id: 2, colaboradorId: 10, fecha: '10/03/2026', texto: 'Dos lunes sin marcar. Se conversó con ella; presentará sustento.', autor: 'Espinoza Vargas, Martín' },
  { id: 3, colaboradorId: 9, fecha: '06/03/2026', texto: 'Llegadas tarde por cierre de tienda del día anterior. Ajustar turno los sábados.', autor: 'Espinoza Vargas, Martín' },
];
