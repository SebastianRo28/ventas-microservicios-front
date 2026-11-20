import { Tone } from '../models';

/** Cut-off date of the sample company (periodo Marzo 2026); balances are computed at this date. */
export const FECHA_CORTE = '16/03/2026';

/** Peru: 30 calendar days of vacation per full year of service (D. Leg. 713). */
export const DIAS_VACACIONES_ANUALES = 30;

/** Nexo RH started tracking vacations on this date; earlier history came in as an opening balance (Importador). */
export const FECHA_SALDO_INICIAL = '01/01/2025';

/** Opening balance per collaborator at FECHA_SALDO_INICIAL, in days. Florencia's yields the 35.92 days shown in the design. */
export const SALDOS_INICIALES: Record<number, number> = {
  0: 43.84, 1: 45, 2: 15, 3: 20, 4: 4, 5: 30, 6: 30, 7: 3.62, 8: 0, 9: 12, 10: 0, 11: 40, 12: 0, 13: 5, 14: 0, 15: 0,
};

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
export const VACACIONES: Vacacion[] = [
  v(5501, 0, '02/01/2025', '16/01/2025', 15, 'Importador', 'Saldo período 2023-2024'),
  v(5502, 0, '15/07/2025', '29/07/2025', 15),
  v(5503, 0, '22/12/2025', '04/01/2026', 14),
  v(5504, 1, '03/02/2025', '02/03/2025', 28, 'Importador'),
  v(5505, 1, '01/09/2025', '30/09/2025', 30),
  v(5506, 1, '06/04/2026', '15/04/2026', 10, 'Solicitud', 'Programadas'),
  v(5507, 2, '14/07/2025', '27/07/2025', 14),
  v(5508, 2, '26/12/2025', '04/01/2026', 10),
  v(5509, 3, '05/01/2026', '25/01/2026', 21),
  v(5510, 3, '10/03/2026', '19/03/2026', 10, 'Solicitud', 'Viaje familiar'),
  v(5511, 4, '20/10/2025', '02/11/2025', 14),
  v(5512, 5, '06/01/2025', '04/02/2025', 30, 'Importador'),
  v(5513, 5, '05/01/2026', '19/01/2026', 15),
  v(5514, 6, '03/03/2025', '01/04/2025', 30, 'Importador'),
  v(5515, 6, '16/02/2026', '07/03/2026', 20),
  v(5516, 9, '04/08/2025', '23/08/2025', 20),
  v(5517, 9, '12/03/2026', '18/03/2026', 7, 'Registro manual', 'Regulariza días de febrero'),
  v(5518, 10, '02/02/2026', '08/02/2026', 7),
  v(5519, 11, '03/02/2025', '04/03/2025', 30, 'Importador'),
  v(5520, 11, '02/02/2026', '16/02/2026', 15),
  v(5521, 13, '08/09/2025', '22/09/2025', 15),
  v(5522, 14, '13/10/2025', '19/10/2025', 7),
  v(5523, 15, '04/05/2026', '10/05/2026', 7, 'Solicitud', 'Programadas'),
];

const a = (id: number, colaboradorId: number, tipo: TipoAusencia, desde: string, hasta: string, dias: number, observacion = ''): Ausencia =>
  ({ id, colaboradorId, tipo, desde, hasta, dias, observacion });

export const AUSENCIAS: Ausencia[] = [
  a(801, 0, 'Descanso médico', '23/02/2026', '06/03/2026', 12, 'CITT EsSalud A-2026-118734'),
  a(802, 7, 'Falta injustificada', '09/03/2026', '09/03/2026', 1, 'No se presentó al turno de mañana'),
  a(803, 13, 'Licencia por paternidad', '02/03/2026', '11/03/2026', 10, 'Ley 29409'),
  a(804, 8, 'Permiso con goce', '13/03/2026', '13/03/2026', 1, 'Trámite notarial'),
  a(805, 4, 'Descanso médico', '16/03/2026', '18/03/2026', 3, 'Clínica Internacional'),
  a(806, 15, 'Permiso sin goce', '20/02/2026', '20/02/2026', 1, 'Asunto personal'),
  a(807, 2, 'Licencia por fallecimiento', '26/01/2026', '30/01/2026', 5, 'Fallecimiento de familiar directo'),
];

export const LICENCIAS: LicenciaMedica[] = [
  { id: 1, folio: 'A-2026-118734', colaboradorId: 0, emisor: 'EsSalud · Hospital Rebagliati', diagnostico: 'Cirugía ambulatoria', desde: '23/02/2026', hasta: '06/03/2026', dias: 12, estado: 'Validada', recibida: '23/02/2026', ausenciaId: 801 },
  { id: 2, folio: 'CI-55120', colaboradorId: 4, emisor: 'Clínica Internacional', diagnostico: 'Faringitis aguda', desde: '16/03/2026', hasta: '18/03/2026', dias: 3, estado: 'Validada', recibida: '16/03/2026', ausenciaId: 805 },
  { id: 3, folio: 'A-2026-120455', colaboradorId: 1, emisor: 'EsSalud · Policlínico Chincha', diagnostico: 'Lumbalgia', desde: '17/03/2026', hasta: '23/03/2026', dias: 7, estado: 'Recibida', recibida: '16/03/2026' },
  { id: 4, folio: 'CR-80931', colaboradorId: 14, emisor: 'Clínica Ricardo Palma', diagnostico: 'Gastroenteritis', desde: '05/03/2026', hasta: '06/03/2026', dias: 2, estado: 'Observada', recibida: '09/03/2026' },
  { id: 5, folio: 'SP-11204', colaboradorId: 10, emisor: 'Consultorio particular', diagnostico: 'Migraña', desde: '27/02/2026', hasta: '27/02/2026', dias: 1, estado: 'Rechazada', recibida: '05/03/2026' },
];

export const SOLICITUDES_ASISTENCIA: SolicitudAsistencia[] = [
  { id: 3101, colaboradorId: 8, tipo: 'Vacaciones', desde: '20/03/2026', hasta: '27/03/2026', dias: 8, motivo: 'Viaje', creada: '11/03/2026', estado: 'Pendiente', aprobador: 'Rodrigo Paredes', comentario: '' },
  { id: 3102, colaboradorId: 12, tipo: 'Permiso con goce', desde: '19/03/2026', hasta: '19/03/2026', dias: 1, motivo: 'Sustentación de tesis', creada: '12/03/2026', estado: 'Pendiente', aprobador: 'Rodrigo Paredes', comentario: '' },
  { id: 3103, colaboradorId: 10, tipo: 'Vacaciones', desde: '13/04/2026', hasta: '24/04/2026', dias: 12, motivo: 'Descanso', creada: '13/03/2026', estado: 'Pendiente', aprobador: 'Rodrigo Paredes', comentario: '' },
  { id: 3104, colaboradorId: 7, tipo: 'Permiso sin goce', desde: '23/03/2026', hasta: '24/03/2026', dias: 2, motivo: 'Mudanza', creada: '14/03/2026', estado: 'Pendiente', aprobador: 'Rodrigo Paredes', comentario: '' },
  { id: 3095, colaboradorId: 3, tipo: 'Vacaciones', desde: '10/03/2026', hasta: '19/03/2026', dias: 10, motivo: 'Viaje familiar', creada: '20/02/2026', estado: 'Aprobada', aprobador: 'Rodrigo Paredes', comentario: 'Coordinado con su jefatura' },
  { id: 3090, colaboradorId: 9, tipo: 'Vacaciones', desde: '23/02/2026', hasta: '06/03/2026', dias: 12, motivo: 'Descanso', creada: '10/02/2026', estado: 'Rechazada', aprobador: 'Lucía Cáceres', comentario: 'Cierre de campaña; reprogramar' },
];

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

export const CONFIG_ASISTENCIA: ConfigAsistencia = {
  umbralSaldo: 30, permitirAdelanto: false, anticipacionDias: 3, sobretasaDomingo: 100, horasJornada: 8,
};

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

export const RECARGOS: RecargoDomingo[] = [
  { id: 1, colaboradorId: 7, fecha: '01/03/2026', horas: 8, descansoSustitutorio: false, observacion: 'Inventario mensual' },
  { id: 2, colaboradorId: 1, fecha: '01/03/2026', horas: 6, descansoSustitutorio: true, observacion: 'Inventario mensual · descansa el 04/03' },
  { id: 3, colaboradorId: 7, fecha: '08/03/2026', horas: 8, descansoSustitutorio: false, observacion: 'Recepción de mercadería' },
  { id: 4, colaboradorId: 15, fecha: '15/03/2026', horas: 4, descansoSustitutorio: false, observacion: 'Migración de servidores' },
  { id: 5, colaboradorId: 9, fecha: '15/02/2026', horas: 8, descansoSustitutorio: false, observacion: 'Campaña de verano' },
];

/** Collaborators paid by the day (jornal) instead of a monthly salary. */
export const JORNALES: Record<number, number> = { 7: 71.68 };
