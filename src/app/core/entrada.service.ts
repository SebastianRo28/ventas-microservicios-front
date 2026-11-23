import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { API_URL } from './api';

export interface MetodosLogin { documento: boolean; google: boolean; microsoft: boolean; saml: boolean; }
export interface EntradaTenant {
  slug: string; nombre: string; estado: string; titulo: string; mensaje: string; ayuda: string | null; privacidadUrl: string | null;
  poweredBy: boolean; metodos: MetodosLogin;
}
/** What the sign-in page shows for the browser's host: the company login, the global entry (app.), the provider console or "link not found". */
export interface Entrada { tipo: 'tenant' | 'global' | 'consola' | 'no_encontrado'; tenant: EntradaTenant | null; }
export interface CuentaEncontrada { nombre: string; slug: string; enlace: string; }

/** Public endpoints of the sign-in pages (no session needed). */
@Injectable({ providedIn: 'root' })
export class EntradaService {
  /** Resolved once per page load: the host does not change. */
  readonly entrada$: Observable<Entrada | null> = this.http.get<Entrada>(`${API_URL}/publico/entrada`).pipe(
    catchError(() => of(null)), shareReplay(1));

  constructor(private http: HttpClient) {}

  /** "¿No conoces tu enlace?": e-mails the links of the companies where the address is registered (same answer either way). */
  enviarEnlaces(correo: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${API_URL}/publico/enlaces`, { correo });
  }

  /** Account selector of app.{domain}: companies where this e-mail and password are valid, each with a one-time link. */
  cuentas(correo: string, password: string): Observable<CuentaEncontrada[]> {
    return this.http.post<CuentaEncontrada[]>(`${API_URL}/publico/cuentas`, { correo, password });
  }
}

/** Two letters for the company mark while there is no logo (branding arrives with P-MT.2). */
export function inicialesEmpresa(nombre: string): string {
  const p = nombre.split(/\s+/).filter((x) => x.length > 2 || /^[A-Z]/.test(x));
  return (p.length > 1 ? p[0][0] + p[1][0] : nombre.slice(0, 2)).toUpperCase();
}
