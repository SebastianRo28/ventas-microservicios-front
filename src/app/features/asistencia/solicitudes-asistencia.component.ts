import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, diasCalendario, fmtFecha } from '../../core/asistencia.service';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { ESTADO_SOL_ASIS_TONE, SolicitudAsistencia, TipoSolicitudAsistencia } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'id', label: 'ID', w: '80px' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 't', label: 'Tipo', filter: 'select', w: 'minmax(140px, 0.9fr)' },
  { key: 'de', label: 'Desde', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'ha', label: 'Hasta', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'n', label: 'Días', type: 'number', filter: 'none', w: '80px' },
  { key: 'm', label: 'Motivo', w: 'minmax(160px, 1fr)' },
  { key: 'fc', label: 'Fecha Creación', type: 'date', filter: 'date', w: 'minmax(130px, 0.8fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'r', label: 'Resuelta por', w: 'minmax(140px, 0.9fr)' },
  { key: 'cm', label: 'Comentario', w: 'minmax(180px, 1.1fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

const TIPOS: TipoSolicitudAsistencia[] = ['Vacaciones', 'Permiso con goce', 'Permiso sin goce'];

/** Administrativo › Asistencia › Solicitudes: vacation and leave requests waiting for approval. */
@Component({
  selector: 'app-solicitudes-asistencia',
  template: `
    <app-page-header title="Solicitudes" [crumbs]="['Administrativo', 'Asistencia']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i; refrescar()">
        {{ t }}<span *ngIf="i === 0 && pendientes" class="nx-navcount">{{ pendientes }}</span></button>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" createLabel="Crear Solicitud" [rowActions]="tab === 0 ? pendActions : []"
                    [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false" tableLabel="Solicitudes de asistencia"
                    minWidth="1700px" exportName="solicitudes-asistencia"
                    [emptyTitle]="tab === 0 ? 'No hay solicitudes pendientes' : 'Aún no hay solicitudes resueltas'"
                    emptyText="Las solicitudes de vacaciones y permisos aparecerán aquí"
                    (create)="abrirNueva()" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="resolver as r" [title]="r.aprobar ? 'Aprobar solicitud #' + r.s.id : 'Rechazar solicitud #' + r.s.id" width="560px" (closed)="resolver = null">
      <form id="res-form" class="nx-form" (ngSubmit)="confirmar()">
        <p class="nx-mt-0"><b>{{ nombreDe(r.s.colaboradorId) }}</b> · {{ r.s.tipo }} del {{ r.s.desde }} al {{ r.s.hasta }} ({{ r.s.dias }} días).</p>
        <div *ngIf="r.aprobar && aviso(r.s) as a" class="nx-ok-note nx-ok-note--warn" role="alert"><app-icon name="alert" [size]="17"></app-icon>{{ a }}</div>
        <label class="nx-field">{{ r.aprobar ? 'Comentario' : 'Motivo del rechazo*' }}
          <textarea class="nx-textarea" name="comentario" rows="3" [(ngModel)]="r.comentario" [class.is-invalid]="intento && !r.aprobar && !r.comentario.trim()"></textarea>
          <span *ngIf="intento && !r.aprobar && !r.comentario.trim()" class="nx-error">Indica el motivo para informar al colaborador.</span>
        </label>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="resolver = null">Cancelar</button>
        <button type="submit" form="res-form" class="nx-btn" [ngClass]="r.aprobar ? 'nx-btn--primary' : 'nx-btn--danger-solid'"
                [disabled]="r.aprobar && !!aviso(r.s)">{{ r.aprobar ? 'Aprobar' : 'Rechazar' }}</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="nueva as m" title="Crear solicitud" width="620px" (closed)="nueva = null">
      <form id="sol-form" class="nx-form" (ngSubmit)="crear()">
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [(ngModel)]="m.colaboradorId">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option>
          </select>
        </label>
        <label class="nx-field">Tipo*
          <select class="nx-select" name="tipo" [(ngModel)]="m.tipo"><option *ngFor="let t of tipos">{{ t }}</option></select>
        </label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Desde*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="desde" placeholder="DD/MM/YYYY" [(ngModel)]="m.desde"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Hasta*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="hasta" placeholder="DD/MM/YYYY" [(ngModel)]="m.hasta"><app-icon name="calendar" [size]="16"></app-icon></span></label>
        </div>
        <span class="nx-hint">Días calendario: <b>{{ diasNueva }}</b></span>
        <label class="nx-field">Motivo<input class="nx-input" name="motivo" placeholder="Opcional" [(ngModel)]="m.motivo"></label>
        <span *ngIf="intento && errorNueva" class="nx-error">{{ errorNueva }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="nueva = null">Cancelar</button>
        <button type="submit" form="sol-form" class="nx-btn nx-btn--primary">Crear</button>
      </ng-container>
    </app-modal>
  `
})
export class SolicitudesAsistenciaComponent implements OnDestroy {
  readonly cols = COLS;
  readonly tipos = TIPOS;
  readonly tabs = ['Pendientes', 'Historial'];
  readonly pendActions: RowAction[] = ['aprobar', 'rechazar'];
  tab = 0;
  rows: Row[] = [];
  pendientes = 0;
  colaboradores: Colaborador[] = [];
  resolver: { s: SolicitudAsistencia; aprobar: boolean; comentario: string } | null = null;
  nueva: { colaboradorId: number | null; tipo: TipoSolicitudAsistencia; desde: string; hasta: string; motivo: string } | null = null;
  intento = false;
  private all: SolicitudAsistencia[] = [];
  private sub: Subscription;

  constructor(data: HrDataService, private asis: AsistenciaService, private ui: UiStateService) {
    this.sub = combineLatest([data.colaboradores(), asis.solicitudes$]).subscribe(([cs, ss]) => {
      this.colaboradores = cs;
      this.all = ss;
      this.refrescar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }
  nombreDe(id: number): string { const c = this.col(id); return c ? `${c.apellidos}, ${c.nombres}` : '—'; }

  refrescar(): void {
    this.pendientes = this.all.filter((s) => s.estado === 'Pendiente').length;
    this.rows = this.all.filter((s) => (s.estado === 'Pendiente') === (this.tab === 0)).map((s) => ({
      id: s.id, c: { text: this.nombreDe(s.colaboradorId), link: `/admin/colaboradores/ficha/${s.colaboradorId}` }, t: s.tipo,
      de: s.desde, ha: s.hasta, n: s.dias, m: s.motivo || '—', fc: s.creada, e: { text: s.estado, tone: ESTADO_SOL_ASIS_TONE[s.estado] },
      r: s.estado === 'Pendiente' ? '—' : s.aprobador, cm: s.comentario || '—', x: '',
    }));
  }

  /** Why the request cannot be approved as-is (balance or overlap); '' when it can. */
  aviso(s: SolicitudAsistencia): string {
    const c = this.col(s.colaboradorId);
    if (!c) return 'El colaborador ya no está vigente.';
    if (s.tipo === 'Vacaciones') {
      if (!this.asis.cumplioRecord(c)) return 'Aún no cumple un año de servicio.';
      if (!this.asis.config.permitirAdelanto && s.dias > this.asis.saldo(c)) return `Saldo insuficiente: ${this.asis.saldo(c)} días disponibles.`;
    }
    return this.asis.conflicto(c.id, s.desde, s.hasta);
  }

  onAction(action: RowAction, row: Row): void {
    const s = this.all.find((x) => x.id === row.id);
    if (!s || (action !== 'aprobar' && action !== 'rechazar')) return;
    this.intento = false;
    this.resolver = { s, aprobar: action === 'aprobar', comentario: '' };
  }

  confirmar(): void {
    this.intento = true;
    const r = this.resolver, c = r && this.col(r.s.colaboradorId);
    if (!r || !c) return;
    if (r.aprobar ? this.aviso(r.s) : !r.comentario.trim()) return;
    this.asis.resolverSolicitud(r.s, c, r.aprobar, r.comentario.trim());
    this.resolver = null;
    this.ui.toast(r.aprobar
      ? `Solicitud #${r.s.id} aprobada; se registró en ${r.s.tipo === 'Vacaciones' ? 'Vacaciones' : 'Gestión de Ausencia'}`
      : `Solicitud #${r.s.id} rechazada`);
  }

  // --- Nueva ----------------------------------------------------------------
  abrirNueva(): void { this.intento = false; this.nueva = { colaboradorId: null, tipo: 'Vacaciones', desde: '', hasta: '', motivo: '' }; }
  get diasNueva(): number { return this.nueva ? diasCalendario(this.nueva.desde.trim(), this.nueva.hasta.trim()) : 0; }
  get errorNueva(): string {
    const m = this.nueva;
    if (!m || m.colaboradorId == null) return 'Selecciona un colaborador.';
    const d = parseFecha(m.desde.trim()), h = parseFecha(m.hasta.trim());
    if (!d || !h) return 'Usa el formato DD/MM/YYYY en las fechas.';
    if (d > h) return 'La fecha “Desde” debe ser anterior o igual a “Hasta”.';
    const min = new Date(parseFecha(this.asis.corte)!.getTime() + this.asis.config.anticipacionDias * 86_400_000);
    if (d < min) return `Las solicitudes se ingresan con al menos ${this.asis.config.anticipacionDias} días de anticipación (desde el ${fmtFecha(min)}).`;
    return '';
  }
  crear(): void {
    this.intento = true;
    const m = this.nueva, c = m?.colaboradorId != null ? this.col(+m.colaboradorId) : undefined;
    if (!m || !c || this.errorNueva) return;
    const s = this.asis.crearSolicitud(c, m.tipo, m.desde.trim(), m.hasta.trim(), m.motivo.trim());
    this.nueva = null;
    this.tab = 0;
    this.refrescar();
    this.ui.toast(`Solicitud #${s.id} creada y enviada a aprobación`);
  }
}
