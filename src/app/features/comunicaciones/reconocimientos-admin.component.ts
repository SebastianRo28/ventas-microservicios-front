import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Reconocimiento, VALORES_RECONOCIMIENTO } from '../../core/sample/reportes';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'a', label: 'Reconocimiento a', w: 'minmax(190px, 1.3fr)' },
  { key: 'au', label: 'Autor', w: 'minmax(170px, 1.1fr)' },
  { key: 't', label: 'Tipo', type: 'badge', filter: 'select', w: 'minmax(190px, 1.1fr)' },
  { key: 'r', label: 'Reconocimiento', w: 'minmax(260px, 2fr)' },
  { key: 'f', label: 'Fecha de creación', type: 'date', filter: 'date', w: '150px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];
const RCOLS: Column[] = [
  { key: 'n', label: 'Colaborador', w: 'minmax(200px, 1.4fr)' },
  { key: 'c', label: 'Reconocimientos recibidos', type: 'number', filter: 'none', w: '200px' },
  { key: 'v', label: 'Valor más frecuente', type: 'badge', filter: 'select', w: 'minmax(190px, 1.1fr)' },
  { key: 'u', label: 'Último reconocimiento', type: 'date', filter: 'date', w: '180px' },
];

const fecha = (d: string) => d.split('/').reverse().join('');

/** P-12.6 Comunicaciones › Reconocimientos (admin). "Reconocidos" is aggregated from the history. */
@Component({
  selector: 'app-reconocimientos-admin',
  template: `
    <app-page-header title="Reconocimientos" [crumbs]="['Desarrollo Organizacional', 'Comunicaciones']">
      <a class="nx-btn nx-btn--primary" routerLink="/portal"><app-icon name="award" [size]="16"></app-icon>Reconocer</a>
    </app-page-header>
    <div class="nx-values-legend">
      <span *ngFor="let v of valores" class="nx-value-chip">
        <span [style.background]="v.color"><app-icon [name]="v.icono" [size]="14"></app-icon></span>{{ v.nombre }}
      </span>
    </div>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Historial de Reconocimientos', 'Historial de Reconocidos']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <app-data-table *ngIf="tab === 0" [columns]="cols" [rows]="rows" [rowActions]="actions" [showBulk]="false" [selectable]="false"
                    [showAdvancedFilter]="false" tableLabel="Historial de reconocimientos" minWidth="1200px" exportName="reconocimientos"
                    (action)="onAction($event.action, $event.row)"></app-data-table>
    <app-data-table *ngIf="tab === 1" [columns]="rcols" [rows]="reconocidos" [showBulk]="false" [selectable]="false"
                    [showAdvancedFilter]="false" tableLabel="Historial de reconocidos" minWidth="900px" exportName="reconocidos"></app-data-table>
  `
})
export class ReconocimientosAdminComponent {
  readonly valores = VALORES_RECONOCIMIENTO;
  readonly cols = COLS; readonly rcols = RCOLS;
  readonly actions: RowAction[] = ['ver', 'eliminar'];
  tab = 0;
  rows: Row[] = [];
  reconocidos: Row[] = [];
  private all: Reconocimiento[] = [];

  constructor(data: HrDataService, private ui: UiStateService) {
    data.reconocimientos().subscribe((r) => { this.all = r; this.refresh(); });
  }

  private refresh(): void {
    this.rows = this.all.map((r) => ({ id: r.id, a: r.para, au: r.autor, t: { text: r.valor, tone: 'neutral' as const }, r: r.mensaje, f: r.fecha, x: '' }));
    const by = new Map<string, Reconocimiento[]>();
    this.all.forEach((r) => by.set(r.para, [...(by.get(r.para) ?? []), r]));
    this.reconocidos = [...by.entries()].map(([nombre, list], id) => {
      const freq = new Map<string, number>();
      list.forEach((r) => freq.set(r.valor, (freq.get(r.valor) ?? 0) + 1));
      const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const ultimo = [...list].sort((a, b) => fecha(b.fecha).localeCompare(fecha(a.fecha)))[0].fecha;
      return { id, n: nombre, c: list.length, v: { text: top, tone: 'neutral' as const }, u: ultimo };
    }).sort((a, b) => (b['c'] as number) - (a['c'] as number));
  }

  onAction(action: RowAction, row: Row): void {
    const i = this.all.findIndex((r) => r.id === row.id);
    if (i < 0) return;
    if (action === 'eliminar') {
      const [r] = this.all.splice(i, 1);
      this.refresh();
      this.ui.toast(`Reconocimiento a ${r.para} eliminado`);
    } else {
      const r = this.all[i];
      this.ui.toast(`“${r.mensaje}” — ${r.autor}`);
    }
  }
}
