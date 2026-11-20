import { Component } from '@angular/core';
import { downloadCsv } from '../../core/csv';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { CATEGORIAS_REPORTE, EjecucionReporte, PLANTILLAS_REPORTE, PlantillaReporte, Reporte } from '../../core/sample/reportes';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(220px, 2fr)' },
  { key: 'pl', label: 'Plantilla', filter: 'select', w: 'minmax(160px, 1.2fr)' },
  { key: 'c', label: 'Categoría', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'pr', label: 'Programado', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'f', label: 'Creado en', type: 'date', filter: 'date', w: 'minmax(120px, 0.8fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '150px' },
];
const HCOLS: Column[] = [
  { key: 'n', label: 'Reporte', w: 'minmax(220px, 2fr)' },
  { key: 'p', label: 'Período', filter: 'select', w: 'minmax(120px, 1fr)' },
  { key: 'u', label: 'Generado por', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'f', label: 'Fecha y hora', type: 'date', filter: 'date', w: 'minmax(150px, 1fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.8fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '80px' },
];

/** Reports that can be generated from data the app already has. */
const GENERABLES = new Set(['Maestro de empleados', 'Maestro de empleados · RR.HH.']);

/** 5.4 Reportería › Exportadores, with the "Plantillas" picker. */
@Component({
  selector: 'app-exportadores',
  templateUrl: './exportadores.component.html'
})
export class ExportadoresComponent {
  readonly cols = COLS; readonly hcols = HCOLS;
  readonly categorias = CATEGORIAS_REPORTE;
  readonly actions: RowAction[] = ['descargar', 'duplicar', 'eliminar'];
  readonly hActions: RowAction[] = ['descargar'];
  tab = 0;
  banner = true;
  rows: Row[] = [];
  hrows: Row[] = [];
  reportes: Reporte[] = [];
  historial: EjecucionReporte[] = [];
  private colaboradores: Colaborador[] = [];

  modal = false;
  categoria = 'Todas';
  query = '';
  seleccion: PlantillaReporte | null = null;

  constructor(private data: HrDataService, private ui: UiStateService) {
    data.reportes().subscribe((r) => (this.reportes = r));
    data.historialReportes().subscribe((h) => (this.historial = h));
    data.colaboradores().subscribe((c) => (this.colaboradores = c));
    this.refresh();
  }

  private refresh(): void {
    this.rows = this.reportes.map((r) => ({ id: r.id, n: r.nombre, pl: r.plantilla, c: r.categoria, pr: r.programado ? 'Sí' : 'No', f: r.creado, x: '' }));
    this.hrows = this.historial.map((h) => ({
      id: h.id, n: h.reporte, p: h.periodo, u: h.usuario, f: h.fecha,
      e: h.estado === 'Enviado' ? { text: 'Enviado', tone: 'success' as const } : { text: 'Fallido', tone: 'danger' as const }, x: '',
    }));
  }

  // --- template picker ------------------------------------------------------
  countCat(c: string): number { return c === 'Todas' ? PLANTILLAS_REPORTE.length : PLANTILLAS_REPORTE.filter((p) => p.categoria === c).length; }

  get plantillas(): PlantillaReporte[] {
    const q = this.query.trim().toLowerCase();
    return PLANTILLAS_REPORTE.filter((p) => (this.categoria === 'Todas' || p.categoria === this.categoria) && (!q || p.titulo.toLowerCase().includes(q)));
  }

  openModal(): void { this.categoria = 'Todas'; this.query = ''; this.seleccion = null; this.modal = true; }

  usarPlantilla(): void {
    const p = this.seleccion;
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.reportes.unshift({
      id: Math.max(0, ...this.reportes.map((r) => r.id)) + 1, nombre: p.tipo === 'blank' ? 'Reporte nuevo' : `${p.titulo} – ${hoy}`,
      plantilla: p.titulo, categoria: p.categoria === 'Todas' ? 'Administrativo' : p.categoria, programado: false, creado: hoy,
    });
    this.modal = false;
    this.tab = 0;
    this.refresh();
    this.ui.toast(`Reporte creado con la plantilla “${p.titulo}”`);
  }

  // --- actions --------------------------------------------------------------
  onAction(action: RowAction, row: Row): void {
    const i = this.reportes.findIndex((r) => r.id === row.id);
    if (i < 0) return;
    const r = this.reportes[i];
    if (action === 'descargar') this.generar(r.nombre, r.plantilla);
    if (action === 'duplicar') {
      this.reportes.splice(i + 1, 0, { ...r, id: Math.max(...this.reportes.map((x) => x.id)) + 1, nombre: `${r.nombre} (copia)`, programado: false });
      this.ui.toast(`Se duplicó “${r.nombre}”`);
    }
    if (action === 'eliminar') { this.reportes.splice(i, 1); this.ui.toast(`Reporte “${r.nombre}” eliminado`); }
    this.refresh();
  }

  eliminarVarios(rows: Row[]): void {
    const ids = new Set(rows.map((r) => r.id));
    for (let i = this.reportes.length - 1; i >= 0; i--) if (ids.has(this.reportes[i].id)) this.reportes.splice(i, 1);
    this.refresh();
    this.ui.toast(`${rows.length} reporte(s) eliminado(s)`);
  }

  onHistorial(row: Row): void {
    const h = this.historial.find((x) => x.id === row.id);
    if (!h) return;
    if (h.estado === 'Fallido') { this.ui.toast('Esta ejecución falló y no generó archivo'); return; }
    const r = this.reportes.find((x) => x.nombre === h.reporte);
    this.generar(h.reporte, r?.plantilla ?? '');
  }

  /** Generates the file and records the run in Historial. */
  private generar(nombre: string, plantilla: string): void {
    if (!GENERABLES.has(plantilla)) {
      this.ui.toast(`El reporte “${plantilla || nombre}” se podrá generar cuando exista el API de Remuneraciones`);
      return;
    }
    downloadCsv(nombre.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-'),
      ['Apellidos', 'Nombres', 'Número de Documento', 'Cargo', 'División', 'Área', 'Sub-área', 'Fecha Ingreso', 'Sueldo Neto'],
      this.colaboradores.map((c) => [c.apellidos, c.nombres, c.documento, c.cargo, c.division, c.area, c.subArea, c.ingreso, soles(c.sueldoNeto)]));
    const ahora = new Date();
    this.historial.unshift({
      id: Math.max(0, ...this.historial.map((h) => h.id)) + 1, reporte: nombre, periodo: this.data.periodo, usuario: this.data.usuario.nombre,
      fecha: ahora.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ''),
      estado: 'Enviado',
    });
    this.refresh();
  }
}
