import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { ParametrosRemService } from '../../core/parametros-rem.service';
import { ItemsService, periodoNum, vigenteEn } from '../../core/items.service';
import { Colaborador } from '../../core/models';
import { AsignacionItem, CLASE_TONE, TipoItem } from '../../core/sample/items';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 'i', label: 'Ítem', w: 'minmax(220px, 1.5fr)' },
  { key: 'cl', label: 'Clase', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'p', label: 'PLAME', w: '90px' },
  { key: 'm', label: 'Monto', type: 'money', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'v', label: 'Vigencia', w: 'minmax(150px, 0.9fr)' },
  { key: 'o', label: 'Origen', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'ob', label: 'Observación', w: 'minmax(180px, 1.2fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Remuneraciones › Ítems › Asignación de ítems: items each collaborator receives in a period. Sunday surcharges and
 * unpaid absences come from Asistencia and are read-only here.
 */
@Component({
  selector: 'app-asignacion-items',
  template: `
    <app-page-header title="Asignación de ítems" [crumbs]="['Remuneraciones', 'Ítems']"></app-page-header>
    <div class="nx-row nx-row--center nx-mb-16">
      <label class="nx-field nx-field--inline">Período
        <select class="nx-select nx-select--sm" name="periodo" [(ngModel)]="periodo" (ngModelChange)="refrescar()">
          <option *ngFor="let p of periodos" [value]="p.value">{{ p.label }}</option>
        </select>
      </label>
    </div>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Haberes del período</span><b>{{ stats.haberes }}</b></div>
      <div class="nx-card nx-stat"><span>Descuentos del período</span><b>{{ stats.descuentos }}</b></div>
      <div class="nx-card nx-stat"><span>Colaboradores con ítems</span><b>{{ stats.colaboradores }}</b></div>
      <div class="nx-card nx-stat"><span>Calculados desde Asistencia</span><b>{{ stats.automaticos }}</b></div>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" createLabel="Asignar ítem" [rowActions]="actions" [selectable]="false" [showBulk]="false"
                    [showAdvancedFilter]="false" tableLabel="Ítems asignados" minWidth="1500px" [exportName]="'items-' + periodo.replace('/', '-')"
                    emptyTitle="No hay ítems en este período" (create)="abrir()" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="modal as m" title="Asignar ítem" width="620px" (closed)="modal = null">
      <form id="asig-form" class="nx-form" (ngSubmit)="guardar()">
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [(ngModel)]="m.colaboradorId">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option>
          </select>
        </label>
        <label class="nx-field">Ítem*
          <select class="nx-select" name="tipo" [(ngModel)]="m.tipoId" (ngModelChange)="sugerir()">
            <option [ngValue]="null" disabled>Selecciona un ítem</option>
            <option *ngFor="let t of asignables" [ngValue]="t.id">{{ t.codigo }} · {{ t.nombre }} ({{ t.clase }})</option>
          </select>
          <span class="nx-hint">Solo ítems activos y manuales; los automáticos los calcula Nexo RH.</span>
        </label>
        <label class="nx-field">Monto (S/)*<input class="nx-input" name="monto" inputmode="decimal" placeholder="0.00" [(ngModel)]="m.monto"></label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Desde (MM/YYYY)*<input class="nx-input" name="desde" placeholder="03/2026" [(ngModel)]="m.desde"></label>
          <label class="nx-field">Hasta (MM/YYYY)<input class="nx-input" name="hasta" placeholder="Sin fecha de término" [(ngModel)]="m.hasta"></label>
        </div>
        <label class="nx-field">Observación<input class="nx-input" name="observacion" placeholder="Opcional" [(ngModel)]="m.observacion"></label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = null">Cancelar</button>
        <button type="submit" form="asig-form" class="nx-btn nx-btn--primary">Asignar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar as b" title="Quitar ítem" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se quitará “{{ items.tipo(b.tipoId)?.nombre }}” ({{ fmt(b.monto) }}) de todos los períodos de su vigencia.</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Quitar</button>
      </ng-container>
    </app-modal>
  `
})
export class AsignacionItemsComponent implements OnDestroy {
  readonly cols = COLS;
  readonly actions: RowAction[] = ['eliminar'];
  readonly periodos: { value: string; label: string }[];
  periodo: string;
  rows: Row[] = [];
  colaboradores: Colaborador[] = [];
  stats = { haberes: '', descuentos: '', colaboradores: 0, automaticos: 0 };
  modal: { colaboradorId: number | null; tipoId: number | null; monto: string; desde: string; hasta: string; observacion: string } | null = null;
  borrar: AsignacionItem | null = null;
  intento = false;
  private tipos: TipoItem[] = [];
  private asignaciones: AsignacionItem[] = [];
  private sub: Subscription;

  constructor(data: HrDataService, public items: ItemsService, private asis: AsistenciaService, private params: ParametrosRemService, private ui: UiStateService) {
    const corte = parseFecha(asis.corte)!;
    const pad = (n: number) => String(n).padStart(2, '0');
    this.periodo = `${pad(corte.getMonth() + 1)}/${corte.getFullYear()}`;
    this.periodos = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(corte.getFullYear(), corte.getMonth() - 3 + i, 1);
      return { value: `${pad(d.getMonth() + 1)}/${d.getFullYear()}`, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` };
    });
    this.sub = combineLatest([data.colaboradores(), items.tipos$, items.asignaciones$, asis.recargos$, asis.ausencias$]).subscribe(([cs, ts, as]) => {
      this.colaboradores = cs;
      this.tipos = ts;
      this.asignaciones = as;
      this.refrescar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  fmt(n: number): string { return soles(n); }
  private col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }
  private byCodigo(codigo: string): TipoItem | undefined { return this.tipos.find((t) => t.codigo === codigo); }
  get asignables(): TipoItem[] { return this.tipos.filter((t) => t.activo && !t.automatico && t.clase !== 'Aporte empleador'); }

  /** Read-only rows computed from Asistencia for the selected period. */
  private automaticos(): { c: Colaborador; t: TipoItem; monto: number; ob: string }[] {
    const [mm, yyyy] = this.periodo.split('/').map(Number);
    const out: { c: Colaborador; t: TipoItem; monto: number; ob: string }[] = [];
    const rec = this.byCodigo('REC-DOM'), ina = this.byCodigo('DSC-INA');
    for (const c of this.colaboradores) {
      const rs = this.asis.recargos$.value.filter((r) => { const d = parseFecha(r.fecha)!; return r.colaboradorId === c.id && d.getMonth() + 1 === mm && d.getFullYear() === yyyy; });
      const monto = rs.reduce((s, r) => s + this.asis.montoRecargo(r, c), 0);
      if (rec?.activo && monto > 0) out.push({ c, t: rec, monto: Math.round(monto * 100) / 100, ob: `${rs.filter((r) => !r.descansoSustitutorio).length} día(s) en Recargo Domingo` });
      const sg = this.asis.diasSinGoce(c.id, yyyy, mm - 1);
      if (ina?.activo && sg > 0) out.push({ c, t: ina, monto: Math.round(sg * this.asis.valorDia(c) * 100) / 100, ob: `${sg} día(s) sin goce en Gestión de Ausencia` });
    }
    return out;
  }

  refrescar(): void {
    const nombre = (c?: Colaborador) => (c ? { text: `${c.apellidos}, ${c.nombres}`, link: `/admin/colaboradores/ficha/${c.id}` } : '—');
    const manuales = this.asignaciones.filter((a) => vigenteEn(a, this.periodo));
    const autos = this.automaticos();
    let haberes = 0, descuentos = 0;
    const suma = (t: TipoItem | undefined, m: number) => { if (t?.clase === 'Haber') haberes += m; else if (t?.clase === 'Descuento') descuentos += m; };
    this.rows = [
      ...manuales.map((a) => {
        const t = this.items.tipo(a.tipoId);
        suma(t, a.monto);
        return {
          id: a.id, c: nombre(this.col(a.colaboradorId)), i: t ? `${t.codigo} · ${t.nombre}` : '—',
          cl: t ? { text: t.clase, tone: CLASE_TONE[t.clase] } : '—', p: t?.plame ?? '—', m: soles(a.monto),
          v: a.hasta === a.desde ? a.desde : `${a.desde} – ${a.hasta || 'indefinido'}`, o: t?.automatico ? 'Datos de KPI' : a.observacion.startsWith('Control de Asistencia') ? 'Control de Asistencia' : 'Manual', ob: a.observacion || '—', x: '',
        };
      }),
      ...autos.map((r, i) => {
        suma(r.t, r.monto);
        return {
          id: `auto-${i}`, c: nombre(r.c), i: `${r.t.codigo} · ${r.t.nombre}`, cl: { text: r.t.clase, tone: CLASE_TONE[r.t.clase] }, p: r.t.plame,
          m: soles(r.monto), v: this.periodo, o: 'Asistencia', ob: r.ob, x: '',
        };
      }),
    ];
    this.stats = {
      haberes: soles(Math.round(haberes * 100) / 100), descuentos: soles(Math.round(descuentos * 100) / 100),
      colaboradores: new Set([...manuales.map((a) => a.colaboradorId), ...autos.map((r) => r.c.id)]).size, automaticos: autos.length,
    };
  }

  abrir(): void {
    this.intento = false;
    this.modal = { colaboradorId: null, tipoId: null, monto: '', desde: this.periodo, hasta: '', observacion: '' };
  }
  sugerir(): void {
    const m = this.modal;
    if (m && this.items.tipo(Number(m.tipoId))?.codigo === 'ASI-FAM') { m.monto = this.params.asignacionFamiliar.toFixed(2); m.hasta = ''; }
  }

  get error(): string {
    const m = this.modal;
    if (!m || m.colaboradorId == null || m.tipoId == null) return 'Selecciona el colaborador y el ítem.';
    const monto = Number(String(m.monto).replace(',', '.'));
    if (!Number.isFinite(monto) || monto <= 0) return 'Ingresa un monto mayor a 0.';
    const d = periodoNum(m.desde), h = m.hasta.trim() ? periodoNum(m.hasta) : Infinity;
    if (Number.isNaN(d) || Number.isNaN(h)) return 'Usa el formato MM/YYYY en los períodos.';
    if (h < d) return 'El período “Hasta” debe ser igual o posterior a “Desde”.';
    const choque = this.asignaciones.find((a) => a.colaboradorId === +m.colaboradorId! && a.tipoId === +m.tipoId! &&
      periodoNum(a.desde) <= h && (a.hasta ? periodoNum(a.hasta) : Infinity) >= d);
    if (choque) return `Ya tiene este ítem asignado desde ${choque.desde}${choque.hasta ? ' hasta ' + choque.hasta : ''}.`;
    const t = this.items.tipo(+m.tipoId);
    if (t?.codigo === 'ASI-FAM' && monto !== this.params.asignacionFamiliar) return `La asignación familiar es ${soles(this.params.asignacionFamiliar)} (${this.params.valor('asigFamiliarPct')} % de la RMV).`;
    return '';
  }

  guardar(): void {
    this.intento = true;
    const m = this.modal, c = m?.colaboradorId != null ? this.col(+m.colaboradorId) : undefined;
    if (!m || !c || m.tipoId == null || this.error) return;
    const a = this.items.asignar(c, { tipoId: +m.tipoId, monto: Math.round(Number(String(m.monto).replace(',', '.')) * 100) / 100,
      desde: m.desde.trim(), hasta: m.hasta.trim(), observacion: m.observacion.trim() });
    this.modal = null;
    if (!vigenteEn(a, this.periodo)) this.periodo = this.periodos.find((p) => p.value === a.desde)?.value ?? this.periodo;
    this.refrescar();
    this.ui.toast(`${this.items.tipo(a.tipoId)?.nombre} asignado a ${c.nombres} ${c.apellidos.split(' ')[0]}`);
  }

  onAction(action: RowAction, row: Row): void {
    if (action !== 'eliminar') return;
    if (String(row.id).startsWith('auto-')) { this.ui.toast('Este ítem se calcula desde Asistencia; modifícalo allí'); return; }
    const a = this.asignaciones.find((x) => x.id === row.id);
    if (a && this.items.tipo(a.tipoId)?.automatico) { this.ui.toast('Este bono se envía desde Datos de KPI; corrígelo allí y reenvía'); return; }
    if (a?.observacion.startsWith('Control de Asistencia')) { this.ui.toast('Estas horas extras vienen de Control de Asistencia › Aprobación de Horas Extras; corrígelas allí'); return; }
    this.borrar = a ?? null;
  }
  confirmarBorrar(): void {
    const b = this.borrar, c = b && this.col(b.colaboradorId);
    if (!b || !c) return;
    this.items.quitar(b, c);
    this.borrar = null;
    this.ui.toast('Ítem quitado');
  }
}
