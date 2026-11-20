import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { API_URL } from './api';

export type RolUsuario = 'Administrador' | 'Supervisor' | 'Colaborador';
export interface UsuarioSesion { id: number; nombre: string; correo: string; rol: RolUsuario; perfil: string; colaboradorId: number | null; iniciales: string; debeCambiarPassword: boolean; }
export interface Sesion { token: string; expira: string; usuario: UsuarioSesion; }

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
  return p === 'cambiar-password' || reglas.some((r) => p === r || p.startsWith(r + '/'));
}

/**
 * Session against the Nexo RH API. The token is kept in sessionStorage (it ends when the tab closes) and sent by
 * AuthInterceptor on every API request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario$ = new BehaviorSubject<UsuarioSesion | null>(null);
  private sesion: Sesion | null = null;

  constructor(private http: HttpClient) {
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Sesion | null;
      if (s && new Date(s.expira).getTime() > Date.now()) this.fijar(s);
    } catch { /* storage unavailable: start signed out */ }
  }

  get token(): string | null { return this.sesion && new Date(this.sesion.expira).getTime() > Date.now() ? this.sesion.token : null; }
  get usuario(): UsuarioSesion | null { return this.usuario$.value; }
  get autenticado(): boolean { return !!this.token; }
  get esAdmin(): boolean { return this.usuario?.rol === 'Administrador'; }
  /** The password was set by an administrator: it must be changed before using the app. */
  get debeCambiarPassword(): boolean { return !!this.usuario?.debeCambiarPassword; }
  puedeVer(path: string): boolean { return rolPuedeVer(this.usuario?.rol, path); }
  /** Home page for the role. */
  get inicio(): string { return this.esAdmin ? '/admin/colaboradores/vigentes' : '/portal'; }

  login(correo: string, password: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/auth/login`, { correo, password }).pipe(tap((s) => this.fijar(s)));
  }

  /** Changes the password; the API answers with a new token (older ones stop working). */
  cambiarPassword(actual: string, nueva: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/auth/password`, { actual, nueva }).pipe(tap((s) => this.fijar(s)));
  }

  logout(): void {
    this.sesion = null;
    try { sessionStorage.removeItem(CLAVE); } catch { /* ignore */ }
    this.usuario$.next(null);
  }

  private fijar(s: Sesion): void {
    this.sesion = s;
    try { sessionStorage.setItem(CLAVE, JSON.stringify(s)); } catch { /* ignore */ }
    this.usuario$.next(s.usuario);
  }
}

/** Adds the bearer token to API calls and sends the user back to the login page when the session expires. */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const esApi = req.url.startsWith(API_URL);
    const token = this.auth.token;
    const r = esApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next.handle(r).pipe(catchError((e: HttpErrorResponse) => {
      if (esApi && e.status === 401 && !req.url.endsWith('/auth/login')) {
        this.auth.logout();
        this.router.navigate(['/login'], { queryParams: { vuelta: this.router.url, motivo: 'sesion' } });
      }
      if (esApi && e.status === 403 && (e.error as { codigo?: string } | null)?.codigo === 'password_temporal') {
        this.router.navigate(['/cambiar-password']);
      }
      return throwError(() => e);
    }));
  }
}

/** Every screen except /login requires a session, a definitive password and a role allowed to open it. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado) return router.createUrlTree(['/login'], { queryParams: { vuelta: state.url } });
  if (auth.debeCambiarPassword) return router.createUrlTree(['/cambiar-password'], { queryParams: { vuelta: state.url } });
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
