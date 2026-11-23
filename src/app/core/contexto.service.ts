import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';
import { cuentaSuspendida$, moduloNoHabilitado$ } from './eventos';

export interface ModuloInfo { codigo: string; nombre: string; descripcion: string; beneficios: string[]; contratado: boolean; }
export interface UsoLimite { clave: string; nombre: string; usado: number; maximo: number; unidad: string; pct: number; estado: 'ok' | 'aviso' | 'bloqueado'; }
export interface BannerEstado { tipo: 'trial' | 'moroso' | 'limite' | 'soporte' | 'cancelado'; texto: string; accion: string | null; ruta: string | null; }
export interface PasoImplementacion { clave: string; titulo: string; avance: number; }
export interface ImplementacionInfo { activo: boolean; avance: number; pasos: PasoImplementacion[]; }
/** GET /api/me/context. */
export interface ContextoUsuario {
  usuario: { id: number; nombre: string; correo: string; rol: string };
  tenant: { id: string; slug: string; nombre: string; estado: string; plan: string; planNombre: string; trialHasta: string | null; diasTrial: number | null; marcaVersion: number;
    motivoSuspension: string | null; eliminacionProgramada: string | null };
  modulos: string[]; funciones: string[]; catalogoModulos: ModuloInfo[];
  limites: UsoLimite[]; banners: BannerEstado[]; implementacion: ImplementacionInfo | null; anuncios: AnuncioTenant[];
}
/** Announcement of the Nexo RH console for this company (banner or modal when signing in). */
export interface AnuncioTenant { id: number; titulo: string; cuerpo: string; tipo: string; canal: string; }
/** What the "module not included in your plan" modal shows (P-MT.5). */
export interface ModuloBloqueado { codigo: string | null; nombre: string; descripcion: string; beneficios: string[]; proximamente: boolean; }

/** Screen of the implementation checklist for each step. */
export const RUTAS_IMPLEMENTACION: Record<string, string> = {
  marca: '/configuracion/marca', empresas: '/configuracion/empresas', estructura: '/admin/organizacion/areas',
  cargos: '/admin/organizacion/cargos', colaboradores: '/admin/colaboradores/crear', ausencias: '/configuracion/feriados',
  usuarios: '/configuracion/usuarios', portal: '/portal',
};

/**
 * Context of the signed-in user in their company: contracted modules (locks in the menu and the routes), status
 * banners, plan limits and the implementation checklist. Reloaded after signing in and when something changes.
 */
@Injectable({ providedIn: 'root' })
export class ContextoService {
  readonly contexto$ = new BehaviorSubject<ContextoUsuario | null>(null);
  /** Module whose commercial modal is open. */
  readonly bloqueado$ = new BehaviorSubject<ModuloBloqueado | null>(null);

  constructor(private http: HttpClient, private auth: AuthService) {
    moduloNoHabilitado$.subscribe((m) => this.mostrarBloqueado(m));
    let ultimo: number | null = null;
    auth.usuario$.subscribe((u) => {
      if (!u) { ultimo = null; this.contexto$.next(null); return; }
      if (u.id !== ultimo && !u.debeCambiarPassword) { ultimo = u.id; this.cargar().subscribe(); }
    });
  }

  get contexto(): ContextoUsuario | null { return this.contexto$.value; }

  cargar(): Observable<ContextoUsuario | null> {
    return this.http.get<ContextoUsuario>(`${API_URL}/me/context`).pipe(
      tap((c) => {
        this.contexto$.next(c);
        // Suspended account: administrators only see its status and the data download.
        if (c.tenant.estado === 'Suspendido' && !location.pathname.startsWith('/cuenta-suspendida')) cuentaSuspendida$.next();
      }),
      catchError(() => of(null)));
  }

  /** While the context loads every module counts as available, so the menu does not flash locks. */
  modulo(codigo: string | undefined | null): boolean {
    if (!codigo) return true;
    const c = this.contexto;
    return !c || c.modulos.includes(codigo);
  }

  /** Opens the commercial modal. Without a code (Onboarding, Talento…) it is a product coming soon. */
  mostrarBloqueado(codigo: string | null, nombre?: string, esperado = false): void {
    // The catalog comes with the context: wait for it before deciding what to show.
    if (codigo && !this.contexto && !esperado) { this.cargar().subscribe(() => this.mostrarBloqueado(codigo, nombre, true)); return; }
    const info = codigo ? this.contexto?.catalogoModulos.find((m) => m.codigo === codigo) : undefined;
    this.bloqueado$.next(info
      ? { codigo: info.codigo, nombre: info.nombre, descripcion: info.descripcion, beneficios: info.beneficios, proximamente: false }
      : codigo
        ? { codigo, nombre: nombre ?? 'Este módulo', descripcion: 'Este módulo no está incluido en el plan de tu empresa.', beneficios: [], proximamente: false }
        : { codigo, nombre: nombre ?? 'Este módulo', descripcion: 'Estamos preparando este módulo. Déjanos tus datos y te avisaremos cuando esté disponible.', beneficios: [], proximamente: true });
  }

  solicitarInformacion(modulo: string, mensaje?: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${API_URL}/cuenta/solicitudes`, { modulo, mensaje: mensaje || null });
  }
}
