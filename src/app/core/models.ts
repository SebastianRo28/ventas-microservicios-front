export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'orange' | 'gray';

export interface Colaborador {
  id: number;
  apellidos: string;
  nombres: string;
  documento: string;
  cargo: string;
  division: string;
  area: string;
  subArea: string;
  /** dd/MM/yyyy */
  ingreso: string;
  /** Comes as null from the API when the user may not see this person's salary (see `reservado`). */
  sueldoNeto: number;
  /** Direct manager (org chart). */
  jefeId?: number | null;
  /** True when the API hid personal or salary data because of the user's permissions. */
  reservado?: boolean;
  /** Optional record details shown in the Ficha; missing values render as "—". */
  detalle?: ColaboradorDetalle;
}

export interface ColaboradorDetalle {
  tipoDocumento?: string;
  emailCorporativo?: string;
  telefono?: string;
  nacimiento?: string;
  direccion?: string;
  carrera?: string;
  institucion?: string;
  planSalud?: string;
  pension?: string;
  cuspp?: string;
  banco?: string;
  formaPago?: string;
  supervisor?: string;
  sueldoBase?: number;
  contrato?: string;
  jornada?: string;
  sindicalizado?: string;
  /** Banner shown on top of the record, e.g. an active medical leave. */
  aviso?: string;
}

export interface Cargo {
  id: number;
  nombre: string;
  subAreas: number;
  colaboradores: number;
  familia: string;
  activo: boolean;
}

export interface FamiliaCargo { id: number; nombre: string; cargos: number; activo: boolean; }
export interface Competencia { id: number; nombre: string; descripcion: string; activo: boolean; }

export interface SubArea { nombre: string; colaboradores: number; }
export interface Area { nombre: string; colaboradores: number; subAreas: SubArea[]; }
export interface Division { nombre: string; colaboradores: number; areas: Area[]; }

export interface ProcesoPago { nombre: string; estado: string; tone: Tone; colaboradores: number; fechaPago: string; }
export interface PeriodoRem { label: string; abierto: boolean; procesos: ProcesoPago[]; }

export interface Serie { titulo: string; valores: number[]; formato: 'int' | 'money' | 'hours'; }

/** Payslip summary (GET /api/remuneraciones/boletas). Amounts in soles. */
export interface Boleta {
  id: number;
  /** MM/YYYY */
  periodo: string;
  colaboradorId: number;
  nombre: string;
  documento: string;
  cargo: string;
  regimen: string;
  diasLaborados: number;
  diasVacaciones: number;
  diasNoTrabajados: number;
  ingresos: number;
  descuentos: number;
  aportes: number;
  neto: number;
  /** Overtime and rest-day surcharge amounts included in ingresos. */
  horasExtras: number;
  recargos: number;
  /** Closed period (final). Drafts of the open period are only seen by administrators. */
  definitiva: boolean;
  observaciones: string[];
}
export interface LineaBoleta { codigo: string; nombre: string; clase: 'Haber' | 'Descuento' | 'Aporte empleador'; detalle: string; monto: number; }
export interface BoletaDetalle { resumen: Boleta; lineas: LineaBoleta[]; }
/** Payroll period (GET /api/remuneraciones/periodos). */
export interface PeriodoPlanilla {
  periodo: string; cerrado: boolean; procesadoEn: string | null; procesadoPor: string; cerradoEn: string | null; cerradoPor: string;
  boletas: number; ingresos: number; descuentos: number; aportes: number; neto: number;
}

export interface Pendiente { tipo: 'sst' | 'vac' | 'aus' | 'eva' | 'otro'; etiqueta: string; tone: Tone; fecha: string; titulo: string; detalle: string; }

/** Account in Administración › Usuarios (API /usuarios). */
export interface UsuarioCuenta {
  id: number;
  nombre: string;
  correo: string;
  rol: 'Administrador' | 'Supervisor' | 'Colaborador';
  perfil: string;
  perfilId: number | null;
  colaboradorId: number | null;
  colaborador: string | null;
  activo: boolean;
  ultimoAcceso: string;
  bloqueado: boolean;
  debeCambiarPassword: boolean;
  /** Invited by e-mail and not activated yet. */
  pendienteActivacion: boolean;
  dobleFactor: boolean;
}
/** The role comes from the profile (perfilId). */
export interface UsuarioGuardar { nombre: string; correo: string; perfilId: number; colaboradorId: number | null; invitar?: boolean; }
/** User profile (Administración › Perfiles): a name plus the base role that defines access. */
export interface PerfilCuenta {
  id: number; nombre: string; rol: 'Administrador' | 'Supervisor' | 'Colaborador'; predefinido: boolean; descripcion: string;
  usuarios: number; creado: string; actualizado: string; modificadoPor: string;
}
export interface PerfilGuardar { nombre: string; rol: string; descripcion: string; }
/** Answer to creating an account or resetting its password: the temporary password is shown only once. */
/** passwordTemporal is null when an invitation was e-mailed instead. */
export interface UsuarioCreado { usuario: UsuarioCuenta; passwordTemporal: string | null; }
