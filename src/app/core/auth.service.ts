import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { cuentaCancelada$, cuentaSuspendida$, mantenimiento$, moduloNoHabilitado$, supportReadOnly$ } from './eventos';
import { CanActivateFn, Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, of, tap, throwError } from 'rxjs';
import { API_URL } from './api';

export type RolUsuario = 'Administrador' | 'Supervisor' | 'Colaborador';
export interface UsuarioSesion {
  id: number; nombre: string; correo: string; rol: RolUsuario; perfil: string; colaboradorId: number | null; iniciales: string;
  debeCambiarPassword: boolean; dobleFactor: boolean; debeActivarDobleFactor: boolean;
}
/** Nexo RH support session inside the company's app (red banner). */
export interface SoporteInfo { sesionId: string; agente: string; modo: 'lectura' | 'escritura'; motivo: string; ticket: string | null; expira: string; }
export interface Sesion { token: string; expira: string; usuario: UsuarioSesion; soporte?: SoporteInfo | null; }
/** Answer of POST /auth/login: a session, or the second step when the account has two-factor authentication. */
export interface RespuestaLogin { token: string | null; expira: string | null; usuario: UsuarioSesion | null; mfaRequerido: boolean; mfaToken: string | null; soporte?: SoporteInfo | null; }
export interface InfoToken { tipo: 'Activacion' | 'Restablecer'; nombre: string; correo: string; passwordMinimo: number; privacidadUrl: string | null; }
export interface InicioDobleFactor { clave: string; uri: string; }

const CLAVE = 'nexo-rh.sesion';

/**
 * Screens each role may open (path prefixes). Administrators see everything. The API enforces the same limits on the
 * data; this only keeps the menu and the routes consistent with them.
 */
const ACCESO: Record<RolUsuario, string[] | null> = {
  Administrador: null,
  Supervisor: ['portal', 'admin/colaboradores/vigentes', 'admin/colaboradores/ficha',
    'ca/panel', 'ca/colaboradores', 'ca/marcaciones', 'ca/ausencias', 'ca/horas-extras', 'ca/reportes'],
  Colaborador: ['portal'],
};

/** True when a user with this role may open the path (e.g. "/admin/panel" or "rem/procesos?x=1"). */
export function rolPuedeVer(rol: RolUsuario | undefined, path: string): boolean {
  if (!rol) return false;
  const reglas = ACCESO[rol];
  if (!reglas) return true;
  const p = path.replace(/^\//, '').split(/[?#]/)[0];
  return p === 'cambiar-password' || p === 'seguridad/doble-factor' || reglas.some((r) => p === r || p.startsWith(r + '/'));
}

/**
 * Session against the Nexo RH API (one per company subdomain: the browser keeps storage per host). The token is kept in
 * sessionStorage (it ends when the tab closes) or, with "Recordarme", in localStorage. AuthInterceptor sends it on every
 * API request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario$ = new BehaviorSubject<UsuarioSesion | null>(null);
  private sesion: Sesion | null = null;
  /** "Recordarme": the session survives closing the browser (until it expires). */
  recordar = false;

  constructor(private http: HttpClient) {
    try {
      this.recordar = !!localStorage.getItem(CLAVE);
      const s = JSON.parse((this.recordar ? localStorage : sessionStorage).getItem(CLAVE) ?? 'null') as Sesion | null;
      if (s && new Date(s.expira).getTime() > Date.now()) this.fijar(s);
    } catch { /* storage unavailable: start signed out */ }
  }

  get token(): string | null { return this.sesion && new Date(this.sesion.expira).getTime() > Date.now() ? this.sesion.token : null; }
  get usuario(): UsuarioSesion | null { return this.usuario$.value; }
  get autenticado(): boolean { return !!this.token; }
  /** Support session of the Nexo RH team (no company user behind it). */
  get soporte(): SoporteInfo | null { return this.sesion?.soporte ?? null; }
  get esAdmin(): boolean { return this.usuario?.rol === 'Administrador'; }
  /** The password was set by an administrator: it must be changed before using the app. */
  get debeCambiarPassword(): boolean { return !!this.usuario?.debeCambiarPassword; }
  /** The company requires two-factor authentication and the account has not set it up yet. */
  get debeActivarDobleFactor(): boolean { return !!this.usuario?.debeActivarDobleFactor; }
  /** Required step right after signing in, before the requested page. */
  get pasoPendiente(): string | null { return this.debeCambiarPassword ? '/cambiar-password' : this.debeActivarDobleFactor ? '/seguridad/doble-factor' : null; }
  puedeVer(path: string): boolean { return rolPuedeVer(this.usuario?.rol, path); }
  /** Home page for the role. */
  get inicio(): string { return this.esAdmin ? '/admin/colaboradores/vigentes' : '/portal'; }

  /** Signs in with e-mail (or document number) and password; with two-factor authentication it answers mfaRequerido. */
  login(correo: string, password: string, recordar = false): Observable<RespuestaLogin> {
    this.recordar = recordar;
    return this.http.post<RespuestaLogin>(`${API_URL}/auth/login`, { correo, password }).pipe(tap((r) => this.fijarRespuesta(r)));
  }

  /** Second step of the sign-in: 6-digit code of the authenticator app. */
  verificarCodigo(mfaToken: string, codigo: string): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(`${API_URL}/auth/mfa`, { mfaToken, codigo }).pipe(tap((r) => this.fijarRespuesta(r)));
  }

  /** Entry from the account selector of app.{domain} (one-time code in the link). */
  canjear(codigo: string): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(`${API_URL}/auth/canjear`, { codigo }).pipe(tap((r) => this.fijarRespuesta(r)));
  }

  /** Entry from the one-time link of the provider console (never remembered in localStorage). */
  entrarSoporte(codigo: string): Observable<RespuestaLogin> {
    this.recordar = false;
    return this.http.post<RespuestaLogin>(`${API_URL}/auth/soporte`, { codigo }).pipe(tap((r) => this.fijarRespuesta(r)));
  }

  /** "Terminar sesión" of the support banner: closes it in the console and signs out. */
  terminarSoporte(): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/soporte/terminar`, {}).pipe(catchError(() => of(undefined)), tap({ complete: () => this.logout() }));
  }

  olvide(correo: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${API_URL}/auth/olvide`, { correo });
  }

  verToken(tipo: 'Activacion' | 'Restablecer', token: string): Observable<InfoToken> {
    return this.http.get<InfoToken>(`${API_URL}/auth/token`, { params: { tipo, token } });
  }

  /** Sets the password from an e-mailed link (reset or account activation). */
  nuevaPassword(tipo: 'Activacion' | 'Restablecer', token: string, password: string, aceptaPrivacidad?: boolean): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/${tipo === 'Activacion' ? 'activar' : 'restablecer'}`, { token, password, aceptaPrivacidad });
  }

  iniciarDobleFactor(): Observable<InicioDobleFactor> {
    return this.http.post<InicioDobleFactor>(`${API_URL}/auth/2fa/iniciar`, {});
  }

  /** Confirms the authenticator app; the API closes the other sessions and answers with a new token. */
  confirmarDobleFactor(codigo: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/auth/2fa/confirmar`, { codigo }).pipe(tap((s) => this.fijar(s)));
  }

  desactivarDobleFactor(password: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/auth/2fa/desactivar`, { password }).pipe(tap((s) => this.fijar(s)));
  }

  /** Changes the password; the API answers with a new token (older ones stop working). */
  cambiarPassword(actual: string, nueva: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/auth/password`, { actual, nueva }).pipe(tap((s) => this.fijar(s)));
  }

  logout(): void {
    this.sesion = null;
    try { sessionStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE); } catch { /* ignore */ }
    this.usuario$.next(null);
  }

  private fijarRespuesta(r: RespuestaLogin): void {
    if (r.token && r.expira && r.usuario) this.fijar({ token: r.token, expira: r.expira, usuario: r.usuario, soporte: r.soporte ?? null });
  }

  private fijar(s: Sesion): void {
    this.sesion = s;
    try {
      (this.recordar ? localStorage : sessionStorage).setItem(CLAVE, JSON.stringify(s));
      (this.recordar ? sessionStorage : localStorage).removeItem(CLAVE);
    } catch { /* ignore */ }
    this.usuario$.next(s.usuario);
  }
}

/** Adds the bearer token to API calls and sends the user back to the login page when the session expires. */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // The provider console (/api/platform) has its own session and its own error handling.
    const esApi = req.url.startsWith(API_URL) && !req.url.startsWith(`${API_URL}/platform`);
    const token = this.auth.token;
    const r = esApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next.handle(r).pipe(catchError((e: HttpErrorResponse) => {
      // Anonymous sign-in steps answer 401 for a wrong password or code: that is not an expired session.
      const anonimo = /\/auth\/(login|mfa|canjear|olvide|token|restablecer|activar)$|\/publico\//.test(req.url.split('?')[0]);
      if (esApi && e.status === 401 && !anonimo) {
        this.auth.logout();
        this.router.navigate(['/login'], { queryParams: { vuelta: this.router.url, motivo: 'sesion' } });
      }
      if (esApi && e.status === 403 && (e.error as { codigo?: string } | null)?.codigo === 'password_temporal') {
        this.router.navigate(['/cambiar-password']);
      }
      const err = e.error as { codigo?: string; modulo?: string } | null;
      // Only for the user's own actions: background reads (menu counters, widgets) of a module fail quietly.
      if (esApi && e.status === 403 && err?.codigo === 'module_not_enabled' && req.method !== 'GET') {
        moduloNoHabilitado$.next(err.modulo ?? null);
      }
      if (esApi && e.status === 403 && err?.codigo === 'SUPPORT_READ_ONLY') supportReadOnly$.next();
      if (esApi && e.status === 423 && err?.codigo === 'tenant_suspended' && this.auth.autenticado && !anonimo) {
        if (this.auth.esAdmin) cuentaSuspendida$.next(); else { this.auth.logout(); this.router.navigate(['/login']); }
      }
      if (esApi && e.status === 423 && err?.codigo === 'tenant_cancelled' && req.method !== 'GET') cuentaCancelada$.next();
      if (esApi && e.status === 503 && err?.codigo === 'tenant_maintenance') mantenimiento$.next();
      if (esApi && e.status === 423 && err?.codigo === 'tenant_deleted' && this.auth.autenticado) {
        this.auth.logout(); this.router.navigate(['/login'], { queryParams: { motivo: 'eliminada' } });
      }
      if (esApi && e.status === 403 && (e.error as { codigo?: string } | null)?.codigo === 'doble_factor_requerido') {
        this.router.navigate(['/seguridad/doble-factor']);
      }
      return throwError(() => e);
    }));
  }
}

/** Every screen except the sign-in pages requires a session, a definitive password, two-factor authentication when the
 * company requires it and a role allowed to open it. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado) return router.createUrlTree(['/login'], { queryParams: { vuelta: state.url } });
  const paso = auth.pasoPendiente;
  if (paso) return router.createUrlTree([paso], { queryParams: { vuelta: state.url } });
  return auth.puedeVer(state.url) ? true : router.parseUrl(auth.inicio);
};

/** Only requires a session (the change-password page). */
export const sesionGuard: CanActivateFn = (_route, state) =>
  inject(AuthService).autenticado ? true : inject(Router).createUrlTree(['/login'], { queryParams: { vuelta: state.url } });

/** Readable message for an API error (ProblemDetails or network failure). */
export function mensajeError(e: unknown): string {
  const err = e as HttpErrorResponse;
  if (err?.status === 0) return 'No se pudo conectar con el servidor de Nexo RH. Verifica que la API esté en ejecución.';
  const p = err?.error as { detail?: string; title?: string; errors?: Record<string, string[]> } | null;
  if (p?.errors) return Object.values(p.errors).map((v) => v[0]).join(' ');
  return p?.detail || p?.title || 'Ocurrió un error inesperado. Intenta de nuevo.';
}
