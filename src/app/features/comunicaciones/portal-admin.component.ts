import { Component } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Router } from '@angular/router';
import { downloadCsv } from '../../core/csv';
import { HrDataService } from '../../core/hr-data.service';
import { ESTADO_PUBLICACION_TONE, ElementoPortal } from '../../core/sample/reportes';
import { ComunicacionService, PublicacionApi } from '../../core/comunicacion.service';
import { mensajeError } from '../../core/auth.service';
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

/**
 * P-12.5 Comunicaciones › Portal del Colaborador (admin). Publicaciones are stored by the API and shown on the Mi Portal
 * wall while published (from the publication date until expiry); portadas and acciones rápidas are still local.
 */
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
                      (create)="editar(null)"
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

    <app-modal *ngIf="pubModal as m" [title]="m.id === null ? 'Crear Publicación' : 'Editar Publicación'" width="640px" (closed)="pubModal = null">
      <form id="pub-form" class="nx-form" (ngSubmit)="guardarPub()">
        <label class="nx-field">Título*<input class="nx-input" name="titulo" maxlength="150" [(ngModel)]="m.titulo"></label>
        <label class="nx-field">Contenido*<textarea class="nx-textarea" name="texto" rows="5" maxlength="4000" [(ngModel)]="m.texto"></textarea></label>
        <label class="nx-field">Autor<input class="nx-input" name="autor" maxlength="80" [(ngModel)]="m.autor" placeholder="Gestión de Personas"></label>
        <div class="nx-grid nx-grid--2">
          <label class="nx-field">Publicar el (DD/MM/AAAA)<input class="nx-input" name="publicarEl" [(ngModel)]="m.publicarEl" placeholder="Vacío = borrador"></label>
          <label class="nx-field">Expira el (DD/MM/AAAA)<input class="nx-input" name="expira" [(ngModel)]="m.expira" placeholder="Sin expiración"></label>
        </div>
        <label class="nx-check nx-check--plain"><input type="checkbox" name="fijada" [(ngModel)]="m.fijada">Fijar al inicio del muro</label>
        <span class="nx-hint">Sin fecha queda como borrador; con fecha futura queda programada.</span>
        <span *ngIf="errorPub" class="nx-error" role="alert">{{ errorPub }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="pubModal = null">Cancelar</button>
        <button type="submit" form="pub-form" class="nx-btn nx-btn--primary" [disabled]="ocupado">Guardar</button>
      </ng-container>
    </app-modal>
  `
})
export class PortalAdminComponent {
  readonly tabs = ['Publicaciones', 'Portadas', 'Acciones Rápidas'];
  readonly cols = COLS; readonly pcols = PCOLS;
  readonly pubActions: RowAction[] = ['editar', 'descargar', 'eliminar'];
  readonly elemActions: RowAction[] = ['ocultar', 'editar', 'eliminar'];
  tab = 0;
  pubRows: Row[] = []; portadaRows: Row[] = []; accionRows: Row[] = [];
  pubs: PublicacionApi[] = []; portadas: ElementoPortal[] = []; acciones: ElementoPortal[] = [];
  pubModal: { id: number | null; titulo: string; texto: string; autor: string; publicarEl: string; expira: string; fijada: boolean } | null = null;
  errorPub = '';
  ocupado = false;

  constructor(data: HrDataService, public ui: UiStateService, private router: Router, private api: ComunicacionService) {
    this.cargarPubs();
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

  private cargarPubs(): void {
    this.api.publicaciones().subscribe({ next: (p) => { this.pubs = p; this.refresh(); }, error: (e) => this.ui.toast(mensajeError(e)) });
  }

  editar(p: PublicacionApi | null): void {
    this.errorPub = '';
    this.pubModal = p
      ? { id: p.id, titulo: p.titulo, texto: p.texto, autor: p.autor, publicarEl: p.publicada === '—' ? '' : p.publicada, expira: p.expira === '—' ? '' : p.expira, fijada: p.fijada }
      : { id: null, titulo: '', texto: '', autor: '', publicarEl: '', expira: '', fijada: false };
  }

  guardarPub(): void {
    const m = this.pubModal;
    if (!m || this.ocupado) return;
    this.ocupado = true;
    this.errorPub = '';
    this.api.guardarPublicacion(m.id, { titulo: m.titulo.trim(), texto: m.texto.trim(), autor: m.autor.trim(), fijada: m.fijada, publicarEl: m.publicarEl.trim(), expira: m.expira.trim() }).subscribe({
      next: (p) => { this.ocupado = false; this.pubModal = null; this.ui.toast(`“${p.titulo}” guardada (${p.estado.toLowerCase()})`); this.cargarPubs(); },
      error: (e) => { this.ocupado = false; this.errorPub = mensajeError(e); },
    });
  }

  private metricas(list: PublicacionApi[]): string[][] {
    return list.map((p) => [p.titulo, p.estado, p.publicada, p.expira, String(p.vistas), String(p.comentarios), String(p.reacciones),
      p.engagement === null ? '' : String(p.engagement)]);
  }
  private readonly headers = ['Título', 'Estado', 'Fecha de publicación', 'Fecha de expiración', 'Vistas únicas', 'Comentarios', 'Reacciones', '% Engagement'];

  descargarTodas(): void { downloadCsv('metricas-publicaciones', this.headers, this.metricas(this.pubs)); }

  onPub(action: RowAction, row: Row): void {
    const p = this.pubs.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'editar') this.editar(p);
    if (action === 'descargar') downloadCsv(`metricas-${p.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, this.headers, this.metricas([p]));
    if (action === 'eliminar') this.eliminarPubs([row]);
  }

  eliminarPubs(rows: Row[]): void {
    forkJoin(rows.map((r) => this.api.eliminarPublicacion(+r.id).pipe(map(() => true), catchError(() => of(false))))).subscribe((r) => {
      this.ui.toast(`${r.filter(Boolean).length} publicación(es) eliminada(s)`);
      this.cargarPubs();
    });
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
