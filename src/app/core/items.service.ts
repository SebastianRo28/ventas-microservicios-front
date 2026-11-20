import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuditService } from './audit.service';
import { soles } from './format';
import { Colaborador } from './models';
import { ASIGNACIONES_ITEM, AsignacionItem, TIPOS_ITEM, TipoItem } from './sample/items';

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

/** Payroll item types and their assignments to collaborators. In memory until there is an API. */
@Injectable({ providedIn: 'root' })
export class ItemsService {
  readonly tipos$ = new BehaviorSubject<TipoItem[]>(TIPOS_ITEM);
  readonly asignaciones$ = new BehaviorSubject<AsignacionItem[]>(ASIGNACIONES_ITEM);

  constructor(private audit: AuditService) {}

  tipo(id: number): TipoItem | undefined { return this.tipos$.value.find((t) => t.id === id); }
  usos(tipoId: number): number { return this.asignaciones$.value.filter((a) => a.tipoId === tipoId).length; }

  guardarTipo(t: Omit<TipoItem, 'id'> & { id: number | null }): TipoItem {
    const list = this.tipos$.value;
    if (t.id === null) {
      const nuevo: TipoItem = { ...t, id: Math.max(0, ...list.map((x) => x.id)) + 1 };
      this.tipos$.next([...list, nuevo]);
      return nuevo;
    }
    const actual = list.find((x) => x.id === t.id)!;
    Object.assign(actual, t);
    this.tipos$.next([...list]);
    return actual;
  }
  eliminarTipo(t: TipoItem): void { this.tipos$.next(this.tipos$.value.filter((x) => x !== t)); }
  toggleTipo(t: TipoItem): void { t.activo = !t.activo; this.tipos$.next([...this.tipos$.value]); }

  asignar(c: Colaborador, a: Omit<AsignacionItem, 'id' | 'colaboradorId'>): AsignacionItem {
    const list = this.asignaciones$.value;
    const nueva: AsignacionItem = { ...a, id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: c.id };
    this.asignaciones$.next([nueva, ...list]);
    this.audit.registrar({ colaborador: `${c.apellidos}, ${c.nombres}`, documento: c.documento, entidad: `Ítem ${this.tipo(a.tipoId)?.codigo} #${nueva.id}`,
      accion: 'Crear', actual: `${soles(a.monto)} · ${a.desde}${a.hasta ? ' a ' + a.hasta : ' en adelante'}` });
    return nueva;
  }
  quitar(a: AsignacionItem, c: Colaborador): void {
    this.asignaciones$.next(this.asignaciones$.value.filter((x) => x !== a));
    this.audit.registrar({ colaborador: `${c.apellidos}, ${c.nombres}`, documento: c.documento, entidad: `Ítem ${this.tipo(a.tipoId)?.codigo} #${a.id}`,
      accion: 'Eliminar', anterior: soles(a.monto) });
  }
}
