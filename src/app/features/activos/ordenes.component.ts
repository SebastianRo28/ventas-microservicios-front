import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Activo } from '../../core/sample/catalogos';
import { ESTADO_ORDEN_TONE, OrdenActivo } from '../../core/sample/operaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'id', label: 'ID', w: '70px' },
  { key: 'o', label: 'Origen de la orden', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'p', label: 'Producto', w: 'minmax(180px, 1.3fr)' },
  { key: 'c', label: 'Categoría', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'sp', label: 'Solicitado para', w: 'minmax(180px, 1.2fr)' },
  { key: 'a', label: 'Área', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'cg', label: 'Cargo', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 's', label: 'Solicitante', w: 'minmax(150px, 1fr)' },
  { key: 'fs', label: 'Fecha de solicitud', type: 'date', filter: 'date', w: '150px' },
  { key: 'fa', label: 'Fecha para asignar', type: 'date', filter: 'date', w: '150px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/**
 * P-06.5 Gestión de Activos › Órdenes. Approving an order assigns an available unit of the
 * same product from the Inventario; without stock the order stays pending.
 */
@Component({
  selector: 'app-ordenes',
  template: `
    <app-page-header title="Órdenes" [crumbs]="['Administrativo', 'Gestión de Activos']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Pendientes', 'Historial']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pick(i)">{{ t }}</button>
    </div>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Si deseas que tus colaboradores ingresen sus propias solicitudes, activa la plantilla
        <a routerLink="/admin/workflow/plantillas">Solicitud de Activos</a> (Workflow).</span>
    </div>
    <div *ngIf="aviso" class="nx-ok-note nx-mb-14" [class.nx-ok-note--warn]="avisoWarn" role="status">
      <app-icon [name]="avisoWarn ? 'alert' : 'checkcircle'" [size]="17"></app-icon>{{ aviso }}
    </div>
    <app-data-table [columns]="columns" [rows]="rows" createLabel="Crear Orden" [rowActions]="tab === 0 ? pendActions : histActions"
                    [showBulk]="false" [showAdvancedFilter]="false" tableLabel="Órdenes" minWidth="1800px" exportName="ordenes-activos"
                    [emptyTitle]="tab === 0 ? 'No hay órdenes pendientes' : 'Aún no hay datos'"
                    (create)="ui.toast('La creación de órdenes llegará en la próxima versión')"
                    (action)="onAction($event.action, $event.row)"></app-data-table>
  `
})
export class OrdenesComponent {
  readonly columns = COLUMNS;
  readonly pendActions: RowAction[] = ['aprobar', 'rechazar', 'ver'];
  readonly histActions: RowAction[] = ['ver'];
  tab = 0;
  rows: Row[] = [];
  aviso = '';
  avisoWarn = false;
  private ordenes: OrdenActivo[] = [];
  private activos: Activo[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.activos().subscribe((a) => (this.activos = a));
    data.ordenes().subscribe((o) => { this.ordenes = o; this.pick(0); });
  }

  private isPending(o: OrdenActivo): boolean { return o.estado === 'Pendiente' || o.estado === 'Atrasado'; }

  pick(i: number): void {
    this.tab = i;
    this.rows = this.ordenes.filter((o) => this.isPending(o) === (i === 0)).map((o) => ({
      id: o.id, o: o.origen, p: o.producto, c: o.categoria, sp: o.para, a: o.area, cg: o.cargo, s: o.solicitante,
      fs: o.solicitada, fa: o.asignarEl, e: { text: o.estado, tone: ESTADO_ORDEN_TONE[o.estado] }, x: '',
    }));
  }

  onAction(action: RowAction, row: Row): void {
    const o = this.ordenes.find((x) => x.id === row.id);
    if (!o) return;
    if (action === 'aprobar') {
      const unidad = this.activos.find((a) => a.nombre === o.producto && a.estado === 'Disponible');
      if (!unidad) {
        this.setAviso(`No hay unidades disponibles de “${o.producto}” en el inventario. La orden ${o.id} sigue pendiente.`, true);
        return;
      }
      const fecha = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
      unidad.estado = 'Asignado';
      unidad.asignado = o.para;
      unidad.historial.unshift({ fecha, asignado: o.para, estado: 'Asignado', comentario: `Orden ${o.id} aprobada.`, admin: 'Rodrigo Paredes' });
      o.estado = 'Asignada';
      this.setAviso(`Activo ${unidad.id} asignado a ${o.para}. Ya aparece en el inventario como asignado.`, false);
    }
    if (action === 'rechazar') {
      o.estado = 'Rechazada';
      this.setAviso(`Orden ${o.id} rechazada.`, false);
    }
    if (action === 'ver') this.ui.toast('El detalle de la orden llegará en la próxima versión');
    this.pick(this.tab);
  }

  private setAviso(msg: string, warn: boolean): void { this.aviso = msg; this.avisoWarn = warn; }
}
