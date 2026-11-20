import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { ESTADO_SOLICITUD_TONE, PLANTILLAS_WF, PlantillaWf, SolicitudWf } from '../../core/sample/workflow';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'id', label: 'ID', w: '80px' },
  { key: 't', label: 'Título', w: 'minmax(200px, 1.8fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.8fr)' },
  { key: 'tp', label: 'Tipo', filter: 'select', w: 'minmax(110px, 0.8fr)' },
  { key: 's', label: 'Solicitante', w: 'minmax(150px, 1fr)' },
  { key: 'c', label: 'Colaborador afectado', w: 'minmax(170px, 1.1fr)' },
  { key: 'd', label: 'N° de documento', w: 'minmax(120px, 0.8fr)' },
  { key: 'p', label: 'Progreso', type: 'progress', filter: 'none', w: 'minmax(130px, 0.9fr)' },
  { key: 'fc', label: 'Fecha Creación', type: 'date', filter: 'date', w: 'minmax(130px, 0.8fr)' },
  { key: 'fa', label: 'Fecha Actualización', type: 'date', filter: 'date', w: 'minmax(150px, 0.8fr)' },
];

/** P-02.1 Workflow › Solicitudes, with P-02.2 modal "Nueva solicitud". */
@Component({
  selector: 'app-wf-solicitudes',
  template: `
    <app-page-header title="Solicitudes" [crumbs]="['Administrativo', 'Workflow']">
      <span header-badge class="nx-pro nx-pro--head">PRO</span>
    </app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pickTab(i)">{{ t }}</button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" createLabel="Crear Solicitud" [showAdvancedFilter]="false"
                    tableLabel="Solicitudes de workflow" minWidth="1500px" exportName="solicitudes-workflow"
                    emptyTitle="No tienes solicitudes aquí" emptyText="Cuando haya solicitudes en esta bandeja podrás verlas aquí"
                    (create)="openModal()"></app-data-table>

    <app-modal *ngIf="modal" title="Nueva solicitud" width="820px" (closed)="modal = false">
      <div class="nx-form">
        <label class="nx-input-icon">
          <app-icon name="search" [size]="16"></app-icon>
          <input aria-label="Buscar plantilla" placeholder="Buscar plantilla" [(ngModel)]="query">
        </label>
        <span class="nx-muted nx-small">Plantillas activas</span>
        <div class="nx-templates">
          <button *ngFor="let t of plantillas" type="button" class="nx-template" (click)="crear(t)">
            <span class="nx-iconbox nx-iconbox--38"><app-icon name="workflow" [size]="18"></app-icon></span>
            <span class="nx-template__text"><b>{{ t.nombre }}</b><span class="nx-badge nx-badge--sm nx-tone-gray">{{ t.tipo }}</span></span>
          </button>
        </div>
        <p *ngIf="!plantillas.length" class="nx-muted nx-center">No hay plantillas activas con ese nombre.</p>
      </div>
      <ng-container modal-footer>
        <span></span>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = false">Cancelar</button>
      </ng-container>
    </app-modal>
  `
})
export class WfSolicitudesComponent {
  readonly columns = COLUMNS;
  readonly tabs = ['Mis pendientes', 'Mis solicitudes', 'Todas'];
  tab = 0;
  rows: Row[] = [];
  modal = false;
  query = '';
  private all: SolicitudWf[] = [];

  constructor(private data: HrDataService, private ui: UiStateService) {
    data.solicitudesWf().subscribe((s) => { this.all = s; this.pickTab(this.tab); });
  }

  get plantillas(): PlantillaWf[] {
    const q = this.query.trim().toLowerCase();
    return PLANTILLAS_WF.filter((t) => !q || t.nombre.toLowerCase().includes(q));
  }

  pickTab(i: number): void {
    this.tab = i;
    this.rows = this.all
      .filter((r) => i === 2 || r.grupo === (i === 0 ? 'me' : 'mine'))
      .map((r) => ({
        id: r.id, t: r.titulo, e: { text: r.estado, tone: ESTADO_SOLICITUD_TONE[r.estado] }, tp: r.tipo, s: r.solicitante,
        c: r.afectado, d: r.documento, p: { text: `${r.progreso}%`, pct: r.progreso }, fc: r.creada, fa: r.actualizada,
      }));
  }

  openModal(): void { this.query = ''; this.modal = true; }

  /** Creates a request from the chosen template and shows it under "Mis solicitudes". */
  crear(t: PlantillaWf): void {
    const nueva = this.data.addSolicitudWf(t);
    this.modal = false;
    this.pickTab(1);
    this.ui.toast(`Solicitud #${nueva.id} creada`);
  }
}
