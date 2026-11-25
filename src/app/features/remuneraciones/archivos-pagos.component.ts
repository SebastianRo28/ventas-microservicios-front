import { Component } from '@angular/core';
import { combineLatest } from 'rxjs';
import { HrDataService } from '../../core/hr-data.service';
import { soles } from '../../core/format';
import { ArchivoPago, ESTADO_TONE } from '../../core/sample/remuneraciones';
import { PeriodoService } from '../../core/periodo.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'n', label: 'Nombre', type: 'link', w: 'minmax(220px, 1.6fr)' },
  { key: 't', label: 'Tipo de archivo', filter: 'select', w: 'minmax(160px, 1.1fr)' },
  { key: 'tc', label: 'Tipo(s) de Comprobante(s)', filter: 'select', w: 'minmax(180px, 1.1fr)' },
  { key: 'c', label: 'Comprobantes', type: 'number', filter: 'none', w: '120px' },
  { key: 'm', label: 'Mes', filter: 'select', w: '110px' },
  { key: 'e', label: 'Estado del Archivo', type: 'badge', filter: 'select', w: 'minmax(150px, 0.9fr)' },
  { key: 'cp', label: 'Creado Por', filter: 'select', w: 'minmax(140px, 0.9fr)' },
  { key: 'o', label: 'Origen', filter: 'select', w: '100px' },
  { key: 'f', label: 'Fecha de Creación', type: 'date', filter: 'date', w: '150px' },
  { key: 'th', label: 'Total Haberes', type: 'money', filter: 'none', w: 'minmax(130px, 0.9fr)' },
  { key: 'td', label: 'Total Descuentos', type: 'money', filter: 'none', w: 'minmax(140px, 0.9fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/** P-03.4 Archivos y Pagos. "Abiertos" = files of the open payroll period. */
@Component({
  selector: 'app-archivos-pagos',
  template: `
    <app-page-header title="Archivos y Pagos" [crumbs]="['Remuneraciones']"></app-page-header>
    <div class="nx-segmented nx-mb-14" role="group" aria-label="Estado del período">
      <button type="button" [class.is-on]="seg === 0" [attr.aria-pressed]="seg === 0" (click)="pick(0)">Abiertos</button>
      <button type="button" [class.is-on]="seg === 1" [attr.aria-pressed]="seg === 1" (click)="pick(1)">Cerrados</button>
    </div>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Comprobantes sin archivo… <a href="#" (click)="$event.preventDefault()">Descarga el listado</a></span>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" [pageSize]="10" createLabel="Crear" tableLabel="Archivos y pagos"
                    minWidth="1800px" exportName="archivos-y-pagos" [rowActions]="actions"
                    [bulkActions]="['Descargar seleccionados', 'Eliminar seleccionados']"
                    (create)="ui.toast('La creación de archivos estará disponible en la próxima versión')"></app-data-table>
  `
})
export class ArchivosPagosComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['descargar', 'cerrar', 'mas'];
  seg = 0;
  rows: Row[] = [];
  private all: ArchivoPago[] = [];

  constructor(data: HrDataService, public ui: UiStateService, private per: PeriodoService) {
    combineLatest([data.archivosPagos(), per.periodos$]).subscribe(([a]) => { this.all = a; this.pick(this.seg); });
  }

  /** Months of open payroll periods ("03-2026"): their files are in "Meses abiertos". */
  private get abiertos(): Set<string> { return new Set(this.per.periodos$.value.filter((p) => !p.cerrado).map((p) => p.periodo.replace('/', '-'))); }

  pick(seg: number): void {
    this.seg = seg;
    this.rows = this.all
      .filter((a) => (seg === 0) === this.abiertos.has(a.mes))
      .map((a) => ({
        id: a.id, n: { text: a.nombre }, t: a.tipo, tc: a.comprobantes, c: a.cantidad, m: a.mes,
        e: { text: a.estado, tone: ESTADO_TONE[a.estado] }, cp: a.creadoPor, o: a.origen, f: a.fecha,
        th: soles(a.haberes), td: soles(a.descuentos), x: '',
      }));
  }
}
