import { Component } from '@angular/core';
import { AuditService } from '../../core/audit.service';
import { ParametrosRemService } from '../../core/parametros-rem.service';
import { ConfigRem } from '../../core/sample/parametros-rem';
import { UiStateService } from '../../core/ui-state.service';
import { GenericosService } from '../../core/genericos.service';
import { CONFIG_FORMS } from '../../core/sample/config-forms';

/** Remuneraciones › Configuraciones: pay schedule, rounding and how payslips are delivered. */
@Component({
  selector: 'app-rem-config',
  template: `
    <app-page-header title="Configuraciones" [crumbs]="['Remuneraciones']" [askAi]="false"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <form class="nx-card nx-settings nx-maxw-720" (ngSubmit)="guardar()" novalidate>
      <ng-container *ngIf="tab === 0">
        <h3 class="nx-settings__title nx-mt-0">Calendario de pago</h3>
        <label class="nx-field nx-w-300">Periodicidad
          <select class="nx-select" name="periodicidad" [(ngModel)]="f.periodicidad">
            <option>Mensual</option><option value="Quincenal">Quincenal (adelanto + fin de mes)</option>
          </select>
        </label>
        <label class="nx-field nx-w-300 nx-mt-16">Día de pago
          <input class="nx-input" name="diaPago" type="number" min="1" max="31" [(ngModel)]="f.diaPago">
          <span class="nx-hint">Si el mes tiene menos días, se paga el último día del mes.</span>
        </label>
        <ng-container *ngIf="f.periodicidad === 'Quincenal'">
          <label class="nx-field nx-w-300 nx-mt-16">Día del adelanto
            <input class="nx-input" name="diaAdelanto" type="number" min="1" max="28" [(ngModel)]="f.diaAdelanto">
          </label>
          <label class="nx-field nx-w-300 nx-mt-16">Adelanto (% del sueldo)
            <input class="nx-input" name="adelantoPct" type="number" min="10" max="50" [(ngModel)]="f.adelantoPct">
          </label>
        </ng-container>
        <label class="nx-field nx-w-300 nx-mt-16">Redondeo del neto a pagar
          <select class="nx-select" name="redondeo" [(ngModel)]="f.redondeo"><option>Sin redondeo</option><option>Al décimo</option><option>Al entero</option></select>
          <span class="nx-hint">Ejemplo: S/ 2,078.72 → {{ ejemplo }}</span>
        </label>
      </ng-container>
      <ng-container *ngIf="tab === 1">
        <h3 class="nx-settings__title nx-mt-0">Boletas de pago</h3>
        <label *ngFor="let o of opcionesBoleta" class="nx-switch-row nx-mt-12">
          <button type="button" role="switch" class="nx-switch" [class.is-on]="f[o.key]" [attr.aria-checked]="f[o.key]"
                  [attr.aria-label]="o.label" (click)="f[o.key] = !f[o.key]"><span></span></button>{{ o.label }}
        </label>
        <p *ngIf="!f.boletaCorreo && !f.boletaPortal" class="nx-ok-note nx-ok-note--warn nx-mt-16" role="alert">
          <app-icon name="alert" [size]="17"></app-icon>Los colaboradores no recibirán su boleta por ningún medio digital.</p>
      </ng-container>
      <span *ngIf="error" class="nx-error nx-mt-12">{{ error }}</span>
      <div class="nx-settings__foot"><button type="submit" class="nx-btn nx-btn--primary">Guardar</button></div>
    </form>
  `
})
export class RemConfigComponent {
  readonly tabs = ['General', 'Boletas'];
  readonly opcionesBoleta: { key: 'boletaAportes' | 'boletaFirma' | 'boletaCorreo' | 'boletaPortal'; label: string }[] = [
    { key: 'boletaAportes', label: 'Mostrar aportes del empleador (EsSalud) en la boleta' },
    { key: 'boletaFirma', label: 'Firmar boletas digitalmente al cerrar el proceso' },
    { key: 'boletaCorreo', label: 'Enviar la boleta por correo al colaborador' },
    { key: 'boletaPortal', label: 'Publicar la boleta en Mi portal' },
  ];
  tab = 0;
  f: ConfigRem;
  error = '';

  constructor(private gen: GenericosService, private params: ParametrosRemService, private audit: AuditService, private ui: UiStateService) { this.f = { ...params.config }; }

  get ejemplo(): string {
    const n = 2078.72;
    const r = this.f.redondeo === 'Al entero' ? Math.round(n) : this.f.redondeo === 'Al décimo' ? Math.round(n * 10) / 10 : n;
    return 'S/ ' + r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  guardar(): void {
    const entero = (n: unknown, min: number, max: number) => Number.isInteger(Number(n)) && Number(n) >= min && Number(n) <= max;
    this.error = !entero(this.f.diaPago, 1, 31) ? 'El día de pago debe estar entre 1 y 31.'
      : this.f.periodicidad === 'Quincenal' && !entero(this.f.diaAdelanto, 1, 28) ? 'El día del adelanto debe estar entre 1 y 28.'
      : this.f.periodicidad === 'Quincenal' && Number(this.f.diaAdelanto) >= Number(this.f.diaPago) ? 'El adelanto debe pagarse antes del día de pago.'
      : this.f.periodicidad === 'Quincenal' && !entero(this.f.adelantoPct, 10, 50) ? 'El adelanto debe estar entre 10 % y 50 %.' : '';
    if (this.error) { this.tab = 0; return; }
    const cambios = this.gen.guardarConfig(CONFIG_FORMS['remuneraciones'], 'Configuración de remuneraciones',
      { ...this.f, diaPago: Number(this.f.diaPago), diaAdelanto: Number(this.f.diaAdelanto), adelantoPct: Number(this.f.adelantoPct) });
    this.ui.toast(cambios.length ? 'Configuración de remuneraciones guardada' : 'No hay cambios que guardar');
  }
}
