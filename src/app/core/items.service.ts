import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { API_URL } from './api';
import { AuditService } from './audit.service';
import { AuthService, mensajeError } from './auth.service';
import { soles } from './format';
import { Colaborador } from './models';
import { AsignacionItem, TipoItem } from './sample/items';
import { UiStateService } from './ui-state.service';

/** "MM/YYYY" → comparable number (yyyymm); NaN when malformed. */
export const periodoNum = (p: string): number => {
  const m = p.trim().match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
  return m ? +m[2] * 100 + +m[1] : NaN;
};

/** Whether an assignment applies in the given period (MM/YYYY). */
export const vigenteEn = (a: AsignacionItem, periodo: string): boolean => {
  const p = periodoNum(periodo);
  return periodoNum(a.desde) <= p && (!a.hasta || periodoNum(a.hasta) >= p);
};

const URL = `${API_URL}/remuneraciones`;

/**
 * Payroll item types and their assignments to collaborators, stored by the API (administrators only). Changes apply
 * here at once and are sent to the API, which validates them and records them in Historial de cambios; when it
 * rejects one, the reason is shown and the lists are reloaded.
 */
@Injectable({ providedIn: 'root' })
export class ItemsService {
  readonly tipos$ = new BehaviorSubject<TipoItem[]>([]);
  readonly asignaciones$ = new BehaviorSubject<AsignacionItem[]>([]);
  private tmp = -1;

  constructor(private audit: AuditService, private http: HttpClient, private auth: AuthService, private ui: UiStateService) {
    auth.usuario$.subscribe((u) => { if (!u) { this.tipos$.next([]); this.asignaciones$.next([]); } });
  }

  cargar(): Observable<void> {
    if (!this.auth.esAdmin || this.auth.debeCambiarPassword) return of(undefined);
    return forkJoin([this.http.get<TipoItem[]>(`${URL}/tipos-item`), this.http.get<AsignacionItem[]>(`${URL}/asignaciones`)]).pipe(
      tap(([t, a]) => { this.tipos$.next(t); this.asignaciones$.next(a); }),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  private enviar<T>(peticion: Observable<T>, alGuardar?: (r: T) => void): void {
    peticion.subscribe({
      next: (r) => alGuardar?.(r),
      error: (e) => {
        if (e?.status === 401) return;
        this.ui.toast(`No se guardó el cambio: ${mensajeError(e)}`);
        this.cargar().subscribe();
      },
    });
  }

  tipo(id: number): TipoItem | undefined { return this.tipos$.value.find((t) => t.id === id); }
  usos(tipoId: number): number { return this.asignaciones$.value.filter((a) => a.tipoId === tipoId).length; }

  guardarTipo(t: Omit<TipoItem, 'id'> & { id: number | null }): TipoItem {
    const list = this.tipos$.value;
    const cuerpo = { codigo: t.codigo, nombre: t.nombre, clase: t.clase, plame: t.plame, essalud: t.essalud, pension: t.pension, quinta: t.quinta, activo: t.activo };
    if (t.id === null) {
      const nuevo: TipoItem = { ...t, id: this.tmp-- };
      this.tipos$.next([...list, nuevo]);
      this.enviar(this.http.post<TipoItem>(`${URL}/tipos-item`, cuerpo), (r) => { Object.assign(nuevo, r); this.tipos$.next([...this.tipos$.value]); });
      return nuevo;
    }
    const actual = list.find((x) => x.id === t.id)!;
    Object.assign(actual, t);
    this.tipos$.next([...list]);
    this.enviar(this.http.put<TipoItem>(`${URL}/tipos-item/${actual.id}`, cuerpo), (r) => { Object.assign(actual, r); this.tipos$.next([...this.tipos$.value]); });
    return actual;
  }
  eliminarTipo(t: TipoItem): void {
    this.tipos$.next(this.tipos$.value.filter((x) => x !== t));
    this.enviar(this.http.delete(`${URL}/tipos-item/${t.id}`));
  }
  toggleTipo(t: TipoItem): void {
    t.activo = !t.activo;
    this.tipos$.next([...this.tipos$.value]);
    this.enviar(this.http.put<TipoItem>(`${URL}/tipos-item/${t.id}`, { ...t }));
  }

  asignar(c: Colaborador, a: Omit<AsignacionItem, 'id' | 'colaboradorId'>): AsignacionItem {
    const list = this.asignaciones$.value;
    const nueva: AsignacionItem = { ...a, id: this.tmp--, colaboradorId: c.id };
    this.asignaciones$.next([nueva, ...list]);
    this.audit.registrar({ colaborador: `${c.apellidos}, ${c.nombres}`, documento: c.documento, entidad: `Ítem ${this.tipo(a.tipoId)?.codigo}`,
      accion: 'Crear', actual: `${soles(a.monto)} · ${a.desde}${a.hasta ? ' a ' + a.hasta : ' en adelante'}` }, false);
    this.enviar(this.http.post<AsignacionItem>(`${URL}/asignaciones`, { colaboradorId: c.id, ...a }),
      (r) => { Object.assign(nueva, r); this.asignaciones$.next([...this.asignaciones$.value]); });
    return nueva;
  }
  /** Removes the item; one already paid in closed periods only gets an end period (the API decides). */
  quitar(a: AsignacionItem, c: Colaborador): void {
    this.asignaciones$.next(this.asignaciones$.value.filter((x) => x !== a));
    this.audit.registrar({ colaborador: `${c.apellidos}, ${c.nombres}`, documento: c.documento, entidad: `Ítem ${this.tipo(a.tipoId)?.codigo} #${a.id}`,
      accion: 'Eliminar', anterior: soles(a.monto) }, false);
    this.enviar(this.http.delete(`${URL}/asignaciones/${a.id}`), () => this.cargar().subscribe());
  }
}
