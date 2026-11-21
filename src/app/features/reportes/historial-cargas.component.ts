import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { downloadCsv } from '../../core/csv';
import { CargaApi, ReporteriaService } from '../../core/reporteria.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const TONE: Record<CargaApi['estado'], 'success' | 'warning' | 'danger'> = { Exitosa: 'success', 'Con errores': 'warning', Fallida: 'danger' };

const COLS: Column[] = [
  { key: 'id', label: 'N°', w: '70px' },
  { key: 'i', label: 'Importador', filter: 'select', w: 'minmax(200px, 1.3fr)' },
  { key: 'a', label: 'Archivo', w: 'minmax(180px, 1.2fr)' },
  { key: 'u', label: 'Usuario', filter: 'select', w: 'minmax(140px, 0.9fr)' },
  { key: 'f', label: 'Fecha', type: 'date', filter: 'date', w: 'minmax(140px, 0.9fr)' },
  { key: 'r', label: 'Registros cargados', type: 'number', filter: 'none', w: 'minmax(140px, 0.8fr)' },
  { key: 'n', label: 'Errores', type: 'number', filter: 'none', w: '90px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(120px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

/** Reportería › Importadores › Historial de Cargas (API): each load with its result and an error log to download. */
@Component({
  selector: 'app-historial-cargas',
  template: `
    <app-page-header title="Historial de Cargas" [crumbs]="['Reportería', 'Importadores']">
      <a class="nx-btn nx-btn--primary" routerLink="/rep/importadores"><app-icon name="upload" [size]="16"></app-icon>Nueva carga</a>
    </app-page-header>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="acciones" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Historial de cargas" minWidth="1300px" exportName="historial-cargas"
                    emptyTitle="Aún no hay cargas" emptyText="Las cargas que hagas desde Importadores aparecerán aquí con su resultado"
                    (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="sel as c" [title]="'Carga N° ' + c.id + ' · ' + c.importador" width="660px" (closed)="sel = null">
      <div class="nx-fieldrow"><span>Archivo</span><span>{{ c.archivo }}</span></div>
      <div class="nx-fieldrow"><span>Cargado por</span><span>{{ c.usuario }} · {{ c.fecha }}</span></div>
      <div class="nx-fieldrow"><span>Resultado</span><span>{{ c.estado }} · {{ c.registros }} registro(s) cargado(s) · {{ c.errores.length }} error(es)</span></div>
      <div *ngIf="c.errores.length" class="nx-dt__scroll nx-period__table nx-mt-16">
        <table class="nx-table" aria-label="Errores de la carga">
          <thead><tr><th>Fila</th><th>Campo</th><th>Error</th></tr></thead>
          <tbody><tr *ngFor="let e of c.errores"><td>{{ e.fila || '—' }}</td><td><code>{{ e.campo }}</code></td><td class="nx-wrap">{{ e.mensaje }}</td></tr></tbody>
        </table>
      </div>
      <ng-container modal-footer>
        <button *ngIf="c.errores.length" type="button" class="nx-btn nx-btn--outline" (click)="descargar(c)"><app-icon name="download" [size]="15"></app-icon>Descargar errores</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="sel = null">Cerrar</button>
      </ng-container>
    </app-modal>
  `
})
export class HistorialCargasComponent {
  readonly cols = COLS;
  readonly acciones: RowAction[] = ['ver', 'descargar'];
  rows: Row[] = [];
  sel: CargaApi | null = null;
  private cargas: CargaApi[] = [];

  constructor(api: ReporteriaService, ui: UiStateService) {
    api.cargas().subscribe({
      next: (cs) => {
        this.cargas = cs;
        this.rows = cs.map((c) => ({
          id: c.id, i: c.importador, a: c.archivo, u: c.usuario, f: c.fecha, r: c.registros, n: c.errores.length, e: { text: c.estado, tone: TONE[c.estado] }, x: '',
        }));
      },
      error: (e) => ui.toast(mensajeError(e)),
    });
  }

  onAction(action: RowAction, row: Row): void {
    const c = this.cargas.find((x) => x.id === row.id);
    if (!c) return;
    if (action === 'ver') this.sel = c;
    if (action === 'descargar') this.descargar(c);
  }

  /** Error log as CSV; a load without errors downloads its summary. */
  descargar(c: CargaApi): void {
    downloadCsv(`carga-${c.id}-errores`, ['Fila', 'Campo', 'Error'],
      c.errores.length ? c.errores.map((e) => [e.fila ? String(e.fila) : '—', e.campo, e.mensaje]) : [['—', '—', `Sin errores: ${c.registros} registros cargados`]]);
  }
}
