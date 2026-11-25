import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { DatosService } from '../../core/datos.service';
import { Dashboard, Widget } from '../../core/sample/catalogos';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const ACC: Column = { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '90px' };
const COLS: Column[] = [
  { key: 'id', label: 'ID', w: '70px' },
  { key: 'n', label: 'Nombre', w: 'minmax(220px, 1.5fr)' },
  { key: 'd', label: 'Descripción', w: 'minmax(260px, 2.2fr)' },
  { key: 'f', label: 'Fecha última edición', type: 'date', filter: 'date', w: 'minmax(160px, 1fr)' }, ACC,
];
const WCOLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(220px, 1.6fr)' },
  { key: 't', label: 'Tipo', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'o', label: 'Origen', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'f', label: 'Fecha última edición', type: 'date', filter: 'date', w: 'minmax(160px, 1fr)' }, ACC,
];

/** P-02.5 Reportería › Analítica (Beta). */
@Component({
  selector: 'app-analitica',
  template: `
    <app-page-header title="Analítica" [crumbs]="['Reportería']">
      <span header-badge class="nx-navbadge nx-navbadge--beta">Beta</span>
    </app-page-header>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Crea dashboards con widgets de la librería o generados con Nexo AI a partir de los datos de colaboradores, trabajos, empresas y planes.
        <a href="#" (click)="$event.preventDefault()">Ver artículo de ayuda</a></span>
    </div>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Dashboards', 'Widgets']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <app-data-table *ngIf="tab === 0" [columns]="cols" [rows]="dashRows" createLabel="Crear Dashboard" [rowActions]="actions"
                    [showAdvancedFilter]="false" [showBulk]="false" [selectable]="false" tableLabel="Dashboards" minWidth="900px"
                    exportName="dashboards" (create)="openModal()" (action)="eliminar('dash', $event.row)"></app-data-table>
    <app-data-table *ngIf="tab === 1" [columns]="wcols" [rows]="widgetRows" [rowActions]="actions"
                    [showAdvancedFilter]="false" [showBulk]="false" [selectable]="false" tableLabel="Widgets" minWidth="900px"
                    exportName="widgets" (action)="eliminar('widget', $event.row)"></app-data-table>

    <app-modal *ngIf="modal" title="Crear Dashboard" width="560px" (closed)="modal = false">
      <form id="nuevo-dashboard" class="nx-form" (ngSubmit)="guardar()">
        <label class="nx-field">Nombre*
          <input class="nx-input" name="nombre" required placeholder="Ej. Demografía de colaboradores" [(ngModel)]="nombre" [class.is-invalid]="intento && !nombre.trim()">
          <span *ngIf="intento && !nombre.trim()" class="nx-error">Campo obligatorio.</span>
        </label>
        <label class="nx-field">Descripción
          <textarea class="nx-input nx-textarea" name="descripcion" [(ngModel)]="descripcion"></textarea>
        </label>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = false">Cancelar</button>
        <button type="submit" form="nuevo-dashboard" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>
  `
})
export class AnaliticaComponent {
  readonly cols = COLS;
  readonly wcols = WCOLS;
  readonly actions: RowAction[] = ['eliminar'];
  tab = 0;
  dashRows: Row[] = [];
  widgetRows: Row[] = [];
  modal = false;
  intento = false;
  nombre = '';
  descripcion = '';
  private dashboards: Dashboard[] = [];
  private widgets: Widget[] = [];

  constructor(data: HrDataService, private ui: UiStateService, private datos: DatosService) {
    data.dashboards().subscribe((d) => { this.dashboards = d; this.refresh(); });
    data.widgets().subscribe((w) => { this.widgets = w; this.refresh(); });
  }

  private refresh(): void {
    this.dashRows = this.dashboards.map((d) => ({ id: d.id, n: d.nombre, d: d.descripcion, f: d.editado, x: '' }));
    this.widgetRows = this.widgets.map((w) => ({ id: w.id, n: w.nombre, t: w.tipo, o: w.origen, f: w.editado, x: '' }));
  }

  openModal(): void { this.nombre = ''; this.descripcion = ''; this.intento = false; this.modal = true; }

  guardar(): void {
    this.intento = true;
    if (!this.nombre.trim()) return;
    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.datos.crear('dashboards', { nombre: this.nombre.trim(), descripcion: this.descripcion.trim(), editado: hoy }).subscribe();
    this.modal = false;
    this.ui.toast(`Dashboard “${this.nombre.trim()}” creado`);
  }

  eliminar(kind: 'dash' | 'widget', row: Row): void {
    const list: { id: number; nombre: string }[] = kind === 'dash' ? this.dashboards : this.widgets;
    const item = list.find((x) => x.id === row.id);
    if (!item) return;
    this.datos.eliminar(kind === 'dash' ? 'dashboards' : 'widgets', item.id).subscribe(() => this.ui.toast(`“${item.nombre}” eliminado`));
  }
}
