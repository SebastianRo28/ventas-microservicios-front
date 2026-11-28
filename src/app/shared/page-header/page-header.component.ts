import { Component, Input } from '@angular/core';

/** Breadcrumb + page title. Project actions to the right. Nexo AI lives in the floating button, not in each title. */
@Component({
  selector: 'app-page-header',
  template: `
    <nav class="nx-breadcrumb" aria-label="Ruta">
      <ng-container *ngFor="let c of crumbs">{{ c | termino }} <app-icon name="chevron-right" [size]="13"></app-icon> </ng-container>
      <span aria-current="page">{{ title | termino }}</span>
    </nav>
    <div class="nx-page-head">
      <h1>{{ title | termino }}</h1>
      <ng-content select="[header-badge]"></ng-content>
      <div class="nx-grow"></div>
      <ng-content></ng-content>
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() crumbs: string[] = [];
  /** Kept so existing templates that pass [askAi] keep compiling; the chip is gone. */
  @Input() askAi = false;
}
