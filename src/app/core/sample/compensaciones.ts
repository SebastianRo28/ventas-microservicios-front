/**
 * Sample data for Usuarios y perfiles (P-02.7), Parámetros generales (5.10),
 * Bandas salariales (P-09.1/P-09.3) and Estudio salarial (P-09.5/P-09.6).
 */

export interface Perfil { id: number; nombre: string; predefinido: boolean; actualizado: string; modificadoPor: string; creado: string; }

export type Permiso = 'Modificación' | 'Lectura' | 'Sí' | 'No';
/** Permission sheet shown in "Resumen del perfil" for custom profiles (design sample). */
export const PERMISOS: Record<string, [string, Permiso][]> = {
  'Administrativo': [['Colaboradores', 'Modificación'], ['Planificación de headcount', 'Lectura'], ['Organización', 'Modificación']],
  'Remuneraciones': [['Procesos', 'Lectura'], ['Archivos y Pagos', 'Lectura'], ['Ítems', 'Lectura']],
  'Control de Asistencia': [['Marcaciones', 'Lectura'], ['Turnos', 'No'], ['Horas extras', 'No']],
  'Desarrollo Organizacional': [['Comunicaciones', 'Lectura'], ['Encuestas', 'No'], ['Canal de denuncias', 'No']],
  'Beneficios': [['Beneficios', 'No']],
  'Seguridad y Salud en el Trabajo': [['Registro de evidencias', 'Modificación']],
  'Capacitaciones': [['Capacitaciones', 'No']],
  'Reportería/Información': [['Exportadores', 'Sí'], ['Importadores', 'No'], ['Analítica', 'Lectura']],
  'Configuración del Sistema': [['Parámetros generales', 'No'], ['Usuarios y perfiles', 'No'], ['Accesos API', 'No']],
  'Acceso a Soporte': [['Chat de soporte', 'Sí']],
};

export interface Usuario { id: number; nombre: string; correo: string; perfil: string; acceso: string; activo: boolean; }

/** Salary band of a position: min/max are derived from the target salary. */
export interface Banda { id: number; cargo: string; objetivo: number; pctMin: number; pctMax: number; activo: boolean; }

export interface NivelBanda { nombre: string; codigo: string; cargos: number; minimo: number; objetivo: number; maximo: number; }

/** Base salary, last change and last evaluation per collaborator id (design P-09.3). */
export interface Remuneracion { sueldoBase: number; ultimaModificacion: string; evaluacion: string; compTeorica?: number; }

/** Market salary study rows ("Cargo Nexo"); `interno` is the paired internal position. */
export interface CargoMercado { id: number; cargo: string; interno: string | null; descripcion: string; industria: string; tamano: string; p25: number; p50: number; p75: number; p90: number; }
