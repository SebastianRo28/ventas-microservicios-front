import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { API_URL } from './api';

export type RolUsuario = 'Administrador' | 'Supervisor' | 'Colaborador';
export interface UsuarioSesion { id: number; nombre: string; correo: string; rol: RolUsuario; perfil: string; colaboradorId: number | null; iniciales: string; }
interface Sesion { token: string; expira: string; usuario: UsuarioSesion; }

const CLAVE = 'nexo-rh.sesion';

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

  login(correo: string, password: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/auth/login`, { correo, password }).pipe(tap((s) => this.fijar(s)));
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
      return throwError(() => e);
    }));
  }
}

/** Every screen except /login requires a session. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.autenticado ? true : inject(Router).createUrlTree(['/login'], { queryParams: { vuelta: state.url } });
};

/** Readable message for an API error (ProblemDetails or network failure). */
export function mensajeError(e: unknown): string {
  const err = e as HttpErrorResponse;
  if (err?.status === 0) return 'No se pudo conectar con el servidor de Nexo RH. Verifica que la API esté en ejecución.';
  const p = err?.error as { detail?: string; title?: string; errors?: Record<string, string[]> } | null;
  if (p?.errors) return Object.values(p.errors).map((v) => v[0]).join(' ');
  return p?.detail || p?.title || 'Ocurrió un error inesperado. Intenta de nuevo.';
}
