import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { ParametrosRemService } from '../../core/parametros-rem.service';
import { Colaborador } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const DIAS_MES = 30;

const COLS: Column[] = [
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 'cg', label: 'Cargo', w: 'minmax(160px, 1fr)' },
  { key: 't', label: 'Remuneración', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'b', label: 'Base mensual', type: 'money', filter: 'none', w: 'minmax(120px, 0.8fr)' },
  { key: 'vd', label: 'Valor día', type: 'money', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'vh', label: 'Valor hora', type: 'money', filter: 'none', w: 'minmax(100px, 0.7fr)' },
  { key: 'sg', label: 'Días sin goce', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'dp', label: 'Días pagados', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'm', label: 'Monto del período', type: 'money', filter: 'none', w: 'minmax(140px, 0.9fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];

/**
 * Administrativo › Asistencia › Sueldos Diarios: daily and hourly value of each collaborator and the days
 * payroll pays this period (30-day month minus unpaid absences from Gestión de Ausencia).
 */
@Component({
  selector: 'app-sueldos-diarios',
  template: `
    <app-page-header title="Sueldos Diarios" [crumbs]="['Administrativo', 'Asistencia']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Colaboradores con jornal diario</span><b>{{ stats.diarios }}</b></div>
      <div class="nx-card nx-stat"><span>Días sin goce en {{ periodo }}</span><b>{{ stats.sinGoce }}</b></div>
      <div class="nx-card nx-stat"><span>Descuento por días sin goce</span><b>{{ stats.descuento }}</b></div>
      <div class="nx-card nx-stat"><span>Total del período</span><b>{{ stats.total }}</b></div>
    </div>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Período {{ periodo }}: mes de 30 días. El valor día es la base mensual ÷ 30 (o el jornal) y el valor hora usa una jornada de
        {{ asis.config.horasJornada }} horas. Los días sin goce vienen de <a routerLink="/admin/asistencia/ausencia">Gestión de Ausencia</a>.</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="actions" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Sueldos diarios" minWidth="1500px" exportName="sueldos-diarios" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="editar as e" [title]="'Tipo de remuneración · ' + e.c.nombres + ' ' + e.c.apellidos.split(' ')[0]" width="520px" (closed)="editar = null">
      <form id="jornal-form" class="nx-form" (ngSubmit)="guardar()">
        <div class="nx-segmented" role="radiogroup" aria-label="Tipo de remuneración">
          <button type="button" role="radio" [attr.aria-checked]="!e.diario" [class.is-on]="!e.diario" (click)="e.diario = false">Mensual</button>
          <button type="button" role="radio" [attr.aria-checked]="e.diario" [class.is-on]="e.diario" (click)="e.diario = true">Diario (jornal)</button>
        </div>
        <p *ngIf="!e.diario" class="nx-muted nx-mt-0">Valor día = base mensual {{ fmt(asis.base(e.c)) }} ÷ 30 = {{ fmt(asis.base(e.c) / 30) }}.</p>
        <label *ngIf="e.diario" class="nx-field">Jornal diario (S/)*
          <input class="nx-input" name="jornal" inputmode="decimal" placeholder="0.00" [(ngModel)]="e.jornal" [class.is-invalid]="intento && !!error">
          <span class="nx-hint">Mínimo {{ fmt(minimo) }} (RMV {{ fmt(rmv) }} ÷ 30).</span>
        </label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="editar = null">Cancelar</button>
        <button type="submit" form="jornal-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>
  `
})
export class SueldosDiariosComponent implements OnDestroy {
  readonly cols = COLS;
  readonly actions: RowAction[] = ['editar'];
  /** A daily wage cannot be below RMV / 30 (Tablas de parámetros). */
  get rmv(): number { return this.params.rmv; }
  get minimo(): number { return this.params.jornalMinimo; }
  readonly periodo: string;
  rows: Row[] = [];
  stats = { diarios: 0, sinGoce: 0, descuento: '', total: '' };
  editar: { c: Colaborador; diario: boolean; jornal: string } | null = null;
  intento = false;
  private colaboradores: Colaborador[] = [];
  private readonly anio: number;
  private readonly mes: number;
  private sub: Subscription;

  constructor(data: HrDataService, public asis: AsistenciaService, private params: ParametrosRemService, private ui: UiStateService) {
    const corte = parseFecha(asis.corte)!;
    this.anio = corte.getFullYear();
    this.mes = corte.getMonth();
    this.periodo = corte.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toLowerCase();
    this.sub = combineLatest([data.colaboradores(), asis.ausencias$]).subscribe(([cs]) => { this.colaboradores = cs; this.refrescar(); });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  fmt(n: number): string { return soles(Math.round(n * 100) / 100); }

  private refrescar(): void {
    let sinGoce = 0, descuento = 0, total = 0;
    this.rows = this.colaboradores.map((c) => {
      const sg = this.asis.diasSinGoce(c.id, this.anio, this.mes);
      const dp = Math.max(0, DIAS_MES - sg);
      const vd = this.asis.valorDia(c);
      const monto = Math.round(vd * dp * 100) / 100;
      sinGoce += sg; descuento += vd * sg; total += monto;
      return {
        id: c.id, c: { text: `${c.apellidos}, ${c.nombres}`, link: `/admin/colaboradores/ficha/${c.id}` }, cg: c.cargo,
        t: this.asis.esDiario(c) ? { text: 'Diario', tone: 'info' } : { text: 'Mensual', tone: 'neutral' },
        b: this.asis.esDiario(c) ? '—' : soles(this.asis.base(c)), vd: soles(vd), vh: soles(this.asis.valorHora(c)),
        sg, dp, m: soles(monto), x: '',
      };
    });
    this.stats = { diarios: this.colaboradores.filter((c) => this.asis.esDiario(c)).length, sinGoce, descuento: this.fmt(descuento), total: this.fmt(total) };
  }

  onAction(action: RowAction, row: Row): void {
    const c = this.colaboradores.find((x) => x.id === row.id);
    if (action !== 'editar' || !c) return;
    this.intento = false;
    this.editar = { c, diario: this.asis.esDiario(c), jornal: this.asis.esDiario(c) ? this.asis.jornales[c.id].toFixed(2) : (this.asis.base(c) / 30).toFixed(2) };
  }

  get error(): string {
    const e = this.editar;
    if (!e || !e.diario) return '';
    const n = Number(String(e.jornal).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return 'Ingresa un monto válido.';
    if (n < this.minimo) return `El jornal no puede ser menor a ${this.fmt(this.minimo)}.`;
    return '';
  }

  guardar(): void {
    this.intento = true;
    const e = this.editar;
    if (!e || this.error) return;
    const jornal = e.diario ? Math.round(Number(String(e.jornal).replace(',', '.')) * 100) / 100 : null;
    this.asis.cambiarJornal(e.c, jornal);
    this.editar = null;
    this.refrescar();
    this.ui.toast(jornal === null ? `${e.c.nombres} ahora tiene remuneración mensual` : `Jornal de ${e.c.nombres} actualizado a ${this.fmt(jornal)}`);
  }
}
