import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { API_URL } from './api';
import { AsistenciaApi } from './asistencia-api.service';
import { GenericosService } from './genericos.service';
import { PortalService } from './portal.service';
import { ItemsService } from './items.service';
import { ParametrosRemService } from './parametros-rem.service';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { UiStateService } from './ui-state.service';
import {
  Boleta, BoletaDetalle, Cargo, Colaborador, Competencia, Division, FamiliaCargo, Pendiente, PerfilCuenta, PerfilGuardar, PeriodoPlanilla, PeriodoRem, Serie, UsuarioCreado, UsuarioCuenta, UsuarioGuardar
} from './models';
import { ARCHIVOS_PAGOS, ArchivoPago, PERIODOS_PROCESOS, PeriodoProcesos } from './sample/remuneraciones';
import { SolicitudWf } from './sample/workflow';
import {
  DASHBOARDS, Dashboard, PlantillaWorkflow, WIDGETS, Widget
} from './sample/catalogos';
import {
  DENUNCIAS, Denuncia, ENCUESTAS, Encuesta
} from './sample/operaciones';
import {
  ASIGNACIONES_COLABORADORES, ASIGNACIONES_EMPRESAS, AsignacionSst, BIBLIOTECA_SST, CORREOS, CUMPLIMIENTOS, CorreoAutomatico,
  Cumplimiento, CumplimientoBiblioteca, ENCUESTAS_CLIMA, EncuestaClima, REQUISITOS, Requisito
} from './sample/sst';
import {
  ACCIONES_RAPIDAS, ElementoPortal, IMPORTADORES, Importador, PORTADAS, PUBLICACIONES,
  Publicacion, RECONOCIMIENTOS, Reconocimiento
} from './sample/reportes';
import {
  NIVELES_BANDA, NivelBanda
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
              private asistenciaApi: AsistenciaApi, private items: ItemsService, private parametrosRem: ParametrosRemService,
              private genericos: GenericosService, private portal: PortalService) {
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
    return forkJoin([this.http.get<Colaborador[]>(`${API_URL}/colaboradores`), this.audit.cargar(), this.asistenciaApi.cargar(),
      this.items.cargar(), this.parametrosRem.cargar(), this.genericos.cargar(), this.cargarWorkflow(), this.portal.cargarReconocimientos(),
      this.portal.cargarEncuestas()]).pipe(
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

  // --- Workflow (API) ---------------------------------------------------------------------------------------------
  private readonly solicitudes$ = new BehaviorSubject<SolicitudWf[]>([]);
  solicitudesWf(): Observable<SolicitudWf[]> { return this.solicitudes$.asObservable(); }

  /** Requests the user may see; "grupo" sorts them into the trays (to act on, created by me, the rest). */
  cargarWorkflow(): Observable<void> {
    if (!this.auth.autenticado || this.auth.debeCambiarPassword) return of(undefined);
    return this.http.get<SolicitudWf[]>(`${API_URL}/workflow/solicitudes`).pipe(
      map((l) => { this.solicitudes$.next(l.map((x) => ({ ...x, grupo: x.puedoResolver ? 'me' : x.esMia ? 'mine' : 'all' }))); }),
      catchError(() => of(undefined)),
    );
  }

  /** Own request from Mi Portal › Procesos Internos (the API validates the amount and the options). */
  solicitarDesdePortal(proceso: string, valor: string): Observable<SolicitudWf> {
    return this.http.post<SolicitudWf>(`${API_URL}/workflow/solicitudes/portal`, { proceso, valor }).pipe(tap(() => this.cargarWorkflow().subscribe()));
  }

  /** Request from an active template (HR, or a manager for someone in their team). */
  solicitarDesdePlantilla(plantillaId: number, afectadoId: number | null, detalle: string): Observable<SolicitudWf> {
    return this.http.post<SolicitudWf>(`${API_URL}/workflow/solicitudes`, { plantillaId, afectadoId, detalle }).pipe(tap(() => this.cargarWorkflow().subscribe()));
  }

  /** Approves or rejects; an approved salary advance becomes an ADE-SUE deduction in the open payroll period. */
  resolverSolicitudWf(id: number, aprobar: boolean, comentario = ''): Observable<{ solicitud: SolicitudWf; itemId: number | null }> {
    return this.http.post<{ solicitud: SolicitudWf; itemId: number | null }>(`${API_URL}/workflow/solicitudes/${id}/resolver`, { aprobar, comentario }).pipe(
      tap(() => { this.cargarWorkflow().subscribe(); this.audit.cargar().subscribe(); this.items.cargar().subscribe(); }),
    );
  }

  plantillasWorkflow(): Observable<PlantillaWorkflow[]> { return this.http.get<PlantillaWorkflow[]>(`${API_URL}/workflow/plantillas`).pipe(catchError(() => of([]))); }
  estadoPlantillaWf(id: number, activa: boolean): Observable<PlantillaWorkflow> { return this.http.post<PlantillaWorkflow>(`${API_URL}/workflow/plantillas/${id}/estado`, { activa }); }
  duplicarPlantillaWf(id: number): Observable<PlantillaWorkflow> { return this.http.post<PlantillaWorkflow>(`${API_URL}/workflow/plantillas/${id}/duplicar`, {}); }
  eliminarPlantillaWf(id: number): Observable<unknown> { return this.http.delete(`${API_URL}/workflow/plantillas/${id}`); }

  dashboards(): Observable<Dashboard[]> { return of(DASHBOARDS); }
  widgets(): Observable<Widget[]> { return of(WIDGETS); }
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
  reconocimientos(): Observable<Reconocimiento[]> { return this.portal.reconocimientos$.asObservable(); }
  importadores(): Observable<Importador[]> { return of(IMPORTADORES); }
  perfiles(): Observable<PerfilCuenta[]> { return this.http.get<PerfilCuenta[]>(`${API_URL}/perfiles`); }
  crearPerfil(p: PerfilGuardar): Observable<PerfilCuenta> { return this.http.post<PerfilCuenta>(`${API_URL}/perfiles`, p); }
  modificarPerfil(id: number, p: PerfilGuardar): Observable<PerfilCuenta> { return this.http.put<PerfilCuenta>(`${API_URL}/perfiles/${id}`, p); }
  eliminarPerfil(id: number): Observable<unknown> { return this.http.delete(`${API_URL}/perfiles/${id}`); }
  usuarios(): Observable<UsuarioCuenta[]> { return this.http.get<UsuarioCuenta[]>(`${API_URL}/usuarios`); }
  crearUsuario(u: UsuarioGuardar): Observable<UsuarioCreado> { return this.http.post<UsuarioCreado>(`${API_URL}/usuarios`, u); }
  modificarUsuario(id: number, u: UsuarioGuardar): Observable<UsuarioCuenta> { return this.http.put<UsuarioCuenta>(`${API_URL}/usuarios/${id}`, u); }
  estadoUsuario(id: number, activo: boolean): Observable<UsuarioCuenta> { return this.http.post<UsuarioCuenta>(`${API_URL}/usuarios/${id}/estado`, { activo }); }
  restablecerUsuario(id: number): Observable<UsuarioCreado> { return this.http.post<UsuarioCreado>(`${API_URL}/usuarios/${id}/restablecer`, {}); }
  /** Re-sends the "Activa tu cuenta" e-mail to an account that has not been activated. */
  invitarUsuario(id: number): Observable<UsuarioCuenta> { return this.http.post<UsuarioCuenta>(`${API_URL}/usuarios/${id}/invitar`, {}); }
  /** Removes two-factor authentication (e.g. the person lost their phone). */
  quitarDobleFactor(id: number): Observable<UsuarioCuenta> { return this.http.post<UsuarioCuenta>(`${API_URL}/usuarios/${id}/2fa/quitar`, {}); }
  nivelesBanda(): Observable<NivelBanda[]> { return of(NIVELES_BANDA); }


  /** Payslips of a collaborator; the sample data only has history for Florencia Alamos (id 0). */
  /** Payslips of a collaborator (others only see their own, final ones). */
  boletas(colaboradorId: number): Observable<Boleta[]> {
    return this.http.get<Boleta[]>(`${API_URL}/remuneraciones/boletas`, { params: { colaboradorId } }).pipe(catchError(() => of([])));
  }
  boleta(id: number): Observable<BoletaDetalle> { return this.http.get<BoletaDetalle>(`${API_URL}/remuneraciones/boletas/${id}`); }
  /** Payroll periods and their payslips (administrators). */
  periodosPlanilla(): Observable<PeriodoPlanilla[]> { return this.http.get<PeriodoPlanilla[]>(`${API_URL}/remuneraciones/periodos`); }
  boletasPeriodo(periodo: string): Observable<Boleta[]> { return this.http.get<Boleta[]>(`${API_URL}/remuneraciones/boletas`, { params: { periodo } }); }
  /** "MM/YYYY" → "MM-YYYY" in the URL. */
  procesarPeriodo(periodo: string): Observable<PeriodoPlanilla> {
    return this.http.post<PeriodoPlanilla>(`${API_URL}/remuneraciones/periodos/${periodo.replace('/', '-')}/procesar`, {}).pipe(tap(() => this.audit.cargar().subscribe()));
  }
  cerrarPeriodo(periodo: string): Observable<PeriodoPlanilla> {
    return this.http.post<PeriodoPlanilla>(`${API_URL}/remuneraciones/periodos/${periodo.replace('/', '-')}/cerrar`, {}).pipe(tap(() => this.audit.cargar().subscribe()));
  }

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
