import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, catchError, of, tap } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';
import { mensajeError } from './auth.service';
import { UiStateService } from './ui-state.service';

/** A record of /api/datos/{coleccion}: any object with the id the API assigned. */
export type Registro = { id: number; colaboradorId?: number } & Record<string, unknown>;

/**
 * Records of the modules without a table of their own (KPI, benefits, courses, tickets, dashboards…), stored by the API
 * per company (GET/POST/PUT/DELETE /api/datos/{coleccion}). Each collection is cached as a BehaviorSubject: screens
 * subscribe with `lista$()` and the cache is updated with what the API returns. Signing out empties it.
 */
@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly cache = new Map<string, BehaviorSubject<Registro[]>>();
  private readonly cargadas = new Set<string>();

  constructor(private http: HttpClient, private auth: AuthService, private ui: UiStateService) {
    auth.usuario$.subscribe((u) => {
      if (u) return;
      for (const s of this.cache.values()) s.next([]);
      this.cargadas.clear();
    });
  }

  private sujeto(c: string): BehaviorSubject<Registro[]> {
    let s = this.cache.get(c);
    if (!s) { s = new BehaviorSubject<Registro[]>([]); this.cache.set(c, s); }
    return s;
  }

  /** Records of a collection; loads them the first time (an empty list if the user cannot read it). */
  lista$<T extends { id: number } = Registro>(c: string): BehaviorSubject<T[]> {
    const s = this.sujeto(c);
    if (!this.cargadas.has(c) && this.auth.autenticado) { this.cargadas.add(c); this.recargar(c).subscribe(); }
    return s as unknown as BehaviorSubject<T[]>;
  }

  valor<T extends { id: number } = Registro>(c: string): T[] { return this.lista$<T>(c).value; }

  recargar(c: string): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${API_URL}/datos/${c}`).pipe(
      tap((l) => this.sujeto(c).next(l)),
      catchError(() => { this.sujeto(c).next([]); return of([]); }));
  }

  crear<T extends { id: number } = Registro>(c: string, datos: object): Observable<T> {
    return (this.http.post<T>(`${API_URL}/datos/${c}`, datos)).pipe(
      tap((r) => this.sujeto(c).next([...this.sujeto(c).value, r])),
      catchError((e) => { this.ui.toast(mensajeError(e)); return EMPTY; }));
  }

  actualizar<T extends { id: number } = Registro>(c: string, r: T): Observable<T> {
    const { id, ...datos } = r;
    return this.http.put<T>(`${API_URL}/datos/${c}/${id}`, datos).pipe(
      tap((n) => this.sujeto(c).next(this.sujeto(c).value.map((x) => (x.id === id ? n : x)))),
      catchError((e) => { this.ui.toast(mensajeError(e)); this.recargar(c).subscribe(); return EMPTY; }));
  }

  eliminar(c: string, id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/datos/${c}/${id}`).pipe(
      tap(() => this.sujeto(c).next(this.sujeto(c).value.filter((x) => x.id !== id))),
      catchError((e) => { this.ui.toast(mensajeError(e)); return EMPTY; }));
  }
}
