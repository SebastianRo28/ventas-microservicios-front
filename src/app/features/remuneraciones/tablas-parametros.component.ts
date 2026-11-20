import { Component } from '@angular/core';
import { parseFecha, soles } from '../../core/format';
import { ParametrosRemService } from '../../core/parametros-rem.service';
import { ComisionAfp, ParametroGeneral, TramoRenta } from '../../core/sample/parametros-rem';
import { UiStateService } from '../../core/ui-state.service';

type Edicion =
  | { tipo: 'general'; p: ParametroGeneral; valor: string; desde: string }
  | { tipo: 'afp'; a: ComisionAfp; flujo: string; saldo: string }
  | { tipo: 'tramo'; t: TramoRenta; tasa: string };

const num = (s: string) => Number(String(s).replace(',', '.'));

/** Remuneraciones › Tablas de parámetros: legal values payroll uses (RMV, UIT, contributions, AFP, 5th-category tax). */
@Component({
  selector: 'app-tablas-parametros',
  template: `
    <app-page-header title="Tablas de parámetros" [crumbs]="['Remuneraciones']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <div class="nx-banner nx-banner--warning" role="note">
      <app-icon name="alert" [size]="19"></app-icon>
      <span class="nx-grow">Valores de referencia del prototipo. Confírmalos con la fuente oficial (MTPE, SUNAT, SBS) antes de cerrar un proceso de remuneraciones.</span>
    </div>

    <ng-container *ngIf="tab === 0">
      <div class="nx-grid nx-grid--4 nx-mb-16">
        <div class="nx-card nx-stat"><span>RMV</span><b>{{ fmt(params.rmv) }}</b></div>
        <div class="nx-card nx-stat"><span>Asignación familiar</span><b>{{ fmt(params.asignacionFamiliar) }}</b></div>
        <div class="nx-card nx-stat"><span>Jornal mínimo (RMV ÷ 30)</span><b>{{ fmt(params.jornalMinimo) }}</b></div>
        <div class="nx-card nx-stat"><span>Deducción anual 5ta</span><b>{{ fmt(params.valor('deduccionUit') * params.valor('uit')) }}</b></div>
      </div>
      <div class="nx-card nx-dt__scroll">
        <table class="nx-table" aria-label="Parámetros generales">
          <thead><tr><th>Parámetro</th><th class="nx-num">Valor</th><th>Vigente desde</th><th>Fuente</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of params.generales">
              <td><b>{{ p.nombre }}</b></td><td class="nx-num">{{ valorTexto(p) }}</td><td>{{ p.vigenteDesde }}</td><td>{{ p.fuente }}</td>
              <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Editar ' + p.nombre" (click)="editarGeneral(p)"><app-icon name="edit" [size]="16"></app-icon></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </ng-container>

    <div *ngIf="tab === 1" class="nx-card nx-dt__scroll">
      <table class="nx-table" aria-label="Comisiones AFP">
        <thead><tr><th>AFP</th><th class="nx-num">Aporte obligatorio</th><th class="nx-num">Prima de seguro</th><th class="nx-num">Comisión sobre flujo</th><th class="nx-num">Comisión sobre saldo (anual)</th><th class="nx-num">Total sobre flujo</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of params.afp">
            <td><b>{{ a.afp }}</b></td><td class="nx-num">{{ params.valor('afpAportePct') }} %</td><td class="nx-num">{{ params.valor('primaSeguroPct') }} %</td>
            <td class="nx-num">{{ a.comisionFlujoPct }} %</td><td class="nx-num">{{ a.comisionSaldoPct }} %</td>
            <td class="nx-num"><b>{{ totalFlujo(a) }} %</b></td>
            <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Editar ' + a.afp" (click)="editarAfp(a)"><app-icon name="edit" [size]="16"></app-icon></button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <ng-container *ngIf="tab === 2">
      <div class="nx-card nx-dt__scroll">
        <table class="nx-table" aria-label="Tramos de renta de quinta categoría">
          <thead><tr><th>Tramo (renta neta anual)</th><th class="nx-num">Desde</th><th class="nx-num">Hasta</th><th class="nx-num">Tasa</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr *ngFor="let t of params.tramos">
              <td><b>{{ tramoTexto(t) }}</b></td>
              <td class="nx-num">{{ fmt(t.desde * params.valor('uit')) }}</td>
              <td class="nx-num">{{ t.hasta === null ? '—' : fmt(t.hasta * params.valor('uit')) }}</td>
              <td class="nx-num">{{ t.tasaPct }} %</td>
              <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Editar tasa del tramo" (click)="editarTramo(t)"><app-icon name="edit" [size]="16"></app-icon></button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="nx-muted nx-small">Los montos se calculan con la UIT vigente ({{ fmt(params.valor('uit')) }}). La renta neta descuenta {{ params.valor('deduccionUit') }} UIT de la renta bruta anual.</p>
    </ng-container>

    <app-modal *ngIf="edicion as e" [title]="tituloEdicion" width="520px" (closed)="edicion = null">
      <form id="param-form" class="nx-form" (ngSubmit)="guardar()">
        <ng-container *ngIf="e.tipo === 'general'">
          <label class="nx-field">Valor ({{ e.p.unidad }})*<input class="nx-input" name="valor" inputmode="decimal" [(ngModel)]="e.valor"></label>
          <label class="nx-field">Vigente desde*<input class="nx-input" name="desde" placeholder="DD/MM/YYYY" [(ngModel)]="e.desde"></label>
          <span *ngIf="e.p.clave === 'rmv' || e.p.clave === 'asigFamiliarPct'" class="nx-hint">Cambia la asignación familiar y el jornal mínimo que usan Asignación de ítems y Sueldos Diarios.</span>
        </ng-container>
        <ng-container *ngIf="e.tipo === 'afp'">
          <label class="nx-field">Comisión sobre flujo (%)*<input class="nx-input" name="flujo" inputmode="decimal" [(ngModel)]="e.flujo"></label>
          <label class="nx-field">Comisión sobre saldo anual (%)*<input class="nx-input" name="saldo" inputmode="decimal" [(ngModel)]="e.saldo"></label>
        </ng-container>
        <label *ngIf="e.tipo === 'tramo'" class="nx-field">Tasa (%)*<input class="nx-input" name="tasa" inputmode="decimal" [(ngModel)]="e.tasa"></label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="edicion = null">Cancelar</button>
        <button type="submit" form="param-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>
  `
})
export class TablasParametrosComponent {
  readonly tabs = ['Generales', 'AFP', 'Renta de 5ta categoría'];
  tab = 0;
  edicion: Edicion | null = null;
  intento = false;

  constructor(public params: ParametrosRemService, private ui: UiStateService) {}

  fmt(n: number): string { return soles(n); }
  valorTexto(p: ParametroGeneral): string { return p.unidad === 'S/' ? soles(p.valor) : `${p.valor} ${p.unidad}`; }
  totalFlujo(a: ComisionAfp): string {
    return (this.params.valor('afpAportePct') + this.params.valor('primaSeguroPct') + a.comisionFlujoPct).toFixed(2);
  }

  tramoTexto(t: TramoRenta): string {
    return t.hasta === null ? `Más de ${t.desde} UIT` : t.desde === 0 ? `Hasta ${t.hasta} UIT` : `Más de ${t.desde} hasta ${t.hasta} UIT`;
  }

  get tituloEdicion(): string {
    const e = this.edicion;
    return !e ? '' : e.tipo === 'general' ? e.p.nombre : e.tipo === 'afp' ? `Comisiones AFP ${e.a.afp}` : `Tramo: ${this.tramoTexto(e.t).toLowerCase()}`;
  }

  editarGeneral(p: ParametroGeneral): void { this.intento = false; this.edicion = { tipo: 'general', p, valor: String(p.valor), desde: p.vigenteDesde }; }
  editarAfp(a: ComisionAfp): void { this.intento = false; this.edicion = { tipo: 'afp', a, flujo: String(a.comisionFlujoPct), saldo: String(a.comisionSaldoPct) }; }
  editarTramo(t: TramoRenta): void { this.intento = false; this.edicion = { tipo: 'tramo', t, tasa: String(t.tasaPct) }; }

  get error(): string {
    const e = this.edicion;
    if (!e) return '';
    const pct = (s: string, max: number) => { const n = num(s); return Number.isFinite(n) && n >= 0 && n <= max; };
    if (e.tipo === 'general') {
      const n = num(e.valor);
      if (!Number.isFinite(n) || n <= 0) return 'Ingresa un valor mayor a 0.';
      if (e.p.unidad === '%' && n > 100) return 'Un porcentaje no puede superar 100 %.';
      if (!parseFecha(e.desde.trim())) return 'Usa el formato DD/MM/YYYY en la fecha.';
      return '';
    }
    if (e.tipo === 'afp') return pct(e.flujo, 5) && pct(e.saldo, 5) ? '' : 'Las comisiones deben estar entre 0 % y 5 %.';
    return pct(e.tasa, 50) ? '' : 'La tasa debe estar entre 0 % y 50 %.';
  }

  guardar(): void {
    this.intento = true;
    const e = this.edicion;
    if (!e || this.error) return;
    if (e.tipo === 'general') this.params.actualizar(e.p, num(e.valor), e.desde.trim());
    else if (e.tipo === 'afp') this.params.actualizarAfp(e.a, num(e.flujo), num(e.saldo));
    else this.params.actualizarTramo(e.t, num(e.tasa));
    this.ui.toast(`Se actualizó ${this.tituloEdicion}`);
    this.edicion = null;
  }
}
