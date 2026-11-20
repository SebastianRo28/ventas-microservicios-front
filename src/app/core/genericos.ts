/** Definitions for the generic catalog and settings screens (configured per route through route data). */

/** Where a select field gets its options when they come from other data. */
export type FuenteOpciones = 'colaboradores' | 'areas' | 'cargos' | 'items' | `catalogo:${string}`;

export interface CampoCatalogo {
  key: string;
  label: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'select' | 'switch' | 'textarea';
  /** Fixed options or a data source. For `catalogo:x`, the option value is the first field of catalog x. */
  opciones?: string[] | FuenteOpciones;
  obligatorio?: boolean;
  /** Required only when another field has a given value. */
  requeridoSi?: { campo: string; valor: string };
  /** Value must be unique among rows (case-insensitive). */
  unico?: boolean;
  patron?: { re: string; msg: string };
  min?: number;
  max?: number;
  placeholder?: string;
  ayuda?: string;
  /** Hidden from the table (still in the form). */
  soloFormulario?: boolean;
  /** Labels for a switch in the table, default Activo / Inactivo. */
  etiquetas?: [string, string];
  ancho?: string;
}

export type FilaCatalogo = { id: number } & Record<string, string | number | boolean>;

export interface CatalogoConfig {
  clave: string;
  singular: string;
  /** Grammatical gender of the singular, for messages (agregada / agregado). */
  femenino?: boolean;
  descripcion?: string;
  campos: CampoCatalogo[];
  filas: Omit<FilaCatalogo, 'id'>[];
  /** Rows of other catalogs that point to this one; a referenced row cannot be deleted. */
  referenciadoPor?: { clave: string; campo: string }[];
  minWidth?: string;
}

export interface CampoConfig {
  key: string;
  label: string;
  tipo: 'switch' | 'numero' | 'select' | 'texto' | 'email';
  opciones?: string[];
  min?: number;
  max?: number;
  ayuda?: string;
  /** Only shown (and validated) while this switch is on. */
  dependeDe?: string;
  obligatorio?: boolean;
}
export interface SeccionConfig { titulo: string; descripcion?: string; campos: CampoConfig[]; }
export interface ConfigFormDef {
  clave: string;
  nota?: string;
  tabs: { nombre: string; secciones: SeccionConfig[] }[];
  valores: Record<string, string | number | boolean>;
}
