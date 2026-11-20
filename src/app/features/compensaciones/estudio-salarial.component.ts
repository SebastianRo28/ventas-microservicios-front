import { Component } from '@angular/core';
import { UBICACION_TONE, Ubicacion, barra, ubicar } from '../../core/bandas';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { Banda, CargoMercado, Remuneracion } from '../../core/sample/compensaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'cb', label: 'Cargo Nexo', w: 'minmax(170px, 1.2fr)' },
  { key: 'ci', label: 'Cargo interno', w: 'minmax(160px, 1.1fr)' },
  { key: 'd', label: 'Descripción del cargo Nexo', w: 'minmax(220px, 1.6fr)' },
  { key: 'in', label: 'Industria', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 't', label: 'Tamaño de empresa', type: 'badge', filter: 'select', w: '170px' },
  { key: 'p25', label: 'P25', type: 'money', filter: 'none', w: '120px' },
  { key: 'p50', label: 'P50', type: 'money', filter: 'none', w: '120px' },
  { key: 'p75', label: 'P75', type: 'money', filter: 'none', w: '120px' },
  { key: 'p90', label: 'P90', type: 'money', filter: 'none', w: '120px' },
  { key: 'x', label: 'Emparejar', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

interface Comparacion { banda: Banda; mercado: CargoMercado | null; n: number; ubicacion: Ubicacion; compa: number | null; bar: ReturnType<typeof barra> | null; }

/** P-09.5 Estudio salarial and P-09.6 Comparación de cargos. Market band = P25–P75; compa ratio = objetivo / P50. */
@Component({
  selector: 'app-estudio-salarial',
  templateUrl: './estudio-salarial.component.html'
})
export class EstudioSalarialComponent {
  readonly tabs = ['Estudio salarial', 'Comparación de cargos', 'Colaboradores'];
  readonly cols = COLS;
  readonly tone = UBICACION_TONE;
  readonly soles = soles;
  readonly actions: RowAction[] = ['emparejar'];
  tab = 0;
  mercado: CargoMercado[] = [];
  bandas: Banda[] = [];
  colaboradores: Colaborador[] = [];
  rem: Record<number, Remuneracion> = {};
  rows: Row[] = [];
  comparaciones: Comparacion[] = [];

  emparejar: { mercado: CargoMercado; interno: string } | null = null;
  desemparejar: CargoMercado | null = null;

  constructor(data: HrDataService, private ui: UiStateService) {
    data.estudioSalarial().subscribe((m) => (this.mercado = m));
    data.bandas().subscribe((b) => (this.bandas = b));
    data.colaboradores().subscribe((c) => (this.colaboradores = c));
    data.remuneraciones().subscribe((r) => (this.rem = r));
    this.refresh();
  }

  private refresh(): void {
    const tamTone = (t: string) => (t === 'Gran Empresa' ? 'info' as const : t === 'Pequeña Empresa' ? 'gray' as const : 'neutral' as const);
    this.rows = this.mercado.map((m) => ({
      id: m.id, cb: m.cargo, ci: m.interno ?? '—', d: m.descripcion, in: m.industria, t: { text: m.tamano, tone: tamTone(m.tamano) },
      p25: soles(m.p25), p50: soles(m.p50), p75: soles(m.p75), p90: soles(m.p90), x: '',
    }));
    this.comparaciones = this.bandas.map((b) => {
      const m = this.mercado.find((x) => x.interno === b.cargo) ?? null;
      return {
        banda: b, mercado: m, n: this.colaboradores.filter((c) => c.cargo === b.cargo).length,
        ubicacion: m ? ubicar(b.objetivo, m.p25, m.p75) : 'Sin información',
        compa: m ? Math.round((b.objetivo / m.p50) * 100) / 100 : null,
        bar: m ? barra(b.objetivo, m.p25, m.p75, m.p50) : null,
      };
    });
  }

  get emparejadas(): Comparacion[] { return this.comparaciones.filter((c) => c.mercado); }
  pctEmparejados(): number { return this.comparaciones.length ? Math.round((this.emparejadas.length / this.comparaciones.length) * 100) : 0; }
  pct(u: Ubicacion): number { return this.emparejadas.length ? Math.round((this.emparejadas.filter((c) => c.ubicacion === u).length / this.emparejadas.length) * 100) : 0; }
  get compaPromedio(): string {
    const v = this.emparejadas.map((c) => c.compa!);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '—';
  }

  /** Collaborators whose position is paired with a market position. */
  get vsMercado() {
    return this.colaboradores.flatMap((c) => {
      const m = this.mercado.find((x) => x.interno === c.cargo);
      const base = this.rem[c.id]?.sueldoBase;
      if (!m || !base) return [];
      return [{ c, m, base, diff: Math.round(((base - m.p50) / m.p50) * 100) }];
    });
  }

  /** Internal positions that have a band and are not paired yet. */
  get libres(): string[] {
    return this.bandas.map((b) => b.cargo).filter((c) => !this.mercado.some((m) => m.interno === c));
  }

  onAction(row: Row): void {
    const m = this.mercado.find((x) => x.id === row.id);
    if (!m) return;
    if (m.interno) { this.desemparejar = m; return; }
    this.emparejar = { mercado: m, interno: '' };
  }

  confirmarEmparejar(): void {
    const e = this.emparejar;
    if (!e || !e.interno) return;
    e.mercado.interno = e.interno;
    this.emparejar = null;
    this.refresh();
    this.ui.toast(`“${e.interno}” quedó emparejado con “${e.mercado.cargo}”`);
  }

  confirmarDesemparejar(): void {
    const m = this.desemparejar;
    if (!m) return;
    const interno = m.interno;
    m.interno = null;
    this.desemparejar = null;
    this.refresh();
    this.ui.toast(`Se desemparejó “${interno}” de “${m.cargo}”`);
  }
}
