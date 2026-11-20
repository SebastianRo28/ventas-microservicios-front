import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, seCruzan } from '../../core/asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { RecargoDomingo } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'id', label: 'ID', w: '70px' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 'f', label: 'Fecha', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'd', label: 'Día', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'h', label: 'Horas', type: 'number', filter: 'none', w: '80px' },
  { key: 's', label: 'Descanso sustitutorio', type: 'badge', filter: 'select', w: 'minmax(150px, 0.9fr)' },
  { key: 'm', label: 'Recargo', type: 'money', filter: 'none', w: 'minmax(120px, 0.8fr)' },
  { key: 'o', label: 'Observación', w: 'minmax(180px, 1.2fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];

/**
 * Administrativo › Asistencia › Recargo Domingo: work on the weekly rest day or a holiday. Without a substitute
 * rest day it is paid with the configured surcharge (100% by default, D. Leg. 713).
 */
@Component({
  selector: 'app-recargo-domingo',
  template: `
    <app-page-header title="Recargo Domingo" [crumbs]="['Administrativo', 'Asistencia']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="abrir()"><app-icon name="plus" [size]="16"></app-icon>Registrar día trabajado</button>
    </app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Días trabajados en {{ mesLabel }}</span><b>{{ stats.dias }}</b></div>
      <div class="nx-card nx-stat"><span>Con descanso sustitutorio</span><b>{{ stats.sustitutorio }}</b></div>
      <div class="nx-card nx-stat"><span>Recargo a pagar en {{ mesLabel }}</span><b>{{ stats.monto }}</b></div>
      <div class="nx-card nx-stat"><span>Sobretasa vigente</span><b>{{ asis.config.sobretasaDomingo }} %</b></div>
    </div>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Recargo = horas × valor hora × (1 + {{ asis.config.sobretasaDomingo }} %). Si se otorga otro día de descanso, no hay recargo.
        La sobretasa se cambia en <a routerLink="/admin/asistencia/configuraciones">Configuraciones</a>.</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="actions" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Domingos y feriados trabajados" minWidth="1400px" exportName="recargo-domingo"
                    emptyTitle="No hay domingos ni feriados trabajados" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="modal as m" title="Registrar día trabajado" width="580px" (closed)="modal = null">
      <form id="rec-form" class="nx-form" (ngSubmit)="guardar()">
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [(ngModel)]="m.colaboradorId">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option>
          </select>
        </label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Fecha*<input class="nx-input" name="fecha" placeholder="DD/MM/YYYY" [(ngModel)]="m.fecha"></label>
          <label class="nx-field">Horas trabajadas*<input class="nx-input" name="horas" type="number" min="1" max="12" [(ngModel)]="m.horas"></label>
        </div>
        <span *ngIf="diaLabel" class="nx-hint">{{ diaLabel }}</span>
        <label class="nx-check nx-check--plain"><input type="checkbox" name="sustitutorio" [(ngModel)]="m.sustitutorio">Se otorga descanso sustitutorio (sin recargo)</label>
        <label class="nx-field">Observación<input class="nx-input" name="observacion" placeholder="Opcional" [(ngModel)]="m.observacion"></label>
        <div *ngIf="!error && previa" class="nx-ok-note" role="status"><app-icon name="checkcircle" [size]="17"></app-icon>{{ previa }}</div>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = null">Cancelar</button>
        <button type="submit" form="rec-form" class="nx-btn nx-btn--primary">Registrar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar as b" title="Eliminar registro" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará el día trabajado del {{ b.fecha }} ({{ b.horas }} h).</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class RecargoDomingoComponent implements OnDestroy {
  readonly cols = COLS;
  readonly actions: RowAction[] = ['eliminar'];
  readonly mesLabel: string;
  rows: Row[] = [];
  colaboradores: Colaborador[] = [];
  stats = { dias: 0, sustitutorio: 0, monto: '' };
  modal: { colaboradorId: number | null; fecha: string; horas: number; sustitutorio: boolean; observacion: string } | null = null;
  borrar: RecargoDomingo | null = null;
  intento = false;
  private recargos: RecargoDomingo[] = [];
  private sub: Subscription;

  constructor(data: HrDataService, public asis: AsistenciaService, private ui: UiStateService) {
    this.mesLabel = parseFecha(asis.corte)!.toLocaleDateString('es-PE', { month: 'long' }).toLowerCase();
    this.sub = combineLatest([data.colaboradores(), asis.recargos$]).subscribe(([cs, rs]) => {
      this.colaboradores = cs;
      this.recargos = rs;
      this.refrescar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }

  /** "Domingo" or the holiday name; '' when the date is a regular working day. */
  private tipoDia(fecha: string): string {
    const d = parseFecha(fecha);
    if (!d) return '';
    const feriado = this.asis.esFeriado(fecha);
    if (feriado) return `Feriado · ${feriado}`;
    return d.getDay() === 0 ? 'Domingo' : '';
  }

  private refrescar(): void {
    const corte = parseFecha(this.asis.corte)!;
    const delMes = (r: RecargoDomingo) => { const d = parseFecha(r.fecha)!; return d.getMonth() === corte.getMonth() && d.getFullYear() === corte.getFullYear(); };
    let monto = 0;
    for (const r of this.recargos.filter(delMes)) { const c = this.col(r.colaboradorId); if (c) monto += this.asis.montoRecargo(r, c); }
    this.stats = {
      dias: this.recargos.filter(delMes).length,
      sustitutorio: this.recargos.filter((r) => delMes(r) && r.descansoSustitutorio).length,
      monto: soles(Math.round(monto * 100) / 100),
    };
    this.rows = [...this.recargos].sort((a, b) => parseFecha(b.fecha)!.getTime() - parseFecha(a.fecha)!.getTime()).map((r) => {
      const c = this.col(r.colaboradorId);
      return {
        id: r.id, c: c ? { text: `${c.apellidos}, ${c.nombres}`, link: `/admin/colaboradores/ficha/${c.id}` } : '—', f: r.fecha,
        d: this.tipoDia(r.fecha) || '—', h: r.horas,
        s: r.descansoSustitutorio ? { text: 'Sí', tone: 'success' } : { text: 'No', tone: 'neutral' },
        m: c ? soles(this.asis.montoRecargo(r, c)) : '—', o: r.observacion || '—', x: '',
      };
    });
  }

  abrir(): void { this.intento = false; this.modal = { colaboradorId: null, fecha: '', horas: 8, sustitutorio: false, observacion: '' }; }

  get diaLabel(): string { const f = this.modal?.fecha.trim(); return f && parseFecha(f) ? this.tipoDia(f) || 'No es domingo ni feriado.' : ''; }

  get error(): string {
    const m = this.modal;
    if (!m || m.colaboradorId == null) return 'Selecciona un colaborador.';
    const f = m.fecha.trim();
    if (!parseFecha(f)) return 'Usa el formato DD/MM/YYYY en la fecha.';
    if (!this.tipoDia(f)) return 'La fecha debe ser un domingo o un feriado.';
    const h = Number(m.horas);
    if (!Number.isFinite(h) || h < 1 || h > 12) return 'Las horas deben estar entre 1 y 12.';
    const id = +m.colaboradorId;
    if (this.recargos.some((r) => r.colaboradorId === id && r.fecha === f)) return 'Ese día ya está registrado para el colaborador.';
    const fuera = this.asis.vacaciones$.value.find((v) => v.colaboradorId === id && seCruzan(f, f, v.desde, v.hasta))
      ?? this.asis.ausencias$.value.find((a) => a.colaboradorId === id && seCruzan(f, f, a.desde, a.hasta));
    return fuera ? `Ese día el colaborador figura ausente (del ${fuera.desde} al ${fuera.hasta}).` : '';
  }

  /** Amount preview before saving. */
  get previa(): string {
    const m = this.modal, c = m?.colaboradorId != null ? this.col(+m.colaboradorId) : undefined;
    if (!m || !c) return '';
    if (m.sustitutorio) return 'Sin recargo: se otorga otro día de descanso.';
    const monto = this.asis.montoRecargo({ id: 0, colaboradorId: c.id, fecha: m.fecha, horas: Number(m.horas), descansoSustitutorio: false, observacion: '' }, c);
    return `Recargo estimado: ${soles(monto)} (${m.horas} h × ${soles(this.asis.valorHora(c))} × ${1 + this.asis.config.sobretasaDomingo / 100}).`;
  }

  guardar(): void {
    this.intento = true;
    const m = this.modal, c = m?.colaboradorId != null ? this.col(+m.colaboradorId) : undefined;
    if (!m || !c || this.error) return;
    const r = this.asis.registrarRecargo(c, { fecha: m.fecha.trim(), horas: Number(m.horas), descansoSustitutorio: m.sustitutorio, observacion: m.observacion.trim() });
    this.modal = null;
    this.ui.toast(`Día trabajado registrado: ${soles(this.asis.montoRecargo(r, c))} de recargo`);
  }

  onAction(action: RowAction, row: Row): void {
    if (action === 'eliminar') this.borrar = this.recargos.find((r) => r.id === row.id) ?? null;
  }
  confirmarBorrar(): void {
    const b = this.borrar, c = b && this.col(b.colaboradorId);
    if (!b || !c) return;
    this.asis.eliminarRecargo(b, c);
    this.borrar = null;
    this.ui.toast('Registro eliminado');
  }
}
