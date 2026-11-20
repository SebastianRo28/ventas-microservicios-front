import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Pendiente } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';

type Filtro = 'all' | Pendiente['tipo'];

@Component({
  selector: 'app-pendientes-drawer',
  template: `
    <aside class="nx-drawer" aria-label="Mis pendientes" role="dialog" aria-modal="true">
      <div class="nx-drawer__head">
        <h2>Mis pendientes</h2>
        <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Cerrar" (click)="ui.closeDrawer()">
          <app-icon name="x"></app-icon>
        </button>
      </div>
      <div class="nx-drawer__filters">
        <select class="nx-select nx-select--bold" aria-label="Estado de las tareas">
          <option>Pendientes ({{ items.length }})</option>
          <option>Completadas</option>
        </select>
        <div class="nx-chips">
          <button *ngFor="let c of chips" type="button" class="nx-chip" [class.is-on]="filtro === c[0]"
                  [attr.aria-pressed]="filtro === c[0]" (click)="filtro = c[0]">{{ c[1] }}</button>
        </div>
      </div>
      <div class="nx-drawer__body nx-drawer__feed">
        <article *ngFor="let p of visibles" class="nx-card nx-task">
          <div class="nx-task__top">
            <span class="nx-badge nx-badge--sm" [ngClass]="'nx-tone-' + p.tone">{{ p.etiqueta }}</span>
            <span class="nx-muted nx-small">{{ p.fecha }}</span>
          </div>
          <b>{{ p.titulo }}</b>
          <span class="nx-muted">{{ p.detalle }}</span>
        </article>
      </div>
    </aside>
  `
})
export class PendientesDrawerComponent {
  readonly chips: [Filtro, string][] = [
    ['all', 'Todas'], ['aus', 'Solicitud de Ausentismo'], ['vac', 'Solicitud de Vacaciones'], ['sst', 'SST'], ['eva', 'Evaluaciones']
  ];
  filtro: Filtro = 'all';
  items: Pendiente[] = [];

  constructor(public ui: UiStateService, data: HrDataService) {
    data.pendientes().subscribe((p) => (this.items = p));
  }

  get visibles(): Pendiente[] {
    return this.items.filter((p) => this.filtro === 'all' || p.tipo === this.filtro);
  }
}
