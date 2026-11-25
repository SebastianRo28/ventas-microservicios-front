import { Tone } from '../models';

/**
 * Sample data for SST › Requisitos (P-11.1/P-11.2), SST › Cumplimientos (P-11.3),
 * Encuestas › Clima (P-13.6) and Comunicaciones › Correos (P-12.6).
 */

export interface Requisito {
  id: number; nombre: string; cumplimiento: string; aplicaA: 'Colaboradores' | 'Empresas';
  asignaciones: number; sinEvidencia: number; vigentes: number; vencidas: number; actualizado: string;
}

export type EstadoEvidencia = 'Vigente' | 'Por vencer' | 'Vencida' | 'Sin evidencia';
export const ESTADO_EVIDENCIA_TONE: Record<EstadoEvidencia, Tone> = { Vigente: 'success', 'Por vencer': 'warning', Vencida: 'danger', 'Sin evidencia': 'gray' };

export interface AsignacionSst {
  id: number; requisito: string; titular: string; colaboradorId?: number; estado: EstadoEvidencia;
  cumplimiento: string; documento?: string; cargo?: string; area?: string; actualizado: string;
}

export interface Cumplimiento {
  id: number; nombre: string; normativa: string; categoria: string;
  /** "vigentes/total" evidence for collaborators and companies. */
  colaboradores: [number, number]; empresas: [number, number]; descripcion: string; actualizado: string;
}

export interface CumplimientoBiblioteca { id: number; pais: string; nombre: string; normativa: string; categoria: string; }

export interface EncuestaClima { id: number; nombre: string; creada: string; inicio: string; termino: string; participantes: number; estado: 'Pendiente' | 'En curso' | 'Finalizada'; avance: number; }

export interface OrigenClima { titulo: string; detalle: string; icono: string; validada: boolean; }

export interface CorreoAutomatico { id: number; nombre: string; tipo: string; autor: string; activo: boolean; hora: string; }
