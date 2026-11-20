import { Component, HostListener } from '@angular/core';
import { UiStateService } from '../../core/ui-state.service';

/** Hosts the right-hand 420px drawers over a dark scrim. */
@Component({
  selector: 'app-drawers',
  template: `
    <div *ngIf="ui.drawer$ | async as d" class="nx-drawer-host">
      <button type="button" class="nx-scrim" aria-label="Cerrar panel" (click)="ui.closeDrawer()"></button>
      <app-admin-drawer *ngIf="d === 'admin'"></app-admin-drawer>
      <app-pendientes-drawer *ngIf="d === 'pendientes'"></app-pendientes-drawer>
      <app-ai-drawer *ngIf="d === 'ai'"></app-ai-drawer>
    </div>
  `
})
export class DrawersComponent {
  constructor(public ui: UiStateService) {}

  @HostListener('document:keydown.escape')
  onEscape(): void { this.ui.closeDrawer(); }
}
