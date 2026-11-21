import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { EjecucionApi, PlantillaReporteApi, ReporteApi, ReporteriaService } from '../../core/reporteria.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(220px, 2fr)' },
  { key: 'pl', label: 'Plantilla', filter: 'select', w: 'minmax(160px, 1.2fr)' },
  { key: 'c', label: 'Categoría', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'u', label: 'Creado por', filter: 'select', w: 'minmax(140px, 1fr)' },
  { key: 'f', label: 'Creado en', type: 'date', filter: 'date', w: 'minmax(120px, 0.8fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '150px' },
];
const HCOLS: Column[] = [
  { key: 'n', label: 'Reporte', w: 'minmax(220px, 2fr)' },
  { key: 'pl', label: 'Plantilla', filter: 'select', w: 'minmax(160px, 1.2fr)' },
  { key: 'p', label: 'Período', filter: 'select', w: 'minmax(100px, 0.8fr)' },
  { key: 'u', label: 'Generado por', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'f', label: 'Fecha y hora', type: 'date', filter: 'date', w: 'minmax(150px, 1fr)' },
  { key: 'r', label: 'Filas', type: 'number', filter: 'none', w: '90px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '80px' },
];
const CATEGORIAS = ['Todas', 'Remuneraciones', 'Administrativo', 'Desarrollo Organizacional', 'Beneficios', 'Capacitaciones'];

/**
 * 5.4 Reportería › Exportadores (API). Reports are saved from templates and generated as CSV with the current data;
 * payroll reports ask for the period. Every generated file is recorded in Historial.
 */
@Component({
  selector: 'app-exportadores',
  templateUrl: './exportadores.component.html'
})
export class ExportadoresComponent {
  readonly cols = COLS; readonly hcols = HCOLS;
  readonly categorias = CATEGORIAS;
  readonly actions: RowAction[] = ['descargar', 'duplicar', 'eliminar'];
  readonly hActions: RowAction[] = ['descargar'];
  tab = 0;
  rows: Row[] = [];
  hrows: Row[] = [];
  reportes: ReporteApi[] = [];
  historial: EjecucionApi[] = [];
  todas: PlantillaReporteApi[] = [];
  periodos: string[] = [];

  modal = false;
  categoria = 'Todas';
  query = '';
  seleccion: PlantillaReporteApi | null = null;
  pedirPeriodo: { reporte: ReporteApi; periodo: string } | null = null;
  ocupado = false;

  constructor(private api: ReporteriaService, private ui: UiStateService) { this.cargar(); }

  cargar(): void {
    this.api.datos().subscribe({
      next: (d) => {
        this.reportes = d.reportes;
        this.historial = d.historial;
        this.todas = d.plantillas;
        this.periodos = d.periodos;
        this.rows = d.reportes.map((r) => ({ id: r.id, n: r.nombre, pl: r.plantilla, c: r.categoria, u: r.creadoPor, f: r.creado, x: '' }));
        this.hrows = d.historial.map((h) => ({ id: h.id, n: h.reporte, pl: h.plantilla, p: h.periodo ?? '—', u: h.usuario, f: h.fecha, r: h.filas, x: '' }));
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  // --- template picker ------------------------------------------------------
  countCat(c: string): number { return c === 'Todas' ? this.todas.length : this.todas.filter((p) => p.categoria === c).length; }

  get plantillas(): PlantillaReporteApi[] {
    const q = this.query.trim().toLowerCase();
    return this.todas.filter((p) => (this.categoria === 'Todas' || p.categoria === this.categoria) && (!q || p.titulo.toLowerCase().includes(q)));
  }

  openModal(): void { this.categoria = 'Todas'; this.query = ''; this.seleccion = null; this.modal = true; }

  elegir(p: PlantillaReporteApi): void { if (p.generable) this.seleccion = p; }

  usarPlantilla(): void {
    const p = this.seleccion;
    if (!p || this.ocupado) return;
    this.ocupado = true;
    this.api.crear(p.titulo).subscribe({
      next: (r) => { this.ocupado = false; this.modal = false; this.tab = 0; this.ui.toast(`Reporte “${r.nombre}” creado`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }

  // --- actions --------------------------------------------------------------
  onAction(action: RowAction, row: Row): void {
    const r = this.reportes.find((x) => x.id === row.id);
    if (!r) return;
    if (action === 'descargar') {
      if (!r.generable) { this.ui.toast(`El reporte “${r.plantilla}” todavía no se puede generar en Nexo RH`); return; }
      if (r.requierePeriodo) {
        if (!this.periodos.length) { this.ui.toast('Aún no hay períodos con boletas calculadas'); return; }
        this.pedirPeriodo = { reporte: r, periodo: this.periodos[0] };
      } else this.generar(r, null);
    }
    if (action === 'duplicar') {
      this.api.duplicar(r.id).subscribe({ next: () => { this.ui.toast(`Se duplicó “${r.nombre}”`); this.cargar(); }, error: (e) => this.ui.toast(mensajeError(e)) });
    }
    if (action === 'eliminar') this.eliminar([r.id], `Reporte “${r.nombre}” eliminado`);
  }

  eliminarVarios(rows: Row[]): void { this.eliminar(rows.map((r) => +r.id), `${rows.length} reporte(s) eliminado(s)`); }

  private eliminar(ids: number[], msg: string): void {
    this.api.eliminar(ids).subscribe({ next: () => { this.ui.toast(msg); this.cargar(); }, error: (e) => this.ui.toast(mensajeError(e)) });
  }

  confirmarPeriodo(): void {
    const p = this.pedirPeriodo;
    if (!p) return;
    this.pedirPeriodo = null;
    this.generar(p.reporte, p.periodo);
  }

  private generar(r: ReporteApi, periodo: string | null): void {
    this.api.generar(r.id, periodo).subscribe({
      next: () => { this.ui.toast(`Reporte “${r.nombre}” generado`); this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  onHistorial(row: Row): void {
    this.api.regenerar(+row.id).subscribe({
      next: () => { this.ui.toast('Reporte generado de nuevo con los datos actuales'); this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
}
