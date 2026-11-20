import { Component } from '@angular/core';
import { downloadCsv } from '../../core/csv';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador, Division, Tone } from '../../core/models';
import { CENTRO_COSTO_DIVISION, INGRESOS_PLANIFICADOS, PLAN_AREA, PLAN_CARGO, POSICIONES, Posicion } from '../../core/sample/plataforma';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

type EstadoHc = 'Completo' | 'Insuficiente' | 'Excedido';
const TONE: Record<EstadoHc, Tone> = { Completo: 'success', Insuficiente: 'warning', Excedido: 'danger' };
const MESES = ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'];
/** Months of the sample period (Oct 2025 – Mar 2026) as [month, year]. */
const PERIODO: [number, number][] = [[9, 2025], [10, 2025], [11, 2025], [0, 2026], [1, 2026], [2, 2026]];

interface Linea { nombre: string; detalle: string; esperado: number; actual: number; vacante: number; estado: EstadoHc; }

const PCOLS: Column[] = [
  { key: 'id', label: 'ID de la posición', w: '140px' },
  { key: 'c', label: 'Cargo', filter: 'select', w: 'minmax(170px, 1.2fr)' },
  { key: 'd', label: 'División', filter: 'select', w: 'minmax(180px, 1.2fr)' },
  { key: 'a', label: 'Área', filter: 'select', w: 'minmax(130px, 0.9fr)' },
  { key: 's', label: 'Sub-área', filter: 'select', w: 'minmax(130px, 0.9fr)' },
  { key: 'fi', label: 'Fecha de ingreso proyectada', type: 'date', filter: 'date', w: '190px' },
  { key: 'ft', label: 'Fecha de término', type: 'date', filter: 'date', w: '150px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];

const linea = (nombre: string, detalle: string, esperado: number, actual: number): Linea => ({
  nombre, detalle, esperado, actual, vacante: Math.max(0, esperado - actual),
  estado: actual === esperado ? 'Completo' : actual < esperado ? 'Insuficiente' : 'Excedido',
});

/** P-10.1 Áreas y cargos, P-10.2 Posiciones, P-10.4 Analítica. "Actual" = current collaborators. */
@Component({
  selector: 'app-headcount',
  templateUrl: './headcount.component.html'
})
export class HeadcountComponent {
  readonly tabs = ['Áreas y cargos', 'Posiciones', 'Analítica'];
  readonly tone = TONE;
  readonly meses = MESES;
  readonly pcols = PCOLS;
  readonly actions: RowAction[] = ['editar', 'eliminar'];
  tab = 0;
  sub = 0;
  seg = 0;
  colaboradores: Colaborador[] = [];
  divisiones: Division[] = [];
  cargos: string[] = [];
  posiciones: Posicion[] = POSICIONES;
  prows: Row[] = [];

  modal: { area: string; cargo: string; ingreso: string; termino: string; cantidad: number } | null = null;
  intento = false;

  constructor(public data: HrDataService, private ui: UiStateService) {
    data.colaboradores().subscribe((c) => (this.colaboradores = c));
    data.divisiones().subscribe((d) => (this.divisiones = d));
    data.cargos().subscribe((c) => (this.cargos = c.filter((x) => x.activo).map((x) => x.nombre)));
    this.refreshPos();
  }

  get nivelLabel(): string { return { division: 'División', area: 'Área', subarea: 'Sub-área' }[this.data.hcNivel]; }

  /** Rows of "Áreas" grouped at the level chosen in Headcount › Configuraciones. */
  get lineasNivel(): Linea[] {
    const actual = (pred: (c: Colaborador) => boolean) => this.colaboradores.filter(pred).length;
    const abiertas = (pred: (p: Posicion) => boolean) => this.posiciones.filter((p) => p.vigente && pred(p)).length;
    if (this.data.hcNivel === 'division') {
      return this.divisiones.map((d) => linea(d.nombre, CENTRO_COSTO_DIVISION[d.nombre] ?? '—',
        d.areas.reduce((s, a) => s + (PLAN_AREA[a.nombre] ?? 0), 0), actual((c) => c.division === d.nombre)));
    }
    if (this.data.hcNivel === 'subarea') {
      return this.divisiones.flatMap((d) => d.areas.flatMap((a) => a.subAreas.map((s) => {
        const act = actual((c) => c.subArea === s.nombre && c.area === a.nombre);
        return linea(s.nombre, a.nombre, act + abiertas((p) => p.subArea === s.nombre), act);
      })));
    }
    return this.divisiones.flatMap((d) => d.areas.map((a) => linea(a.nombre, CENTRO_COSTO_DIVISION[d.nombre] ?? '—',
      PLAN_AREA[a.nombre] ?? 0, actual((c) => c.area === a.nombre))));
  }

  get lineasCargo(): Linea[] {
    return Object.keys(PLAN_CARGO).map((cargo) => {
      const sub = this.colaboradores.find((c) => c.cargo === cargo)?.subArea ?? this.posiciones.find((p) => p.cargo === cargo)?.subArea ?? '—';
      return linea(cargo, sub, PLAN_CARGO[cargo], this.colaboradores.filter((c) => c.cargo === cargo).length);
    });
  }

  get esperado(): number { return Object.values(PLAN_AREA).reduce((a, b) => a + b, 0); }
  get actual(): number { return this.colaboradores.length; }
  get sinPosicion(): number { return this.colaboradores.filter((c) => !PLAN_CARGO[c.cargo]).length; }
  get vacantes(): number { return this.lineasNivel.reduce((s, l) => s + l.vacante, 0); }
  get planificado(): number { return this.actual + this.posiciones.filter((p) => p.vigente).length; }

  get alerta(): string {
    const ex = this.lineasNivel.filter((l) => l.estado === 'Excedido').map((l) => l.nombre);
    return ex.length ? `${ex.join(', ')} ${ex.length === 1 ? 'supera' : 'superan'} lo presupuestado.` : '';
  }

  // --- Posiciones -----------------------------------------------------------
  private refreshPos(): void {
    this.prows = this.posiciones.filter((p) => p.vigente === (this.seg === 0)).map((p) => ({
      id: p.id, c: p.cargo, d: p.division, a: p.area, s: p.subArea, fi: p.ingreso, ft: p.termino, x: '',
    }));
  }
  pickSeg(i: number): void { this.seg = i; this.refreshPos(); }

  get areas(): { division: string; area: string; subArea: string }[] {
    return this.divisiones.flatMap((d) => d.areas.flatMap((a) => a.subAreas.map((s) => ({ division: d.nombre, area: a.nombre, subArea: s.nombre }))));
  }

  abrirModal(): void {
    this.intento = false;
    this.modal = { area: this.areas[0] ? `${this.areas[0].division}|${this.areas[0].area}|${this.areas[0].subArea}` : '', cargo: this.cargos[0] ?? '', ingreso: '', termino: '', cantidad: 1 };
  }

  get errModal(): string {
    const m = this.modal;
    if (!m) return '';
    if (!m.area || !m.cargo) return 'Selecciona área y cargo.';
    if (!(m.cantidad >= 1 && m.cantidad <= 20)) return 'La cantidad debe estar entre 1 y 20.';
    const ini = parseFecha(m.ingreso);
    if (!ini) return 'Ingresa la fecha de ingreso proyectada (DD/MM/YYYY).';
    if (m.termino) {
      const fin = parseFecha(m.termino);
      if (!fin) return 'La fecha de término debe tener el formato DD/MM/YYYY.';
      if (fin <= ini) return 'La fecha de término debe ser posterior al ingreso.';
    }
    return '';
  }

  guardar(): void {
    this.intento = true;
    const m = this.modal;
    if (!m || this.errModal) return;
    const [division, area, subArea] = m.area.split('|');
    const lugar = { division, area, subArea };
    let n = Math.max(0, ...this.posiciones.map((p) => +p.id.replace('POS-', '')));
    for (let i = 0; i < m.cantidad; i++) {
      this.posiciones.unshift({ id: `POS-${String(++n).padStart(4, '0')}`, cargo: m.cargo, ...lugar, ingreso: m.ingreso, termino: m.termino || '—', vigente: true });
    }
    PLAN_AREA[lugar.area] = (PLAN_AREA[lugar.area] ?? 0) + m.cantidad;
    PLAN_CARGO[m.cargo] = (PLAN_CARGO[m.cargo] ?? this.colaboradores.filter((c) => c.cargo === m.cargo).length) + m.cantidad;
    this.modal = null;
    this.seg = 0;
    this.refreshPos();
    this.ui.toast(`${m.cantidad} posición(es) de ${m.cargo} creadas en ${lugar.area}`);
  }

  onPosicion(action: RowAction, row: Row): void {
    const p = this.posiciones.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'eliminar') {
      this.posiciones.splice(this.posiciones.indexOf(p), 1);
      if (p.vigente) {
        PLAN_AREA[p.area] = Math.max(0, (PLAN_AREA[p.area] ?? 0) - 1);
        if (PLAN_CARGO[p.cargo]) PLAN_CARGO[p.cargo] = Math.max(0, PLAN_CARGO[p.cargo] - 1);
      }
      this.refreshPos();
      this.ui.toast(`Posición ${p.id} eliminada`);
    } else {
      this.ui.toast('La edición de posiciones llegará en la próxima versión');
    }
  }

  // --- Analítica ------------------------------------------------------------
  /** Real hires per month counted from collaborators' start dates. */
  get ingresosReales(): number[] {
    return PERIODO.map(([m, y]) => this.colaboradores.filter((c) => {
      const d = parseFecha(c.ingreso);
      return d && d.getMonth() === m && d.getFullYear() === y;
    }).length);
  }
  readonly planificados = INGRESOS_PLANIFICADOS;
  get maxIngresos(): number { return Math.max(1, ...this.planificados, ...this.ingresosReales); }
  get maxArea(): number { return Math.max(1, ...this.lineasNivel.flatMap((l) => [l.esperado, l.actual])); }

  descargar(kind: 'areas' | 'ingresos'): void {
    if (kind === 'areas') {
      downloadCsv('headcount-esperado-vs-actual', [this.nivelLabel, 'Esperado', 'Actual'], this.lineasNivel.map((l) => [l.nombre, String(l.esperado), String(l.actual)]));
    } else {
      const reales = this.ingresosReales;
      downloadCsv('ingresos-planificados-vs-reales', ['Mes', 'Ingreso planificado', 'Ingresos reales'], MESES.map((m, i) => [m, String(this.planificados[i]), String(reales[i])]));
    }
  }
}
