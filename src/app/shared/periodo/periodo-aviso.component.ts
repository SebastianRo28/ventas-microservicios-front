import { Component } from '@angular/core';
import { PeriodoService, nombreMes } from '../../core/periodo.service';

/**
 * Notice for screens that follow the topbar period: shown only when looking at a period other than the open one,
 * with a link back to it. Screens decide what "read-only" means (e.g. no assigning items in a closed period).
 */
@Component({
  selector: 'app-periodo-aviso',
  template: `
    <div *ngIf="periodo.viendoOtro" class="nx-banner nx-banner--warning nx-banner--compact" role="status">
      <app-icon name="calendar" [size]="18"></app-icon>
      <span class="nx-grow">Estás viendo <b>{{ periodo.etiqueta }}</b>{{ periodo.cerrado() ? ', un período cerrado: sus datos son de solo lectura.' : '.' }}</span>
      <button type="button" class="nx-link-btn" (click)="periodo.volverAlAbierto()">Volver a {{ abierto }}</button>
    </div>
  `
})
export class PeriodoAvisoComponent {
  constructor(public periodo: PeriodoService) {}
  get abierto(): string { return nombreMes(this.periodo.abierto); }
}
