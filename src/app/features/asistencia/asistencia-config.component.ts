import { Component } from '@angular/core';
import { AsistenciaService } from '../../core/asistencia.service';
import { ConfigAsistencia } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';

/** Administrativo › Asistencia › Configuraciones: rules the other attendance screens apply. */
@Component({
  selector: 'app-asistencia-config',
  template: `
    <app-page-header title="Configuraciones" [crumbs]="['Administrativo', 'Asistencia']" [askAi]="false"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <form class="nx-card nx-settings nx-maxw-720" (ngSubmit)="guardar()" novalidate>
      <ng-container *ngIf="tab === 0">
        <h3 class="nx-settings__title nx-mt-0">Vacaciones</h3>
        <div class="nx-fieldrow"><span>Días por año de servicio</span><span>30 días calendario (D. Leg. 713, no editable)</span></div>
        <label class="nx-field nx-w-300 nx-mt-16">Alertar saldos mayores a (días)
          <input class="nx-input" name="umbral" type="number" min="1" max="120" [(ngModel)]="f.umbralSaldo">
          <span class="nx-hint">Se marcan en rojo en Vacaciones.</span>
        </label>
        <label class="nx-switch-row nx-mt-16">
          <button type="button" role="switch" class="nx-switch" [class.is-on]="f.permitirAdelanto" [attr.aria-checked]="f.permitirAdelanto"
                  aria-label="Permitir adelanto de vacaciones" (click)="f.permitirAdelanto = !f.permitirAdelanto"><span></span></button>
          Permitir adelanto de vacaciones (registrar más días que el saldo, por acuerdo con el colaborador)
        </label>
      </ng-container>
      <ng-container *ngIf="tab === 1">
        <h3 class="nx-settings__title nx-mt-0">Solicitudes</h3>
        <label class="nx-field nx-w-300">Anticipación mínima (días)
          <input class="nx-input" name="anticipacion" type="number" min="0" max="60" [(ngModel)]="f.anticipacionDias">
          <span class="nx-hint">Días antes del inicio en que debe ingresarse una solicitud.</span>
        </label>
      </ng-container>
      <ng-container *ngIf="tab === 2">
        <h3 class="nx-settings__title nx-mt-0">Jornada y recargos</h3>
        <label class="nx-field nx-w-300">Horas de la jornada diaria
          <input class="nx-input" name="horas" type="number" min="1" max="8" [(ngModel)]="f.horasJornada">
          <span class="nx-hint">Se usa para el valor hora (máximo legal: 8 horas diarias).</span>
        </label>
        <label class="nx-field nx-w-300 nx-mt-16">Sobretasa por domingo o feriado trabajado (%)
          <input class="nx-input" name="sobretasa" type="number" min="100" max="300" [(ngModel)]="f.sobretasaDomingo">
          <span class="nx-hint">Mínimo legal 100 % cuando no se otorga descanso sustitutorio.</span>
        </label>
      </ng-container>
      <span *ngIf="error" class="nx-error nx-mt-12">{{ error }}</span>
      <div class="nx-settings__foot"><button type="submit" class="nx-btn nx-btn--primary">Guardar</button></div>
    </form>
  `
})
export class AsistenciaConfigComponent {
  readonly tabs = ['Vacaciones', 'Solicitudes', 'Jornada y recargos'];
  tab = 0;
  f: ConfigAsistencia;
  error = '';

  constructor(private asis: AsistenciaService, private ui: UiStateService) { this.f = { ...asis.config }; }

  private validar(): string {
    const entero = (n: unknown, min: number, max: number) => Number.isInteger(Number(n)) && Number(n) >= min && Number(n) <= max;
    if (!entero(this.f.umbralSaldo, 1, 120)) { this.tab = 0; return 'El umbral de saldo debe ser un entero entre 1 y 120.'; }
    if (!entero(this.f.anticipacionDias, 0, 60)) { this.tab = 1; return 'La anticipación debe ser un entero entre 0 y 60 días.'; }
    if (!entero(this.f.horasJornada, 1, 8)) { this.tab = 2; return 'La jornada debe tener entre 1 y 8 horas.'; }
    if (!entero(this.f.sobretasaDomingo, 100, 300)) { this.tab = 2; return 'La sobretasa debe estar entre 100 % y 300 %.'; }
    return '';
  }

  guardar(): void {
    this.error = this.validar();
    if (this.error) return;
    Object.assign(this.asis.config, {
      umbralSaldo: Number(this.f.umbralSaldo), anticipacionDias: Number(this.f.anticipacionDias),
      horasJornada: Number(this.f.horasJornada), sobretasaDomingo: Number(this.f.sobretasaDomingo), permitirAdelanto: this.f.permitirAdelanto,
    });
    this.ui.toast('Configuración de asistencia guardada');
  }
}
