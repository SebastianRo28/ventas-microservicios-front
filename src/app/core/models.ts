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

export interface Boleta {
  /** MM-yyyy */
  mes: string;
  bruto: number;
  neto: number;
  aporteEmpleador: number;
  horasExtras: number;
  recargos: number;
  horasNoTrabajadas: number;
  diasNoTrabajados: number;
  proceso: string;
  abierto: boolean;
}

export interface Pendiente { tipo: 'sst' | 'vac' | 'aus' | 'eva' | 'otro'; etiqueta: string; tone: Tone; fecha: string; titulo: string; detalle: string; }
