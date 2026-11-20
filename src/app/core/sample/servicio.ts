export type EstadoTicket = 'Abierto' | 'En proceso' | 'Resuelto';
export type CategoriaTicket = 'Remuneraciones' | 'Vacaciones y asistencia' | 'Beneficios' | 'Documentos' | 'Otros';

export interface MensajeTicket { autor: string; rrhh: boolean; fecha: string; texto: string; }
export interface Ticket {
  id: number;
  asunto: string;
  categoria: CategoriaTicket;
  colaborador: string;
  /** dd/MM/yyyy HH:mm */
  abierto: string;
  estado: EstadoTicket;
  asignado: string;
  mensajes: MensajeTicket[];
}

/** Questions collaborators send through "Servicio al colaborador" (chat in Mi Portal). Mutable sample data. */
export const TICKETS: Ticket[] = [
  { id: 412, asunto: '¿Cuándo se paga la gratificación de julio?', categoria: 'Remuneraciones', colaborador: 'Ortiz Ramírez, Daniela', abierto: '16/03/2026 09:12',
    estado: 'Abierto', asignado: '', mensajes: [
      { autor: 'Ortiz Ramírez, Daniela', rrhh: false, fecha: '16/03/2026 09:12', texto: 'Hola, ingresé en marzo. ¿Me corresponde gratificación en julio y cuánto sería aproximadamente?' },
    ] },
  { id: 411, asunto: 'Mi boleta de febrero no muestra las horas extras', categoria: 'Remuneraciones', colaborador: 'Gutiérrez Paredes, Javier', abierto: '13/03/2026 18:40',
    estado: 'En proceso', asignado: 'Lucía Cáceres', mensajes: [
      { autor: 'Gutiérrez Paredes, Javier', rrhh: false, fecha: '13/03/2026 18:40', texto: 'Trabajé 6 horas extras el 21/02 por inventario y no aparecen en la boleta.' },
      { autor: 'Lucía Cáceres', rrhh: true, fecha: '14/03/2026 10:05', texto: 'Hola Javier, lo estamos revisando con tu jefatura. Te confirmamos hoy.' },
    ] },
  { id: 409, asunto: 'Cambio de cuenta bancaria', categoria: 'Documentos', colaborador: 'Zapata Ugarte, Miguel', abierto: '11/03/2026 12:20',
    estado: 'Abierto', asignado: '', mensajes: [
      { autor: 'Zapata Ugarte, Miguel', rrhh: false, fecha: '11/03/2026 12:20', texto: 'Abrí una cuenta en otro banco. ¿Qué necesito para que me depositen ahí desde abril?' },
    ] },
  { id: 405, asunto: 'Saldo de vacaciones', categoria: 'Vacaciones y asistencia', colaborador: 'Medina Torres, Sofía', abierto: '05/03/2026 08:55',
    estado: 'Resuelto', asignado: 'Rodrigo Paredes', mensajes: [
      { autor: 'Medina Torres, Sofía', rrhh: false, fecha: '05/03/2026 08:55', texto: '¿Cuántos días de vacaciones tengo disponibles?' },
      { autor: 'Rodrigo Paredes', rrhh: true, fecha: '05/03/2026 11:30', texto: 'Hola Sofía, puedes verlo en Mi Portal › Portal, en "Vacaciones disponibles". Al 16/03 tienes 29 días.' },
    ] },
];
