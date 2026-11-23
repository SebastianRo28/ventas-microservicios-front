import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { API_URL } from '../core/api';

export interface UsuarioConsola { id: number; nombre: string; correo: string; rol: 'Admin' | 'Operaciones' | 'Soporte' | 'Ventas'; }
export interface SesionConsola { token: string; expira: string; usuario: UsuarioConsola; }
export interface LoginConsola { mfaRequerido: boolean; mfaToken: string; enrolar: boolean; clave: string | null; uri: string | null; }

export interface PlanInfo { codigo: string; nombre: string; precio: number; limiteEmpresas: number; limiteAlmacenamientoGb: number; limiteAdmins: number; limiteApiPorMinuto: number; }
export interface Dashboard {
  kpis: { tenantsActivos: number; tenantsTrial: number; tenantsSuspendidos: number; tenantsMorosos: number; colaboradoresFacturables: number; mrr: number; churnPct: number; altasMes: number };
  serieMrr: { periodo: string; monto: number }[];
  planes: { plan: string; nombre: string; tenants: number }[];
  trialsPorVencer: { tenantId: string; nombre: string; slug: string; plan: string; colaboradores: number; trialHasta: string; dias: number; ejecutivo: string | null }[];
  solicitudes: { id: number; tenantId: string; tenant: string; modulo: string; moduloNombre: string; usuario: string; mensaje: string | null; creadaEn: string; estado: string }[];
  morosidad: number; tenantsMorososVencidos: number;
}
export interface TenantFila {
  id: string; nombre: string; slug: string; dominioPrincipal: string; plan: string; planNombre: string; modulos: string[]; estado: string;
  colaboradores: number; creadoEn: string; trialHasta: string | null; ejecutivo: string | null; soporteAutorizado: boolean; precio: number;
}
export interface PaginaTenants { items: TenantFila[]; total: number; porEstado: Record<string, number>; ejecutivos: string[]; }
export interface ModuloTenant { codigo: string; nombre: string; condicion: string; precio: number; activo: boolean; desde: string | null; hasta: string | null; }
export interface DetalleTenant {
  id: string; slug: string; nombre: string; razonSocial: string; ruc: string; industria: string | null; ejecutivo: string | null; correoFacturacion: string | null;
  estado: string; motivoSuspension: string | null; plan: string; planNombre: string; precioPorColaborador: number; precioPactado: number | null; trialHasta: string | null;
  creadoEn: string; dominioPrincipal: string; baseDatos: string; versionEsquema: string; soporteHasta: string | null; colaboradores: number; mrr: number;
  usuariosActivos30d: number; usuarios: number; saldo: number; modulos: ModuloTenant[]; planes: PlanInfo[];
  canceladoEn: string | null; eliminacionProgramada: string | null; eliminadoEn: string | null;
  enMantenimiento: boolean; funciones: string[];
}
export interface Certificado { tenantId: string; slug: string; razonSocial: string; ruc: string; eliminadoEn: string; responsable: string; filasNegocio: number; porTabla: Record<string, number>; archivosCatalogo: number; nota: string; }
export interface ResumenCicloVida { en: string; trialsVencidos: number; morosos: number; suspendidos: number; reactivados: number; eliminados: number; usos: number; facturas: number; eventos: string[]; }
export interface UsoLimite { clave: string; nombre: string; usado: number; maximo: number; unidad: string; pct: number; estado: string; }
export interface UsoTenant { colaboradores: { periodo: string; colaboradores: number }[]; limites: UsoLimite[]; usuariosActivos30d: number; correos30d: number; sesionesSoporte: number; }
export interface Factura { numero: string; periodo: string; emitida: string; vence: string; colaboradores: number; subtotal: number; igv: number; total: number; estado: string; sunatEstado: string; }
export interface RegistroDns { tipo: string; nombre: string; valor: string; ttl: number; ok: boolean | null; }
export interface Dominio {
  id: number; host: string; tipo: string; verificado: boolean; principal: boolean; estadoCertificado: 'Pendiente' | 'Emitiendo' | 'Activo';
  verificadoEn: string | null; certificadoEn: string | null; ultimaRevision: string | null; error: string | null; registros: RegistroDns[];
}
export interface CorreoDominio {
  dominio: string; remitente: string; direccion: string; verificado: boolean; spfOk: boolean; dkimOk: boolean; dmarcOk: boolean;
  verificadoEn: string | null; ultimaRevision: string | null; enUso: boolean; registros: RegistroDns[];
}
export interface AdminTenant { id: number; nombre: string; correo: string; activo: boolean; ultimoAcceso: string; dobleFactor: boolean; pendienteActivacion: boolean; }
export interface EventoAuditoria { en: string; actor: string; origen: string; accion: string; detalle: string | null; ip: string | null; }
export interface Nota { id: number; autor: string; creadaEn: string; texto: string; }
export interface Trabajo { id: string; estado: 'running' | 'succeeded' | 'failed'; progreso: number; pasos: { clave: string; titulo: string; estado: string; error: string | null }[]; tenantId: string | null; }
export interface PlanConsola {
  codigo: string; nombre: string; precioPorColaborador: number; limiteEmpresas: number; limiteAlmacenamientoGb: number; limiteAdmins: number; limiteApiPorMinuto: number;
  funciones: string[]; modulos: { codigo: string; nombre: string; incluido: boolean; precioAdicional: number }[]; tenants: number;
}
export interface CatalogoConsola { clave: string; nombre: string; columnas: string; version: string | null; registros: number; publicadaEn: string | null; vigenteDesde: string | null; versiones: number; estado: string; }
export interface Anuncio { id: number; titulo: string; cuerpo: string; tipo: string; planes: string[]; modulos: string[]; desde: string | null; hasta: string | null; canal: string; estado: string; alcance: number; }
export interface Flag { clave: string; descripcion: string; modulo: string | null; tenants: { tenantId: string; slug: string; activo: boolean; moduloContratado: boolean }[]; activos: number; }
export interface Salud {
  desde: string; minutosEnLinea: number; p95Ms: number; requests: number;
  basesDatos: { nombre: string; tipo: string; tenants: number; esquema: string; pendientes: number; estado: string }[];
  tenants: { tenantId: string; nombre: string; rpm: number; p95Ms: number; pctErrores: number }[];
  trabajosFallidos: unknown[];
}

const CLAVE = 'nexo-rh.consola';
const B = `${API_URL}/platform`;

/** Readable message of an API error. */
export function errorConsola(e: unknown): string {
  const err = e as HttpErrorResponse;
  if (err?.status === 0) return 'No se pudo conectar con la API de Nexo RH.';
  const p = err?.error as { detail?: string; title?: string; errors?: Record<string, string[]> } | null;
  if (p?.errors) return Object.values(p.errors).map((v) => v[0]).join(' ');
  return p?.detail || p?.title || 'Ocurrió un error inesperado.';
}

/**
 * Provider console (admin.{domain}): own session (separate from any company's), sent only to /api/platform.
 * Fixed Nexo RH theme.
 */
@Injectable({ providedIn: 'root' })
export class ConsolaService {
  readonly usuario$ = new BehaviorSubject<UsuarioConsola | null>(null);
  private sesion: SesionConsola | null = null;

  constructor(private http: HttpClient, private router: Router) {
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as SesionConsola | null;
      if (s && new Date(s.expira).getTime() > Date.now()) { this.sesion = s; this.usuario$.next(s.usuario); }
    } catch { /* ignore */ }
  }

  get autenticado(): boolean { return !!this.sesion && new Date(this.sesion.expira).getTime() > Date.now(); }
  get usuario(): UsuarioConsola | null { return this.usuario$.value; }
  get esAdmin(): boolean { return this.usuario?.rol === 'Admin'; }
  get puedeSoporte(): boolean { return this.usuario?.rol === 'Admin' || this.usuario?.rol === 'Soporte'; }

  login(correo: string, password: string): Observable<LoginConsola> { return this.http.post<LoginConsola>(`${B}/auth/login`, { correo, password }); }
  verificar(mfaToken: string, codigo: string): Observable<SesionConsola> {
    return this.http.post<SesionConsola>(`${B}/auth/mfa/verify`, { mfaToken, codigo }).pipe(tap((s) => {
      this.sesion = s;
      try { sessionStorage.setItem(CLAVE, JSON.stringify(s)); } catch { /* ignore */ }
      this.usuario$.next(s.usuario);
    }));
  }
  salir(): void {
    this.sesion = null;
    try { sessionStorage.removeItem(CLAVE); } catch { /* ignore */ }
    this.usuario$.next(null);
    this.router.navigate(['/consola/login']);
  }

  private get h(): { headers: HttpHeaders } { return { headers: new HttpHeaders({ Authorization: `Bearer ${this.sesion?.token ?? ''}` }) }; }
  private manejar<T>(o: Observable<T>): Observable<T> {
    return o.pipe(catchError((e: HttpErrorResponse) => { if (e.status === 401) this.salir(); return throwError(() => e); }));
  }
  get<T>(ruta: string, params?: Record<string, string | number>): Observable<T> { return this.manejar(this.http.get<T>(`${B}/${ruta}`, { ...this.h, params })); }
  post<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.manejar(this.http.post<T>(`${B}/${ruta}`, cuerpo, this.h)); }
  put<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.manejar(this.http.put<T>(`${B}/${ruta}`, cuerpo, this.h)); }
  patch<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.manejar(this.http.patch<T>(`${B}/${ruta}`, cuerpo, this.h)); }
  delete<T>(ruta: string): Observable<T> { return this.manejar(this.http.delete<T>(`${B}/${ruta}`, this.h)); }
}

export const consolaGuard: CanActivateFn = (_r, state) => {
  const c = inject(ConsolaService);
  return c.autenticado ? true : inject(Router).createUrlTree(['/consola/login'], { queryParams: { vuelta: state.url } });
};

/** S/ 1,234.50 */
export function soles(n: number | null | undefined): string {
  return 'S/ ' + (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
export const TONOS_ESTADO: Record<string, string> = { Activo: 'nx-tone-success', Trial: 'nx-tone-info', Moroso: 'nx-tone-warning', Suspendido: 'nx-tone-danger', Cancelado: '', Eliminado: '' };
