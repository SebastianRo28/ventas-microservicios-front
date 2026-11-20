/**
 * Sample data for Usuarios y perfiles (P-02.7), Parámetros generales (5.10),
 * Bandas salariales (P-09.1/P-09.3) and Estudio salarial (P-09.5/P-09.6).
 */

export interface Perfil { id: number; nombre: string; predefinido: boolean; actualizado: string; modificadoPor: string; creado: string; }
export const PERFILES: Perfil[] = [
  { id: 0, nombre: 'Administrador', predefinido: true, actualizado: '12/01/2026', modificadoPor: 'Rodrigo Paredes', creado: '14/11/2025' },
  { id: 1, nombre: 'Normal / Colaborador', predefinido: true, actualizado: '05/01/2026', modificadoPor: 'Rodrigo Paredes', creado: '14/11/2025' },
  { id: 2, nombre: 'Supervisor', predefinido: false, actualizado: '20/02/2026', modificadoPor: 'Lucía Cáceres', creado: '14/11/2025' },
  { id: 3, nombre: 'Prevencionista de Riesgos', predefinido: false, actualizado: '14/03/2026', modificadoPor: 'Rodrigo Paredes', creado: '14/11/2025' },
  { id: 4, nombre: 'Admin comunicaciones', predefinido: false, actualizado: '02/03/2026', modificadoPor: 'Lucía Cáceres', creado: '14/11/2025' },
  { id: 5, nombre: 'Jefe Selección', predefinido: false, actualizado: '18/02/2026', modificadoPor: 'Lucía Cáceres', creado: '14/11/2025' },
  { id: 6, nombre: 'Lectura gestión de activos', predefinido: false, actualizado: '10/03/2026', modificadoPor: 'Rodrigo Paredes', creado: '14/11/2025' },
];

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
export const USUARIOS: Usuario[] = [
  { id: 0, nombre: 'Paredes, Rodrigo', correo: 'r.paredes@comercialandina.pe', perfil: 'Administrador', acceso: '18/03/2026', activo: true },
  { id: 1, nombre: 'Cáceres Huamán, Lucía', correo: 'l.caceres@comercialandina.pe', perfil: 'Administrador', acceso: '18/03/2026', activo: true },
  { id: 2, nombre: 'Navarro Ríos, Gonzalo', correo: 'g.navarro@comercialandina.pe', perfil: 'Supervisor', acceso: '17/03/2026', activo: true },
  { id: 3, nombre: 'Pérez Soto, Luis', correo: 'l.perez@comercialandina.pe', perfil: 'Prevencionista de Riesgos', acceso: '16/03/2026', activo: true },
  { id: 4, nombre: 'Medina Torres, Sofía', correo: 's.medina@comercialandina.pe', perfil: 'Admin comunicaciones', acceso: '15/03/2026', activo: true },
  { id: 5, nombre: 'Alamos Ruiz, Florencia', correo: 'f.alamos@comercialandina.pe', perfil: 'Normal / Colaborador', acceso: '18/03/2026', activo: true },
  { id: 6, nombre: 'Chávez Quispe, Renato', correo: 'r.chavez@comercialandina.pe', perfil: 'Normal / Colaborador', acceso: '12/03/2026', activo: true },
  { id: 7, nombre: 'Benavides Rojas, Diego', correo: 'd.benavides@comercialandina.pe', perfil: 'Supervisor', acceso: '11/03/2026', activo: true },
  { id: 8, nombre: 'Zapata Ugarte, Miguel', correo: 'm.zapata@comercialandina.pe', perfil: 'Normal / Colaborador', acceso: '02/01/2026', activo: false },
];

/** Salary band of a position: min/max are derived from the target salary. */
export interface Banda { id: number; cargo: string; objetivo: number; pctMin: number; pctMax: number; activo: boolean; }
export const BANDAS: Banda[] = [
  { id: 0, cargo: 'Analista Finanzas', objetivo: 6500, pctMin: 85, pctMax: 120, activo: true },
  { id: 1, cargo: 'Desarrollador Senior', objetivo: 8000, pctMin: 85, pctMax: 120, activo: true },
  { id: 2, cargo: 'Ejecutiva Comercial', objetivo: 5000, pctMin: 85, pctMax: 120, activo: true },
  { id: 3, cargo: 'Supervisor de Ventas', objetivo: 6000, pctMin: 85, pctMax: 120, activo: true },
  { id: 4, cargo: 'Asistente de Almacén', objetivo: 2300, pctMin: 85, pctMax: 120, activo: true },
  { id: 5, cargo: 'Contadora', objetivo: 7000, pctMin: 85, pctMax: 120, activo: true },
];

export interface NivelBanda { nombre: string; codigo: string; cargos: number; minimo: number; objetivo: number; maximo: number; }
export const NIVELES_BANDA: NivelBanda[] = [
  { nombre: 'Nivel 1 · Operativo', codigo: 'N1', cargos: 9, minimo: 1615, objetivo: 1900, maximo: 2280 },
  { nombre: 'Nivel 2 · Asistente', codigo: 'N2', cargos: 8, minimo: 2380, objetivo: 2800, maximo: 3360 },
  { nombre: 'Nivel 3 · Analista', codigo: 'N3', cargos: 12, minimo: 3825, objetivo: 4500, maximo: 5400 },
  { nombre: 'Nivel 4 · Jefatura', codigo: 'N4', cargos: 7, minimo: 6800, objetivo: 8000, maximo: 9600 },
  { nombre: 'Nivel 5 · Gerencia', codigo: 'N5', cargos: 3, minimo: 11900, objetivo: 14000, maximo: 16800 },
];

/** Base salary, last change and last evaluation per collaborator id (design P-09.3). */
export interface Remuneracion { sueldoBase: number; ultimaModificacion: string; evaluacion: string; compTeorica?: number; }
export const REMUNERACIONES: Record<number, Remuneracion> = {
  0: { sueldoBase: 7500, ultimaModificacion: '01/01/2025', evaluacion: 'Supera expectativas' },
  3: { sueldoBase: 8450, ultimaModificacion: '01/01/2026', evaluacion: 'Cumple expectativas' },
  4: { sueldoBase: 5500, ultimaModificacion: '22/08/2025', evaluacion: 'Cumple expectativas' },
  9: { sueldoBase: 8200, ultimaModificacion: '01/07/2025', evaluacion: 'Supera expectativas' },
  7: { sueldoBase: 2400, ultimaModificacion: '18/11/2025', evaluacion: 'Cumple expectativas' },
  6: { sueldoBase: 5600, ultimaModificacion: '05/09/2024', evaluacion: 'En desarrollo' },
};

/** Market salary study rows ("Cargo Nexo"); `interno` is the paired internal position. */
export interface CargoMercado { id: number; cargo: string; interno: string | null; descripcion: string; industria: string; tamano: string; p25: number; p50: number; p75: number; p90: number; }
export const ESTUDIO_SALARIAL: CargoMercado[] = [
  { id: 0, cargo: 'Analista de finanzas', interno: 'Analista Finanzas', descripcion: 'Elabora reportes financieros, flujo de caja y conciliaciones…', industria: 'Comercio mayorista', tamano: 'Mediana Empresa', p25: 3840, p50: 4800, p75: 6000, p90: 7440 },
  { id: 1, cargo: 'Desarrollador de software senior', interno: 'Desarrollador Senior', descripcion: 'Diseña, desarrolla y mantiene aplicaciones…', industria: 'Tecnología', tamano: 'Total de mercado', p25: 6320, p50: 7900, p75: 9875, p90: 12245 },
  { id: 2, cargo: 'Ejecutivo comercial', interno: null, descripcion: 'Gestiona cartera de clientes corporativos y metas de venta…', industria: 'Comercio mayorista', tamano: 'Mediana Empresa', p25: 3280, p50: 4100, p75: 5125, p90: 6355 },
  { id: 3, cargo: 'Supervisor de ventas', interno: null, descripcion: 'Lidera equipos de venta en tienda o canal…', industria: 'Retail', tamano: 'Gran Empresa', p25: 4480, p50: 5600, p75: 7000, p90: 8680 },
  { id: 4, cargo: 'Asistente de almacén', interno: null, descripcion: 'Recepciona, almacena y despacha mercadería…', industria: 'Logística', tamano: 'Mediana Empresa', p25: 1520, p50: 1900, p75: 2375, p90: 2945 },
  { id: 5, cargo: 'Contador general', interno: null, descripcion: 'Responsable de la contabilidad, cierres y declaraciones…', industria: 'Total de mercado', tamano: 'Total de mercado', p25: 5440, p50: 6800, p75: 8500, p90: 10540 },
  { id: 6, cargo: 'Analista de recursos humanos', interno: null, descripcion: 'Gestiona procesos de RR.HH. como planillas y selección…', industria: 'Comercio mayorista', tamano: 'Pequeña Empresa', p25: 3120, p50: 3900, p75: 4875, p90: 6045 },
  { id: 7, cargo: 'Diseñador UX', interno: null, descripcion: 'Investiga usuarios y diseña interfaces digitales…', industria: 'Tecnología', tamano: 'Total de mercado', p25: 4320, p50: 5400, p75: 6750, p90: 8370 },
];
