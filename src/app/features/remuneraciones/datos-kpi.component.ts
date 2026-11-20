import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { KpiService } from '../../core/kpi.service';
import { Colaborador } from '../../core/models';
import { TipoKpi } from '../../core/sample/kpi';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 'k', label: 'KPI', filter: 'select', w: 'minmax(220px, 1.4fr)' },
  { key: 'mt', label: 'Meta', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'r', label: 'Real', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'cu', label: 'Cumplimiento', type: 'progress', filter: 'none', w: 'minmax(150px, 1fr)' },
  { key: 'b', label: 'Bono', type: 'money', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Remuneraciones › KPI › Datos de KPI: actual values per period, the bonus they pay, and sending it to payroll items. */
@Component({
  selector: 'app-datos-kpi',
  template: `
    <app-page-header title="Datos de KPI" [crumbs]="['Remuneraciones', 'KPI']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="confirmar = true">
        <app-icon name="upload" [size]="16"></app-icon>{{ enviado ? 'Reenviar bonos' : 'Enviar bonos a ítems' }}</button>
    </app-page-header>
    <div class="nx-row nx-row--center nx-mb-16">
      <label class="nx-field nx-field--inline">Período
        <select class="nx-select nx-select--sm" name="periodo" [(ngModel)]="periodo" (ngModelChange)="refrescar()">
          <option *ngFor="let p of periodos" [value]="p.value">{{ p.label }}</option>
        </select>
      </label>
    </div>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Datos cargados</span><b>{{ stats.cargados }} / {{ stats.total }}</b></div>
      <div class="nx-card nx-stat"><span>Cumplimiento promedio</span><b>{{ stats.promedio }}</b></div>
      <div class="nx-card nx-stat"><span>Bonos a pagar</span><b>{{ stats.bono }}</b></div>
      <div class="nx-card nx-stat"><span>Estado del período</span><b class="nx-stat__text">{{ enviado ? 'Enviado a ítems' : 'Sin enviar' }}</b></div>
    </div>
    <div *ngIf="stats.cargados < stats.total" class="nx-ok-note nx-ok-note--warn nx-mb-14" role="status">
      <app-icon name="alert" [size]="17"></app-icon>Faltan {{ stats.total - stats.cargados }} datos: esos colaboradores no recibirán bono si envías ahora.
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="actions" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Datos de KPI" minWidth="1300px" [exportName]="'datos-kpi-' + periodo.replace('/', '-')"
                    emptyTitle="No hay KPI activos con colaboradores" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="editar as e" [title]="e.k.codigo + ' · ' + e.c.nombres + ' ' + e.c.apellidos.split(' ')[0]" width="500px" (closed)="editar = null">
      <form id="dato-form" class="nx-form" (ngSubmit)="guardar()">
        <p class="nx-mt-0">{{ e.k.nombre }} · meta {{ metaTexto(e.k) }} ({{ e.k.sentido.toLowerCase() }}).</p>
        <label class="nx-field">Valor real ({{ e.k.unidad }})*<input class="nx-input" name="real" inputmode="decimal" [(ngModel)]="e.real"></label>
        <div *ngIf="!errorDato && e.real !== ''" class="nx-ok-note" role="status"><app-icon name="checkcircle" [size]="17"></app-icon>
          Cumplimiento {{ kpi.cumplimiento(e.k, num(e.real)) }} % · bono {{ fmt(kpi.pago(e.k, num(e.real))) }}</div>
        <span *ngIf="intento && errorDato" class="nx-error">{{ errorDato }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="editar = null">Cancelar</button>
        <button type="submit" form="dato-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="confirmar" [title]="(enviado ? 'Reenviar' : 'Enviar') + ' bonos de ' + periodoLabel" width="520px" (closed)="confirmar = false">
      <p class="nx-mt-0">Se asignará el ítem BON-KPI por {{ stats.bono }} en {{ periodoLabel }}.
        <ng-container *ngIf="enviado"> Las asignaciones del envío anterior se reemplazan.</ng-container></p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="confirmar = false">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="enviar()">{{ enviado ? 'Reenviar' : 'Enviar' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class DatosKpiComponent implements OnDestroy {
  readonly cols = COLS;
  readonly actions: RowAction[] = ['editar'];
  readonly periodos: { value: string; label: string }[];
  periodo: string;
  rows: Row[] = [];
  stats = { cargados: 0, total: 0, promedio: '—', bono: '' };
  editar: { k: TipoKpi; c: Colaborador; real: string } | null = null;
  confirmar = false;
  intento = false;
  private colaboradores: Colaborador[] = [];
  private tipos: TipoKpi[] = [];
  private sub: Subscription;

  constructor(data: HrDataService, public kpi: KpiService, asis: AsistenciaService, private ui: UiStateService) {
    const corte = parseFecha(asis.corte)!;
    const pad = (n: number) => String(n).padStart(2, '0');
    this.periodo = `${pad(corte.getMonth() + 1)}/${corte.getFullYear()}`;
    this.periodos = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(corte.getFullYear(), corte.getMonth() - 2 + i, 1);
      return { value: `${pad(d.getMonth() + 1)}/${d.getFullYear()}`, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` };
    });
    this.sub = combineLatest([data.colaboradores(), kpi.tipos$, kpi.datos$]).subscribe(([cs, ts]) => {
      this.colaboradores = cs;
      this.tipos = ts;
      this.refrescar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  num(s: string): number { return Number(String(s).replace(',', '.')); }
  fmt(n: number): string { return soles(n); }
  get enviado(): boolean { return this.kpi.enviados.has(this.periodo); }
  get periodoLabel(): string { return (this.periodos.find((p) => p.value === this.periodo)?.label ?? this.periodo).toLowerCase(); }
  metaTexto(k: TipoKpi, v = k.meta): string { return k.unidad === 'S/' ? soles(v) : `${v}${k.unidad === '%' ? ' %' : ''}`; }

  refrescar(): void {
    const rows: Row[] = [];
    let cargados = 0, suma = 0, bono = 0;
    for (const k of this.tipos.filter((t) => t.activo)) {
      for (const id of k.colaboradores) {
        const c = this.colaboradores.find((x) => x.id === id);
        if (!c) continue;
        const d = this.kpi.dato(k.id, c.id, this.periodo);
        const cu = d ? this.kpi.cumplimiento(k, d.real) : null;
        const pago = d ? this.kpi.pago(k, d.real) : 0;
        if (d) { cargados++; suma += cu!; bono += pago; }
        rows.push({
          id: `${k.id}-${c.id}`, c: { text: `${c.apellidos}, ${c.nombres}`, link: `/admin/colaboradores/ficha/${c.id}` }, k: `${k.codigo} · ${k.nombre}`,
          mt: this.metaTexto(k), r: d ? this.metaTexto(k, d.real) : '—',
          cu: cu === null ? { text: '—', pct: 0 } : { text: `${cu} %`, pct: Math.min(100, cu) },
          b: soles(pago), e: !d ? { text: 'Sin dato', tone: 'warning' } : pago > 0 ? { text: 'Paga bono', tone: 'success' } : { text: 'Bajo umbral', tone: 'gray' }, x: '',
        });
      }
    }
    this.rows = rows;
    this.stats = { cargados, total: rows.length, promedio: cargados ? `${(Math.round((suma / cargados) * 10) / 10)} %` : '—', bono: soles(Math.round(bono * 100) / 100) };
  }

  onAction(action: RowAction, row: Row): void {
    if (action !== 'editar') return;
    const [kid, cid] = String(row.id).split('-').map(Number);
    const k = this.tipos.find((t) => t.id === kid), c = this.colaboradores.find((x) => x.id === cid);
    if (!k || !c) return;
    this.intento = false;
    const d = this.kpi.dato(k.id, c.id, this.periodo);
    this.editar = { k, c, real: d ? String(d.real) : '' };
  }

  get errorDato(): string {
    const e = this.editar;
    if (!e) return '';
    const n = this.num(e.real);
    if (String(e.real).trim() === '' || !Number.isFinite(n) || n < 0) return 'Ingresa un valor numérico mayor o igual a 0.';
    if (e.k.unidad === '%' && n > 100) return 'Un porcentaje no puede superar 100.';
    return '';
  }

  guardar(): void {
    this.intento = true;
    const e = this.editar;
    if (!e || this.errorDato) return;
    this.kpi.guardarDato(e.k, e.c, this.periodo, this.num(e.real));
    this.editar = null;
    this.ui.toast(this.enviado ? 'Dato guardado. Reenvía los bonos para actualizar los ítems' : 'Dato guardado');
  }

  enviar(): void {
    const r = this.kpi.enviar(this.periodo, this.colaboradores);
    this.confirmar = false;
    this.refrescar();
    this.ui.toast(r.personas ? `Bonos enviados: ${r.personas} colaboradores, ${soles(r.total)} en Asignación de ítems` : 'Nadie alcanzó el umbral: no se asignaron bonos');
  }
}
