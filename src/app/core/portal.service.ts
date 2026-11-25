import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, tap } from 'rxjs';
import { API_URL } from './api';
import { fmtFecha } from './asistencia.service';
import { AuthService } from './auth.service';
import { DatosService } from './datos.service';
import { Reconocimiento } from './sample/reportes';
import { Beneficio, Canje, Curso, EncuestaPortal, Evaluacion } from './sample/portal';

/** Company value used in recognitions (GET /api/reconocimientos/valores); tono is a palette token. */
export interface ValorReconocimiento { nombre: string; color: string; icono: string; }
const TONOS: Record<string, string> = {
  primary: 'var(--nx-primary-700)', success: 'var(--nx-success-700)', orange: 'var(--nx-orange-700)', info: 'var(--nx-info-800)',
  violet: 'var(--nx-primary-900)', danger: 'var(--nx-danger-700)', warning: 'var(--nx-warning-700)',
};

/** Course progress of the signed-in collaborator (/api/datos/curso-avance). */
interface AvanceCurso { id: number; cursoId: number; inscrito: boolean; hechos: number[]; completado: string | null; }

/**
 * State of the collaborator portal of the signed-in user, all from the API: recognitions and surveys from their modules;
 * benefits, redemptions, points, courses (catalog + own progress) and evaluations from /api/datos. The org chart (who
 * reports to whom) comes from each collaborator's manager, set by HrDataService when the collaborators load.
 */
@Injectable({ providedIn: 'root' })
export class PortalService {
  constructor(private auth: AuthService, private http: HttpClient, private datos: DatosService) {
    auth.usuario$.subscribe((u) => { if (!u) { this.reconocimientos$.next([]); this.encuestas$.next([]); } });
  }
  /** Collaborator of the signed-in user (-1 when the account is not linked to one, e.g. an external administrator). */
  get yoId(): number { return this.auth.usuario?.colaboradorId ?? -1; }
  /** Name of the signed-in user, as shown in posts and certificates. */
  get yoNombre(): string { return this.auth.usuario?.nombre ?? ''; }
  get yoCorreo(): string { return this.auth.usuario?.correo ?? ''; }
  get yoIniciales(): string { return this.auth.usuario?.iniciales ?? '—'; }
  /** Hides portal shortcuts to screens the user's role cannot open. */
  puedeVer(path: string): boolean { return this.auth.puedeVer(path); }
  /** Direct manager of each collaborator (null = top of the organization), from their record. */
  jefes: Record<number, number | null> = {};
  fijarJefes(cs: { id: number; jefeId?: number | null }[]): void { this.jefes = Object.fromEntries(cs.map((c) => [c.id, c.jefeId ?? null])); }

  get beneficios(): Beneficio[] { return this.datos.valor<Beneficio>('beneficios'); }
  get canjes$(): BehaviorSubject<Canje[]> { return this.datos.lista$<Canje>('beneficio-canjes'); }
  readonly encuestas$ = new BehaviorSubject<EncuestaPortal[]>([]);
  readonly reconocimientos$ = new BehaviorSubject<Reconocimiento[]>([]);
  /** The company's values for recognitions (its own, or the default ones while it has not set them). */
  readonly valores$ = new BehaviorSubject<ValorReconocimiento[]>([]);
  cargarValores(): Observable<void> {
    if (!this.auth.autenticado || this.auth.debeCambiarPassword) return of(undefined);
    return this.http.get<{ nombre: string; tono: string; icono: string }[]>(`${API_URL}/reconocimientos/valores`).pipe(
      tap((l) => this.valores$.next(l.map((v) => ({ nombre: v.nombre, color: TONOS[v.tono] ?? TONOS['primary'], icono: v.icono })))),
      map(() => undefined), catchError(() => of(undefined)));
  }
  get evaluaciones$(): BehaviorSubject<Evaluacion[]> { return this.datos.lista$<Evaluacion>('evaluaciones'); }
  /** Available points: what Recursos Humanos assigned minus what was redeemed. */
  get puntos(): number {
    const asignados = this.datos.valor<{ id: number; puntos: number }>('beneficio-puntos').reduce((s, p) => s + p.puntos, 0);
    return asignados - this.canjes$.value.reduce((s, c) => s + c.puntos, 0);
  }
  /** Course catalog with the signed-in collaborator's progress in each one. */
  get cursos$(): Observable<Curso[]> {
    return combineLatest([this.datos.lista$<Curso>('cursos'), this.datos.lista$<AvanceCurso>('curso-avance')]).pipe(map(([cs, av]) => cs.map((c) => {
      const a = av.find((x) => x.cursoId === c.id);
      return { ...c, inscrito: a?.inscrito ?? false, hechos: a?.hechos ?? [], completado: a?.completado ?? null };
    })));
  }

  /** Evaluations waiting for the collaborator: counter next to "Mis Evaluaciones". */
  get evaluacionesPendientes(): number { return this.evaluaciones$.value.filter((e) => e.estado === 'Autoevaluación pendiente').length; }

  /** Pending surveys: shown as the counter next to "Mis Encuestas" in the menu. */
  get encuestasPendientes(): number { return this.encuestas$.value.filter((e) => !e.respondida).length; }

  /** Direct reports of a collaborator. */
  reportes(id: number): number[] { return Object.keys(this.jefes).map(Number).filter((k) => this.jefes[k] === id); }

  /** The API sets the cost, date and state, and checks the stock and the points left. */
  canjear(b: Beneficio): Observable<Canje> { return this.datos.crear<Canje>('beneficio-canjes', { beneficioId: b.id }); }

  private guardarAvance(c: Curso, cambios: Partial<AvanceCurso>): void {
    const actual = this.datos.valor<AvanceCurso>('curso-avance').find((a) => a.cursoId === c.id);
    const avance = { cursoId: c.id, inscrito: c.inscrito, hechos: c.hechos, completado: c.completado, ...cambios };
    if (actual) this.datos.actualizar<AvanceCurso>('curso-avance', { ...actual, ...avance }).subscribe();
    else this.datos.crear('curso-avance', avance).subscribe();
  }

  /** Marks a module done or undone; completing every module completes the course. */
  marcarModulo(c: Curso, i: number, hecho: boolean): void {
    const hechos = hecho ? [...new Set([...c.hechos, i])].sort((a, b) => a - b) : c.hechos.filter((x) => x !== i);
    this.guardarAvance(c, { hechos, completado: hechos.length === c.modulos.length ? fmtFecha(new Date()) : null, inscrito: true });
  }
  inscribir(c: Curso): void { this.guardarAvance(c, { inscrito: true }); }

  enviarAutoevaluacion(e: Evaluacion, notas: Record<string, number>): void {
    this.datos.actualizar<Evaluacion>('evaluaciones', { ...e, auto: { ...notas }, estado: 'Esperando a la jefatura' }).subscribe();
  }

  /** Surveys of the signed-in collaborator: open ones and the ones already answered (GET /api/encuestas/mias). */
  cargarEncuestas(): Observable<void> {
    if (!this.auth.autenticado || this.auth.debeCambiarPassword) return of(undefined);
    return this.http.get<EncuestaPortal[]>(`${API_URL}/encuestas/mias`).pipe(
      tap((l) => this.encuestas$.next(l)), map(() => undefined), catchError(() => of(undefined)));
  }

  /** Sends the answers once; in anonymous surveys the API does not store who answered. */
  responder(e: EncuestaPortal, respuestas: Record<string, string>): Observable<void> {
    return this.http.post<void>(`${API_URL}/encuestas/${e.id}/responder`, { valores: respuestas }).pipe(
      tap(() => this.cargarEncuestas().subscribe()));
  }

  /** Recognitions wall (everyone sees it). */
  cargarReconocimientos(): Observable<void> {
    if (!this.auth.autenticado || this.auth.debeCambiarPassword) return of(undefined);
    return this.http.get<Reconocimiento[]>(`${API_URL}/reconocimientos`).pipe(
      tap((l) => this.reconocimientos$.next(l)), map(() => undefined), catchError(() => of(undefined)));
  }

  /** Publishes a recognition for one or more colleagues; the API sets the author and the date. */
  reconocer(paraIds: number[], valor: string, mensaje: string): Observable<Reconocimiento> {
    return this.http.post<Reconocimiento>(`${API_URL}/reconocimientos`, { paraIds, valor, mensaje }).pipe(
      tap((r) => this.reconocimientos$.next([r, ...this.reconocimientos$.value])));
  }
}

/** Corporate e-mail on file (directory data, or the record when it is visible); empty when the company has not set it. */
export const emailDe = (c: { contacto?: { email?: string | null }; detalle?: { emailCorporativo?: string } }): string =>
  c.contacto?.email || c.detalle?.emailCorporativo || '';
