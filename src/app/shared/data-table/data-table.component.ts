import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { CellValue, Column, Row, RowAction, cellText } from './data-table.models';

const ACTION_META: Record<RowAction, { icon: string; label: string }> = {
  ver: { icon: 'eye', label: 'Ver detalle' },
  editar: { icon: 'edit', label: 'Editar' },
  eliminar: { icon: 'trash', label: 'Eliminar' },
  descargar: { icon: 'download', label: 'Descargar' },
  historial: { icon: 'history', label: 'Historial' },
  firmar: { icon: 'filesig', label: 'Firmar' },
  ocultar: { icon: 'eye-off', label: 'Mostrar u ocultar' },
  cerrar: { icon: 'lock', label: 'Cerrar / pagar' },
  mas: { icon: 'more', label: 'Más acciones' },
  info: { icon: 'info', label: 'Información' },
  pausa: { icon: 'pause', label: 'Activar o desactivar' },
  duplicar: { icon: 'copy', label: 'Duplicar' },
  cambiar: { icon: 'refresh', label: 'Cambiar estado o asignar' },
  aprobar: { icon: 'check', label: 'Aprobar' },
  rechazar: { icon: 'x', label: 'Rechazar' },
  observar: { icon: 'alert', label: 'Observar' },
  cargar: { icon: 'plus', label: 'Cargar evidencia' },
  emparejar: { icon: 'sitemap', label: 'Emparejar con un cargo interno' },
  restablecer: { icon: 'key', label: 'Restablecer contraseña' },
};

/**
 * Standard DataTable (design DS-03): page size, export, bulk actions, create button,
 * sortable headers, per-column filters, column visibility, row selection, pagination
 * and the empty state.
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html'
})
export class DataTableComponent implements OnChanges {
  @Input() columns: Column[] = [];
  @Input() rows: Row[] = [];
  @Input() tableLabel = 'Tabla de datos';
  @Input() minWidth = '900px';
  @Input() pageSize = 25;
  @Input() createLabel = '';
  /** When set, the create button is a link to this route. */
  @Input() createLink?: string;
  @Input() selectable = true;
  @Input() showBulk = true;
  @Input() showAdvancedFilter = true;
  @Input() showFilters = true;
  @Input() bulkActions = ['Exportar seleccionados', 'Eliminar seleccionados'];
  @Input() rowActions: RowAction[] = ['ver'];
  @Input() emptyTitle = 'Aún no hay datos';
  @Input() emptyText = 'Cuando ingreses datos podrás verlos aquí';
  @Input() exportName = 'datos';

  @Output() create = new EventEmitter<void>();
  @Output() action = new EventEmitter<{ action: RowAction; row: Row }>();
  @Output() bulk = new EventEmitter<{ action: string; rows: Row[] }>();

  page = 1;
  sortKey: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  hidden = new Set<string>();
  filters: Record<string, string> = {};
  selected = new Set<Row['id']>();
  colsOpen = false;
  bulkOpen = false;
  advOpen = false;

  readonly actionMeta = ACTION_META;
  readonly cellText = cellText;

  /** Derived view, recomputed on any change. */
  view = { cols: [] as Column[], shown: [] as Row[], filtered: [] as Row[], pages: [] as (number | '…')[], nPages: 1, grid: '' };

  ngOnChanges(): void { this.recompute(); }

  @HostListener('document:click', ['$event'])
  closeMenus(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.nx-dt__menu-anchor')) { this.colsOpen = false; this.bulkOpen = false; }
  }

  recompute(): void {
    const cols = this.columns.filter((c) => !this.hidden.has(c.key));
    let rows = this.rows.filter((r) => cols.every((c) => {
      const f = (this.filters[c.key] ?? '').toLowerCase();
      if (!f) return true;
      const v = cellText(r[c.key]).toLowerCase();
      return c.filter === 'select' ? v === f : v.includes(f);
    }));
    if (this.sortKey) {
      const col = this.columns.find((c) => c.key === this.sortKey);
      const key = (r: Row) => this.sortValue(r[this.sortKey!], col?.type);
      const dir = this.sortDir === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * dir);
    }
    const nPages = Math.max(1, Math.ceil(rows.length / this.pageSize));
    this.page = Math.min(this.page, nPages);
    const start = (this.page - 1) * this.pageSize;
    const pages: (number | '…')[] = nPages <= 7
      ? Array.from({ length: nPages }, (_, i) => i + 1)
      : this.page <= 4 ? [1, 2, 3, 4, 5, '…', nPages]
      : this.page >= nPages - 3 ? [1, '…', nPages - 4, nPages - 3, nPages - 2, nPages - 1, nPages]
      : [1, '…', this.page - 1, this.page, this.page + 1, '…', nPages];
    const grid = (this.selectable ? '44px ' : '') + cols.map((c) => c.w ?? 'minmax(120px, 1fr)').join(' ') + ' 48px';
    this.view = { cols, shown: rows.slice(start, start + this.pageSize), filtered: rows, pages, nPages, grid };
  }

  private sortValue(v: unknown, type?: string): string | number {
    const s = cellText(v);
    if (type === 'money' || type === 'number') return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
    if (type === 'date') {
      const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      return m ? m[3] + m[2] + m[1] : s;
    }
    return s.toLowerCase();
  }

  // --- interactions -------------------------------------------------------
  isSortable(c: Column): boolean { return c.sortable !== false && c.type !== 'actions'; }

  sort(c: Column): void {
    this.sortDir = this.sortKey === c.key && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortKey = c.key;
    this.recompute();
  }

  setFilter(key: string, value: string): void {
    this.filters = { ...this.filters, [key]: value };
    this.page = 1;
    this.recompute();
  }

  options(c: Column): string[] {
    return c.options ?? [...new Set(this.rows.map((r) => cellText(r[c.key])))].sort();
  }

  setPageSize(v: string): void { this.pageSize = +v; this.page = 1; this.recompute(); }
  goTo(p: number | '…'): void { if (p !== '…') { this.page = p; this.recompute(); } }
  prev(): void { this.goTo(Math.max(1, this.page - 1)); }
  next(): void { this.goTo(Math.min(this.view.nPages, this.page + 1)); }

  toggleColumn(key: string): void {
    this.hidden.has(key) ? this.hidden.delete(key) : this.hidden.add(key);
    this.recompute();
  }

  get allSelected(): boolean { return this.view.shown.length > 0 && this.view.shown.every((r) => this.selected.has(r.id)); }
  toggleAll(): void {
    const on = !this.allSelected;
    this.view.shown.forEach((r) => (on ? this.selected.add(r.id) : this.selected.delete(r.id)));
  }
  toggleRow(r: Row): void { this.selected.has(r.id) ? this.selected.delete(r.id) : this.selected.add(r.id); }

  runBulk(label: string): void {
    this.bulkOpen = false;
    this.bulk.emit({ action: label, rows: this.rows.filter((r) => this.selected.has(r.id)) });
  }

  /** Download what is currently filtered as CSV (Excel opens it). */
  exportCsv(): void {
    const cols = this.view.cols.filter((c) => c.type !== 'actions');
    const esc = (v: string) => /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lines = [cols.map((c) => esc(c.label)).join(';'),
      ...this.view.filtered.map((r) => cols.map((c) => esc(cellText(r[c.key]))).join(';'))];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.exportName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  rich(v: unknown): CellValue | null { return v && typeof v === 'object' ? v as CellValue : null; }
  trackRow = (_: number, r: Row) => r.id;
  trackCol = (_: number, c: Column) => c.key;
}
