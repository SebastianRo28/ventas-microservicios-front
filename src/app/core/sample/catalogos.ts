/**
 * Sample data for Workflow › Plantillas (P-02.3), Documentos › Plantillas (P-05.1),
 * Analítica (P-02.5) and Gestión de Activos › Inventario (P-06.2).
 */

export type EstadoPlantilla = 'Activa' | 'Inactiva' | 'Error' | 'Incompleta';

export interface PlantillaWorkflow { id: number; nombre: string; tipo: string; estado: EstadoPlantilla; operaciones: number; actualizada: string; solicitudes?: number; }

export interface PlantillaDocumento { id: number; nombre: string; tipo: string; activa: boolean; carpeta: string; }

export interface Dashboard { id: number; nombre: string; descripcion: string; editado: string; }
export interface Widget { id: number; nombre: string; tipo: string; origen: string; editado: string; }

export type EstadoActivo = 'Disponible' | 'Asignado' | 'Mantenimiento' | 'Inactivo';

export interface MovimientoActivo { fecha: string; asignado: string; estado: EstadoActivo; comentario: string; admin: string; }
export interface Activo { id: string; nombre: string; categoria: string; marca: string; estado: EstadoActivo; asignado: string; historial: MovimientoActivo[]; }
