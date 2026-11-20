import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';

/** P-10.5 Headcount › Configuraciones: organizational level used by the headcount plan. */
@Component({
  selector: 'app-hc-config',
  template: `
    <app-page-header title="Configuraciones" [crumbs]="['Administrativo', 'Headcount']" [askAi]="false"></app-page-header>
    <div class="nx-tabs" role="tablist"><button type="button" role="tab" class="nx-tab is-active" aria-selected="true">Áreas</button></div>
    <form class="nx-card nx-settings nx-maxw-720" (ngSubmit)="guardar()">
      <h3 class="nx-settings__title nx-mt-0">Áreas</h3>
      <p class="nx-muted">Definir sobre qué nivel de la estructura organizacional se muestra el detalle de la planificación de headcount.</p>
      <label class="nx-field nx-w-300">Nivel
        <select class="nx-select" name="nivel" [(ngModel)]="nivel">
          <option value="division">Primer nivel (División)</option>
          <option value="area">Segundo nivel (Área)</option>
          <option value="subarea">Tercer nivel (Sub-área)</option>
        </select>
      </label>
      <p class="nx-muted nx-small nx-row nx-row--center nx-mt-16"><app-icon name="lock" [size]="15"></app-icon>Solo lo ven quienes tienen el permiso “Configuración de planificación de headcount”.</p>
      <div><button type="submit" class="nx-btn nx-btn--primary">Guardar</button></div>
    </form>
  `
})
export class HcConfigComponent {
  nivel: HrDataService['hcNivel'];

  constructor(private data: HrDataService, private ui: UiStateService) {
    this.nivel = data.hcNivel;
  }

  guardar(): void {
    this.data.hcNivel = this.nivel;
    this.ui.toast('Nivel de planificación guardado. Headcount ahora se agrupa por ' +
      ({ division: 'división', area: 'área', subarea: 'sub-área' }[this.nivel]));
  }
}
