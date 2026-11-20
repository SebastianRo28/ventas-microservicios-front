import { Tone } from '../models';

/**
 * Sample data for Gestión de Activos › Órdenes (P-06.5) and Configuraciones (P-06.1),
 * Canal de denuncias › Denuncias (P-07.5) and Encuestas › Libre (P-13.1).
 */

export type EstadoOrden = 'Pendiente' | 'Atrasado' | 'Asignada' | 'Rechazada';
export const ESTADO_ORDEN_TONE: Record<EstadoOrden, Tone> = { Pendiente: 'warning', Atrasado: 'warning', Asignada: 'success', Rechazada: 'danger' };

export interface OrdenActivo {
  id: number; origen: string; producto: string; categoria: string; para: string; area: string; cargo: string;
  solicitante: string; solicitada: string; asignarEl: string; estado: EstadoOrden;
}

const o = (id: number, origen: string, producto: string, categoria: string, para: string, area: string, cargo: string,
  solicitante: string, solicitada: string, asignarEl: string, estado: EstadoOrden): OrdenActivo =>
  ({ id, origen, producto, categoria, para, area, cargo, solicitante, solicitada, asignarEl, estado });
const WF = 'Workflow', GA = 'Gestión de activos';

export const ORDENES: OrdenActivo[] = [
  o(118, WF, 'Laptop ThinkPad E14 Gen 5', 'Computadores', 'Ortiz Ramírez, Daniela', 'Recursos Humanos', 'Practicante Profesional', 'Cáceres Huamán, Lucía', '24/02/2026', '01/03/2026', 'Atrasado'),
  o(121, GA, 'Zapatos de seguridad T42', 'EPP', 'Gutiérrez Paredes, Javier', 'Logística', 'Asistente de Almacén', 'Benavides Rojas, Diego', '10/03/2026', '20/03/2026', 'Pendiente'),
  o(122, WF, 'Celular Galaxy A54', 'Tecnología', 'Salas Cornejo, Mateo', 'Logística', 'Asistente de Almacén', 'Rodrigo Paredes', '11/03/2026', '01/04/2026', 'Pendiente'),
  o(124, GA, 'Monitor 24" P2422H', 'Tecnología', 'Chávez Quispe, Renato', 'Desarrollo', 'Desarrollador Senior', 'Chávez Quispe, Renato', '15/03/2026', '25/03/2026', 'Pendiente'),
  o(109, GA, 'MacBook Air 13"', 'Computadores', 'Herrera Castillo, Valeria', 'Desarrollo', 'Diseñadora UX', 'Rodrigo Paredes', '07/02/2025', '10/02/2025', 'Asignada'),
  o(112, WF, 'Camioneta Hilux', 'Transporte', 'Benavides Rojas, Diego', 'Logística', 'Jefe de Operaciones', 'Benavides Rojas, Diego', '05/01/2026', '15/01/2026', 'Rechazada'),
];

export interface Categoria { id: number; nombre: string; }
export interface Producto { id: number; nombre: string; categoria: string; marca: string; activos: number; }

export const CATEGORIAS: Categoria[] = ['Uniformes', 'Tecnología', 'Construcción', 'Licencias', 'Transporte', 'EPP', 'Computadores', 'Mobiliario', 'Telefonía']
  .map((nombre, i) => ({ id: i + 1, nombre }));

const p = (id: number, nombre: string, categoria: string, marca: string, activos: number): Producto => ({ id, nombre, categoria, marca, activos });
export const PRODUCTOS: Producto[] = [
  p(0, 'Laptop ThinkPad E14 Gen 5', 'Computadores', 'Lenovo', 4),
  p(1, 'MacBook Air 13"', 'Computadores', 'Apple', 1),
  p(2, 'Monitor 24" P2422H', 'Tecnología', 'Dell', 2),
  p(3, 'Celular Galaxy A54', 'Tecnología', 'Samsung', 2),
  p(4, 'Casco de seguridad', 'EPP', '3M', 1),
  p(5, 'Chaleco reflectivo', 'EPP', 'Steelpro', 1),
  p(6, 'Zapatos de seguridad T42', 'EPP', 'Caterpillar', 1),
  p(7, 'Polo corporativo M', 'Uniformes', 'Comercial Andina', 1),
  p(8, 'Licencia Microsoft 365', 'Licencias', 'Microsoft', 1),
  p(9, 'Camioneta Hilux', 'Transporte', 'Toyota', 1),
  p(10, 'Taladro percutor', 'Construcción', 'Bosch', 1),
];

export type EstadoDenuncia = 'Nueva' | 'En curso' | 'Finalizada' | 'Descartada';
export const ESTADO_DENUNCIA_TONE: Record<EstadoDenuncia, Tone> = { Nueva: 'warning', 'En curso': 'info', Finalizada: 'success', Descartada: 'danger' };

export interface Denuncia { acceso: string; mensajes: number; tipo: string; relacion: string; creada: string; estado: EstadoDenuncia; actualizada: string; }

export const DENUNCIAS: Denuncia[] = [
  { acceso: '350197411370', mensajes: 1, tipo: 'Acoso laboral', relacion: 'Colaborador', creada: '17/03/2026', estado: 'En curso', actualizada: '19/03/2026' },
  { acceso: '406042314536', mensajes: 2, tipo: 'Discriminación', relacion: 'Colaborador', creada: '18/03/2026', estado: 'Nueva', actualizada: '18/03/2026' },
  { acceso: '512903847261', mensajes: 0, tipo: 'Conflicto de intereses', relacion: 'Proveedor', creada: '11/03/2026', estado: 'En curso', actualizada: '15/03/2026' },
  { acceso: '208374615920', mensajes: 0, tipo: 'Hurto o robo', relacion: 'Contratista', creada: '04/03/2026', estado: 'Nueva', actualizada: '04/03/2026' },
  { acceso: '109283746501', mensajes: 0, tipo: 'Carga de trabajo', relacion: 'Colaborador', creada: '12/01/2026', estado: 'Finalizada', actualizada: '20/02/2026' },
  { acceso: '774102938465', mensajes: 0, tipo: 'Información confidencial', relacion: 'Otro', creada: '05/12/2025', estado: 'Descartada', actualizada: '10/12/2025' },
];

export type EstadoEncuesta = 'Pendiente' | 'En curso' | 'Finalizada';
export const ESTADO_ENCUESTA_TONE: Record<EstadoEncuesta, Tone> = { Pendiente: 'warning', 'En curso': 'info', Finalizada: 'success' };

export interface Encuesta { id: number; nombre: string; creada: string; inicio: string; termino: string; participantes: number; estado: EstadoEncuesta; avance: number; }

export const ENCUESTAS: Encuesta[] = [
  { id: 0, nombre: 'Buzón de sugerencias 2026', creada: '05/01/2026', inicio: '06/01/2026', termino: '31/12/2026', participantes: 16, estado: 'En curso', avance: 44 },
  { id: 1, nombre: 'Evaluación de la inducción', creada: '20/02/2026', inicio: '01/03/2026', termino: '31/03/2026', participantes: 4, estado: 'En curso', avance: 75 },
  { id: 2, nombre: 'Valoración de beneficios', creada: '10/03/2026', inicio: '23/03/2026', termino: '06/04/2026', participantes: 16, estado: 'Pendiente', avance: 0 },
  { id: 3, nombre: 'Percepción de seguridad laboral', creada: '01/02/2026', inicio: '05/02/2026', termino: '20/02/2026', participantes: 9, estado: 'Finalizada', avance: 89 },
  { id: 4, nombre: 'Salida voluntaria', creada: '01/01/2026', inicio: '01/01/2026', termino: '31/12/2026', participantes: 1, estado: 'En curso', avance: 100 },
  { id: 5, nombre: 'Estrés laboral', creada: '02/12/2025', inicio: '05/12/2025', termino: '19/12/2025', participantes: 15, estado: 'Finalizada', avance: 80 },
];

export const PLANTILLAS_ENCUESTA = ['En blanco', 'Onboarding', 'Salida voluntaria', 'Evaluación del Área', 'Percepción de seguridad laboral',
  'Buzón de sugerencias', 'Valoración de beneficios', 'Estrés laboral', 'Evaluación de la inducción', 'Teletrabajo'];
