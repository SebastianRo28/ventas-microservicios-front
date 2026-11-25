import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { KpiService } from '../../core/kpi.service';
import { Colaborador } from '../../core/models';
import { SentidoKpi, TipoKpi, UnidadKpi } from '../../core/sample/kpi';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'cd', label: 'Código', w: 'minmax(100px, 0.6fr)' },
  { key: 'n', label: 'Nombre', w: 'minmax(220px, 1.5fr)' },
  { key: 's', label: 'Sentido', filter: 'select', w: 'minmax(130px, 0.8fr)' },
  { key: 'mt', label: 'Meta', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'b', label: 'Bono al 100 %', type: 'money', filter: 'none', w: 'minmax(120px, 0.8fr)' },
  { key: 'r', label: 'Paga entre', w: 'minmax(120px, 0.8fr)' },
  { key: 'c', label: 'Colaboradores', type: 'number', filter: 'none', w: 'minmax(120px, 0.7fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(100px, 0.6fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '140px' },
];

interface Form {
  id: number | null; codigo: string; nombre: string; unidad: UnidadKpi; sentido: SentidoKpi;
  meta: string; bono: string; umbralPct: string; topePct: string; activo: boolean; colaboradores: Set<number>;
}
const num = (s: string) => Number(String(s).replace(',', '.'));

/** Remuneraciones › KPI › Tipos de KPI: indicators that pay a variable bonus and who is measured by each. */
@Component({
  selector: 'app-tipos-kpi',
  template: `
    <app-page-header title="Tipos de KPI" [crumbs]="['Remuneraciones', 'KPI']"></app-page-header>
    <div class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">El bono es 0 si el cumplimiento está bajo el umbral; sobre el umbral se paga bono × cumplimiento, hasta el tope.
        Los bonos se envían desde <a routerLink="/rem/kpi/datos">Datos de KPI</a> al ítem BON-KPI.</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" createLabel="Crear KPI" [rowActions]="actions" [selectable]="false" [showBulk]="false"
                    [showAdvancedFilter]="false" tableLabel="Tipos de KPI" minWidth="1300px" exportName="tipos-de-kpi"
                    (create)="abrir(null)" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="form as f" [title]="f.id === null ? 'Crear KPI' : 'Editar KPI'" width="700px" (closed)="form = null">
      <form id="kpi-form" class="nx-form" (ngSubmit)="guardar()">
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Código*<input class="nx-input" name="codigo" maxlength="10" placeholder="Ej. VTA-MEN" [(ngModel)]="f.codigo"></label>
          <label class="nx-field">Nombre*<input class="nx-input" name="nombre" placeholder="Ej. Ventas mensuales" [(ngModel)]="f.nombre"></label>
          <label class="nx-field">Unidad<select class="nx-select" name="unidad" [(ngModel)]="f.unidad"><option>%</option><option>S/</option><option>Unidades</option></select></label>
          <label class="nx-field">Sentido<select class="nx-select" name="sentido" [(ngModel)]="f.sentido"><option>Mayor es mejor</option><option>Menor es mejor</option></select></label>
          <label class="nx-field">Meta*<input class="nx-input" name="meta" inputmode="decimal" [(ngModel)]="f.meta"></label>
          <label class="nx-field">Bono al 100 % (S/)*<input class="nx-input" name="bono" inputmode="decimal" [(ngModel)]="f.bono"></label>
          <label class="nx-field">Umbral mínimo (%)*<input class="nx-input" name="umbral" inputmode="decimal" [(ngModel)]="f.umbralPct"></label>
          <label class="nx-field">Tope (%)*<input class="nx-input" name="tope" inputmode="decimal" [(ngModel)]="f.topePct"></label>
        </div>
        <span class="nx-field-label nx-mb-0">Colaboradores medidos ({{ f.colaboradores.size }})</span>
        <div class="nx-kpi-people">
          <label *ngFor="let c of colaboradores" class="nx-check nx-check--plain">
            <input type="checkbox" [checked]="f.colaboradores.has(c.id)" (change)="toggle(f, c.id)">{{ c.apellidos }}, {{ c.nombres }}
          </label>
        </div>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="form = null">Cancelar</button>
        <button type="submit" form="kpi-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar as b" title="Eliminar KPI" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará “{{ b.nombre }}” ({{ b.codigo }}).</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class TiposKpiComponent implements OnDestroy {
  readonly cols = COLS;
  readonly actions: RowAction[] = ['editar', 'pausa', 'eliminar'];
  rows: Row[] = [];
  colaboradores: Colaborador[] = [];
  form: Form | null = null;
  borrar: TipoKpi | null = null;
  intento = false;
  private tipos: TipoKpi[] = [];
  private sub: Subscription;

  constructor(data: HrDataService, private kpi: KpiService, private ui: UiStateService) {
    this.sub = combineLatest([data.colaboradores(), kpi.tipos$]).subscribe(([cs, ts]) => {
      this.colaboradores = cs;
      this.tipos = ts;
      this.rows = ts.map((t) => ({
        id: t.id, cd: t.codigo, n: t.nombre, s: t.sentido, mt: t.unidad === 'S/' ? soles(t.meta) : `${t.meta}${t.unidad === '%' ? ' %' : ''}`,
        b: soles(t.bono), r: `${t.umbralPct} % – ${t.topePct} %`, c: t.colaboradores.length,
        e: t.activo ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'gray' }, x: '',
      }));
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  abrir(t: TipoKpi | null): void {
    this.intento = false;
    this.form = t
      ? { ...t, meta: String(t.meta), bono: String(t.bono), umbralPct: String(t.umbralPct), topePct: String(t.topePct), colaboradores: new Set(t.colaboradores) }
      : { id: null, codigo: '', nombre: '', unidad: '%', sentido: 'Mayor es mejor', meta: '', bono: '', umbralPct: '80', topePct: '120', activo: true, colaboradores: new Set() };
  }
  toggle(f: Form, id: number): void { f.colaboradores.has(id) ? f.colaboradores.delete(id) : f.colaboradores.add(id); }

  get error(): string {
    const f = this.form;
    if (!f) return '';
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo || !f.nombre.trim()) return 'Completa el código y el nombre.';
    if (!/^[A-Z0-9-]{2,10}$/.test(codigo)) return 'El código usa letras, números y guiones (2 a 10 caracteres).';
    if (this.tipos.some((t) => t.id !== f.id && t.codigo === codigo)) return `Ya existe un KPI con el código ${codigo}.`;
    const meta = num(f.meta), bono = num(f.bono), umbral = num(f.umbralPct), tope = num(f.topePct);
    if (!(meta > 0)) return 'La meta debe ser mayor a 0.';
    if (!(bono >= 0) || !Number.isFinite(bono)) return 'Ingresa un bono válido.';
    if (!(umbral >= 0 && umbral <= 100)) return 'El umbral debe estar entre 0 % y 100 %.';
    if (!(tope >= 100 && tope <= 200)) return 'El tope debe estar entre 100 % y 200 %.';
    if (!f.colaboradores.size) return 'Selecciona al menos un colaborador.';
    return '';
  }

  guardar(): void {
    this.intento = true;
    const f = this.form;
    if (!f || this.error) return;
    const codigo = f.codigo.trim().toUpperCase();
    this.kpi.guardarTipo({
      id: f.id, codigo: f.codigo.trim().toUpperCase(), nombre: f.nombre.trim(), unidad: f.unidad, sentido: f.sentido, meta: num(f.meta),
      bono: num(f.bono), umbralPct: num(f.umbralPct), topePct: num(f.topePct), activo: f.activo, colaboradores: [...f.colaboradores],
    });
    this.form = null;
    this.ui.toast(f.id === null ? `KPI ${codigo} creado` : `KPI ${codigo} actualizado`);
  }

  onAction(action: RowAction, row: Row): void {
    const t = this.tipos.find((x) => x.id === row.id);
    if (!t) return;
    if (action === 'editar') this.abrir(t);
    else if (action === 'pausa') { this.kpi.toggleTipo(t); this.ui.toast(!t.activo ? `${t.nombre} activado` : `${t.nombre} desactivado: no paga bono`); }
    else if (action === 'eliminar') {
      if (this.kpi.usos(t.id)) this.ui.toast(`No se puede eliminar: tiene ${this.kpi.usos(t.id)} datos cargados. Desactívalo en su lugar`);
      else this.borrar = t;
    }
  }
  confirmarBorrar(): void {
    const b = this.borrar;
    if (!b) return;
    this.kpi.eliminarTipo(b);
    this.borrar = null;
    this.ui.toast(`KPI ${b.codigo} eliminado`);
  }
}
