import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatosService } from './datos.service';
import { ItemsService } from './items.service';
import { Colaborador } from './models';
import { DatoKpi, TipoKpi } from './sample/kpi';

/**
 * KPI definitions, monthly values and the bonus they pay (sent to Asignación de ítems as BON-KPI). Stored by the API per
 * company (/api/datos: kpi-tipos, kpi-datos and kpi-envios, the periods whose bonuses were sent); the API records the changes.
 */
@Injectable({ providedIn: 'root' })
export class KpiService {
  get tipos$(): BehaviorSubject<TipoKpi[]> { return this.datos.lista$<TipoKpi>('kpi-tipos'); }
  get datos$(): BehaviorSubject<DatoKpi[]> { return this.datos.lista$<DatoKpi>('kpi-datos'); }
  /** Periods whose bonuses were already sent to Asignación de ítems. */
  get enviados(): Set<string> { return new Set(this.datos.lista$<{ id: number; periodo: string }>('kpi-envios').value.map((e) => e.periodo)); }

  constructor(private items: ItemsService, private datos: DatosService) {}

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
    if (actual) this.datos.actualizar('kpi-datos', { ...actual, real }).subscribe();
    else this.datos.crear('kpi-datos', { kpiId: k.id, colaboradorId: c.id, periodo, real }).subscribe();
  }

  guardarTipo(t: Omit<TipoKpi, 'id'> & { id: number | null }): void {
    const { id, ...datos } = t;
    if (id === null) this.datos.crear('kpi-tipos', datos).subscribe();
    else this.datos.actualizar('kpi-tipos', { ...datos, id }).subscribe();
  }

  toggleTipo(t: TipoKpi): void { this.datos.actualizar('kpi-tipos', { ...t, activo: !t.activo }).subscribe(); }
  eliminarTipo(t: TipoKpi): void { this.datos.eliminar('kpi-tipos', t.id).subscribe(); }
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
    if (!this.enviados.has(periodo)) this.datos.crear('kpi-envios', { periodo }).subscribe();
    return { personas, total: Math.round(total * 100) / 100 };
  }
}
