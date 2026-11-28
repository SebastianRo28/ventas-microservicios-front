import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'nombre', label: 'Nombre', type: 'link', w: 'minmax(180px, 1.7fr)' },
  { key: 'doc', label: 'Número de Documento', w: 'minmax(100px, 0.9fr)' },
  { key: 'cargo', label: 'Cargo', filter: 'select', w: 'minmax(110px, 1.2fr)' },
  { key: 'div', label: 'División', filter: 'select', oculta: true, w: 'minmax(110px, 1.3fr)' },
  { key: 'area', label: 'Área', filter: 'select', w: 'minmax(90px, 1fr)' },
  { key: 'sub', label: 'Sub-área', filter: 'select', oculta: true, w: 'minmax(90px, 1fr)' },
  { key: 'ing', label: 'Fecha Ingreso', filter: 'date', type: 'date', w: 'minmax(110px, 0.9fr)' },
  { key: 'neto', label: 'Sueldo Neto', filter: 'none', type: 'money', w: 'minmax(100px, 0.9fr)' },
];

/** P-03.5 Colaboradores Vigentes (layout L-01). */
@Component({
  selector: 'app-vigentes',
  template: `
    <app-page-header title="Colaboradores Vigentes" [crumbs]="['Administrativo', 'Colaboradores']"></app-page-header>
    <div *ngIf="banner" class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Puedes crear colaboradores uno a uno o cargarlos de forma masiva con el importador “Colaboradores”.
        <a routerLink="/rep/importadores">Ver artículo de ayuda</a></span>
      <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Cerrar aviso" (click)="banner = false">
        <app-icon name="x" [size]="16"></app-icon>
      </button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" tableLabel="Colaboradores vigentes" minWidth="1000px"
                    createLabel="Crear Colaborador" createLink="/admin/colaboradores/crear" exportName="colaboradores-vigentes"
                    [bulkActions]="['Exportar seleccionados', 'Agregar a grupo', 'Enviar invitación de usuario']"
                    (bulk)="onBulk($event.action, $event.rows.length)"></app-data-table>
  `
})
export class VigentesComponent {
  readonly columns = COLUMNS;
  rows: Row[] = [];
  banner = true;

  constructor(data: HrDataService, private ui: UiStateService) {
    data.colaboradores().subscribe((list) => {
      this.rows = list.map((c) => ({
        id: c.id,
        nombre: { text: `${c.apellidos}, ${c.nombres}`, chip: 'F1', link: `/admin/colaboradores/ficha/${c.id}` },
        doc: c.documento, cargo: c.cargo, div: c.division, area: c.area, sub: c.subArea, ing: c.ingreso,
        // Reserved records (outside the user's team) come without salary.
        neto: c.sueldoNeto == null ? '—' : 'S/ ' + c.sueldoNeto.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      }));
    });
  }

  onBulk(action: string, n: number): void {
    this.ui.toast(`${action}: ${n} ${n === 1 ? 'colaborador' : 'colaboradores'}`);
  }
}
