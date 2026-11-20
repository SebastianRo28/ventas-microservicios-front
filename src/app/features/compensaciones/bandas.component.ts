import { Component } from '@angular/core';
import { UBICACION_TONE, Ubicacion, bandaMax, bandaMin, barra, ubicar } from '../../core/bandas';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { Banda, NivelBanda, Remuneracion } from '../../core/sample/compensaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'b', label: 'Banda salarial del cargo', w: 'minmax(220px, 1.6fr)' },
  { key: 'c', label: 'Cargo asociado', w: 'minmax(160px, 1.1fr)' },
  { key: 'n', label: 'Colaboradores dentro del cargo', type: 'number', filter: 'none', w: '170px' },
  { key: 'nb', label: 'Colaboradores bajo la banda del cargo', type: 'number', filter: 'none', w: '200px' },
  { key: 'e', label: 'Estado del cargo', type: 'badge', filter: 'select', w: '140px' },
  { key: 'o', label: 'Sueldo objetivo', type: 'money', filter: 'none', w: '150px' },
  { key: 'mn', label: 'Mínimo de la banda', type: 'money', filter: 'none', w: '160px' },
  { key: 'mx', label: 'Máximo de la banda', type: 'money', filter: 'none', w: '160px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];
const NCOLS: Column[] = [
  { key: 'n', label: 'Nivel', w: 'minmax(160px, 1.2fr)' },
  { key: 'c', label: 'Código', w: '100px' },
  { key: 'k', label: 'Cargos', type: 'number', filter: 'none', w: '100px' },
  { key: 'mn', label: 'Mínimo', type: 'money', filter: 'none', w: '140px' },
  { key: 'o', label: 'Sueldo objetivo', type: 'money', filter: 'none', w: '160px' },
  { key: 'mx', label: 'Máximo', type: 'money', filter: 'none', w: '140px' },
];

export interface FilaBanda {
  colaborador: Colaborador; banda: Banda; rem: Remuneracion; base: number; min: number; max: number;
  ubicacion: Ubicacion; compa: number; bar: ReturnType<typeof barra>;
}

/** P-09.1 / P-09.3 Compensaciones › Bandas Salariales. */
@Component({
  selector: 'app-bandas',
  templateUrl: './bandas.component.html'
})
export class BandasComponent {
  readonly tabs = ['Cargos', 'Niveles', 'Colaboradores', 'Analítica'];
  readonly cols = COLS; readonly ncols = NCOLS;
  readonly tone = UBICACION_TONE;
  readonly ubicaciones: Ubicacion[] = ['En la banda', 'Sobre la banda', 'Bajo la banda'];
  readonly soles = soles;
  readonly actions: RowAction[] = ['editar', 'eliminar'];
  tab = 0;
  banner = true;
  bandas: Banda[] = [];
  niveles: NivelBanda[] = [];
  colaboradores: Colaborador[] = [];
  rem: Record<number, Remuneracion> = {};
  cargos: string[] = [];
  rows: Row[] = [];
  nrows: Row[] = [];
  filas: FilaBanda[] = [];

  consulta = '';
  filtro: { texto: string; test: (f: FilaBanda) => boolean } | null = null;

  bandaModal: { id: number | null; cargo: string; objetivo: string; pctMin: string; pctMax: string } | null = null;
  compModal: { fila: FilaBanda; monto: string; comentario: string } | null = null;
  intento = false;

  constructor(data: HrDataService, private ui: UiStateService) {
    data.bandas().subscribe((b) => (this.bandas = b));
    data.nivelesBanda().subscribe((n) => (this.niveles = n));
    data.colaboradores().subscribe((c) => (this.colaboradores = c));
    data.remuneraciones().subscribe((r) => (this.rem = r));
    data.cargos().subscribe((c) => (this.cargos = c.filter((x) => x.activo).map((x) => x.nombre)));
    this.refresh();
  }

  private refresh(): void {
    this.filas = this.colaboradores.flatMap((c) => {
      const banda = this.bandas.find((b) => b.cargo === c.cargo);
      const rem = this.rem[c.id];
      if (!banda || !rem) return [];
      const base = rem.compTeorica ?? rem.sueldoBase, min = bandaMin(banda), max = bandaMax(banda);
      return [{ colaborador: c, banda, rem, base, min, max, ubicacion: ubicar(base, min, max),
        compa: Math.round((base / banda.objetivo) * 100) / 100, bar: barra(base, min, max, banda.objetivo) }];
    });
    this.rows = this.bandas.map((b) => {
      const enCargo = this.filas.filter((f) => f.banda.id === b.id);
      return {
        id: b.id, b: `Banda Salarial - ${b.cargo}`, c: b.cargo, n: this.colaboradores.filter((c) => c.cargo === b.cargo).length,
        nb: enCargo.filter((f) => f.ubicacion === 'Bajo la banda').length,
        e: b.activo ? { text: 'Activo', tone: 'success' as const } : { text: 'Inactivo', tone: 'gray' as const },
        o: soles(b.objetivo), mn: soles(bandaMin(b)), mx: soles(bandaMax(b)), x: '',
      };
    });
    this.nrows = this.niveles.map((n, id) => ({ id, n: n.nombre, c: n.codigo, k: n.cargos, mn: soles(n.minimo), o: soles(n.objetivo), mx: soles(n.maximo) }));
  }

  // --- KPIs -----------------------------------------------------------------
  get sinBanda(): number { return this.colaboradores.length - this.filas.length; }
  pct(u: Ubicacion): number { return this.filas.length ? Math.round((this.filas.filter((f) => f.ubicacion === u).length / this.filas.length) * 100) : 0; }
  count(u: Ubicacion): number { return this.filas.filter((f) => f.ubicacion === u).length; }
  get compaPromedio(): string {
    return this.filas.length ? (this.filas.reduce((s, f) => s + f.compa, 0) / this.filas.length).toFixed(2) : '—';
  }
  get visibles(): FilaBanda[] { return this.filtro ? this.filas.filter(this.filtro.test) : this.filas; }

  /**
   * Keyword-based filter for the "lenguaje natural" box: recognises band position
   * (sobre / bajo / en la banda) and division or area names.
   */
  filtrar(): void {
    const q = this.consulta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!q.trim()) { this.filtro = null; return; }
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const ub: Ubicacion | null = /sobre/.test(q) ? 'Sobre la banda' : /bajo|debajo/.test(q) ? 'Bajo la banda' : /dentro|en la banda/.test(q) ? 'En la banda' : null;
    const lugares = [...new Set(this.filas.flatMap((f) => [f.colaborador.division, f.colaborador.area]))].filter((l) => q.includes(norm(l)));
    if (!ub && !lugares.length) {
      this.filtro = { texto: `No se reconoció un criterio en “${this.consulta}”. Prueba con “sobre la banda en Comercial”.`, test: () => false };
      return;
    }
    const partes = [ub ? `Ubicación en banda es “${ub}”` : '', lugares.length ? `División o área: ${lugares.join(', ')}` : ''].filter(Boolean);
    this.filtro = {
      texto: partes.join(' · '),
      test: (f) => (!ub || f.ubicacion === ub) && (!lugares.length || lugares.includes(f.colaborador.division) || lugares.includes(f.colaborador.area)),
    };
  }
  limpiar(): void { this.consulta = ''; this.filtro = null; }

  // --- bandas ---------------------------------------------------------------
  nuevaBanda(): void {
    this.intento = false;
    const libre = this.cargos.find((c) => !this.bandas.some((b) => b.cargo === c)) ?? '';
    this.bandaModal = { id: null, cargo: libre, objetivo: '', pctMin: '85', pctMax: '120' };
  }

  onBanda(action: RowAction, row: Row): void {
    const b = this.bandas.find((x) => x.id === row.id);
    if (!b) return;
    if (action === 'editar') { this.intento = false; this.bandaModal = { id: b.id, cargo: b.cargo, objetivo: String(b.objetivo), pctMin: String(b.pctMin), pctMax: String(b.pctMax) }; }
    if (action === 'eliminar') { this.bandas.splice(this.bandas.indexOf(b), 1); this.refresh(); this.ui.toast(`Banda de ${b.cargo} eliminada`); }
  }

  /** Median base salary of the position, used by "Calcular automáticamente". */
  medianaCargo(cargo: string): number | null {
    const v = this.colaboradores.filter((c) => c.cargo === cargo).map((c) => this.rem[c.id]?.sueldoBase).filter((x): x is number => !!x).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  calcularObjetivo(): void {
    const m = this.bandaModal;
    if (!m) return;
    const med = this.medianaCargo(m.cargo);
    if (med === null) { this.ui.toast(`No hay sueldos registrados para ${m.cargo || 'el cargo'}`); return; }
    m.objetivo = med.toFixed(2);
  }

  num(v: string): number { return parseFloat(String(v).replace(/,/g, '')) || 0; }
  get errBanda(): string {
    const m = this.bandaModal;
    if (!m) return '';
    if (!m.cargo) return 'Selecciona un cargo.';
    if (m.id === null && this.bandas.some((b) => b.cargo === m.cargo)) return 'Ese cargo ya tiene una banda salarial.';
    if (this.num(m.objetivo) <= 0) return 'Ingresa un sueldo objetivo mayor a 0.';
    if (!(this.num(m.pctMin) > 0 && this.num(m.pctMin) <= 100)) return 'El mínimo debe estar entre 1 % y 100 % del objetivo.';
    if (this.num(m.pctMax) < 100) return 'El máximo debe ser al menos 100 % del objetivo.';
    return '';
  }

  guardarBanda(): void {
    this.intento = true;
    const m = this.bandaModal;
    if (!m || this.errBanda) return;
    const datos = { cargo: m.cargo, objetivo: this.num(m.objetivo), pctMin: this.num(m.pctMin), pctMax: this.num(m.pctMax) };
    if (m.id === null) this.bandas.push({ id: Math.max(-1, ...this.bandas.map((b) => b.id)) + 1, activo: true, ...datos });
    else Object.assign(this.bandas.find((b) => b.id === m.id)!, datos);
    this.bandaModal = null;
    this.refresh();
    this.ui.toast(`Banda de ${datos.cargo} guardada`);
  }

  // --- compensación teórica -------------------------------------------------
  abrirComp(f: FilaBanda): void { this.intento = false; this.compModal = { fila: f, monto: String(f.rem.compTeorica ?? f.rem.sueldoBase), comentario: '' }; }

  guardarComp(): void {
    this.intento = true;
    const m = this.compModal;
    if (!m || this.num(m.monto) <= 0) return;
    m.fila.rem.compTeorica = this.num(m.monto);
    this.compModal = null;
    this.refresh();
    this.ui.toast('Compensación teórica actualizada');
  }
}
