import { Component } from '@angular/core';
import { ActivosService, EstadoOrden, OrdenActivoApi, ProductoActivoApi } from '../../core/administracion.service';
import { mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { Tone } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const TONE: Record<EstadoOrden, Tone> = { Pendiente: 'warning', Atrasado: 'warning', Asignada: 'success', Rechazada: 'danger' };
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
 * P-06.5 Gestión de Activos › Órdenes (API). Approving an order assigns the first available unit of the same product
 * from the Inventario; without stock the order stays pending. Rejecting asks for the reason.
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
                    (create)="abrirNueva()" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="nueva as n" title="Crear Orden" width="540px" (closed)="nueva = null">
      <form id="orden-form" class="nx-form" (ngSubmit)="crear()">
        <label class="nx-field">Producto*
          <select class="nx-select" name="producto" [(ngModel)]="n.productoId"><option *ngFor="let p of productos" [ngValue]="p.id">{{ p.nombre }} · {{ p.marca }}</option></select></label>
        <label class="nx-field">Solicitado para*
          <select class="nx-select" name="para" [(ngModel)]="n.paraId"><option [ngValue]="null">Seleccionar colaborador</option>
            <option *ngFor="let p of personas" [ngValue]="p.id">{{ p.nombre }}</option></select></label>
        <label class="nx-field">Fecha para asignar*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="asignarEl" [(ngModel)]="n.asignarEl" placeholder="DD/MM/AAAA"><app-icon name="calendar" [size]="16"></app-icon></span></label>
        <label class="nx-field">Comentario<input class="nx-input" name="comentario" maxlength="300" [(ngModel)]="n.comentario"></label>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="nueva = null">Cancelar</button>
        <button type="submit" form="orden-form" class="nx-btn nx-btn--primary" [disabled]="ocupado">Crear orden</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="rechazo as r" [title]="'Rechazar orden ' + r.orden.id" width="500px" (closed)="rechazo = null">
      <form id="rechazo-form" class="nx-form" (ngSubmit)="rechazar()">
        <p class="nx-muted nx-mt-0">{{ r.orden.producto }} para {{ r.orden.para }}</p>
        <label class="nx-field">Motivo del rechazo*<textarea class="nx-input nx-textarea" name="motivo" maxlength="300" [(ngModel)]="r.motivo"></textarea></label>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="rechazo = null">Cancelar</button>
        <button type="submit" form="rechazo-form" class="nx-btn nx-btn--primary nx-btn--danger" [disabled]="ocupado">Rechazar orden</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="detalle as d" [title]="'Orden ' + d.id" width="520px" (closed)="detalle = null">
      <div class="nx-fields">
        <div class="nx-fieldrow"><span>Producto</span><span>{{ d.producto }} · {{ d.categoria }}</span></div>
        <div class="nx-fieldrow"><span>Solicitado para</span><span>{{ d.para }} · {{ d.cargo }}</span></div>
        <div class="nx-fieldrow"><span>Solicitante</span><span>{{ d.solicitante }} · {{ d.solicitada }}</span></div>
        <div class="nx-fieldrow"><span>Fecha para asignar</span><span>{{ d.asignarEl }}</span></div>
        <div class="nx-fieldrow"><span>Estado</span><span class="nx-badge" [ngClass]="'nx-tone-' + tone[d.estado]">{{ d.estado }}</span></div>
        <div *ngIf="d.activoCodigo" class="nx-fieldrow"><span>Activo entregado</span><span>{{ d.activoCodigo }}</span></div>
        <div *ngIf="d.comentario" class="nx-fieldrow"><span>Comentario</span><span>{{ d.comentario }}</span></div>
      </div>
      <ng-container modal-footer><span></span><button type="button" class="nx-btn nx-btn--outline" (click)="detalle = null">Cerrar</button></ng-container>
    </app-modal>
  `
})
export class OrdenesComponent {
  readonly columns = COLUMNS;
  readonly tone = TONE;
  readonly pendActions: RowAction[] = ['aprobar', 'rechazar', 'ver'];
  readonly histActions: RowAction[] = ['ver'];
  tab = 0;
  rows: Row[] = [];
  aviso = '';
  avisoWarn = false;
  productos: ProductoActivoApi[] = [];
  personas: { id: number; nombre: string }[] = [];
  private ordenes: OrdenActivoApi[] = [];

  nueva: { productoId: number | null; paraId: number | null; asignarEl: string; comentario: string } | null = null;
  rechazo: { orden: OrdenActivoApi; motivo: string } | null = null;
  detalle: OrdenActivoApi | null = null;
  error = '';
  ocupado = false;

  constructor(private api: ActivosService, data: HrDataService, public ui: UiStateService) {
    data.colaboradores().subscribe((l) => (this.personas = l.map((c) => ({ id: c.id, nombre: `${c.apellidos}, ${c.nombres}` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))));
    this.cargar();
  }

  cargar(): void {
    this.api.datos().subscribe({
      next: (d) => { this.ordenes = d.ordenes; this.productos = d.productos; this.pick(this.tab); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  private isPending(o: OrdenActivoApi): boolean { return o.estado === 'Pendiente' || o.estado === 'Atrasado'; }

  pick(i: number): void {
    this.tab = i;
    this.rows = this.ordenes.filter((o) => this.isPending(o) === (i === 0)).map((o) => ({
      id: o.id, o: o.origen, p: o.producto, c: o.categoria, sp: o.para, a: o.area, cg: o.cargo, s: o.solicitante,
      fs: o.solicitada, fa: o.asignarEl, e: { text: o.estado, tone: TONE[o.estado] }, x: '',
    }));
  }

  onAction(action: RowAction, row: Row): void {
    const o = this.ordenes.find((x) => x.id === row.id);
    if (!o) return;
    if (action === 'aprobar') {
      this.api.atender(o.id).subscribe({
        next: (r) => { this.setAviso(`Activo ${r.activoCodigo} asignado a ${o.para}. Ya aparece en el inventario como asignado.`, false); this.cargar(); },
        error: (e) => this.setAviso(mensajeError(e), true),
      });
    }
    if (action === 'rechazar') { this.error = ''; this.rechazo = { orden: o, motivo: '' }; }
    if (action === 'ver') this.detalle = o;
  }

  rechazar(): void {
    const r = this.rechazo;
    if (!r || this.ocupado) return;
    if (!r.motivo.trim()) { this.error = 'Indica el motivo del rechazo.'; return; }
    this.ocupado = true;
    this.api.rechazar(r.orden.id, r.motivo.trim()).subscribe({
      next: () => { this.ocupado = false; this.rechazo = null; this.setAviso(`Orden ${r.orden.id} rechazada.`, false); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  abrirNueva(): void {
    this.error = '';
    this.nueva = { productoId: this.productos[0]?.id ?? null, paraId: null, asignarEl: '', comentario: '' };
  }

  crear(): void {
    const n = this.nueva;
    if (!n || this.ocupado) return;
    if (n.productoId === null || n.paraId === null || !n.asignarEl.trim()) { this.error = 'Completa el producto, el colaborador y la fecha.'; return; }
    this.ocupado = true;
    this.api.crearOrden({ productoId: n.productoId, paraId: n.paraId, asignarEl: n.asignarEl.trim(), comentario: n.comentario.trim() }).subscribe({
      next: (id) => { this.ocupado = false; this.nueva = null; this.setAviso(`Orden ${id} creada.`, false); this.pick(0); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  private setAviso(msg: string, warn: boolean): void { this.aviso = msg; this.avisoWarn = warn; }
}
