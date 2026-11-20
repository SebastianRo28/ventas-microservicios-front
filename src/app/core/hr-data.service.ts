import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { API_URL } from './api';
import { AsistenciaApi } from './asistencia-api.service';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { UiStateService } from './ui-state.service';
import {
  Boleta, Cargo, Colaborador, Competencia, Division, FamiliaCargo, Pendiente, PeriodoRem, Serie, UsuarioCreado, UsuarioCuenta, UsuarioGuardar
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
  BANDAS, Banda, CargoMercado, ESTUDIO_SALARIAL, NIVELES_BANDA, NivelBanda, PERFILES, Perfil, REMUNERACIONES, Remuneracion
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

  constructor(private audit: AuditService, private http: HttpClient, private auth: AuthService, private ui: UiStateService,
              private asistenciaApi: AsistenciaApi) {
    // Page reloaded with a session still open: load the data again.
    if (auth.autenticado) this.cargar().subscribe();
    auth.usuario$.subscribe((u) => { if (!u) this.colaboradores$.next([]); });
  }
  /** Signed-in user (topbar, "created by" fields). */
  get usuario(): { nombre: string; iniciales: string } {
    const u = this.auth.usuario;
    return { nombre: u?.nombre ?? '—', iniciales: u?.iniciales ?? '—' };
  }

  private readonly colaboradores$ = new BehaviorSubject<Colaborador[]>([]);

  /** Loads what comes from the API (collaborators and, for administrators, the change log). */
  cargar(): Observable<void> {
    if (!this.auth.autenticado || this.auth.debeCambiarPassword) return of(undefined);
    return forkJoin([this.http.get<Colaborador[]>(`${API_URL}/colaboradores`), this.audit.cargar(), this.asistenciaApi.cargar()]).pipe(
      map(([cs]) => { this.colaboradores$.next(cs); }),
      catchError(() => { this.ui.toast('No se pudo cargar la información desde el servidor de Nexo RH'); return of(undefined); }),
    );
  }

  colaboradores(): Observable<Colaborador[]> { return this.colaboradores$.asObservable(); }

  colaborador(id: number): Observable<Colaborador | undefined> {
    return this.colaboradores$.pipe(map((list) => list.find((c) => c.id === id)));
  }

  /** Creates a collaborator in the API (it validates and records the change) and reloads the list. */
  addColaborador(data: Omit<Colaborador, 'id'>): Observable<Colaborador> {
    return this.http.post<Colaborador>(`${API_URL}/colaboradores`, data).pipe(
      switchMap((nuevo) => this.cargar().pipe(map(() => nuevo))),
    );
  }
  cargos(): Observable<Cargo[]> { return this.http.get<Cargo[]>(`${API_URL}/organizacion/cargos`).pipe(catchError(() => of([]))); }
  crearCargo(p: { nombre: string; codigo: string; familia: string; subAreas: number; descripcion: string }): Observable<Cargo> {
    return this.http.post<Cargo>(`${API_URL}/organizacion/cargos`, p).pipe(tap(() => this.audit.cargar().subscribe()));
  }
  familias(): Observable<FamiliaCargo[]> { return this.http.get<FamiliaCargo[]>(`${API_URL}/organizacion/familias`).pipe(catchError(() => of([]))); }
  competencias(): Observable<Competencia[]> { return this.http.get<Competencia[]>(`${API_URL}/organizacion/competencias`).pipe(catchError(() => of([]))); }
  divisiones(): Observable<Division[]> { return this.http.get<Division[]>(`${API_URL}/organizacion/divisiones`).pipe(catchError(() => of([]))); }
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
  usuarios(): Observable<UsuarioCuenta[]> { return this.http.get<UsuarioCuenta[]>(`${API_URL}/usuarios`); }
  crearUsuario(u: UsuarioGuardar): Observable<UsuarioCreado> { return this.http.post<UsuarioCreado>(`${API_URL}/usuarios`, u); }
  modificarUsuario(id: number, u: UsuarioGuardar): Observable<UsuarioCuenta> { return this.http.put<UsuarioCuenta>(`${API_URL}/usuarios/${id}`, u); }
  estadoUsuario(id: number, activo: boolean): Observable<UsuarioCuenta> { return this.http.post<UsuarioCuenta>(`${API_URL}/usuarios/${id}/estado`, { activo }); }
  restablecerUsuario(id: number): Observable<UsuarioCreado> { return this.http.post<UsuarioCreado>(`${API_URL}/usuarios/${id}/restablecer`, {}); }
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
    return [...new Set(this.colaboradores$.value.map((c) => c.subArea))].sort((a, b) => a.localeCompare(b));
  }
}

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
