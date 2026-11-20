import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';
import { AccionCambio, Cambio } from './sample/plataforma';

/**
 * Change log behind "Historial de cambios", stored by the API. Changes made through the API (collaborators, cargos)
 * are recorded by the server; modules still working in memory call `registrar`, which shows the change at once and
 * sends it to the API so it is kept.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  readonly cambios: Cambio[] = [];

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Reloads the log from the API (administrators only; others keep their own session entries). */
  cargar(): Observable<void> {
    if (!this.auth.esAdmin) return of(undefined);
    return this.http.get<{ total: number; items: Cambio[] }>(`${API_URL}/cambios?tamano=1000`).pipe(
      map((r) => { this.cambios.splice(0, this.cambios.length, ...r.items); }),
      catchError(() => of(undefined)),
    );
  }

  registrar(c: { colaborador: string; documento: string; entidad: string; accion: AccionCambio; propiedad?: string; anterior?: string; actual?: string }): void {
    const fecha = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    const u = this.auth.usuario;
    this.cambios.unshift({
      id: Math.max(-1, ...this.cambios.map((x) => x.id)) + 1, usuario: u ? `${u.nombre} · ${u.rol}` : '—', origen: 'Web', fecha,
      propiedad: c.propiedad ?? '—', anterior: c.anterior ?? '—', actual: c.actual ?? '—',
      colaborador: c.colaborador, documento: c.documento, entidad: c.entidad, accion: c.accion,
    });
    if (this.auth.autenticado) this.http.post(`${API_URL}/cambios`, c).pipe(catchError(() => of(null))).subscribe();
  }
}
