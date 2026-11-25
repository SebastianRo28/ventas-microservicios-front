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
