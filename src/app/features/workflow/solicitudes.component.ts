import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService, mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { PlantillaWorkflow } from '../../core/sample/catalogos';
import { ESTADO_SOLICITUD_TONE, SolicitudWf } from '../../core/sample/workflow';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

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
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

/**
 * P-02.1 Workflow › Solicitudes, with P-02.2 modal "Nueva solicitud". Requests come from the API: "Mis pendientes" are
 * the ones the user may approve (HR, or the manager of the affected person; never one's own), "Mis solicitudes" the
 * ones the user created, "Todas" everything the user may see.
 */
@Component({
  selector: 'app-wf-solicitudes',
  template: `
    <app-page-header title="Solicitudes" [crumbs]="['Administrativo', 'Workflow']">
      <span header-badge class="nx-pro nx-pro--head">PRO</span>
    </app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pickTab(i)">{{ t }} <span *ngIf="i === 0 && pendientes" class="nx-chip-sm">{{ pendientes }}</span></button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" createLabel="Crear Solicitud" [showAdvancedFilter]="false" [rowActions]="tab === 0 ? acciones : ['ver']"
                    tableLabel="Solicitudes de workflow" minWidth="1600px" exportName="solicitudes-workflow"
                    emptyTitle="No tienes solicitudes aquí" emptyText="Cuando haya solicitudes en esta bandeja podrás verlas aquí"
                    (create)="openModal()" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="modal" [title]="elegida ? elegida.nombre : 'Nueva solicitud'" width="820px" (closed)="modal = false">
      <div *ngIf="!elegida" class="nx-form">
        <label class="nx-input-icon">
          <app-icon name="search" [size]="16"></app-icon>
          <input aria-label="Buscar plantilla" placeholder="Buscar plantilla" [(ngModel)]="query">
        </label>
        <span class="nx-muted nx-small">Plantillas activas</span>
        <div class="nx-templates">
          <button *ngFor="let t of plantillasFiltradas" type="button" class="nx-template" (click)="elegir(t)">
            <span class="nx-iconbox nx-iconbox--38"><app-icon name="workflow" [size]="18"></app-icon></span>
            <span class="nx-template__text"><b>{{ t.nombre }}</b><span class="nx-badge nx-badge--sm nx-tone-gray">{{ t.tipo }}</span></span>
          </button>
        </div>
        <p *ngIf="!plantillasFiltradas.length" class="nx-muted nx-center">No hay plantillas activas con ese nombre.</p>
      </div>
      <form *ngIf="elegida" id="wf-form" class="nx-form" (ngSubmit)="crear()">
        <label class="nx-field">Colaborador afectado{{ esAdmin ? '' : '*' }}
          <select class="nx-select" name="afectado" [(ngModel)]="afectadoId">
            <option [ngValue]="null">{{ esAdmin ? '— Ninguno (p. ej. un pre-ingreso) —' : 'Selecciona a alguien de tu equipo' }}</option>
            <option *ngFor="let c of afectables" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }} · {{ c.cargo }}</option>
          </select>
        </label>
        <label class="nx-field">Detalle
          <textarea class="nx-textarea" name="detalle" rows="3" maxlength="300" placeholder="Motivo, montos o datos que debe revisar quien apruebe" [(ngModel)]="detalle"></textarea>
        </label>
        <span *ngIf="errorApi" class="nx-error" role="alert">{{ errorApi }}</span>
      </form>
      <ng-container modal-footer>
        <button *ngIf="elegida" type="button" class="nx-btn nx-btn--outline" (click)="elegida = null">Volver</button>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = false">Cancelar</button>
        <button *ngIf="elegida" type="submit" form="wf-form" class="nx-btn nx-btn--primary" [disabled]="ocupado || (!esAdmin && afectadoId === null)">Crear solicitud</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="resolver as r" [title]="(r.aprobar ? 'Aprobar' : 'Rechazar') + ' solicitud #' + r.s.id" width="540px" (closed)="resolver = null">
      <form id="wf-res" class="nx-form" (ngSubmit)="confirmar()">
        <p class="nx-mt-0"><b>{{ r.s.titulo }}</b><br><span class="nx-muted">{{ r.s.solicitante }} · afecta a {{ r.s.afectado }}</span></p>
        <p *ngIf="r.s.detalle" class="nx-small">{{ r.s.detalle }}</p>
        <p *ngIf="r.aprobar && r.s.proceso === 'adelanto'" class="nx-small nx-muted">Se descontará en la planilla del período abierto.</p>
        <label class="nx-field">{{ r.aprobar ? 'Comentario (opcional)' : 'Motivo del rechazo*' }}
          <textarea class="nx-textarea" name="comentario" rows="3" maxlength="300" [(ngModel)]="r.comentario"></textarea></label>
        <span *ngIf="intento && !r.aprobar && !r.comentario.trim()" class="nx-error">Indica el motivo para informar al solicitante.</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="resolver = null">Cancelar</button>
        <button type="submit" form="wf-res" class="nx-btn" [disabled]="ocupado" [ngClass]="r.aprobar ? 'nx-btn--primary' : 'nx-btn--danger-solid'">{{ r.aprobar ? 'Aprobar' : 'Rechazar' }}</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="ver as s" [title]="'Solicitud #' + s.id" width="560px" (closed)="ver = null">
      <div class="nx-fieldrow"><span>Título</span><span>{{ s.titulo }}</span></div>
      <div class="nx-fieldrow"><span>Estado</span><span>{{ s.estado }}</span></div>
      <div class="nx-fieldrow"><span>Plantilla / proceso</span><span>{{ s.plantilla || s.proceso || '—' }}</span></div>
      <div class="nx-fieldrow"><span>Solicitante</span><span>{{ s.solicitante }}</span></div>
      <div class="nx-fieldrow"><span>Colaborador afectado</span><span>{{ s.afectado }}</span></div>
      <div class="nx-fieldrow"><span>Detalle</span><span>{{ s.detalle || '—' }}</span></div>
      <div *ngIf="s.resueltaPor" class="nx-fieldrow"><span>Resuelta por</span><span>{{ s.resueltaPor }}{{ s.comentario ? ' · ' + s.comentario : '' }}</span></div>
      <ng-container modal-footer><button type="button" class="nx-btn nx-btn--primary" (click)="ver = null">Cerrar</button></ng-container>
    </app-modal>
  `
})
export class WfSolicitudesComponent implements OnDestroy {
  readonly columns = COLUMNS;
  readonly tabs = ['Mis pendientes', 'Mis solicitudes', 'Todas'];
  readonly acciones: RowAction[] = ['aprobar', 'rechazar'];
  tab = 0;
  rows: Row[] = [];
  modal = false;
  query = '';
  plantillas: PlantillaWorkflow[] = [];
  elegida: PlantillaWorkflow | null = null;
  afectadoId: number | null = null;
  detalle = '';
  errorApi = '';
  ocupado = false;
  intento = false;
  resolver: { s: SolicitudWf; aprobar: boolean; comentario: string } | null = null;
  ver: SolicitudWf | null = null;
  private colaboradores: Colaborador[] = [];
  private all: SolicitudWf[] = [];
  private sub = new Subscription();

  constructor(private data: HrDataService, private ui: UiStateService, private auth: AuthService) {
    this.sub.add(data.solicitudesWf().subscribe((s) => { this.all = s; this.pickTab(this.tab); }));
    this.sub.add(data.colaboradores().subscribe((c) => (this.colaboradores = c)));
    data.cargarWorkflow().subscribe();
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get esAdmin(): boolean { return this.auth.esAdmin; }
  get pendientes(): number { return this.all.filter((s) => s.grupo === 'me').length; }
  get plantillasFiltradas(): PlantillaWorkflow[] {
    const q = this.query.trim().toLowerCase();
    return this.plantillas.filter((t) => t.estado === 'Activa' && (!q || t.nombre.toLowerCase().includes(q)));
  }
  /** Administrators: anyone; supervisors: people of their team with full data (not themselves). */
  get afectables(): Colaborador[] {
    const yo = this.auth.usuario?.colaboradorId;
    return this.colaboradores.filter((c) => this.esAdmin || (!c.reservado && c.id !== yo)).sort((a, b) => a.apellidos.localeCompare(b.apellidos));
  }

  pickTab(i: number): void {
    this.tab = i;
    this.rows = this.all
      .filter((r) => i === 2 || r.grupo === (i === 0 ? 'me' : 'mine'))
      .map((r) => ({
        id: r.id, t: r.titulo, e: { text: r.estado, tone: ESTADO_SOLICITUD_TONE[r.estado] }, tp: r.tipo, s: r.solicitante,
        c: r.afectado, d: r.documento, p: { text: `${r.progreso}%`, pct: r.progreso }, fc: r.creada, fa: r.actualizada, x: '',
      }));
  }

  openModal(): void {
    this.query = ''; this.elegida = null; this.errorApi = ''; this.modal = true;
    this.data.plantillasWorkflow().subscribe((p) => (this.plantillas = p));
  }
  elegir(t: PlantillaWorkflow): void { this.elegida = t; this.afectadoId = null; this.detalle = ''; this.errorApi = ''; }

  crear(): void {
    const t = this.elegida;
    if (!t || this.ocupado) return;
    this.ocupado = true;
    this.data.solicitarDesdePlantilla(t.id, this.afectadoId, this.detalle.trim()).subscribe({
      next: (s) => { this.ocupado = false; this.modal = false; this.pickTab(1); this.ui.toast(`Solicitud #${s.id} creada`); },
      error: (e) => { this.ocupado = false; this.errorApi = mensajeError(e); },
    });
  }

  onAction(action: RowAction, row: Row): void {
    const s = this.all.find((x) => x.id === row.id);
    if (!s) return;
    if (action === 'ver') { this.ver = s; return; }
    if (action !== 'aprobar' && action !== 'rechazar') return;
    this.intento = false;
    this.resolver = { s, aprobar: action === 'aprobar', comentario: '' };
  }

  confirmar(): void {
    this.intento = true;
    const r = this.resolver;
    if (!r || (!r.aprobar && !r.comentario.trim()) || this.ocupado) return;
    this.ocupado = true;
    this.data.resolverSolicitudWf(r.s.id, r.aprobar, r.comentario.trim()).subscribe({
      next: (x) => {
        this.ocupado = false;
        this.resolver = null;
        this.ui.toast(`Solicitud #${r.s.id} ${r.aprobar ? 'aprobada' : 'rechazada'}${x.itemId ? '; el adelanto se descontará en la planilla del mes' : ''}`);
      },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }
}
