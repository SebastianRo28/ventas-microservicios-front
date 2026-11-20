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

export const PUBLICACIONES: Publicacion[] = [
  { id: 0, titulo: 'Bienvenidos a Nexo RH', fijada: true, estado: 'Publicado', publicada: '02/03/2026', expira: '—', vistas: 16, comentarios: 8, reacciones: 39, engagement: 74 },
  { id: 1, titulo: 'Recordatorio: cierre de la sede el 13/03', fijada: false, estado: 'Publicado', publicada: '09/03/2026', expira: '14/03/2026', vistas: 15, comentarios: 1, reacciones: 11, engagement: 55 },
  { id: 2, titulo: 'Campaña de vacunación 2026', fijada: false, estado: 'Programado', publicada: '20/03/2026', expira: '20/04/2026', vistas: 0, comentarios: 0, reacciones: 0, engagement: null },
  { id: 3, titulo: 'Resultados de la encuesta de clima 2025', fijada: false, estado: 'Borrador', publicada: '—', expira: '—', vistas: 0, comentarios: 0, reacciones: 0, engagement: null },
  { id: 4, titulo: 'Nuevos beneficios de salud', fijada: false, estado: 'Publicado', publicada: '15/02/2026', expira: '—', vistas: 14, comentarios: 4, reacciones: 22, engagement: 61 },
  { id: 5, titulo: 'Feriados de abril', fijada: false, estado: 'Borrador', publicada: '—', expira: '—', vistas: 0, comentarios: 0, reacciones: 0, engagement: null },
];

export interface ElementoPortal { id: number; titulo: string; visible: boolean; descripcion: string; vinculo: 'Link' | 'Sin vínculo'; }

export const PORTADAS: ElementoPortal[] = [
  { id: 0, titulo: 'Bienvenidos al nuevo portal Nexo RH', visible: true, descripcion: 'Tus boletas, solicitudes y documentos, ahora en un solo lugar.', vinculo: 'Link' },
  { id: 1, titulo: 'Campaña de vacunación 2026', visible: true, descripcion: 'Inscríbete hasta el 20/03/2026.', vinculo: 'Link' },
  { id: 2, titulo: 'Encuesta de clima laboral', visible: true, descripcion: 'Tu opinión es anónima.', vinculo: 'Link' },
  { id: 3, titulo: 'Aniversario 2025', visible: false, descripcion: 'Gracias por un gran año.', vinculo: 'Sin vínculo' },
];

export const ACCIONES_RAPIDAS: ElementoPortal[] = [
  { id: 0, titulo: 'Vacaciones disponibles', visible: true, descripcion: 'Saldo y botón Solicitar', vinculo: 'Link' },
  { id: 1, titulo: 'Últimas boletas de pago', visible: true, descripcion: 'Links a los últimos meses', vinculo: 'Link' },
  { id: 2, titulo: 'Generar certificado o documento', visible: true, descripcion: 'Plantillas habilitadas para el colaborador', vinculo: 'Link' },
  { id: 3, titulo: 'Solicitar permiso', visible: true, descripcion: 'Abre la solicitud de permiso', vinculo: 'Link' },
  { id: 4, titulo: 'Beneficios', visible: true, descripcion: 'Catálogo de beneficios', vinculo: 'Link' },
  { id: 5, titulo: 'Crear solicitud de workflow', visible: false, descripcion: 'Solicitudes flexibles', vinculo: 'Link' },
];

export interface ValorReconocimiento { nombre: string; color: string; icono: string; }
export const VALORES_RECONOCIMIENTO: ValorReconocimiento[] = [
  { nombre: 'Vamos por más!', color: '#2D4DA4', icono: 'trend' },
  { nombre: 'Nos mueve la excelencia', color: '#1F6E55', icono: 'star' },
  { nombre: 'Pasión por el servicio', color: '#B4521F', icono: 'heart' },
  { nombre: 'Al infinito y más allá', color: '#5B3FA8', icono: 'rocket' },
];

export interface Reconocimiento { id: number; para: string; autor: string; valor: string; mensaje: string; fecha: string; }
export const RECONOCIMIENTOS: Reconocimiento[] = [
  { id: 0, para: 'Chávez Quispe, Renato', autor: 'Cáceres Huamán, Lucía', valor: 'Vamos por más!', mensaje: 'Gracias por apoyar el cierre de planillas de febrero fuera de horario.', fecha: '10/03/2026' },
  { id: 1, para: 'Gutiérrez Paredes, Javier', autor: 'Benavides Rojas, Diego', valor: 'Nos mueve la excelencia', mensaje: 'Inventario cerrado sin diferencias por tercer mes seguido.', fecha: '06/03/2026' },
  { id: 2, para: 'Equipo de Ventas Retail', autor: 'Espinoza Vargas, Martín', valor: 'Pasión por el servicio', mensaje: 'Superaron la meta de satisfacción de clientes de febrero.', fecha: '02/03/2026' },
  { id: 3, para: 'Herrera Castillo, Valeria', autor: 'Chávez Quispe, Renato', valor: 'Al infinito y más allá', mensaje: 'El rediseño del portal quedó increíble.', fecha: '24/02/2026' },
  { id: 4, para: 'Alamos Ruiz, Florencia', autor: 'Navarro Ríos, Gonzalo', valor: 'Nos mueve la excelencia', mensaje: 'Conciliaciones bancarias impecables en el cierre anual.', fecha: '15/01/2026' },
];

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
export const REPORTES: Reporte[] = [
  { id: 0, nombre: 'Maestro de empleados – Marzo', plantilla: 'Maestro de empleados', categoria: 'Administrativo', programado: true, creado: '02/03/2026' },
  { id: 1, nombre: 'Nómina mensual consolidada', plantilla: 'Nómina', categoria: 'Remuneraciones', programado: false, creado: '15/01/2026' },
  { id: 2, nombre: 'Saldos de vacaciones por área', plantilla: 'Saldos de Vacaciones', categoria: 'Administrativo', programado: true, creado: '10/02/2026' },
  { id: 3, nombre: 'CTS noviembre 2025', plantilla: 'CTS', categoria: 'Remuneraciones', programado: false, creado: '05/11/2025' },
  { id: 4, nombre: 'Gratificación diciembre 2025', plantilla: 'Gratificación', categoria: 'Remuneraciones', programado: false, creado: '10/12/2025' },
  { id: 5, nombre: 'Retención de 5ta 2026', plantilla: 'Retención de 5ta', categoria: 'Remuneraciones', programado: true, creado: '08/01/2026' },
  { id: 6, nombre: 'Boletas de pago – resumen', plantilla: 'Boletas de Pago', categoria: 'Remuneraciones', programado: false, creado: '28/02/2026' },
  { id: 7, nombre: 'Bandas y compensaciones', plantilla: 'Compensaciones', categoria: 'Administrativo', programado: false, creado: '20/02/2026' },
];

export interface EjecucionReporte { id: number; reporte: string; periodo: string; usuario: string; fecha: string; estado: 'Enviado' | 'Fallido'; }
export const HISTORIAL_REPORTES: EjecucionReporte[] = [
  { id: 0, reporte: 'Maestro de empleados – Marzo', periodo: 'Marzo 2026', usuario: 'Rodrigo Paredes', fecha: '18/03/2026 08:00', estado: 'Enviado' },
  { id: 1, reporte: 'Saldos de vacaciones por área', periodo: 'Marzo 2026', usuario: 'Rodrigo Paredes', fecha: '15/03/2026 08:00', estado: 'Enviado' },
  { id: 2, reporte: 'Nómina mensual consolidada', periodo: 'Febrero 2026', usuario: 'Lucía Cáceres', fecha: '27/02/2026 17:42', estado: 'Enviado' },
  { id: 3, reporte: 'Retención de 5ta 2026', periodo: 'Febrero 2026', usuario: 'Rodrigo Paredes', fecha: '01/02/2026 08:00', estado: 'Fallido' },
  { id: 4, reporte: 'Boletas de pago – resumen', periodo: 'Febrero 2026', usuario: 'Lucía Cáceres', fecha: '28/02/2026 11:15', estado: 'Enviado' },
];

export type TipoPlantillaReporte = 'blank' | 'pre' | 'custom';
export interface PlantillaReporte { titulo: string; categoria: string; tipo: TipoPlantillaReporte; descripcion: string; }
const P = (titulo: string, categoria: string, tipo: TipoPlantillaReporte, descripcion: string): PlantillaReporte => ({ titulo, categoria, tipo, descripcion });
const REM = 'Remuneraciones';
export const PLANTILLAS_REPORTE: PlantillaReporte[] = [
  P('Reporte en blanco', 'Todas', 'blank', 'Arma un reporte desde cero eligiendo las columnas.'),
  P('Maestro de empleados', ADM, 'pre', 'Datos personales, contractuales y organizacionales de cada colaborador.'),
  P('Nómina', REM, 'pre', 'Haberes, descuentos y aportes por colaborador y proceso.'),
  P('Boletas de Pago', REM, 'pre', 'Resumen de boletas por colaborador y período.'),
  P('Liquidaciones', REM, 'pre', 'Montos de liquidación de beneficios sociales por término.'),
  P('Nóminas de Pagos Parciales', REM, 'pre', 'Detalle de pagos parciales y adelantos.'),
  P('Registro de Vacaciones', ADM, 'pre', 'Vacaciones tomadas por colaborador con fechas y estado.'),
  P('Saldos de Vacaciones', ADM, 'pre', 'Saldo de vacaciones a la fecha de corte.'),
  P('Saldo de Vacaciones por Período', ADM, 'pre', 'Saldo desglosado por período de devengo.'),
  P('CTS', REM, 'pre', 'Cálculo de CTS semestral por colaborador.'),
  P('Gratificación', REM, 'pre', 'Gratificaciones de julio y diciembre con bonificación extraordinaria.'),
  P('Resumen de Procesos', REM, 'pre', 'Totales por proceso de pago.'),
  P('Contabilidad', REM, 'pre', 'Asientos contables de la planilla.'),
  P('Compensaciones', ADM, 'pre', 'Sueldos, bandas y ubicación en banda.'),
  P('Ítems', REM, 'pre', 'Ítems asignados por colaborador y período.'),
  P('Retención de 5ta', REM, 'pre', 'Proyección y retención del impuesto de quinta categoría.'),
  P('Reporte Compañeros de Banda', ADM, 'pre', 'Colaboradores que comparten banda salarial.'),
  P('Competencias', 'Desarrollo Organizacional', 'pre', 'Competencias asociadas a cada cargo.'),
  P('Posiciones del plan de headcount', ADM, 'pre', 'Posiciones planificadas, ocupadas y vacantes.'),
  P('Líneas Contables', REM, 'pre', 'Detalle de líneas contables por cuenta y centro de costo.'),
  P('Maestro de empleados · RR.HH.', ADM, 'custom', 'Copia personalizada con atributos propios de la empresa.'),
];
export const CATEGORIAS_REPORTE = ['Todas', 'Remuneraciones', 'Administrativo', 'Desarrollo Organizacional', 'Beneficios', 'Capacitaciones'];
