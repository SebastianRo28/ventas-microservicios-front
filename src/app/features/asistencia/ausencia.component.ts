import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, diasCalendario } from '../../core/asistencia.service';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { AUSENCIA_CON_GOCE, Ausencia, TIPOS_AUSENCIA, TipoAusencia } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'id', label: 'ID', w: '80px' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 'a', label: 'Área', filter: 'select', w: 'minmax(140px, 0.9fr)' },
  { key: 't', label: 'Tipo', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'de', label: 'Desde', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'ha', label: 'Hasta', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'n', label: 'Días', type: 'number', filter: 'none', w: '80px' },
  { key: 'g', label: 'Remuneración', type: 'badge', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'o', label: 'Observación', w: 'minmax(200px, 1.3fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];

/**
 * Administrativo › Asistencia › Gestión de Ausencia: medical rest, leaves, permissions and absences.
 * Unpaid days are the ones payroll discounts.
 */
@Component({
  selector: 'app-ausencia',
  template: `
    <app-page-header title="Gestión de Ausencia" [crumbs]="['Administrativo', 'Asistencia']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Ausencias en {{ mesLabel }}</span><b>{{ stats.mes }}</b></div>
      <div class="nx-card nx-stat"><span>Días con goce en {{ mesLabel }}</span><b>{{ stats.conGoce }}</b></div>
      <div class="nx-card nx-stat"><span>Días a descontar en {{ mesLabel }}</span><b>{{ stats.sinGoce }}</b></div>
      <div class="nx-card nx-stat"><span>Ausentes al {{ asis.corte }}</span><b>{{ stats.hoy }}</b></div>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" createLabel="Registrar ausencia" [rowActions]="actions" [selectable]="false"
                    [showBulk]="false" [showAdvancedFilter]="false" tableLabel="Ausencias" minWidth="1500px" exportName="ausencias"
                    emptyTitle="No hay ausencias registradas" (create)="abrir()" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="modal as m" title="Registrar ausencia" width="620px" (closed)="modal = null">
      <form id="aus-form" class="nx-form" (ngSubmit)="guardar()">
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [(ngModel)]="m.colaboradorId">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option>
          </select>
        </label>
        <label class="nx-field">Tipo de ausencia*
          <select class="nx-select" name="tipo" [(ngModel)]="m.tipo"><option *ngFor="let t of tipos">{{ t }}</option></select>
          <span class="nx-hint">{{ goce[m.tipo] ? 'Con goce de haber: no se descuenta en remuneraciones.' : 'Sin goce de haber: se descuenta en el proceso de remuneraciones.' }}</span>
        </label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Desde*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="desde" placeholder="DD/MM/YYYY" [(ngModel)]="m.desde"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Hasta*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="hasta" placeholder="DD/MM/YYYY" [(ngModel)]="m.hasta"><app-icon name="calendar" [size]="16"></app-icon></span></label>
        </div>
        <span class="nx-hint">Días calendario: <b>{{ dias }}</b></span>
        <span *ngIf="m.tipo === 'Descanso médico'" class="nx-hint">Desde el día 21 de descanso médico en el año, EsSalud paga el subsidio por incapacidad temporal.
          Si recibiste el certificado electrónico, regístralo en <a routerLink="/admin/asistencia/licencias" (click)="modal = null">Licencias Médicas Electrónicas</a>.</span>
        <label class="nx-field">Observación<input class="nx-input" name="observacion" placeholder="Opcional" [(ngModel)]="m.observacion"></label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = null">Cancelar</button>
        <button type="submit" form="aus-form" class="nx-btn nx-btn--primary">Registrar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar as b" title="Eliminar ausencia" width="480px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará la ausencia #{{ b.id }} ({{ b.tipo }}, {{ b.dias }} días).</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class AusenciaComponent implements OnDestroy {
  readonly cols = COLS;
  readonly tipos = TIPOS_AUSENCIA;
  readonly goce = AUSENCIA_CON_GOCE;
  readonly actions: RowAction[] = ['eliminar'];
  rows: Row[] = [];
  colaboradores: Colaborador[] = [];
  stats = { mes: 0, conGoce: 0, sinGoce: 0, hoy: 0 };
  readonly mesLabel: string;
  modal: { colaboradorId: number | null; tipo: TipoAusencia; desde: string; hasta: string; observacion: string } | null = null;
  borrar: Ausencia | null = null;
  intento = false;
  private sub: Subscription;

  constructor(data: HrDataService, public asis: AsistenciaService, private ui: UiStateService) {
    this.mesLabel = parseFecha(asis.corte)!.toLocaleDateString('es-PE', { month: 'long' }).toLowerCase();
    this.sub = combineLatest([data.colaboradores(), asis.ausencias$]).subscribe(([cs, as]) => {
      this.colaboradores = cs;
      this.refrescar(as);
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }

  /** Days of [desde, hasta] that fall inside the cut-off month. */
  private diasEnMes(x: Ausencia): number {
    const corte = parseFecha(this.asis.corte)!;
    const ini = new Date(corte.getFullYear(), corte.getMonth(), 1), fin = new Date(corte.getFullYear(), corte.getMonth() + 1, 0);
    const d = parseFecha(x.desde)!, h = parseFecha(x.hasta)!;
    const a = d > ini ? d : ini, b = h < fin ? h : fin;
    return a <= b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1 : 0;
  }

  private refrescar(as: Ausencia[]): void {
    const corte = parseFecha(this.asis.corte)!;
    const delMes = as.filter((x) => this.diasEnMes(x) > 0);
    this.stats = {
      mes: delMes.length,
      conGoce: delMes.filter((x) => AUSENCIA_CON_GOCE[x.tipo]).reduce((s, x) => s + this.diasEnMes(x), 0),
      sinGoce: delMes.filter((x) => !AUSENCIA_CON_GOCE[x.tipo]).reduce((s, x) => s + this.diasEnMes(x), 0),
      hoy: as.filter((x) => parseFecha(x.desde)! <= corte && parseFecha(x.hasta)! >= corte).length,
    };
    this.rows = [...as].sort((a, b) => parseFecha(b.desde)!.getTime() - parseFecha(a.desde)!.getTime()).map((x) => {
      const c = this.col(x.colaboradorId);
      return {
        id: x.id, c: c ? { text: `${c.apellidos}, ${c.nombres}`, link: `/admin/colaboradores/ficha/${c.id}` } : '—', a: c?.area ?? '—',
        t: x.tipo, de: x.desde, ha: x.hasta, n: x.dias,
        g: AUSENCIA_CON_GOCE[x.tipo] ? { text: 'Con goce', tone: 'success' } : { text: 'Sin goce', tone: 'danger' },
        o: x.observacion || '—', x: '',
      };
    });
  }

  abrir(): void { this.intento = false; this.modal = { colaboradorId: null, tipo: 'Descanso médico', desde: '', hasta: '', observacion: '' }; }
  get dias(): number { return this.modal ? diasCalendario(this.modal.desde.trim(), this.modal.hasta.trim()) : 0; }
  get error(): string {
    const m = this.modal;
    if (!m || m.colaboradorId == null) return 'Selecciona un colaborador.';
    const d = parseFecha(m.desde.trim()), h = parseFecha(m.hasta.trim());
    if (!d || !h) return 'Usa el formato DD/MM/YYYY en las fechas.';
    if (d > h) return 'La fecha “Desde” debe ser anterior o igual a “Hasta”.';
    return this.asis.conflicto(+m.colaboradorId, m.desde.trim(), m.hasta.trim());
  }

  guardar(): void {
    this.intento = true;
    const m = this.modal, c = m?.colaboradorId != null ? this.col(+m.colaboradorId) : undefined;
    if (!m || !c || this.error) return;
    const x = this.asis.registrarAusencia(c, m.tipo, m.desde.trim(), m.hasta.trim(), m.observacion.trim());
    this.modal = null;
    this.ui.toast(`Ausencia #${x.id} registrada (${x.dias} ${x.dias === 1 ? 'día' : 'días'})`);
  }

  onAction(action: RowAction, row: Row): void {
    if (action === 'eliminar') this.borrar = this.asis.ausencias$.value.find((x) => x.id === row.id) ?? null;
  }
  confirmarBorrar(): void {
    const b = this.borrar, c = b && this.col(b.colaboradorId);
    if (!b || !c) return;
    this.asis.eliminarAusencia(b, c);
    this.borrar = null;
    this.ui.toast(`Ausencia #${b.id} eliminada`);
  }
}
