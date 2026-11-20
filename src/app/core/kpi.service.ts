import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuditService } from './audit.service';
import { ItemsService } from './items.service';
import { Colaborador } from './models';
import { DATOS_KPI, DatoKpi, TIPOS_KPI, TipoKpi } from './sample/kpi';

/** KPI definitions, monthly values and the bonus they pay (sent to Asignación de ítems as BON-KPI). */
@Injectable({ providedIn: 'root' })
export class KpiService {
  readonly tipos$ = new BehaviorSubject<TipoKpi[]>(TIPOS_KPI);
  readonly datos$ = new BehaviorSubject<DatoKpi[]>(DATOS_KPI);
  /** Periods whose bonuses were already sent to Asignación de ítems. */
  readonly enviados = new Set<string>();

  constructor(private items: ItemsService, private audit: AuditService) {}

  /** Achievement in %, rounded to one decimal. For "lower is better" it is meta / real. */
  cumplimiento(k: TipoKpi, real: number): number {
    const c = k.sentido === 'Mayor es mejor' ? real / k.meta : real > 0 ? k.meta / real : k.topePct / 100;
    return Math.round(c * 1000) / 10;
  }

  /** Bonus: 0 below the threshold, otherwise bono × achievement, capped at the ceiling. */
  pago(k: TipoKpi, real: number): number {
    const c = this.cumplimiento(k, real);
    if (c < k.umbralPct) return 0;
    return Math.round(k.bono * Math.min(c, k.topePct)) / 100;
  }

  dato(kpiId: number, colaboradorId: number, periodo: string): DatoKpi | undefined {
    return this.datos$.value.find((d) => d.kpiId === kpiId && d.colaboradorId === colaboradorId && d.periodo === periodo);
  }

  guardarDato(k: TipoKpi, c: Colaborador, periodo: string, real: number): void {
    const actual = this.dato(k.id, c.id, periodo);
    const anterior = actual ? String(actual.real) : '—';
    if (actual) actual.real = real;
    else this.datos$.value.push({ id: Math.max(0, ...this.datos$.value.map((d) => d.id)) + 1, kpiId: k.id, colaboradorId: c.id, periodo, real });
    this.datos$.next([...this.datos$.value]);
    this.audit.registrar({ colaborador: `${c.apellidos}, ${c.nombres}`, documento: c.documento, entidad: `KPI ${k.codigo} ${periodo}`,
      accion: actual ? 'Modificar' : 'Crear', propiedad: 'valor_real', anterior, actual: String(real) });
  }

  guardarTipo(t: Omit<TipoKpi, 'id'> & { id: number | null }): TipoKpi {
    const list = this.tipos$.value;
    if (t.id === null) {
      const nuevo: TipoKpi = { ...t, id: Math.max(0, ...list.map((x) => x.id)) + 1 };
      this.tipos$.next([...list, nuevo]);
      return nuevo;
    }
    const actual = list.find((x) => x.id === t.id)!;
    Object.assign(actual, t);
    this.tipos$.next([...list]);
    return actual;
  }
  toggleTipo(t: TipoKpi): void { t.activo = !t.activo; this.tipos$.next([...this.tipos$.value]); }
  eliminarTipo(t: TipoKpi): void { this.tipos$.next(this.tipos$.value.filter((x) => x !== t)); }
  usos(kpiId: number): number { return this.datos$.value.filter((d) => d.kpiId === kpiId).length; }

  /**
   * Writes one BON-KPI assignment per collaborator for the period (sum of their KPI bonuses), replacing what a
   * previous send created. Returns how many collaborators get a bonus and the total.
   */
  enviar(periodo: string, colaboradores: Colaborador[]): { personas: number; total: number } {
    const item = this.items.tipos$.value.find((t) => t.codigo === 'BON-KPI');
    if (!item) return { personas: 0, total: 0 };
    const etiqueta = `KPI ${periodo}`;
    for (const a of this.items.asignaciones$.value.filter((x) => x.tipoId === item.id && x.desde === periodo && x.observacion.startsWith(etiqueta))) {
      const c = colaboradores.find((x) => x.id === a.colaboradorId);
      if (c) this.items.quitar(a, c);
    }
    let personas = 0, total = 0;
    for (const c of colaboradores) {
      const detalle: string[] = [];
      let monto = 0;
      for (const k of this.tipos$.value.filter((t) => t.activo && t.colaboradores.includes(c.id))) {
        const d = this.dato(k.id, c.id, periodo);
        if (!d) continue;
        const p = this.pago(k, d.real);
        if (p > 0) { monto += p; detalle.push(k.codigo); }
      }
      if (monto > 0) {
        monto = Math.round(monto * 100) / 100;
        this.items.asignar(c, { tipoId: item.id, monto, desde: periodo, hasta: periodo, observacion: `${etiqueta} · ${detalle.join(', ')}` });
        personas++;
        total += monto;
      }
    }
    this.enviados.add(periodo);
    return { personas, total: Math.round(total * 100) / 100 };
  }
}
