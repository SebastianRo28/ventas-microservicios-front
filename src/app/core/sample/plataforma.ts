/**
 * Sample data for Headcount (P-10.1/P-10.2/P-10.4), Historial de cambios (P-02.8) and Accesos API (P-02.10).
 */

/** Budgeted ("esperado") headcount per area and per position, from the design. */
export const PLAN_AREA: Record<string, number> = {
  'Gerencia General': 1, 'Finanzas': 3, 'Recursos Humanos': 4, 'Contabilidad': 2, 'Logística': 2,
  'Seguridad y Salud': 2, 'Ventas': 4, 'Marketing': 1, 'Desarrollo': 1, 'Infraestructura': 1,
};
export const PLAN_CARGO: Record<string, number> = {
  'Analista Finanzas': 1, 'Analista de Selección': 2, 'Asistente de Almacén': 1, 'Ejecutiva Comercial': 3,
};
export const CENTRO_COSTO_DIVISION: Record<string, string> = {
  'Directorio': 'CC-100 Gerencia General', 'Departamento de Administración': 'CC-120 Administración',
  'Operaciones': 'CC-200 Operaciones', 'Comercial': 'CC-300 Comercial', 'Tecnología': 'CC-400 Tecnología',
};

export interface Posicion { id: string; cargo: string; division: string; area: string; subArea: string; ingreso: string; termino: string; vigente: boolean; }
export const POSICIONES: Posicion[] = [
  { id: 'POS-0101', cargo: 'Analista de Selección', division: 'Departamento de Administración', area: 'Recursos Humanos', subArea: 'Selección', ingreso: '01/04/2026', termino: '—', vigente: true },
  { id: 'POS-0102', cargo: 'Analista de Selección', division: 'Departamento de Administración', area: 'Recursos Humanos', subArea: 'Selección', ingreso: '01/05/2026', termino: '—', vigente: true },
  { id: 'POS-0110', cargo: 'Ejecutiva Comercial', division: 'Comercial', area: 'Ventas', subArea: 'Corporativo', ingreso: '15/04/2026', termino: '—', vigente: true },
  { id: 'POS-0111', cargo: 'Ejecutiva Comercial', division: 'Comercial', area: 'Ventas', subArea: 'Corporativo', ingreso: '15/04/2026', termino: '31/12/2026', vigente: true },
  { id: 'POS-0120', cargo: 'Prevencionista de Riesgos', division: 'Operaciones', area: 'Seguridad y Salud', subArea: 'Prevención', ingreso: '01/06/2026', termino: '—', vigente: true },
  { id: 'POS-0090', cargo: 'Analista Finanzas', division: 'Departamento de Administración', area: 'Finanzas', subArea: 'Tesorería', ingreso: '01/06/2023', termino: '31/12/2025', vigente: false },
];

/** Planned hires per month (Oct 2025 – Mar 2026), from the design's analytics. */
export const INGRESOS_PLANIFICADOS = [3, 2, 4, 5, 3, 4];

export type OrigenCambio = 'Web' | 'Importador' | 'API';
export type AccionCambio = 'Crear' | 'Modificar' | 'Eliminar';
export interface Cambio {
  id: number; usuario: string; origen: OrigenCambio; colaborador: string; documento: string; entidad: string;
  accion: AccionCambio; fecha: string; propiedad: string; anterior: string; actual: string;
}
const RP = 'Rodrigo Paredes · Administrador', LC = 'Lucía Cáceres · Administrador';
export const CAMBIOS: Cambio[] = [
  { id: 0, usuario: RP, origen: 'Web', colaborador: 'Alamos Ruiz, Florencia', documento: '72458193', entidad: 'Trabajo #1043-3', accion: 'Modificar', fecha: '01/01/2025 09:12', propiedad: 'cargo', anterior: 'Asistente de Finanzas', actual: 'Analista Finanzas' },
  { id: 1, usuario: RP, origen: 'Web', colaborador: 'Alamos Ruiz, Florencia', documento: '72458193', entidad: 'Trabajo #1043-3', accion: 'Modificar', fecha: '01/01/2025 09:12', propiedad: 'sueldo_base', anterior: 'S/ 5,200.00', actual: 'S/ 7,500.00' },
  { id: 2, usuario: LC, origen: 'Importador', colaborador: 'Ortiz Ramírez, Daniela', documento: '75236981', entidad: 'Colaborador #2210', accion: 'Crear', fecha: '01/03/2026 08:40', propiedad: '—', anterior: '—', actual: 'Creado' },
  { id: 3, usuario: 'Sistema · API', origen: 'API', colaborador: 'Chávez Quispe, Renato', documento: '72011548', entidad: 'Colaborador #1987', accion: 'Modificar', fecha: '10/03/2026 14:02', propiedad: 'telefono_particular', anterior: '51 912 345 678', actual: '51 987 001 224' },
  { id: 4, usuario: LC, origen: 'Web', colaborador: 'Huertas León, Paolo', documento: '47896521', entidad: 'Vacaciones #5541', accion: 'Eliminar', fecha: '05/02/2026 11:30', propiedad: '—', anterior: '3 días (10/02/2026)', actual: '—' },
  { id: 5, usuario: RP, origen: 'Web', colaborador: 'Pérez Soto, Luis', documento: '40123578', entidad: 'Colaborador #1660', accion: 'Modificar', fecha: '12/03/2026 16:18', propiedad: 'email_corporativo', anterior: 'lperez@comercialandina.pe', actual: 'l.perez@comercialandina.pe' },
  { id: 6, usuario: LC, origen: 'Importador', colaborador: 'Gutiérrez Paredes, Javier', documento: '70458812', entidad: 'Trabajo #2011-1', accion: 'Modificar', fecha: '28/02/2026 10:05', propiedad: 'centro_costo', anterior: 'CC-120', actual: 'CC-200' },
  { id: 7, usuario: RP, origen: 'Web', colaborador: 'Herrera Castillo, Valeria', documento: '74120369', entidad: 'Activo #ACT-0051', accion: 'Crear', fecha: '10/02/2025 09:00', propiedad: 'estado', anterior: '—', actual: 'Asignado' },
];

export type NivelPermiso = 'No' | 'Lectura' | 'Escritura';
export const RECURSOS_API = ['Subir documentos', 'Ver y descargar documentos de empleados', 'Empleados', 'Contabilidad', 'Asistencia', 'Ítems', 'Vacaciones', 'Selección', 'Evaluaciones'];

export interface ApiKey { id: number; descripcion: string; limitarEmpresas: boolean; token: string; empresas: string; ultimaIp: string; ultimoAcceso: string; creada: string; permisos: Record<string, NivelPermiso>; }
const sinPermisos = () => Object.fromEntries(RECURSOS_API.map((r) => [r, 'No' as NivelPermiso]));
export const API_KEYS: ApiKey[] = [
  { id: 12, descripcion: 'Integración ERP contable', limitarEmpresas: true, token: 'nx_live_8f2a91c4d7e64b0a', empresas: 'Comercial Andina S.A.C.', ultimaIp: '190.12.45.201', ultimoAcceso: '18/03/2026 07:58', creada: '14/01/2026', permisos: { ...sinPermisos(), Contabilidad: 'Escritura' } },
  { id: 9, descripcion: 'Sincronización control de acceso', limitarEmpresas: false, token: 'nx_live_3b7c0e55a1f94d22', empresas: 'Todas', ultimaIp: '200.48.110.7', ultimoAcceso: '17/03/2026 23:10', creada: '02/11/2025', permisos: { ...sinPermisos(), Empleados: 'Lectura', Asistencia: 'Escritura' } },
  { id: 4, descripcion: 'BI – Power BI', limitarEmpresas: false, token: 'nx_live_c09d6f11b2e34a8e', empresas: 'Todas', ultimaIp: '181.65.3.14', ultimoAcceso: '10/03/2026 06:00', creada: '20/06/2025', permisos: { ...sinPermisos(), Empleados: 'Lectura', Vacaciones: 'Lectura' } },
];

export interface IpPermitida { ip: string; descripcion: string; creada: string; }
export const WHITELIST: IpPermitida[] = [
  { ip: '190.12.45.201', descripcion: 'Servidor ERP contable', creada: '14/01/2026' },
  { ip: '200.48.110.7', descripcion: 'Control de acceso – sede central', creada: '02/11/2025' },
];

export interface Webhook { id: number; url: string; evento: string; activo: boolean; }
export const EVENTOS_WEBHOOK = ['Colaborador creado', 'Colaborador modificado', 'Trabajo terminado', 'Vacaciones aprobadas', 'Documento firmado'];
export const WEBHOOKS: Webhook[] = [
  { id: 0, url: 'https://erp.empresa.pe/hooks/colaboradores', evento: 'Colaborador creado', activo: true },
  { id: 1, url: 'https://acceso.empresa.pe/hooks/bajas', evento: 'Trabajo terminado', activo: false },
];
