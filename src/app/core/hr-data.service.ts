import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { API_URL } from './api';
import { AsistenciaApi } from './asistencia-api.service';
import { GenericosService } from './genericos.service';
import { PortalService } from './portal.service';
import { ItemsService } from './items.service';
import { ParametrosRemService } from './parametros-rem.service';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { UiStateService } from './ui-state.service';
import { ContextoService } from './contexto.service';
import { DatosService } from './datos.service';
import {
  Boleta, BoletaDetalle, Cargo, Ubigeo, Colaborador, Competencia, Division, FamiliaCargo, PerfilCuenta, PerfilGuardar, PeriodoPlanilla, UsuarioCreado, UsuarioCuenta, UsuarioGuardar
} from './models';
import { ArchivoPago } from './sample/remuneraciones';
import { SolicitudWf } from './sample/workflow';
import { Dashboard, PlantillaWorkflow, Widget } from './sample/catalogos';
import { CorreoAutomatico } from './sample/sst';
import { ElementoPortal, IMPORTADORES, Importador, Reconocimiento } from './sample/reportes';
import { NivelBanda } from './sample/compensaciones';

/**
 * Data access for Nexo RH: everything comes from the API of the signed-in company (its own tables, or /api/datos for
 * the modules that store their records as JSON). The importer list is the product's catalog of templates.
 */
@Injectable({ providedIn: 'root' })
export class HrDataService {
  /** Name of the signed-in company (from /api/me/context); editable from Parámetros generales. */
  empresa = '';
  /** Organizational level used by Headcount (Headcount › Configuraciones). */
  hcNivel: 'division' | 'area' | 'subarea' = 'area';

  constructor(private audit: AuditService, private http: HttpClient, private auth: AuthService, private ui: UiStateService,
              private asistenciaApi: AsistenciaApi, private items: ItemsService, private parametrosRem: ParametrosRemService,
              private genericos: GenericosService, private portal: PortalService, contexto: ContextoService, private datosMod: DatosService) {
    contexto.contexto$.subscribe((c) => { this.empresa = c?.tenant.nombre ?? ''; });
    // Page reloaded with a session still open: load the data again.
    if (auth.autenticado) this.cargar().subscribe();
    auth.usuario$.subscribe((u) => { if (!u) this.colaboradores$.next([]); });
    // The portal org chart (who reports to whom) follows each collaborator's manager.
    this.colaboradores$.subscribe((cs) => portal.fijarJefes(cs));
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
      this.items.cargar(), this.parametrosRem.cargar(), this.genericos.cargar(), this.cargarWorkflow(), this.portal.cargarReconocimientos(), this.portal.cargarValores(),
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
  private ubigeo$?: Observable<Ubigeo>;
  /** Departamentos, provincias y distritos (catálogo global de la consola); se pide una vez por sesión. */
  ubigeo(): Observable<Ubigeo> {
    return this.ubigeo$ ??= this.http.get<Ubigeo>(`${API_URL}/ubigeo`).pipe(
      catchError(() => { this.ubigeo$ = undefined; return of<Ubigeo>({ version: null, departamentos: [] }); }), shareReplay(1));
  }
  divisiones(): Observable<Division[]> { return this.http.get<Division[]>(`${API_URL}/organizacion/divisiones`).pipe(catchError(() => of([]))); }
  archivosPagos(): Observable<ArchivoPago[]> { return this.datosMod.lista$<ArchivoPago>('archivos-pago'); }

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

  dashboards(): Observable<Dashboard[]> { return this.datosMod.lista$<Dashboard>('dashboards'); }
  widgets(): Observable<Widget[]> { return this.datosMod.lista$<Widget>('widgets'); }
  correos(): Observable<CorreoAutomatico[]> { return this.datosMod.lista$<CorreoAutomatico>('correos-automaticos'); }
  portadas(): Observable<ElementoPortal[]> { return this.datosMod.lista$<ElementoPortal>('portal-portadas'); }
  accionesRapidas(): Observable<ElementoPortal[]> { return this.datosMod.lista$<ElementoPortal>('portal-accesos'); }
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
  nivelesBanda(): Observable<NivelBanda[]> { return this.datosMod.lista$<NivelBanda & { id: number }>('bandas-niveles'); }


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


  subAreas(): string[] {
    return [...new Set(this.colaboradores$.value.map((c) => c.subArea))].sort((a, b) => a.localeCompare(b));
  }
}
