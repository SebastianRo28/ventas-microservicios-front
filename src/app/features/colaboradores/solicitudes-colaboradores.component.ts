import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { HrDataService } from '../../core/hr-data.service';
import { ESTADO_SOLICITUD_TONE, SolicitudWf } from '../../core/sample/workflow';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'id', label: 'N°', w: '80px' },
  { key: 's', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 't', label: 'Solicitud', w: 'minmax(240px, 1.8fr)' },
  { key: 'tp', label: 'Tipo', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'fc', label: 'Creada', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'fa', label: 'Actualizada', type: 'date', filter: 'date', w: 'minmax(120px, 0.7fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

/**
 * Administrativo › Colaboradores › Solicitudes: requests collaborators start from Mi Portal (constancias, adelantos,
 * cambios de datos…), to approve or reject. HR's own workflow requests stay in Workflow › Solicitudes.
 */
@Component({
  selector: 'app-solicitudes-colaboradores',
  template: `
    <app-page-header title="Solicitudes de colaboradores" [crumbs]="['Administrativo', 'Colaboradores']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab" [class.is-active]="tab === i"
              [attr.aria-selected]="tab === i" (click)="tab = i; refrescar()">{{ t }}<span *ngIf="i === 0 && pendientes" class="nx-navcount">{{ pendientes }}</span></button>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="tab === 0 ? acciones : []" [selectable]="false" [showBulk]="false"
                    [showAdvancedFilter]="false" tableLabel="Solicitudes de colaboradores" minWidth="1200px" exportName="solicitudes-colaboradores"
                    [emptyTitle]="tab === 0 ? 'No hay solicitudes pendientes' : 'Aún no hay solicitudes resueltas'"
                    emptyText="Las solicitudes que los colaboradores inician desde Mi Portal llegan aquí"
                    (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="resolver as r" [title]="(r.aprobar ? 'Aprobar' : 'Rechazar') + ' solicitud #' + r.s.id" width="520px" (closed)="resolver = null">
      <form id="solc-form" class="nx-form" (ngSubmit)="confirmar()">
        <p class="nx-mt-0"><b>{{ r.s.solicitante }}</b> · {{ r.s.titulo }}</p>
        <label class="nx-field">{{ r.aprobar ? 'Comentario (opcional)' : 'Motivo del rechazo*' }}
          <textarea class="nx-textarea" name="comentario" rows="3" maxlength="300" [(ngModel)]="r.comentario"></textarea></label>
        <span *ngIf="intento && !r.aprobar && !r.comentario.trim()" class="nx-error">Indica el motivo para informar al colaborador.</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="resolver = null">Cancelar</button>
        <button type="submit" form="solc-form" class="nx-btn" [ngClass]="r.aprobar ? 'nx-btn--primary' : 'nx-btn--danger-solid'">{{ r.aprobar ? 'Aprobar' : 'Rechazar' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class SolicitudesColaboradoresComponent implements OnDestroy {
  readonly cols = COLS;
  readonly tabs = ['Pendientes', 'Resueltas'];
  readonly acciones: RowAction[] = ['aprobar', 'rechazar'];
  tab = 0;
  rows: Row[] = [];
  pendientes = 0;
  resolver: { s: SolicitudWf; aprobar: boolean; comentario: string } | null = null;
  intento = false;
  private delPortal: SolicitudWf[] = [];
  private ids = new Map<string, number>();
  private sub: Subscription;

  constructor(private data: HrDataService, private ui: UiStateService) {
    this.sub = combineLatest([data.colaboradores(), data.solicitudesWf()]).subscribe(([cs, ss]) => {
      this.ids = new Map(cs.map((c) => [`${c.apellidos}, ${c.nombres}`, c.id]));
      // Started by the collaborator for themself (from Mi Portal).
      this.delPortal = ss.filter((s) => this.ids.has(s.solicitante) && s.solicitante === s.afectado);
      this.refrescar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  refrescar(): void {
    this.pendientes = this.delPortal.filter((s) => s.estado === 'Pendiente').length;
    this.rows = this.delPortal.filter((s) => (s.estado === 'Pendiente') === (this.tab === 0)).map((s) => ({
      id: s.id, s: { text: s.solicitante, link: `/admin/colaboradores/ficha/${this.ids.get(s.solicitante)}` }, t: s.titulo, tp: s.tipo,
      fc: s.creada, fa: s.actualizada, e: { text: s.estado, tone: ESTADO_SOLICITUD_TONE[s.estado] }, x: '',
    }));
  }

  onAction(action: RowAction, row: Row): void {
    const s = this.delPortal.find((x) => x.id === row.id);
    if (!s || (action !== 'aprobar' && action !== 'rechazar')) return;
    this.intento = false;
    this.resolver = { s, aprobar: action === 'aprobar', comentario: '' };
  }

  confirmar(): void {
    this.intento = true;
    const r = this.resolver;
    if (!r || (!r.aprobar && !r.comentario.trim())) return;
    this.data.resolverSolicitudWf(r.s.id, r.aprobar, r.comentario.trim());
    this.resolver = null;
    this.ui.toast(`Solicitud #${r.s.id} ${r.aprobar ? 'aprobada' : 'rechazada'}; el colaborador verá el resultado en Mi Portal`);
  }
}
