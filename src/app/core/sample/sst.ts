import { Tone } from '../models';

/**
 * Sample data for SST › Requisitos (P-11.1/P-11.2), SST › Cumplimientos (P-11.3),
 * Encuestas › Clima (P-13.6) and Comunicaciones › Correos (P-12.6).
 */

export interface Requisito {
  id: number; nombre: string; cumplimiento: string; aplicaA: 'Colaboradores' | 'Empresas';
  asignaciones: number; sinEvidencia: number; vigentes: number; vencidas: number; actualizado: string;
}

const r = (id: number, nombre: string, cumplimiento: string, aplicaA: Requisito['aplicaA'], asignaciones: number,
  sinEvidencia: number, vigentes: number, vencidas: number, actualizado: string): Requisito =>
  ({ id, nombre, cumplimiento, aplicaA, asignaciones, sinEvidencia, vigentes, vencidas, actualizado });
const C = 'Colaboradores', E = 'Empresas';

export const REQUISITOS: Requisito[] = [
  r(0, 'Chaleco de seguridad', 'Entrega de EPP', C, 14, 2, 10, 2, '18/03/2026'),
  r(1, 'Casco de seguridad', 'Entrega de EPP', C, 14, 1, 12, 1, '17/03/2026'),
  r(2, 'Zapatos de seguridad', 'Entrega de EPP', C, 14, 3, 11, 0, '16/03/2026'),
  r(3, 'Examen médico ocupacional', 'Vigilancia de la salud', C, 16, 4, 9, 3, '15/03/2026'),
  r(4, 'Inducción en SST', 'Capacitaciones obligatorias', C, 16, 0, 16, 0, '14/03/2026'),
  r(5, 'Plan anual de capacitaciones', 'Programa anual de SST', E, 1, 0, 1, 0, '13/03/2026'),
  r(6, 'IPERC actualizado', 'Gestión de riesgos', E, 1, 0, 0, 1, '12/03/2026'),
  r(7, 'Reglamento interno de SST', 'Sistema de gestión de SST', E, 1, 0, 1, 0, '11/03/2026'),
  r(8, 'Simulacro de evacuación', 'Preparación ante emergencias', E, 2, 1, 1, 0, '10/03/2026'),
  r(9, 'Registro de accidentes de trabajo', 'Registros obligatorios', E, 1, 0, 1, 0, '09/03/2026'),
  r(10, 'Capacitación en trabajos en altura', 'Capacitaciones obligatorias', C, 4, 1, 2, 1, '08/03/2026'),
  r(11, 'SCTR vigente', 'Seguros obligatorios', C, 16, 0, 15, 1, '07/03/2026'),
];

export type EstadoEvidencia = 'Vigente' | 'Por vencer' | 'Vencida' | 'Sin evidencia';
export const ESTADO_EVIDENCIA_TONE: Record<EstadoEvidencia, Tone> = { Vigente: 'success', 'Por vencer': 'warning', Vencida: 'danger', 'Sin evidencia': 'gray' };

export interface AsignacionSst {
  id: number; requisito: string; titular: string; colaboradorId?: number; estado: EstadoEvidencia;
  cumplimiento: string; documento?: string; cargo?: string; area?: string; actualizado: string;
}

const ac = (id: number, requisito: string, titular: string, colaboradorId: number, estado: EstadoEvidencia, cumplimiento: string,
  documento: string, cargo: string, area: string, actualizado: string): AsignacionSst =>
  ({ id, requisito, titular, colaboradorId, estado, cumplimiento, documento, cargo, area, actualizado });

export const ASIGNACIONES_COLABORADORES: AsignacionSst[] = [
  ac(0, 'Chaleco de seguridad', 'Alamos Ruiz, Florencia', 0, 'Vigente', 'Entrega de EPP', '72458193', 'Analista Finanzas', 'Finanzas', '17/03/2026'),
  ac(1, 'Examen médico ocupacional', 'Benavides Rojas, Diego', 1, 'Por vencer', 'Vigilancia de la salud', '70125864', 'Jefe de Operaciones', 'Logística', '16/03/2026'),
  ac(2, 'Casco de seguridad', 'Cáceres Huamán, Lucía', 2, 'Vigente', 'Entrega de EPP', '46892317', 'Analista de RR.HH.', 'Recursos Humanos', '15/03/2026'),
  ac(3, 'Examen médico ocupacional', 'Chávez Quispe, Renato', 3, 'Vencida', 'Vigilancia de la salud', '72011548', 'Desarrollador Senior', 'Desarrollo', '14/03/2026'),
  ac(4, 'Zapatos de seguridad', 'Delgado Salazar, Andrea', 4, 'Sin evidencia', 'Entrega de EPP', '45781236', 'Ejecutiva Comercial', 'Ventas', '13/03/2026'),
  ac(5, 'Inducción en SST', 'Espinoza Vargas, Martín', 5, 'Vigente', 'Capacitaciones obligatorias', '41236987', 'Gerente General', 'Gerencia General', '12/03/2026'),
  ac(6, 'Chaleco de seguridad', 'Flores Mendoza, Carolina', 6, 'Por vencer', 'Entrega de EPP', '73354120', 'Contadora', 'Contabilidad', '11/03/2026'),
  ac(7, 'SCTR vigente', 'Gutiérrez Paredes, Javier', 7, 'Vigente', 'Seguros obligatorios', '70458812', 'Asistente de Almacén', 'Logística', '10/03/2026'),
];

const EMP = 'Comercial Andina S.A.C.';
export const ASIGNACIONES_EMPRESAS: AsignacionSst[] = [
  { id: 0, requisito: 'Plan anual de capacitaciones', titular: EMP, estado: 'Vigente', cumplimiento: 'Programa anual de SST', actualizado: '10/03/2026' },
  { id: 1, requisito: 'IPERC actualizado', titular: EMP, estado: 'Vencida', cumplimiento: 'Gestión de riesgos', actualizado: '09/03/2026' },
  { id: 2, requisito: 'Reglamento interno de SST', titular: EMP, estado: 'Vigente', cumplimiento: 'Sistema de gestión de SST', actualizado: '08/03/2026' },
  { id: 3, requisito: 'Simulacro de evacuación', titular: EMP, estado: 'Por vencer', cumplimiento: 'Preparación ante emergencias', actualizado: '07/03/2026' },
];

export interface Cumplimiento {
  id: number; nombre: string; normativa: string; categoria: string;
  /** "vigentes/total" evidence for collaborators and companies. */
  colaboradores: [number, number]; empresas: [number, number]; descripcion: string; actualizado: string;
}

const cu = (id: number, nombre: string, normativa: string, categoria: string, colaboradores: [number, number],
  empresas: [number, number], actualizado: string): Cumplimiento =>
  ({ id, nombre, normativa, categoria, colaboradores, empresas, actualizado,
    descripcion: `Obligaciones de ${nombre.toLowerCase()} según la normativa vigente.` });

export const CUMPLIMIENTOS: Cumplimiento[] = [
  cu(0, 'Entrega de EPP', 'Ley N° 29783', 'Activos · Gestión de Riesgos', [35, 42], [0, 0], '16/03/2026'),
  cu(1, 'Vigilancia de la salud', 'D.S. N° 005-2012-TR', 'Gestión de Riesgos', [9, 16], [0, 0], '15/03/2026'),
  cu(2, 'Capacitaciones obligatorias', 'Ley N° 29783', 'Capacitaciones', [18, 20], [0, 0], '14/03/2026'),
  cu(3, 'Programa anual de SST', 'D.S. N° 005-2012-TR', 'General', [0, 0], [1, 1], '13/03/2026'),
  cu(4, 'Gestión de riesgos', 'ISO 45001', 'Gestión de Riesgos', [0, 0], [0, 1], '12/03/2026'),
  cu(5, 'Sistema de gestión de SST', 'Ley N° 29783', 'General', [0, 0], [1, 1], '11/03/2026'),
  cu(6, 'Preparación ante emergencias', 'D.S. N° 005-2012-TR', 'Incidentes', [0, 0], [1, 2], '10/03/2026'),
  cu(7, 'Registros obligatorios', 'R.M. N° 050-2013-TR', 'Incidentes · General', [0, 0], [1, 1], '09/03/2026'),
  cu(8, 'Seguros obligatorios', 'Ley N° 26790', 'General', [15, 16], [0, 0], '08/03/2026'),
];

export interface CumplimientoBiblioteca { id: number; pais: string; nombre: string; normativa: string; categoria: string; }

export const BIBLIOTECA_SST: CumplimientoBiblioteca[] = [
  ['Comité de SST', 'Ley N° 29783', 'General'],
  ['Registro de enfermedades ocupacionales', 'R.M. N° 050-2013-TR', 'Incidentes'],
  ['Mapa de riesgos', 'D.S. N° 005-2012-TR', 'Gestión de Riesgos'],
  ['Investigación de accidentes', 'D.S. N° 005-2012-TR', 'Incidentes'],
  ['Capacitaciones trimestrales en SST', 'Ley N° 29783', 'Capacitaciones'],
  ['Inventario de equipos de emergencia', 'D.S. N° 005-2012-TR', 'Activos'],
  ['Monitoreo de agentes físicos', 'D.S. N° 005-2012-TR', 'Gestión de Riesgos'],
  ['Auditoría del sistema de gestión', 'ISO 45001', 'General'],
  ['Política de SST firmada', 'Ley N° 29783', 'General'],
  ['Exámenes médicos de retiro', 'D.S. N° 005-2012-TR', 'Gestión de Riesgos'],
].map(([nombre, normativa, categoria], id) => ({ id, pais: 'Perú', nombre, normativa, categoria }));

export interface EncuestaClima { id: number; nombre: string; creada: string; inicio: string; termino: string; participantes: number; estado: 'Pendiente' | 'En curso' | 'Finalizada'; avance: number; }

export const ENCUESTAS_CLIMA: EncuestaClima[] = [
  { id: 0, nombre: 'Clima organizacional 2026', creada: '02/03/2026', inicio: '09/03/2026', termino: '31/03/2026', participantes: 16, estado: 'En curso', avance: 81 },
  { id: 1, nombre: 'Clima laboral 2025', creada: '01/10/2025', inicio: '06/10/2025', termino: '31/10/2025', participantes: 15, estado: 'Finalizada', avance: 93 },
  { id: 2, nombre: 'Pulso de clima · Operaciones', creada: '15/03/2026', inicio: '01/04/2026', termino: '15/04/2026', participantes: 9, estado: 'Pendiente', avance: 0 },
];

export interface OrigenClima { titulo: string; detalle: string; icono: string; validada: boolean; }
export const ORIGENES_CLIMA: OrigenClima[] = [
  { titulo: 'Clima organizacional by Nexo', detalle: '7 categorías · 42 preguntas', icono: 'shield', validada: true },
  { titulo: 'Clima laboral', detalle: '5 categorías · 25 preguntas', icono: 'shield', validada: true },
  { titulo: 'En blanco', detalle: 'Arma tus propias categorías', icono: 'plus', validada: false },
  { titulo: 'Encuesta anterior', detalle: 'Clima laboral 2025', icono: 'history', validada: false },
];

export interface CorreoAutomatico { id: number; nombre: string; tipo: string; autor: string; activo: boolean; hora: string; }
export const CORREOS: CorreoAutomatico[] = [
  { id: 0, nombre: 'Notificación de Cumpleaños', tipo: 'Cumpleaños', autor: 'Comunicaciones Internas', activo: true, hora: '09:00' },
  { id: 1, nombre: 'Saludo de Aniversario laboral', tipo: 'Aniversario', autor: 'Gestión de Personas', activo: true, hora: '09:00' },
  { id: 2, nombre: 'Saludo de Cumpleaños', tipo: 'Cumpleaños', autor: 'Comunicaciones Internas', activo: true, hora: '09:00' },
  { id: 3, nombre: 'Bienvenida', tipo: 'Ingreso', autor: 'Gestión de Personas', activo: false, hora: '09:00' },
];
