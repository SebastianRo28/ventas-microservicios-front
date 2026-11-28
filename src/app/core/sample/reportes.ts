import { Tone } from '../models';

/**
 * Sample data for Comunicaciones › Portal (P-12.5) and Reconocimientos (P-12.6),
 * Reportería › Importadores (5.3) and Exportadores (5.4).
 */

export type EstadoPublicacion = 'Publicado' | 'Programado' | 'Borrador';
export const ESTADO_PUBLICACION_TONE: Record<EstadoPublicacion, Tone> = { Publicado: 'success', Programado: 'info', Borrador: 'neutral' };

export interface Publicacion { id: number; titulo: string; fijada: boolean; estado: EstadoPublicacion; publicada: string; expira: string; vistas: number; comentarios: number; reacciones: number;
  /** % engagement as reported by the portal; null while unpublished. */
  engagement: number | null; }

/** Portada or acción rápida of Mi Portal; `imagen` is the URL of the uploaded picture (portadas only). */
export interface ElementoPortal { id: number; titulo: string; visible: boolean; descripcion: string; vinculo: 'Link' | 'Sin vínculo'; imagen?: string | null; }

export interface ValorReconocimiento { nombre: string; color: string; icono: string; }

export interface Reconocimiento { id: number; para: string; autor: string; valor: string; mensaje: string; fecha: string; paraIds?: number[]; autorId?: number | null; }

export type TipoImportador = 'Importador' | 'Modificador';
export interface Importador { nombre: string; tipo: TipoImportador; categoria: string; modulo: string; }

const ADM = 'Administrativo', SST = 'Seguridad y Salud en el Trabajo';
const I = (nombre: string, tipo: TipoImportador, categoria: string, modulo = ADM): Importador => ({ nombre, tipo, categoria, modulo });
const IMP = 'Importador', MOD = 'Modificador';
export const IMPORTADORES: Importador[] = [
  I('Colaboradores', IMP, 'Colaboradores'), I('Educación', IMP, 'Colaboradores'), I('Fotos de Perfil', IMP, 'Colaboradores'),
  I('Trabajos', IMP, 'Colaboradores'), I('Trabajos', MOD, 'Colaboradores'), I('Anular Término', IMP, 'Colaboradores'),
  I('Detalle Grupo Familiar', IMP, 'Colaboradores'), I('Detalle Grupo Familiar', MOD, 'Colaboradores'),
  I('Asignación Políticas de Vacaciones', IMP, 'Colaboradores'), I('Asignación Políticas de Vacaciones', MOD, 'Colaboradores'),
  I('Datos Personales', MOD, 'Colaboradores'), I('Previsión y Salud', MOD, 'Colaboradores'), I('Liquidar/Finiquitar Colaboradores', IMP, 'Colaboradores'),
  I('Renovar Trabajos', IMP, 'Colaboradores'), I('Agrupación LRE Reliquidaciones', IMP, 'Colaboradores'),
  I('Cargos', IMP, 'Organización'), I('Cargos', MOD, 'Organización'), I('Áreas', IMP, 'Organización'), I('Centros de Costos', IMP, 'Organización'),
  I('Asignación de Cuentas Contables', MOD, 'Organización'), I('Bandas salariales', IMP, 'Organización'),
  I('Horas Extras', IMP, 'Asistencia'), I('Saldo Vacaciones', IMP, 'Asistencia'), I('Registros Vacaciones Tomadas', IMP, 'Asistencia'),
  I('Ausencias por Día', IMP, 'Asistencia'), I('Ausencias por Hora', IMP, 'Asistencia'),
  I('Ítems', IMP, 'Ítems y KPI’s'), I('Estructura Descuentos', IMP, 'Ítems y KPI’s'), I('Estructura Ítems Créditos', IMP, 'Ítems y KPI’s'),
  I('Estructura KPI', IMP, 'Ítems y KPI’s'), I('Forzar Montos', IMP, 'Ítems y KPI’s'), I('KPIs', IMP, 'Ítems y KPI’s'),
  I('Suspensión de Ítems y Créditos', IMP, 'Ítems y KPI’s'), I('Pagos parciales', IMP, 'Ítems y KPI’s'), I('Estructura Haberes', IMP, 'Ítems y KPI’s'),
  I('Tabla de Parámetros', MOD, 'Ítems y KPI’s'), I('Créditos', IMP, 'Ítems y KPI’s'),
  I('Información Histórica', IMP, 'Información Histórica'), I('Comprobantes Históricos', IMP, 'Información Histórica'),
  I('Posiciones (headcount)', IMP, 'Planificación de headcount'),
  I('Cumplimientos', IMP, 'Registro de evidencias', SST), I('Requisitos', IMP, 'Registro de evidencias', SST),
  I('Asignación de requisitos (colaboradores y empresas)', IMP, 'Registro de evidencias', SST),
];
export const MODULOS_IMPORTADOR = ['Administrativo', 'Talento', 'Beneficios', SST];
export const CATEGORIAS_IMPORTADOR = ['Todos', 'Colaboradores', 'Organización', 'Boletas de Honorarios', 'Asistencia', 'Trato', 'Ítems y KPI’s',
  'Información Histórica', 'Onboarding', 'Planificación de headcount', 'Registro de evidencias'];

export interface Reporte { id: number; nombre: string; plantilla: string; categoria: string; programado: boolean; creado: string; }

export interface EjecucionReporte { id: number; reporte: string; periodo: string; usuario: string; fecha: string; estado: 'Enviado' | 'Fallido'; }

export type TipoPlantillaReporte = 'blank' | 'pre' | 'custom';
export interface PlantillaReporte { titulo: string; categoria: string; tipo: TipoPlantillaReporte; descripcion: string; }
const P = (titulo: string, categoria: string, tipo: TipoPlantillaReporte, descripcion: string): PlantillaReporte => ({ titulo, categoria, tipo, descripcion });
