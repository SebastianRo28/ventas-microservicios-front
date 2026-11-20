/** Collaborator signed in to "Mi Portal" in the sample data (Florencia Alamos). */
export const YO_ID = 0;

/** Direct manager of each collaborator (null = top of the organization). */
export const JEFES: Record<number, number | null> = {
  5: null,
  11: 5, 1: 5, 3: 5, 9: 5, 2: 5, 10: 5,
  0: 11, 6: 11, 14: 6,
  7: 1, 13: 1,
  8: 3, 15: 3,
  4: 9,
  12: 2,
};

/** Office extension and location for the directory. */
export const CONTACTO: Record<number, { anexo: string; sede: string }> = {
  0: { anexo: '214', sede: 'Sede central · San Isidro' }, 1: { anexo: '301', sede: 'Almacén Lurín' }, 2: { anexo: '120', sede: 'Sede central · San Isidro' },
  3: { anexo: '410', sede: 'Sede central · San Isidro' }, 4: { anexo: '512', sede: 'Tienda Miraflores' }, 5: { anexo: '100', sede: 'Sede central · San Isidro' },
  6: { anexo: '220', sede: 'Sede central · San Isidro' }, 7: { anexo: '305', sede: 'Almacén Lurín' }, 8: { anexo: '415', sede: 'Remoto' },
  9: { anexo: '510', sede: 'Tienda Miraflores' }, 10: { anexo: '520', sede: 'Sede central · San Isidro' }, 11: { anexo: '210', sede: 'Sede central · San Isidro' },
  12: { anexo: '125', sede: 'Sede central · San Isidro' }, 13: { anexo: '310', sede: 'Almacén Lurín' }, 14: { anexo: '222', sede: 'Sede central · San Isidro' },
  15: { anexo: '420', sede: 'Sede central · San Isidro' },
};

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

export const BENEFICIOS: Beneficio[] = [
  { id: 1, nombre: 'Tarde libre', descripcion: 'Media jornada libre, coordinada con tu jefatura.', categoria: 'Tiempo libre', puntos: 600, stock: null, icono: 'clock' },
  { id: 2, nombre: 'Día de cumpleaños', descripcion: 'El día de tu cumpleaños es libre.', categoria: 'Tiempo libre', puntos: 0, stock: null, icono: 'gift' },
  { id: 3, nombre: 'Mes de gimnasio', descripcion: 'Membresía de un mes en la cadena aliada.', categoria: 'Bienestar', puntos: 900, stock: 5, icono: 'heart' },
  { id: 4, nombre: 'Sesión de nutrición', descripcion: 'Consulta virtual con nutricionista.', categoria: 'Bienestar', puntos: 350, stock: 10, icono: 'smile' },
  { id: 5, nombre: 'Curso online', descripcion: 'Un curso a elección en la plataforma de e-learning aliada.', categoria: 'Educación', puntos: 1500, stock: null, icono: 'grad' },
  { id: 6, nombre: 'Vale de almuerzo', descripcion: 'Vale de S/ 40 en restaurantes afiliados.', categoria: 'Alimentación', puntos: 250, stock: 20, icono: 'coins' },
  { id: 7, nombre: 'Entradas al cine (2)', descripcion: 'Dos entradas 2D para cualquier función.', categoria: 'Entretenimiento', puntos: 400, stock: 0, icono: 'play' },
];

export interface Canje { id: number; beneficioId: number; fecha: string; puntos: number; estado: 'Solicitado' | 'Entregado'; }

/** Florencia's points: 1,200 available, as shown in her record. */
export const PUNTOS_INICIALES = 1200;
export const CANJES: Canje[] = [
  { id: 1, beneficioId: 6, fecha: '20/02/2026', puntos: 250, estado: 'Entregado' },
  { id: 2, beneficioId: 4, fecha: '05/01/2026', puntos: 350, estado: 'Entregado' },
];

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

const ESCALA = ['1', '2', '3', '4', '5'];
export const MIS_ENCUESTAS: EncuestaPortal[] = [
  {
    id: 1, nombre: 'Clima organizacional 2026', descripcion: 'Cuéntanos cómo te sientes trabajando en Comercial Andina. Toma 3 minutos.',
    termino: '31/03/2026', anonima: true, respondida: null,
    preguntas: [
      { id: 'c1', texto: 'Me siento orgulloso(a) de trabajar aquí.', tipo: 'escala', opciones: ESCALA, obligatoria: true },
      { id: 'c2', texto: 'Mi jefatura me da retroalimentación útil.', tipo: 'escala', opciones: ESCALA, obligatoria: true },
      { id: 'c3', texto: 'Tengo las herramientas para hacer bien mi trabajo.', tipo: 'escala', opciones: ESCALA, obligatoria: true },
      { id: 'c4', texto: '¿Recomendarías la empresa como lugar de trabajo?', tipo: 'opcion', opciones: ['Sí', 'Tal vez', 'No'], obligatoria: true },
      { id: 'c5', texto: '¿Qué mejorarías?', tipo: 'texto', obligatoria: false },
    ],
  },
  {
    id: 2, nombre: 'Buzón de sugerencias 2026', descripcion: 'Comparte ideas para mejorar procesos, beneficios o el día a día.',
    termino: '31/12/2026', anonima: false, respondida: null,
    preguntas: [
      { id: 's1', texto: 'Tema de tu sugerencia', tipo: 'opcion', opciones: ['Procesos', 'Beneficios', 'Infraestructura', 'Otro'], obligatoria: true },
      { id: 's2', texto: 'Tu sugerencia', tipo: 'texto', obligatoria: true },
    ],
  },
  {
    id: 3, nombre: 'Percepción de seguridad laboral', descripcion: 'Encuesta de SST de febrero.', termino: '20/02/2026', anonima: true, respondida: '12/02/2026',
    preguntas: [{ id: 'p1', texto: 'Conozco las rutas de evacuación de mi sede.', tipo: 'escala', opciones: ESCALA, obligatoria: true }],
  },
];

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

export const CURSOS: Curso[] = [
  { id: 1, nombre: 'Seguridad y salud en el trabajo · 1er trimestre', categoria: 'SST', horas: 2, vence: '31/03/2026', obligatorio: true,
    modulos: ['Política y reglamento interno de SST', 'Identificación de peligros (IPERC)', 'Plan de respuesta ante emergencias'], hechos: [0], completado: null, inscrito: true },
  { id: 2, nombre: 'Prevención del hostigamiento sexual laboral', categoria: 'Cumplimiento', horas: 1.5, vence: '30/04/2026', obligatorio: true,
    modulos: ['Marco legal (Ley 27942)', 'Cómo identificarlo', 'Canales de denuncia'], hechos: [], completado: null, inscrito: true },
  { id: 3, nombre: 'Protección de datos personales', categoria: 'Cumplimiento', horas: 1, vence: '15/02/2026', obligatorio: true,
    modulos: ['Ley 29733 en la práctica', 'Casos en Finanzas'], hechos: [0, 1], completado: '10/02/2026', inscrito: true },
  { id: 4, nombre: 'Excel avanzado para finanzas', categoria: 'Técnico', horas: 8, vence: null, obligatorio: false,
    modulos: ['Tablas dinámicas', 'Power Query', 'Modelos de flujo de caja', 'Dashboards'], hechos: [], completado: null, inscrito: false },
  { id: 5, nombre: 'Comunicación efectiva', categoria: 'Habilidades', horas: 3, vence: null, obligatorio: false,
    modulos: ['Escucha activa', 'Feedback', 'Presentaciones breves'], hechos: [], completado: null, inscrito: false },
];

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

export const EVALUACIONES: Evaluacion[] = [
  { id: 2, nombre: 'Evaluación de desempeño 2026-I', periodo: 'Ene–Jun 2026', cierre: '15/07/2026', evaluador: 'Navarro Ríos, Gonzalo',
    estado: 'Autoevaluación pendiente', auto: {}, jefe: {}, comentarioJefe: '' },
  { id: 1, nombre: 'Evaluación de desempeño 2025', periodo: 'Ene–Dic 2025', cierre: '31/01/2026', evaluador: 'Navarro Ríos, Gonzalo', estado: 'Cerrada',
    auto: { 'Trabajo en equipo': 4, 'Orientación a resultados': 4, 'Comunicación efectiva': 3, 'Adaptabilidad': 4 },
    jefe: { 'Trabajo en equipo': 5, 'Orientación a resultados': 4, 'Comunicación efectiva': 4, 'Adaptabilidad': 4 },
    comentarioJefe: 'Excelente cierre anual y conciliaciones sin observaciones. Para 2026: liderar la automatización de reportes de tesorería.' },
];

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
