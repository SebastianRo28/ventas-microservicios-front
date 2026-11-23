import { Component, Input } from '@angular/core';
import { UiStateService } from '../../core/ui-state.service';

/** Breadcrumb + page title + "Pregúntale a Nexo AI" chip. Project actions to the right. */
@Component({
  selector: 'app-page-header',
  template: `
    <nav class="nx-breadcrumb" aria-label="Ruta">
      <ng-container *ngFor="let c of crumbs">{{ c | termino }} <app-icon name="chevron-right" [size]="13"></app-icon> </ng-container>
      <span aria-current="page">{{ title | termino }}</span>
    </nav>
    <div class="nx-page-head">
      <h1>{{ title | termino }}</h1>
      <button *ngIf="askAi" type="button" class="nx-ai-chip" (click)="ui.openDrawer('ai')">
        <app-icon name="sparkle" [size]="15"></app-icon>Pregúntale a Nexo AI
      </button>
      <ng-content select="[header-badge]"></ng-content>
      <div class="nx-grow"></div>
      <ng-content></ng-content>
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() crumbs: string[] = [];
  @Input() askAi = true;
  constructor(public ui: UiStateService) {}
}
