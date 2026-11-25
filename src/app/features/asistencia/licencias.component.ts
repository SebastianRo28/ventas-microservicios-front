import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, diasCalendario } from '../../core/asistencia.service';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { Ausencia, ESTADO_LICENCIA_TONE, LicenciaMedica } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'f', label: 'Folio', w: 'minmax(130px, 0.8fr)' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 'em', label: 'Emisor', filter: 'select', w: 'minmax(200px, 1.2fr)' },
  { key: 'de', label: 'Desde', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'ha', label: 'Hasta', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'n', label: 'Días', type: 'number', filter: 'none', w: '80px' },
  { key: 'an', label: 'Días DM en el año', type: 'number', filter: 'none', w: 'minmax(130px, 0.8fr)' },
  { key: 'r', label: 'Recibida', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '130px' },
];

/** Days of medical rest per year paid by the employer; from day 21 EsSalud pays the subsidy (Ley 26790). */
const DIAS_CARGO_EMPLEADOR = 20;

/** Administrativo › Asistencia › Licencias Médicas Electrónicas: medical certificates (CITT) to validate. */
@Component({
  selector: 'app-licencias',
  template: `
    <app-page-header title="Licencias Médicas Electrónicas" [crumbs]="['Administrativo', 'Asistencia']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="abrir()"><app-icon name="plus" [size]="16"></app-icon>Registrar licencia</button>
    </app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Por revisar</span><b>{{ stats.revisar }}</b></div>
      <div class="nx-card nx-stat"><span>Validadas en {{ anio }}</span><b>{{ stats.validadas }}</b></div>
      <div class="nx-card nx-stat"><span>Días de descanso médico en {{ anio }}</span><b>{{ stats.dias }}</b></div>
      <div class="nx-card nx-stat"><span>Con subsidio EsSalud (más de 20 días)</span><b>{{ stats.subsidio }}</b></div>
    </div>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i; refrescar()">{{ t }}</button>
    </div>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Al validar una licencia se registra el descanso médico en <a routerLink="/admin/asistencia/ausencia">Gestión de Ausencia</a>.
        Los primeros {{ cargoEmpleador }} días del año los paga la empresa; desde el día 21, EsSalud paga el subsidio.</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="tab === 0 ? revisarActions : []" [selectable]="false" [showBulk]="false"
                    [showAdvancedFilter]="false" tableLabel="Licencias médicas" minWidth="1500px" exportName="licencias-medicas"
                    [emptyTitle]="tab === 0 ? 'No hay licencias por revisar' : 'Aún no hay licencias revisadas'"
                    (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="revisar as r" [title]="'Licencia ' + r.l.folio" width="560px" (closed)="revisar = null">
      <div class="nx-form">
        <div class="nx-fieldrow"><span>Colaborador</span><span>{{ nombreDe(r.l.colaboradorId) }}</span></div>
        <div class="nx-fieldrow"><span>Emisor</span><span>{{ r.l.emisor }}</span></div>
        <div class="nx-fieldrow"><span>Diagnóstico</span><span>{{ r.l.diagnostico }}</span></div>
        <div class="nx-fieldrow"><span>Período</span><span>Del {{ r.l.desde }} al {{ r.l.hasta }} ({{ r.l.dias }} días)</span></div>
        <div *ngIf="r.accion === 'Validada' && conflicto(r.l) as cf" class="nx-ok-note nx-ok-note--warn" role="alert"><app-icon name="alert" [size]="17"></app-icon>{{ cf }}</div>
        <p class="nx-mt-0 nx-mb-0">{{ r.accion === 'Validada' ? 'Se registrará un descanso médico en Gestión de Ausencia.'
          : r.accion === 'Observada' ? 'La licencia quedará observada hasta que el colaborador envíe la corrección.'
          : 'La licencia se rechazará y no se registrará ausencia.' }}</p>
      </div>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="revisar = null">Cancelar</button>
        <button type="button" class="nx-btn" [ngClass]="r.accion === 'Rechazada' ? 'nx-btn--danger-solid' : 'nx-btn--primary'"
                [disabled]="r.accion === 'Validada' && !!conflicto(r.l)" (click)="confirmar()">
          {{ r.accion === 'Validada' ? 'Validar' : r.accion === 'Observada' ? 'Observar' : 'Rechazar' }}</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="modal as m" title="Registrar licencia médica" width="620px" (closed)="modal = null">
      <form id="lic-form" class="nx-form" (ngSubmit)="guardar()">
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [(ngModel)]="m.colaboradorId">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option>
          </select>
        </label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Folio / N° CITT*<input class="nx-input" name="folio" placeholder="A-2026-000000" [(ngModel)]="m.folio"></label>
          <label class="nx-field">Emisor*<input class="nx-input" name="emisor" placeholder="EsSalud · Hospital…" [(ngModel)]="m.emisor"></label>
          <label class="nx-field">Desde*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="desde" placeholder="DD/MM/YYYY" [(ngModel)]="m.desde"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Hasta*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="hasta" placeholder="DD/MM/YYYY" [(ngModel)]="m.hasta"><app-icon name="calendar" [size]="16"></app-icon></span></label>
        </div>
        <span class="nx-hint">Días calendario: <b>{{ dias }}</b></span>
        <label class="nx-field">Diagnóstico<input class="nx-input" name="diagnostico" placeholder="Opcional" [(ngModel)]="m.diagnostico"></label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = null">Cancelar</button>
        <button type="submit" form="lic-form" class="nx-btn nx-btn--primary">Registrar</button>
      </ng-container>
    </app-modal>
  `
})
export class LicenciasComponent implements OnDestroy {
  readonly cols = COLS;
  readonly tabs = ['Por revisar', 'Historial'];
  readonly revisarActions: RowAction[] = ['aprobar', 'observar', 'rechazar'];
  readonly cargoEmpleador = DIAS_CARGO_EMPLEADOR;
  readonly anio: number;
  tab = 0;
  rows: Row[] = [];
  colaboradores: Colaborador[] = [];
  stats = { revisar: 0, validadas: 0, dias: 0, subsidio: 0 };
  revisar: { l: LicenciaMedica; accion: LicenciaMedica['estado'] } | null = null;
  modal: { colaboradorId: number | null; folio: string; emisor: string; diagnostico: string; desde: string; hasta: string } | null = null;
  intento = false;
  private licencias: LicenciaMedica[] = [];
  private ausencias: Ausencia[] = [];
  private sub: Subscription;

  constructor(data: HrDataService, private asis: AsistenciaService, private ui: UiStateService) {
    this.anio = parseFecha(asis.corte)!.getFullYear();
    this.sub = combineLatest([data.colaboradores(), asis.licencias$, asis.ausencias$]).subscribe(([cs, ls, as]) => {
      this.colaboradores = cs;
      this.licencias = ls;
      this.ausencias = as;
      this.refrescar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }
  nombreDe(id: number): string { const c = this.col(id); return c ? `${c.apellidos}, ${c.nombres}` : '—'; }

  /** Medical-rest days registered for the collaborator in the cut-off year. */
  private diasAnio(id: number): number {
    return this.ausencias.filter((a) => a.colaboradorId === id && a.tipo === 'Descanso médico' && parseFecha(a.desde)!.getFullYear() === this.anio)
      .reduce((s, a) => s + a.dias, 0);
  }

  refrescar(): void {
    const porRevisar = (l: LicenciaMedica) => l.estado === 'Recibida' || l.estado === 'Observada';
    const ids = [...new Set(this.colaboradores.map((c) => c.id))];
    this.stats = {
      revisar: this.licencias.filter(porRevisar).length,
      validadas: this.licencias.filter((l) => l.estado === 'Validada' && parseFecha(l.desde)!.getFullYear() === this.anio).length,
      dias: ids.reduce((s, id) => s + this.diasAnio(id), 0),
      subsidio: ids.filter((id) => this.diasAnio(id) > DIAS_CARGO_EMPLEADOR).length,
    };
    this.rows = this.licencias.filter((l) => porRevisar(l) === (this.tab === 0)).map((l) => ({
      id: l.id, f: l.folio, c: { text: this.nombreDe(l.colaboradorId), link: `/admin/colaboradores/ficha/${l.colaboradorId}` },
      em: l.emisor, de: l.desde, ha: l.hasta, n: l.dias, an: this.diasAnio(l.colaboradorId), r: l.recibida,
      e: { text: l.estado, tone: ESTADO_LICENCIA_TONE[l.estado] }, x: '',
    }));
  }

  conflicto(l: LicenciaMedica): string {
    return this.asis.conflicto(l.colaboradorId, l.desde, l.hasta, l.ausenciaId);
  }

  onAction(action: RowAction, row: Row): void {
    const l = this.licencias.find((x) => x.id === row.id);
    const accion = ({ aprobar: 'Validada', observar: 'Observada', rechazar: 'Rechazada' } as const)[action as 'aprobar' | 'observar' | 'rechazar'];
    if (l && accion) this.revisar = { l, accion };
  }

  confirmar(): void {
    const r = this.revisar, c = r && this.col(r.l.colaboradorId);
    if (!r || !c || (r.accion === 'Validada' && this.conflicto(r.l))) return;
    this.asis.cambiarEstadoLicencia(r.l, c, r.accion);
    this.revisar = null;
    this.ui.toast(r.accion === 'Validada' ? `Licencia ${r.l.folio} validada; se registró el descanso médico`
      : `Licencia ${r.l.folio} ${r.accion === 'Observada' ? 'observada' : 'rechazada'}`);
  }

  abrir(): void { this.intento = false; this.modal = { colaboradorId: null, folio: '', emisor: '', diagnostico: '', desde: '', hasta: '' }; }
  get dias(): number { return this.modal ? diasCalendario(this.modal.desde.trim(), this.modal.hasta.trim()) : 0; }
  get error(): string {
    const m = this.modal;
    if (!m || m.colaboradorId == null) return 'Selecciona un colaborador.';
    if (!m.folio.trim() || !m.emisor.trim()) return 'Completa el folio y el emisor.';
    if (this.licencias.some((l) => l.folio.toLowerCase() === m.folio.trim().toLowerCase())) return 'Ya existe una licencia con ese folio.';
    const d = parseFecha(m.desde.trim()), h = parseFecha(m.hasta.trim());
    if (!d || !h) return 'Usa el formato DD/MM/YYYY en las fechas.';
    if (d > h) return 'La fecha “Desde” debe ser anterior o igual a “Hasta”.';
    return '';
  }
  guardar(): void {
    this.intento = true;
    const m = this.modal, c = m?.colaboradorId != null ? this.col(+m.colaboradorId) : undefined;
    if (!m || !c || this.error) return;
    const l = this.asis.agregarLicencia({ colaboradorId: c.id, folio: m.folio.trim(), emisor: m.emisor.trim(), diagnostico: m.diagnostico.trim() || '—',
      desde: m.desde.trim(), hasta: m.hasta.trim() }, c);
    this.modal = null;
    this.tab = 0;
    this.refrescar();
    this.ui.toast(`Licencia ${l.folio} registrada; queda por revisar`);
  }
}
