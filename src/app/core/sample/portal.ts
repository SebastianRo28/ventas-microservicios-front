

export type CategoriaBeneficio = 'Bienestar' | 'Tiempo libre' | 'Educación' | 'Alimentación' | 'Entretenimiento';

export interface Beneficio {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: CategoriaBeneficio;
  puntos: number;
  /** Units left this month; null = unlimited. */
  stock: number | null;
  icono: string;
}

export interface Canje { id: number; beneficioId: number; fecha: string; puntos: number; estado: 'Solicitado' | 'Entregado'; }

export type TipoPregunta = 'escala' | 'opcion' | 'texto';
export interface Pregunta { id: string; texto: string; tipo: TipoPregunta; opciones?: string[]; obligatoria: boolean; }
export interface EncuestaPortal {
  id: number;
  nombre: string;
  descripcion: string;
  termino: string;
  anonima: boolean;
  preguntas: Pregunta[];
  respondida: string | null;
}

// --- Capacitaciones -----------------------------------------------------------
export type EstadoCurso = 'Pendiente' | 'En curso' | 'Completado';
export interface Curso {
  id: number;
  nombre: string;
  categoria: 'SST' | 'Cumplimiento' | 'Habilidades' | 'Técnico';
  horas: number;
  /** Assigned courses have a due date; optional ones from the catalog do not. */
  vence: string | null;
  obligatorio: boolean;
  modulos: string[];
  /** Indexes of completed modules. */
  hechos: number[];
  completado: string | null;
  inscrito: boolean;
}

// --- Evaluaciones -------------------------------------------------------------
export interface Evaluacion {
  id: number;
  nombre: string;
  periodo: string;
  cierre: string;
  evaluador: string;
  estado: 'Autoevaluación pendiente' | 'Esperando a la jefatura' | 'Cerrada';
  /** Self assessment and manager scores per competency (1–5). */
  auto: Record<string, number>;
  jefe: Record<string, number>;
  comentarioJefe: string;
}

// --- Procesos internos ----------------------------------------------------------
export interface ProcesoPortal {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  icono: string;
  campo: { label: string; tipo: 'texto' | 'monto' | 'opcion'; opciones?: string[]; obligatorio: boolean };
}

export const PROCESOS_PORTAL: ProcesoPortal[] = [
  { id: 'constancia', nombre: 'Constancia de trabajo', descripcion: 'Documento que acredita tu vínculo laboral y antigüedad.', tipo: 'Documento', icono: 'filesig',
    campo: { label: 'Dirigida a', tipo: 'opcion', opciones: ['A quien corresponda', 'Entidad bancaria', 'Embajada / consulado'], obligatorio: true } },
  { id: 'quinta', nombre: 'Certificado de retenciones de 5ta', descripcion: 'Certificado anual de rentas y retenciones para tu declaración.', tipo: 'Documento', icono: 'receipt',
    campo: { label: 'Año', tipo: 'opcion', opciones: ['2025', '2024'], obligatorio: true } },
  { id: 'adelanto', nombre: 'Adelanto de sueldo', descripcion: 'Hasta el 50 % de tu sueldo base, descontado en la siguiente boleta.', tipo: 'Flexible', icono: 'coins',
    campo: { label: 'Monto (S/)', tipo: 'monto', obligatorio: true } },
  { id: 'datos', nombre: 'Actualización de datos personales', descripcion: 'Dirección, teléfono, contacto de emergencia o cuenta de pago.', tipo: 'Flexible', icono: 'user',
    campo: { label: '¿Qué dato quieres actualizar?', tipo: 'texto', obligatorio: true } },
  { id: 'activo', nombre: 'Solicitud de activo', descripcion: 'Equipo, accesorio o licencia para tu trabajo.', tipo: 'Flexible', icono: 'laptop',
    campo: { label: '¿Qué necesitas?', tipo: 'texto', obligatorio: true } },
];
