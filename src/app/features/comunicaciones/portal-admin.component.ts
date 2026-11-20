import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { downloadCsv } from '../../core/csv';
import { HrDataService } from '../../core/hr-data.service';
import { ESTADO_PUBLICACION_TONE, ElementoPortal, Publicacion } from '../../core/sample/reportes';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 't', label: 'Título', w: 'minmax(240px, 2fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'fp', label: 'Fecha de publicación', type: 'date', filter: 'date', w: '160px' },
  { key: 'fe', label: 'Fecha de expiración', type: 'date', filter: 'date', w: '160px' },
  { key: 'v', label: 'N° de vistas únicas', type: 'number', filter: 'none', w: '150px' },
  { key: 'c', label: 'N° de comentarios', type: 'number', filter: 'none', w: '150px' },
  { key: 'r', label: 'N° de reacciones', type: 'number', filter: 'none', w: '140px' },
  { key: 'g', label: '% Engagement', type: 'number', filter: 'none', w: '130px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];
const PCOLS: Column[] = [
  { key: 't', label: 'Título', w: 'minmax(200px, 1.4fr)' },
  { key: 'm', label: 'Mostrar en el portal', type: 'badge', filter: 'select', w: '170px' },
  { key: 'd', label: 'Descripción', w: 'minmax(240px, 2fr)' },
  { key: 'l', label: 'Vínculo', filter: 'select', w: '120px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/** P-12.5 Comunicaciones › Portal del Colaborador (admin): publicaciones, portadas y acciones rápidas. */
@Component({
  selector: 'app-portal-admin',
  template: `
    <app-page-header title="Portal del Colaborador" [crumbs]="['Desarrollo Organizacional', 'Comunicaciones']">
      <a class="nx-btn nx-btn--outline" routerLink="/portal"><app-icon name="eye" [size]="15"></app-icon>Ver portal</a>
    </app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>

    <ng-container *ngIf="tab === 0">
      <div class="nx-row nx-row--right">
        <button type="button" class="nx-btn nx-btn--outline" (click)="descargarTodas()"><app-icon name="download" [size]="15"></app-icon>Descargar métricas ({{ pubRows.length }}) publicaciones</button>
      </div>
      <app-data-table [columns]="cols" [rows]="pubRows" createLabel="Crear Publicación" [rowActions]="pubActions" [showAdvancedFilter]="false"
                      [bulkActions]="['Eliminar seleccionados']" tableLabel="Publicaciones" minWidth="1400px" exportName="publicaciones"
                      (create)="ui.toast('El editor de publicaciones llegará en la próxima versión')"
                      (action)="onPub($event.action, $event.row)" (bulk)="eliminarPubs($event.rows)"></app-data-table>
      <p class="nx-muted nx-small nx-mt-12">★ = publicación fijada</p>
    </ng-container>

    <app-data-table *ngIf="tab === 1" [columns]="pcols" [rows]="portadaRows" createLabel="Crear Portada" [rowActions]="elemActions"
                    [showBulk]="false" [selectable]="false" [showAdvancedFilter]="false" tableLabel="Portadas" minWidth="1000px" exportName="portadas"
                    (create)="ui.toast('El editor de portadas llegará en la próxima versión')"
                    (action)="onElem(portadas, $event.action, $event.row)"></app-data-table>
    <app-data-table *ngIf="tab === 2" [columns]="pcols" [rows]="accionRows" createLabel="Crear Acción Rápida" [rowActions]="elemActions"
                    [showBulk]="false" [selectable]="false" [showAdvancedFilter]="false" tableLabel="Acciones rápidas" minWidth="1000px" exportName="acciones-rapidas"
                    (create)="ui.toast('El editor de acciones rápidas llegará en la próxima versión')"
                    (action)="onElem(acciones, $event.action, $event.row)"></app-data-table>
  `
})
export class PortalAdminComponent {
  readonly tabs = ['Publicaciones', 'Portadas', 'Acciones Rápidas'];
  readonly cols = COLS; readonly pcols = PCOLS;
  readonly pubActions: RowAction[] = ['ver', 'descargar', 'eliminar'];
  readonly elemActions: RowAction[] = ['ocultar', 'editar', 'eliminar'];
  tab = 0;
  pubRows: Row[] = []; portadaRows: Row[] = []; accionRows: Row[] = [];
  pubs: Publicacion[] = []; portadas: ElementoPortal[] = []; acciones: ElementoPortal[] = [];

  constructor(data: HrDataService, public ui: UiStateService, private router: Router) {
    data.publicaciones().subscribe((p) => (this.pubs = p));
    data.portadas().subscribe((p) => (this.portadas = p));
    data.accionesRapidas().subscribe((a) => (this.acciones = a));
    this.refresh();
  }

  private refresh(): void {
    this.pubRows = this.pubs.map((p) => ({
      id: p.id, t: (p.fijada ? '★ ' : '') + p.titulo, e: { text: p.estado, tone: ESTADO_PUBLICACION_TONE[p.estado] },
      fp: p.publicada, fe: p.expira, v: p.vistas, c: p.comentarios, r: p.reacciones, g: p.engagement === null ? '—' : `${p.engagement} %`, x: '',
    }));
    const elem = (e: ElementoPortal): Row => ({
      id: e.id, t: e.titulo, m: e.visible ? { text: 'Visible', tone: 'success' as const } : { text: 'Oculto', tone: 'danger' as const },
      d: e.descripcion, l: e.vinculo, x: '',
    });
    this.portadaRows = this.portadas.map(elem);
    this.accionRows = this.acciones.map(elem);
  }

  private metricas(list: Publicacion[]): string[][] {
    return list.map((p) => [p.titulo, p.estado, p.publicada, p.expira, String(p.vistas), String(p.comentarios), String(p.reacciones),
      p.engagement === null ? '' : String(p.engagement)]);
  }
  private readonly headers = ['Título', 'Estado', 'Fecha de publicación', 'Fecha de expiración', 'Vistas únicas', 'Comentarios', 'Reacciones', '% Engagement'];

  descargarTodas(): void { downloadCsv('metricas-publicaciones', this.headers, this.metricas(this.pubs)); }

  onPub(action: RowAction, row: Row): void {
    const p = this.pubs.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'ver') this.router.navigateByUrl('/portal');
    if (action === 'descargar') downloadCsv(`metricas-${p.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, this.headers, this.metricas([p]));
    if (action === 'eliminar') this.eliminarPubs([row]);
  }

  eliminarPubs(rows: Row[]): void {
    const ids = new Set(rows.map((r) => r.id));
    for (let i = this.pubs.length - 1; i >= 0; i--) if (ids.has(this.pubs[i].id)) this.pubs.splice(i, 1);
    this.refresh();
    this.ui.toast(`${rows.length} publicación(es) eliminada(s)`);
  }

  onElem(list: ElementoPortal[], action: RowAction, row: Row): void {
    const i = list.findIndex((e) => e.id === row.id);
    if (i < 0) return;
    const e = list[i];
    if (action === 'ocultar') { e.visible = !e.visible; this.ui.toast(`“${e.titulo}” ahora está ${e.visible ? 'visible' : 'oculto'} en el portal`); }
    if (action === 'eliminar') { list.splice(i, 1); this.ui.toast(`“${e.titulo}” eliminado`); }
    if (action === 'editar') this.ui.toast('La edición llegará en la próxima versión');
    this.refresh();
  }
}
