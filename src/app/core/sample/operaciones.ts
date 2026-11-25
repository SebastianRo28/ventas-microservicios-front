import { Tone } from '../models';

/**
 * Sample data for Gestión de Activos › Órdenes (P-06.5) and Configuraciones (P-06.1),
 * Canal de denuncias › Denuncias (P-07.5) and Encuestas › Libre (P-13.1).
 */

export type EstadoOrden = 'Pendiente' | 'Atrasado' | 'Asignada' | 'Rechazada';

export interface OrdenActivo {
  id: number; origen: string; producto: string; categoria: string; para: string; area: string; cargo: string;
  solicitante: string; solicitada: string; asignarEl: string; estado: EstadoOrden;
}

export interface Categoria { id: number; nombre: string; }
export interface Producto { id: number; nombre: string; categoria: string; marca: string; activos: number; }

export const CATEGORIAS: Categoria[] = ['Uniformes', 'Tecnología', 'Construcción', 'Licencias', 'Transporte', 'EPP', 'Computadores', 'Mobiliario', 'Telefonía']
  .map((nombre, i) => ({ id: i + 1, nombre }));

export type EstadoDenuncia = 'Nueva' | 'En curso' | 'Finalizada' | 'Descartada';
export const ESTADO_DENUNCIA_TONE: Record<EstadoDenuncia, Tone> = { Nueva: 'warning', 'En curso': 'info', Finalizada: 'success', Descartada: 'danger' };

export interface Denuncia { acceso: string; mensajes: number; tipo: string; relacion: string; creada: string; estado: EstadoDenuncia; actualizada: string; }

export type EstadoEncuesta = 'Pendiente' | 'En curso' | 'Finalizada';
export const ESTADO_ENCUESTA_TONE: Record<EstadoEncuesta, Tone> = { Pendiente: 'warning', 'En curso': 'info', Finalizada: 'success' };

export interface Encuesta { id: number; nombre: string; creada: string; inicio: string; termino: string; participantes: number; estado: EstadoEncuesta; avance: number; }
