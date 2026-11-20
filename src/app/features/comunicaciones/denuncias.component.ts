import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Denuncia, ESTADO_DENUNCIA_TONE } from '../../core/sample/operaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'id', label: 'Id de acceso', w: 'minmax(160px, 1fr)' },
  { key: 'm', label: 'Nuevos Mensajes', type: 'number', filter: 'none', w: '150px' },
  { key: 't', label: 'Tipo de denuncia', filter: 'select', w: 'minmax(200px, 1.4fr)' },
  { key: 'r', label: 'Relación con la Empresa', filter: 'select', w: 'minmax(180px, 1fr)' },
  { key: 'f', label: 'Fecha de creación', type: 'date', filter: 'date', w: '150px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' },
  { key: 'x', label: 'Ver', type: 'actions', filter: 'none', sortable: false, w: '70px' },
];

/** P-07.5 Canal de denuncias › Denuncias (admin). Active = Nueva / En curso; Historial = closed cases. */
@Component({
  selector: 'app-denuncias',
  template: `
    <app-page-header title="Denuncias" [crumbs]="['Desarrollo Organizacional', 'Canal de denuncias']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Activas', 'Historial']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pick(i)">{{ t }}</button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" [rowActions]="actions" [showBulk]="false" [selectable]="false"
                    [showAdvancedFilter]="false" tableLabel="Denuncias" minWidth="1200px" exportName="denuncias"
                    [emptyTitle]="tab === 0 ? 'No hay denuncias activas' : 'Aún no hay datos'"
                    (action)="ui.toast('El detalle de la denuncia llegará en la próxima versión')"></app-data-table>
  `
})
export class DenunciasComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['ver'];
  tab = 0;
  rows: Row[] = [];
  private all: Denuncia[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.denuncias().subscribe((d) => { this.all = d; this.pick(0); });
  }

  pick(i: number): void {
    this.tab = i;
    const activa = (d: Denuncia) => d.estado === 'Nueva' || d.estado === 'En curso';
    this.rows = this.all.filter((d) => activa(d) === (i === 0)).map((d) => ({
      id: `ID - ${d.acceso}`, m: d.mensajes, t: d.tipo, r: d.relacion, f: d.creada,
      e: { text: d.estado, tone: ESTADO_DENUNCIA_TONE[d.estado] }, u: d.actualizada, x: '',
    }));
  }
}
