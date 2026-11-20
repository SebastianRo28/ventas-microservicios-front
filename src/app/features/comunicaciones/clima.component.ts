import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { ESTADO_ENCUESTA_TONE } from '../../core/sample/operaciones';
import { EncuestaClima, ORIGENES_CLIMA, OrigenClima } from '../../core/sample/sst';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'n', label: 'Nombre de la encuesta', w: 'minmax(240px, 1.8fr)' },
  { key: 'fc', label: 'Fecha de creación', type: 'date', filter: 'date', w: '150px' },
  { key: 'fi', label: 'Fecha de inicio', type: 'date', filter: 'date', w: '140px' },
  { key: 'ft', label: 'Fecha de término', type: 'date', filter: 'date', w: '140px' },
  { key: 'p', label: 'N° de participantes', type: 'number', filter: 'none', w: '160px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'a', label: 'Avance global', type: 'progress', filter: 'none', w: '170px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/** P-13.6 Encuestas de Clima, with modal "Crear Encuesta de Clima". */
@Component({
  selector: 'app-clima',
  template: `
    <app-page-header title="Encuestas de Clima" [crumbs]="['Desarrollo Organizacional', 'Encuestas']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Activas', 'Historial']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pick(i)">{{ t }}</button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" createLabel="Crear Encuesta de Clima" [rowActions]="actions" [showBulk]="false"
                    [selectable]="false" [showAdvancedFilter]="false" tableLabel="Encuestas de clima" minWidth="1300px"
                    exportName="encuestas-clima" (create)="modal = true" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="modal" title="Crear Encuesta de Clima" width="620px" (closed)="modal = false">
      <div class="nx-form">
        <span class="nx-muted">Elige el origen de la encuesta</span>
        <button *ngFor="let o of origenes; let first = first" type="button" class="nx-origin" [class.is-featured]="first" (click)="crear(o)">
          <span class="nx-iconbox nx-iconbox--38"><app-icon [name]="o.icono" [size]="18"></app-icon></span>
          <span class="nx-origin__text"><b>{{ o.titulo }}</b><span>{{ o.detalle }}</span></span>
          <span *ngIf="o.validada" class="nx-badge nx-tone-success">Validada por Nexo</span>
        </button>
      </div>
      <ng-container modal-footer>
        <span></span>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = false">Cancelar</button>
      </ng-container>
    </app-modal>
  `
})
export class ClimaComponent {
  readonly columns = COLUMNS;
  readonly origenes = ORIGENES_CLIMA;
  readonly actions: RowAction[] = ['ver', 'mas', 'eliminar'];
  tab = 0;
  rows: Row[] = [];
  modal = false;
  private all: EncuestaClima[] = [];

  constructor(data: HrDataService, private ui: UiStateService) {
    data.encuestasClima().subscribe((e) => { this.all = e; this.pick(0); });
  }

  pick(i: number): void {
    this.tab = i;
    this.rows = this.all.filter((e) => (e.estado === 'Finalizada') === (i === 1)).map((e) => ({
      id: e.id, n: e.nombre, fc: e.creada, fi: e.inicio, ft: e.termino, p: e.participantes,
      e: { text: e.estado, tone: ESTADO_ENCUESTA_TONE[e.estado] }, a: { text: `${e.avance} %`, pct: e.avance }, x: '',
    }));
  }

  /** Creates a pending climate survey from the chosen origin. */
  crear(o: OrigenClima): void {
    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nombre = o.titulo === 'En blanco' ? 'Nueva encuesta de clima' : o.titulo === 'Encuesta anterior' ? `${o.detalle} (copia)` : o.titulo;
    this.all.unshift({ id: Math.max(...this.all.map((e) => e.id)) + 1, nombre, creada: hoy, inicio: '—', termino: '—', participantes: 0, estado: 'Pendiente', avance: 0 });
    this.modal = false;
    this.pick(0);
    this.ui.toast(`Encuesta “${nombre}” creada como pendiente`);
  }

  onAction(action: RowAction, row: Row): void {
    const i = this.all.findIndex((e) => e.id === row.id);
    if (i < 0) return;
    if (action === 'eliminar') {
      const [e] = this.all.splice(i, 1);
      this.pick(this.tab);
      this.ui.toast(`Encuesta “${e.nombre}” eliminada`);
    } else {
      this.ui.toast('El reporte de clima llegará en la próxima versión');
    }
  }
}
