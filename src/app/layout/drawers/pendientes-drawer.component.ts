import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Pendiente } from '../../core/models';
import { PendientesService } from '../../core/pendientes.service';
import { UiStateService } from '../../core/ui-state.service';

type Filtro = 'all' | Pendiente['tipo'];

/** "Mis pendientes": what is actually pending for the signed-in user (PendientesService). */
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
        <span class="nx-muted nx-small">Pendientes ({{ items.length }})</span>
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
        <div *ngIf="!visibles.length" class="nx-empty nx-empty--compact"><b>No tienes pendientes</b><span class="nx-muted">Todo al día.</span></div>
      </div>
    </aside>
  `
})
export class PendientesDrawerComponent implements OnDestroy {
  readonly chips: [Filtro, string][] = [
    ['all', 'Todas'], ['aus', 'Solicitud de Ausentismo'], ['vac', 'Solicitud de Vacaciones'], ['sst', 'SST'], ['eva', 'Evaluaciones'], ['otro', 'Otras solicitudes']
  ];
  filtro: Filtro = 'all';
  items: Pendiente[] = [];
  private sub: Subscription;

  constructor(public ui: UiStateService, pendientes: PendientesService) {
    this.sub = pendientes.items$().subscribe((l) => (this.items = l));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get visibles(): Pendiente[] {
    return this.items.filter((p) => this.filtro === 'all' || p.tipo === this.filtro);
  }
}
