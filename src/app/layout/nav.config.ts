/**
 * Navigation tree of Nexo RH (design: "Componente · Rail + Sidebar").
 * Every leaf with a `path` becomes a route; see app-routing.module.ts.
 */
export type NavBadge = 'PRO' | 'Nuevo' | 'Beta';

export interface NavItem {
  label: string;
  icon?: string;
  path?: string;
  badges?: NavBadge[];
  count?: number;
  /** Product not available yet (Onboarding, Talento…): shown dimmed with a lock. */
  locked?: boolean;
  /** Module code (spec. 6.2) the entry needs; without it the entry shows a lock and the commercial modal. */
  modulo?: string;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
  locked?: boolean;
  modulo?: string;
  /** Section that opens a separate application instead of a menu. */
  external?: { text: string; cta: string };
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'portal', label: 'Mi Portal', icon: 'home', items: [
      { label: 'Portal', icon: 'home', path: 'portal' },
      { label: 'Mi ficha', icon: 'user', path: 'portal/mi-ficha' },
      { label: 'Mi Equipo', icon: 'users', path: 'portal/mi-equipo' },
      { label: 'Mis Beneficios', icon: 'gift', path: 'portal/mis-beneficios' },
      { label: 'Mis Encuestas', icon: 'clipcheck', path: 'portal/mis-encuestas', modulo: 'SURVEYS', count: 2 },
      { label: 'Mis Capacitaciones', icon: 'grad', path: 'portal/mis-capacitaciones' },
      { label: 'Mis Evaluaciones', icon: 'star', path: 'portal/mis-evaluaciones', modulo: 'PRO', count: 1 },
      { label: 'Reconocimientos', icon: 'award', path: 'portal/reconocimientos', modulo: 'COMMS' },
      { label: 'Procesos Internos', icon: 'workflow', path: 'portal/procesos-internos', modulo: 'PRO' },
      { label: 'Canal de Denuncias', icon: 'flag', path: 'portal/denuncias', modulo: 'WHISTLEBLOWER' },
      { label: 'Organigrama', icon: 'sitemap', path: 'portal/organigrama' },
      { label: 'Directorio', icon: 'book', path: 'portal/directorio' },
    ]
  },
  {
    id: 'admin', label: 'Administrativo', icon: 'clipboard', items: [
      { label: 'Panel de Control', icon: 'gauge', path: 'admin/panel' },
      {
        label: 'Colaboradores', icon: 'users', children: [
          { label: 'Crear Colaborador', path: 'admin/colaboradores/crear' },
          { label: 'Vigentes', path: 'admin/colaboradores/vigentes' },
          { label: 'Grupos', path: 'admin/colaboradores/grupos' },
          { label: 'Solicitudes', path: 'admin/colaboradores/solicitudes' },
        ]
      },
      {
        label: 'Organización', icon: 'building', children: [
          { label: 'Cargos', path: 'admin/organizacion/cargos' },
          { label: 'Áreas', path: 'admin/organizacion/areas' },
          { label: 'Puestos de Trabajo', path: 'admin/organizacion/puestos' },
          { label: 'Bandas Salariales', path: 'admin/compensaciones/bandas', badges: ['Nuevo'] },
        ]
      },
      {
        label: 'Workflow', icon: 'workflow', badges: ['PRO'], modulo: 'PRO', children: [
          { label: 'Solicitudes', path: 'admin/workflow/solicitudes' },
          { label: 'Plantillas', path: 'admin/workflow/plantillas' },
        ]
      },
      {
        label: 'Asistencia', icon: 'calcheck', modulo: 'ATTENDANCE', children: [
          { label: 'Gestión de Ausencia', path: 'admin/asistencia/ausencia' },
          { label: 'Vacaciones', path: 'admin/asistencia/vacaciones' },
          { label: 'Solicitudes', path: 'admin/asistencia/solicitudes' },
          { label: 'Sueldos Diarios', path: 'admin/asistencia/sueldos-diarios' },
          { label: 'Recargo Domingo', path: 'admin/asistencia/recargo-domingo' },
          { label: 'Calendario', path: 'admin/asistencia/calendario' },
          { label: 'Licencias Médicas Electrónicas', path: 'admin/asistencia/licencias' },
          { label: 'Configuraciones', path: 'admin/asistencia/configuraciones' },
        ]
      },
      {
        label: 'Documentos y Firma', icon: 'filesig', modulo: 'DOCS', children: [
          { label: 'Documentos', path: 'admin/documentos' },
          { label: 'Plantillas', path: 'admin/documentos/plantillas' },
          { label: 'Configuraciones', path: 'admin/documentos/configuraciones' },
        ]
      },
      { label: 'Onboarding', icon: 'rocket', locked: true },
      {
        label: 'Gestión de Activos', icon: 'laptop', modulo: 'ASSETS', children: [
          { label: 'Inventario', path: 'admin/activos/inventario' },
          { label: 'Órdenes', path: 'admin/activos/ordenes' },
          { label: 'Configuraciones', path: 'admin/activos/configuraciones' },
        ]
      },
      {
        label: 'Headcount', icon: 'barchart', modulo: 'HEADCOUNT', children: [
          { label: 'Planificación', path: 'admin/headcount/planificacion' },
          { label: 'Configuraciones', path: 'admin/headcount/configuraciones' },
        ]
      },
      {
        label: 'Compensaciones', icon: 'coins', modulo: 'COMP', children: [
          { label: 'Bandas salariales', path: 'admin/compensaciones/bandas' },
          { label: 'Estudio salarial', path: 'admin/compensaciones/estudio' },
          { label: 'Configuraciones', path: 'admin/compensaciones/configuraciones' },
        ]
      },
      {
        label: 'Otros', icon: 'dots', children: [
          { label: 'Anotaciones', path: 'admin/otros/anotaciones' },
        ]
      },
    ]
  },
  {
    id: 'rem', label: 'Remuneraciones', icon: 'dollar', modulo: 'PAYROLL', items: [
      { label: 'Panel de Control', icon: 'gauge', path: 'rem/panel' },
      { label: 'Procesos', icon: 'receipt', path: 'rem/procesos' },
      { label: 'Archivos y Pagos', icon: 'card', path: 'rem/archivos-pagos' },
      {
        label: 'Ítems', icon: 'list', children: [
          { label: 'Asignación de ítems', path: 'rem/items/asignacion' },
          { label: 'Tipos de ítem', path: 'rem/items/tipos' },
        ]
      },
      {
        label: 'KPI', icon: 'trend', children: [
          { label: 'Datos de KPI', path: 'rem/kpi/datos' },
          { label: 'Tipos de KPI', path: 'rem/kpi/tipos' },
        ]
      },
      { label: 'Tablas de parámetros', icon: 'table', path: 'rem/tablas' },
      { label: 'Configuraciones', icon: 'gear', path: 'rem/configuraciones' },
    ]
  },
  {
    id: 'asis', label: 'Control de Asistencia', icon: 'clock', modulo: 'ATTENDANCE', items: [
      { label: 'Panel de Control', icon: 'gauge', path: 'ca/panel' },
      {
        label: 'Recintos', icon: 'location', children: [
          { label: 'Listado de Recintos', path: 'ca/recintos' },
          { label: 'Ficha de Recinto', path: 'ca/recintos/ficha' },
        ]
      },
      {
        label: 'Colaboradores', icon: 'users', children: [
          { label: 'Listado de Colaboradores', path: 'ca/colaboradores' },
          { label: 'Tarjeta de Asistencia', path: 'ca/colaboradores/tarjeta' },
        ]
      },
      {
        label: 'Marcaciones', icon: 'login', children: [
          { label: 'Registro de Marcaciones', path: 'ca/marcaciones' },
          { label: 'Marcas Manuales', path: 'ca/marcaciones/manuales' },
          { label: 'Marcas Fallidas', path: 'ca/marcaciones/fallidas' },
        ]
      },
      {
        label: 'Turnos', icon: 'calendar', children: [
          { label: 'Listado de Turnos', path: 'ca/turnos' },
          { label: 'Asignación de Turnos', path: 'ca/turnos/asignacion' },
        ]
      },
      {
        label: 'Ausencias', icon: 'calcheck', children: [
          { label: 'Ausencias', path: 'ca/ausencias' },
          { label: 'Horas no Trabajadas', path: 'ca/ausencias/horas-no-trabajadas' },
          { label: 'Feriados', path: 'ca/ausencias/feriados' },
          { label: 'Descansos Médicos', path: 'ca/ausencias/descansos-medicos' },
          { label: 'Vacaciones', path: 'ca/ausencias/vacaciones' },
          { label: 'Permisos', path: 'ca/ausencias/permisos' },
        ]
      },
      {
        label: 'Horas Extras', icon: 'history', children: [
          { label: 'Aprobación de Horas Extras', path: 'ca/horas-extras' },
          { label: 'Reporte de Horas Extras', path: 'ca/horas-extras/reporte' },
        ]
      },
      { label: 'Reportes', icon: 'filebar', path: 'ca/reportes' },
      { label: 'Vista Consolidada', icon: 'building', path: 'ca/consolidada' },
      {
        label: 'Configuraciones', icon: 'gear', children: [
          { label: 'Tolerancias y Alertas', path: 'ca/configuraciones/tolerancias' },
          { label: 'Métodos de Marcación', path: 'ca/configuraciones/metodos' },
        ]
      },
    ]
  },
  {
    id: 'do', label: 'Desarrollo Organizacional', icon: 'handheart', items: [
      { label: 'Talento', icon: 'star', locked: true },
      { label: 'Selección', icon: 'user-search', locked: true },
      {
        label: 'Comunicaciones', icon: 'message', modulo: 'COMMS', children: [
          { label: 'Portal', path: 'do/comunicaciones/portal' },
          { label: 'Reconocimientos', path: 'do/comunicaciones/reconocimientos' },
          { label: 'Servicio al colaborador', path: 'do/comunicaciones/servicio' },
          { label: 'Correos', path: 'do/comunicaciones/correos' },
        ]
      },
      {
        label: 'Encuestas', icon: 'clipcheck', modulo: 'SURVEYS', children: [
          { label: 'Libre', path: 'do/encuestas/libre' },
          { label: 'Clima', path: 'do/encuestas/clima' },
          { label: 'Configuraciones', path: 'do/encuestas/configuraciones' },
        ]
      },
      {
        label: 'Canal de denuncias', icon: 'flag', modulo: 'WHISTLEBLOWER', children: [
          { label: 'Denuncias', path: 'do/denuncias' },
          { label: 'Configuraciones', path: 'do/denuncias/configuraciones' },
        ]
      },
    ]
  },
  {
    id: 'sst', label: 'Seguridad y Salud en el Trabajo', icon: 'shield', modulo: 'SST', items: [
      {
        label: 'Registro de evidencias', icon: 'shield', children: [
          { label: 'Requisitos', path: 'sst/requisitos' },
          { label: 'Cumplimientos', path: 'sst/cumplimientos' },
          { label: 'Configuraciones', path: 'sst/configuraciones' },
        ]
      },
    ]
  },
  { id: 'ben', label: 'Beneficios', icon: 'gift', items: [], locked: true },
  { id: 'tal', label: 'Talento / Capacitaciones', icon: 'grad', items: [], locked: true },
  {
    id: 'rep', label: 'Reportería', icon: 'folder', items: [
      { label: 'Analítica', icon: 'pie', path: 'rep/analitica', modulo: 'PRO', badges: ['Beta', 'PRO'] },
      { label: 'Exportadores', icon: 'download', path: 'rep/exportadores' },
      {
        label: 'Importadores', icon: 'upload', children: [
          { label: 'Importadores', path: 'rep/importadores' },
          { label: 'Historial de Cargas', path: 'rep/importadores/historial' },
        ]
      },
      {
        label: 'Reportes', icon: 'filebar', children: [
          { label: 'Mis Reportes', path: 'rep/reportes' },
          { label: 'Reportes gráficos', path: 'rep/reportes/graficos' },
        ]
      },
    ]
  },
  { id: 'tienda', label: 'Tienda', icon: 'store', items: [], locked: true },
];

export interface NavLeaf {
  path: string;
  label: string;
  section: NavSection;
  group?: NavItem;
  /** Module the screen needs (its own, its group's or its section's). */
  modulo?: string;
}

/** Flat list of every routable leaf, first occurrence wins for duplicated paths. */
export const NAV_LEAVES: NavLeaf[] = (() => {
  const out: NavLeaf[] = [];
  const seen = new Set<string>();
  const add = (item: NavItem, section: NavSection, group?: NavItem) => {
    if (item.path && !seen.has(item.path)) {
      seen.add(item.path);
      out.push({ path: item.path, label: item.label, section, group, modulo: item.modulo ?? group?.modulo ?? section.modulo });
    }
    item.children?.forEach((c) => add(c, section, item));
  };
  NAV_SECTIONS.forEach((s) => s.items.forEach((i) => add(i, s)));
  return out;
})();

/** Detail pages that belong to a menu entry (e.g. a Ficha lives under Vigentes). */
const PARENTS: [RegExp, string][] = [
  [/^admin\/colaboradores\/ficha(\/|$)/, 'admin/colaboradores/vigentes'],
  [/^ca\/colaboradores\/perfil(\/|$)/, 'ca/colaboradores'],
  [/^ca\/recintos\/ficha\//, 'ca/recintos/ficha'],
];

export function findLeaf(path: string): NavLeaf | undefined {
  const clean = path.replace(/^\//, '').split(/[?#]/)[0];
  const target = PARENTS.find(([re]) => re.test(clean))?.[1] ?? clean;
  return NAV_LEAVES.find((l) => l.path === target);
}
