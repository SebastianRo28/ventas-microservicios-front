import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { AuditService } from './audit.service';
import {
  Boleta, Cargo, Colaborador, Competencia, Division, FamiliaCargo, Pendiente, PeriodoRem, Serie
} from './models';
import { ARCHIVOS_PAGOS, ArchivoPago, PERIODOS_PROCESOS, PeriodoProcesos } from './sample/remuneraciones';
import { PlantillaWf, SOLICITUDES_WF, SolicitudWf } from './sample/workflow';
import { DOCUMENTOS, Documento, DocumentoEliminado, PAPELERA } from './sample/documentos';
import {
  ACTIVOS, Activo, DASHBOARDS, Dashboard, PLANTILLAS_DOCUMENTO, PLANTILLAS_WORKFLOW, PlantillaDocumento, PlantillaWorkflow, WIDGETS, Widget
} from './sample/catalogos';
import {
  CATEGORIAS, Categoria, DENUNCIAS, Denuncia, ENCUESTAS, Encuesta, ORDENES, OrdenActivo, PRODUCTOS, Producto
} from './sample/operaciones';
import {
  ASIGNACIONES_COLABORADORES, ASIGNACIONES_EMPRESAS, AsignacionSst, BIBLIOTECA_SST, CORREOS, CUMPLIMIENTOS, CorreoAutomatico,
  Cumplimiento, CumplimientoBiblioteca, ENCUESTAS_CLIMA, EncuestaClima, REQUISITOS, Requisito
} from './sample/sst';
import {
  ACCIONES_RAPIDAS, EjecucionReporte, ElementoPortal, HISTORIAL_REPORTES, IMPORTADORES, Importador, PORTADAS, PUBLICACIONES,
  Publicacion, RECONOCIMIENTOS, REPORTES, Reconocimiento, Reporte
} from './sample/reportes';
import {
  BANDAS, Banda, CargoMercado, ESTUDIO_SALARIAL, NIVELES_BANDA, NivelBanda, PERFILES, Perfil, REMUNERACIONES, Remuneracion, USUARIOS, Usuario
} from './sample/compensaciones';

/**
 * Data access for Nexo RH. There is no HR backend yet, so this serves the sample company
 * from the design ("Comercial Andina S.A.C.", marzo 2026). Swap each method for an
 * HttpClient call when the API exists; the Observable signatures stay the same.
 */
@Injectable({ providedIn: 'root' })
export class HrDataService {
  /** Editable from Parámetros generales. */
  empresa = 'Comercial Andina S.A.C.';
  readonly periodo = 'Marzo 2026';
  /** Organizational level used by Headcount (Headcount › Configuraciones). */
  hcNivel: 'division' | 'area' | 'subarea' = 'area';

  constructor(private audit: AuditService) {}
  readonly usuario = { nombre: 'Rodrigo Paredes', iniciales: 'RP' };

  private readonly colaboradores$ = new BehaviorSubject<Colaborador[]>(COLABORADORES);

  colaboradores(): Observable<Colaborador[]> { return this.colaboradores$.asObservable(); }

  colaborador(id: number): Observable<Colaborador | undefined> {
    return this.colaboradores$.pipe(map((list) => list.find((c) => c.id === id)));
  }

  /** Adds a collaborator in memory (until there is an API) and returns it with its new id. */
  addColaborador(data: Omit<Colaborador, 'id'>): Colaborador {
    const list = this.colaboradores$.value;
    const nuevo: Colaborador = { ...data, id: Math.max(...list.map((c) => c.id)) + 1 };
    this.colaboradores$.next([...list, nuevo].sort((a, b) => a.apellidos.localeCompare(b.apellidos)));
    this.audit.registrar({ colaborador: `${nuevo.apellidos}, ${nuevo.nombres}`, documento: nuevo.documento,
      entidad: `Colaborador #${nuevo.id}`, accion: 'Crear', actual: 'Creado' });
    return nuevo;
  }
  cargos(): Observable<Cargo[]> { return of(CARGOS); }
  familias(): Observable<FamiliaCargo[]> { return of(FAMILIAS); }
  competencias(): Observable<Competencia[]> { return of(COMPETENCIAS); }
  divisiones(): Observable<Division[]> { return of(DIVISIONES); }
  periodos(): Observable<PeriodoRem[]> { return of(PERIODOS); }
  periodosProcesos(): Observable<PeriodoProcesos[]> { return of(PERIODOS_PROCESOS); }
  archivosPagos(): Observable<ArchivoPago[]> { return of(ARCHIVOS_PAGOS); }

  private readonly solicitudes$ = new BehaviorSubject<SolicitudWf[]>(SOLICITUDES_WF);
  solicitudesWf(): Observable<SolicitudWf[]> { return this.solicitudes$.asObservable(); }

  /** Starts a workflow request from a template, created by the signed-in admin. */
  addSolicitudWf(t: PlantillaWf, extra: Partial<Pick<SolicitudWf, 'titulo' | 'solicitante' | 'afectado' | 'documento' | 'grupo'>> = {}): SolicitudWf {
    const list = this.solicitudes$.value;
    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nueva: SolicitudWf = {
      id: String(Math.max(...list.map((s) => +s.id)) + 1), titulo: t.nombre, estado: 'Pendiente', tipo: t.tipo,
      solicitante: this.usuario.nombre, afectado: '—', documento: '—', progreso: 0, creada: hoy, actualizada: hoy, grupo: 'mine', ...extra,
    };
    this.solicitudes$.next([nueva, ...list]);
    return nueva;
  }

  /** Approves or rejects a workflow request (and records it in the change log). */
  resolverSolicitudWf(id: string, aprobar: boolean, comentario = ''): SolicitudWf | undefined {
    const sol = this.solicitudes$.value.find((x) => x.id === id);
    if (!sol) return undefined;
    const anterior = sol.estado;
    sol.estado = aprobar ? 'Aprobada' : 'Rechazada';
    sol.progreso = 100;
    sol.actualizada = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.solicitudes$.next([...this.solicitudes$.value]);
    this.audit.registrar({ colaborador: sol.afectado, documento: sol.documento, entidad: `Solicitud #${sol.id}`, accion: 'Modificar',
      propiedad: 'estado', anterior, actual: sol.estado + (comentario ? ` · ${comentario}` : '') });
    return sol;
  }

  plantillasWorkflow(): Observable<PlantillaWorkflow[]> { return of(PLANTILLAS_WORKFLOW); }
  plantillasDocumento(): Observable<PlantillaDocumento[]> { return of(PLANTILLAS_DOCUMENTO); }
  dashboards(): Observable<Dashboard[]> { return of(DASHBOARDS); }
  widgets(): Observable<Widget[]> { return of(WIDGETS); }
  activos(): Observable<Activo[]> { return of(ACTIVOS); }
  ordenes(): Observable<OrdenActivo[]> { return of(ORDENES); }
  categorias(): Observable<Categoria[]> { return of(CATEGORIAS); }
  productos(): Observable<Producto[]> { return of(PRODUCTOS); }
  denuncias(): Observable<Denuncia[]> { return of(DENUNCIAS); }
  encuestas(): Observable<Encuesta[]> { return of(ENCUESTAS); }
  requisitos(): Observable<Requisito[]> { return of(REQUISITOS); }
  asignacionesSst(): Observable<{ colaboradores: AsignacionSst[]; empresas: AsignacionSst[] }> {
    return of({ colaboradores: ASIGNACIONES_COLABORADORES, empresas: ASIGNACIONES_EMPRESAS });
  }
  cumplimientos(): Observable<Cumplimiento[]> { return of(CUMPLIMIENTOS); }
  bibliotecaSst(): Observable<CumplimientoBiblioteca[]> { return of(BIBLIOTECA_SST); }
  encuestasClima(): Observable<EncuestaClima[]> { return of(ENCUESTAS_CLIMA); }
  correos(): Observable<CorreoAutomatico[]> { return of(CORREOS); }
  publicaciones(): Observable<Publicacion[]> { return of(PUBLICACIONES); }
  portadas(): Observable<ElementoPortal[]> { return of(PORTADAS); }
  accionesRapidas(): Observable<ElementoPortal[]> { return of(ACCIONES_RAPIDAS); }
  reconocimientos(): Observable<Reconocimiento[]> { return of(RECONOCIMIENTOS); }
  importadores(): Observable<Importador[]> { return of(IMPORTADORES); }
  reportes(): Observable<Reporte[]> { return of(REPORTES); }
  historialReportes(): Observable<EjecucionReporte[]> { return of(HISTORIAL_REPORTES); }
  perfiles(): Observable<Perfil[]> { return of(PERFILES); }
  usuarios(): Observable<Usuario[]> { return of(USUARIOS); }
  bandas(): Observable<Banda[]> { return of(BANDAS); }
  nivelesBanda(): Observable<NivelBanda[]> { return of(NIVELES_BANDA); }
  remuneraciones(): Observable<Record<number, Remuneracion>> { return of(REMUNERACIONES); }
  estudioSalarial(): Observable<CargoMercado[]> { return of(ESTUDIO_SALARIAL); }

  documentos(): Observable<Documento[]> { return of(DOCUMENTOS); }
  papelera(): Observable<DocumentoEliminado[]> { return of(PAPELERA); }

  /** Payslips of a collaborator; the sample data only has history for Florencia Alamos (id 0). */
  boletas(colaboradorId: number): Observable<Boleta[]> { return of(colaboradorId === 0 ? BOLETAS : []); }

  /** Last 6 months of absences and overtime for the Ficha charts. */
  asistencia(colaboradorId: number): Observable<{ meses: string[]; diasNoTrabajados: number[]; horasExtras: number[] }> {
    const zero = [0, 0, 0, 0, 0, 0];
    return of({
      meses: MESES.map((m) => m.split(' ')[0]),
      diasNoTrabajados: colaboradorId === 0 ? [0, 1, 0, 0, 1, 5] : zero,
      horasExtras: colaboradorId === 0 ? [4, 6.5, 8, 2, 0, 0] : zero,
    });
  }
  series(): Observable<{ meses: string[]; series: Serie[] }> { return of({ meses: MESES, series: SERIES }); }
  pendientes(): Observable<Pendiente[]> { return of(PENDIENTES); }

  subAreas(): string[] {
    return DIVISIONES.flatMap((d) => d.areas.flatMap((a) => a.subAreas.map((s) => s.nombre)))
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }
}

const c = (id: number, apellidos: string, nombres: string, documento: string, cargo: string, division: string,
  area: string, subArea: string, ingreso: string, sueldoNeto: number): Colaborador =>
  ({ id, apellidos, nombres, documento, cargo, division, area, subArea, ingreso, sueldoNeto });

const ADM = 'Departamento de Administración';
const FLORENCIA_DETALLE = {
  tipoDocumento: 'DNI', emailCorporativo: 'f.alamos@comercialandina.pe', telefono: '51 987 654 321', nacimiento: '14/04/1997',
  direccion: 'Av. Javier Prado Este 1250, San Isidro, Lima', carrera: 'Contabilidad y Finanzas', institucion: 'Universidad de Lima',
  planSalud: 'EsSalud', pension: 'AFP Habitat · comisión Flujo', cuspp: '612345FARRU3', banco: 'BCP · Cuenta de ahorros ****8012',
  formaPago: 'Transferencia', supervisor: 'Navarro Ríos, Gonzalo', sueldoBase: 7500, contrato: 'Indefinido',
  jornada: 'Mensual 43.0 hrs (L, M, M, J, V)', sindicalizado: 'No',
  aviso: 'El colaborador se encuentra con Licencia hasta el viernes 06 de marzo de 2026.',
};

const COLABORADORES: Colaborador[] = [
  { ...c(0, 'Alamos Ruiz', 'Florencia', '72458193', 'Analista Finanzas', ADM, 'Finanzas', 'Tesorería', '01/06/2023', 6240.5), detalle: FLORENCIA_DETALLE },
  c(1, 'Benavides Rojas', 'Diego', '70125864', 'Jefe de Operaciones', 'Operaciones', 'Logística', 'Almacén Central', '15/02/2021', 9870),
  c(2, 'Cáceres Huamán', 'Lucía', '46892317', 'Analista de RR.HH.', ADM, 'Recursos Humanos', 'Compensaciones', '03/04/2022', 5312.75),
  c(3, 'Chávez Quispe', 'Renato', '72011548', 'Desarrollador Senior', 'Tecnología', 'Desarrollo', 'Aplicaciones', '10/01/2022', 8450),
  c(4, 'Delgado Salazar', 'Andrea', '45781236', 'Ejecutiva Comercial', 'Comercial', 'Ventas', 'Corporativo', '22/08/2023', 4980.2),
  c(5, 'Espinoza Vargas', 'Martín', '41236987', 'Gerente General', 'Directorio', 'Gerencia General', 'Gerencia General', '01/03/2019', 18500),
  c(6, 'Flores Mendoza', 'Carolina', '73354120', 'Contadora', ADM, 'Contabilidad', 'Contabilidad General', '05/09/2020', 6980),
  c(7, 'Gutiérrez Paredes', 'Javier', '70458812', 'Asistente de Almacén', 'Operaciones', 'Logística', 'Almacén Central', '18/11/2024', 2150.4),
  c(8, 'Herrera Castillo', 'Valeria', '74120369', 'Diseñadora UX', 'Tecnología', 'Desarrollo', 'Producto', '07/02/2025', 5600),
  c(9, 'Huertas León', 'Paolo', '47896521', 'Supervisor de Ventas', 'Comercial', 'Ventas', 'Retail', '12/06/2021', 7120.85),
  c(10, 'Medina Torres', 'Sofía', '72589634', 'Analista de Marketing', 'Comercial', 'Marketing', 'Digital', '20/01/2024', 4750),
  c(11, 'Navarro Ríos', 'Gonzalo', '43215698', 'Jefe de Finanzas', ADM, 'Finanzas', 'Tesorería', '02/05/2018', 12340),
  c(12, 'Ortiz Ramírez', 'Daniela', '75236981', 'Practicante Profesional', ADM, 'Recursos Humanos', 'Selección', '01/03/2026', 1130),
  c(13, 'Pérez Soto', 'Luis', '40123578', 'Coordinador de SST', 'Operaciones', 'Seguridad y Salud', 'Prevención', '14/07/2022', 6050.3),
  c(14, 'Ríos Calderón', 'Ana', '71458236', 'Asistente Contable', ADM, 'Contabilidad', 'Cuentas por Pagar', '09/10/2023', 3210),
  c(15, 'Zapata Ugarte', 'Miguel', '44785123', 'Técnico de Soporte', 'Tecnología', 'Infraestructura', 'Mesa de Ayuda', '25/04/2024', 3480.6),
];

const CARGO_ROWS: [string, number, number, string, boolean][] = [
  ['Analista Finanzas', 1, 1, 'Intermedio', true], ['Jefe de Operaciones', 1, 1, 'Jefatura', true],
  ['Analista de RR.HH.', 2, 1, 'Intermedio', true], ['Desarrollador Senior', 2, 1, 'Senior', true],
  ['Ejecutiva Comercial', 1, 1, 'Intermedio', true], ['Gerente General', 1, 1, 'Gerencia', true],
  ['Contadora', 1, 1, 'Senior', true], ['Asistente de Almacén', 1, 1, 'Junior', true],
  ['Diseñadora UX', 1, 1, 'Intermedio', true], ['Supervisor de Ventas', 2, 1, 'Jefatura', true],
  ['Analista de Marketing', 1, 1, 'Intermedio', true], ['Jefe de Finanzas', 1, 1, 'Jefatura', true],
  ['Practicante Profesional', 3, 1, 'Junior', true], ['Coordinador de SST', 1, 1, 'Senior', true],
  ['Asistente Contable', 2, 1, 'Junior', true], ['Técnico de Soporte', 1, 1, 'Junior', true],
  ['Asistente Administrativo', 2, 0, 'Junior', true], ['Auxiliar de Almacén', 1, 0, 'Junior', true],
  ['Chofer', 1, 0, 'Junior', false], ['Recepcionista', 1, 0, 'Junior', false],
  ['Analista de Tesorería', 1, 0, 'Intermedio', true], ['Analista Contable', 1, 0, 'Intermedio', true],
  ['Jefe de Contabilidad', 2, 0, 'Jefatura', true], ['Jefe de RR.HH.', 3, 0, 'Jefatura', true],
  ['Analista de Selección', 1, 0, 'Intermedio', true], ['Analista de Planillas', 1, 0, 'Intermedio', true],
  ['Jefe Comercial', 3, 0, 'Jefatura', true], ['Ejecutivo de Cuentas', 1, 0, 'Intermedio', true],
  ['Vendedor Retail', 1, 0, 'Junior', true], ['Analista de Datos', 1, 0, 'Intermedio', true],
  ['Desarrollador Junior', 2, 0, 'Junior', true], ['Arquitecto de Software', 1, 0, 'Senior', true],
  ['Jefe de Tecnología', 2, 0, 'Jefatura', true], ['Soporte Técnico Nivel 2', 1, 0, 'Intermedio', true],
  ['Prevencionista de Riesgos', 1, 0, 'Intermedio', true], ['Supervisor de Almacén', 1, 0, 'Jefatura', true],
  ['Analista de Compras', 1, 0, 'Intermedio', true], ['Asistente de Marketing', 1, 0, 'Junior', true],
  ['Community Manager', 1, 0, 'Junior', true],
];
const CARGOS: Cargo[] = CARGO_ROWS.map(([nombre, subAreas, colaboradores, familia, activo], id) =>
  ({ id, nombre, subAreas, colaboradores, familia, activo }));

const FAMILIAS: FamiliaCargo[] = [
  { id: 0, nombre: 'Intermedio', cargos: 14, activo: true },
  { id: 1, nombre: 'Jefatura', cargos: 8, activo: true },
  { id: 2, nombre: 'Senior', cargos: 4, activo: true },
  { id: 3, nombre: 'Gerencia', cargos: 1, activo: true },
  { id: 4, nombre: 'Junior', cargos: 12, activo: true },
];

const COMPETENCIAS: Competencia[] = [
  { id: 0, nombre: 'Trabajo en equipo', descripcion: 'Colabora con otros para lograr objetivos comunes.', activo: true },
  { id: 1, nombre: 'Orientación a resultados', descripcion: 'Cumple metas con calidad y en los plazos acordados.', activo: true },
  { id: 2, nombre: 'Comunicación efectiva', descripcion: 'Transmite ideas con claridad y escucha activamente.', activo: true },
  { id: 3, nombre: 'Liderazgo', descripcion: 'Guía y desarrolla a su equipo.', activo: true },
  { id: 4, nombre: 'Adaptabilidad', descripcion: 'Responde con flexibilidad a los cambios.', activo: true },
];

const s = (nombre: string, colaboradores: number) => ({ nombre, colaboradores });
const DIVISIONES: Division[] = [
  { nombre: 'Directorio', colaboradores: 1, areas: [
    { nombre: 'Gerencia General', colaboradores: 1, subAreas: [s('Gerencia General', 1)] }] },
  { nombre: ADM, colaboradores: 6, areas: [
    { nombre: 'Finanzas', colaboradores: 2, subAreas: [s('Tesorería', 2)] },
    { nombre: 'Recursos Humanos', colaboradores: 2, subAreas: [s('Compensaciones', 1), s('Selección', 1)] },
    { nombre: 'Contabilidad', colaboradores: 2, subAreas: [s('Contabilidad General', 1), s('Cuentas por Pagar', 1)] }] },
  { nombre: 'Operaciones', colaboradores: 3, areas: [
    { nombre: 'Logística', colaboradores: 2, subAreas: [s('Almacén Central', 2)] },
    { nombre: 'Seguridad y Salud', colaboradores: 1, subAreas: [s('Prevención', 1)] }] },
  { nombre: 'Comercial', colaboradores: 3, areas: [
    { nombre: 'Ventas', colaboradores: 2, subAreas: [s('Corporativo', 1), s('Retail', 1)] },
    { nombre: 'Marketing', colaboradores: 1, subAreas: [s('Digital', 1)] }] },
  { nombre: 'Tecnología', colaboradores: 3, areas: [
    { nombre: 'Desarrollo', colaboradores: 2, subAreas: [s('Aplicaciones', 1), s('Producto', 1)] },
    { nombre: 'Infraestructura', colaboradores: 1, subAreas: [s('Mesa de Ayuda', 1)] }] },
];

const cerrado = (nombre: string, colaboradores: number, fechaPago: string) =>
  ({ nombre, estado: 'Cerrado', tone: 'gray' as const, colaboradores, fechaPago });
const PERIODOS: PeriodoRem[] = [
  { label: 'Marzo ’26', abierto: true, procesos: [
    { nombre: 'Pago Proceso Marzo 2026', estado: 'Iniciado', tone: 'info', colaboradores: 13, fechaPago: '31/03/2026' }] },
  { label: 'Febrero ’26', abierto: false, procesos: [cerrado('Pago Proceso Febrero 2026', 13, '27/02/2026')] },
  { label: 'Enero ’26', abierto: false, procesos: [cerrado('Pago Proceso Enero 2026', 12, '30/01/2026')] },
  { label: 'Diciembre ’25', abierto: false, procesos: [
    cerrado('Pago Proceso Diciembre 2025', 12, '22/12/2025'), cerrado('Gratificación Diciembre 2025', 12, '15/12/2025')] },
];

const b = (mes: string, bruto: number, neto: number, horasExtras: number, diasNoTrabajados: number, proceso: string, abierto = false): Boleta =>
  ({ mes, bruto, neto, aporteEmpleador: 675, horasExtras, recargos: 0, horasNoTrabajadas: 0, diasNoTrabajados, proceso, abierto });
const BOLETAS: Boleta[] = [
  b('03-2026', 7500, 6240.5, 0, 5, 'Proceso Marzo 2026', true),
  b('02-2026', 7500, 6198.2, 0, 1, 'cierre febrero'),
  b('01-2026', 7500, 6262.4, 2, 0, 'cierre enero'),
  b('12-2025', 15000, 12734.8, 8, 0, 'cierre diciembre'),
  b('11-2025', 7500, 6301.1, 6.5, 1, 'cierre noviembre'),
  b('10-2025', 7500, 6288.9, 4, 0, 'cierre octubre'),
  b('09-2025', 7500, 6240.5, 0, 0, 'cierre septiembre'),
  b('08-2025', 7500, 6240.5, 0, 0, 'Carga histórica'),
];

const MESES = ['Oct 2025', 'Nov 2025', 'Dic 2025', 'Ene 2026', 'Feb 2026', 'Mar 2026'];
const SERIES: Serie[] = [
  { titulo: 'Colaboradores', valores: [11, 11, 12, 12, 13, 13], formato: 'int' },
  { titulo: 'Gastos', valores: [188420, 190150, 312900, 196800, 208100, 213645], formato: 'money' },
  { titulo: 'Horas Extras', valores: [18, 22, 30, 12, 8, 0], formato: 'hours' },
  { titulo: 'Licencias', valores: [1, 0, 2, 1, 3, 0], formato: 'int' },
];

const PENDIENTES: Pendiente[] = [
  { tipo: 'sst', etiqueta: 'SST', tone: 'warning', fecha: '12/03/2026', titulo: 'Chaleco de seguridad por vencer', detalle: 'La evidencia de Pérez Soto, Luis vence el 31/03/2026.' },
  { tipo: 'vac', etiqueta: 'Solicitudes', tone: 'info', fecha: '11/03/2026', titulo: 'Solicitud de Vacaciones · Herrera Castillo, Valeria', detalle: 'Del 20/03/2026 al 27/03/2026 (6 días hábiles).' },
  { tipo: 'aus', etiqueta: 'Solicitudes', tone: 'info', fecha: '11/03/2026', titulo: 'Solicitud de Ausentismo · Chávez Quispe, Renato', detalle: 'Permiso por trámite personal el 14/03/2026.' },
  { tipo: 'eva', etiqueta: 'Acciones pendientes - Evaluación', tone: 'neutral', fecha: '09/03/2026', titulo: 'Evaluación de desempeño 2026', detalle: 'Completa la evaluación de tu equipo directo (4 colaboradores).' },
  { tipo: 'otro', etiqueta: 'Solicitudes', tone: 'info', fecha: '06/03/2026', titulo: '#18747 Aporte Patronal está pendiente de revisión', detalle: 'Solicitado por Navarro Ríos, Gonzalo.' },
];
