

export interface Posicion { id: string; cargo: string; division: string; area: string; subArea: string; ingreso: string; termino: string; vigente: boolean; }

export type OrigenCambio = 'Web' | 'Importador' | 'API';
export type AccionCambio = 'Crear' | 'Modificar' | 'Eliminar';
export interface Cambio {
  id: number; usuario: string; origen: OrigenCambio; colaborador: string; documento: string; entidad: string;
  accion: AccionCambio; fecha: string; propiedad: string; anterior: string; actual: string;
}

export type NivelPermiso = 'No' | 'Lectura' | 'Escritura';
export const RECURSOS_API = ['Subir documentos', 'Ver y descargar documentos de empleados', 'Empleados', 'Contabilidad', 'Asistencia', 'Ítems', 'Vacaciones', 'Selección', 'Evaluaciones'];

export interface ApiKey { id: number; descripcion: string; limitarEmpresas: boolean; token: string; empresas: string; ultimaIp: string; ultimoAcceso: string; creada: string; permisos: Record<string, NivelPermiso>; }

export interface IpPermitida { ip: string; descripcion: string; creada: string; }

export interface Webhook { id: number; url: string; evento: string; activo: boolean; }
export const EVENTOS_WEBHOOK = ['Colaborador creado', 'Colaborador modificado', 'Trabajo terminado', 'Vacaciones aprobadas', 'Documento firmado'];
