import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Shown for menu entries whose screen is not built yet. */
@Component({
  selector: 'app-placeholder',
  template: `
    <app-page-header [title]="title" [crumbs]="crumbs"></app-page-header>
    <div class="nx-card nx-empty nx-empty--page">
      <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden="true">
        <path d="M14 22a6 6 0 0 1 6-6h26l9 10h45a6 6 0 0 1 6 6v46a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" style="fill: var(--nx-primary-200)"/>
        <path d="M8 38a6 6 0 0 1 6-6h92a6 6 0 0 1 6 6l-6 40a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" style="fill: var(--nx-primary-700)"/>
        <path d="M44 56h32" style="stroke: var(--nx-on-strong)" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <b>Pantalla en construcción</b>
      <span>Esta sección de Nexo RH todavía no está disponible en esta versión.</span>
      <a class="nx-btn nx-btn--outline" routerLink="/admin/panel">Ir al Panel de Control</a>
    </div>
  `
})
export class PlaceholderComponent {
  title: string;
  crumbs: string[];
  constructor(route: ActivatedRoute) {
    this.title = route.snapshot.data['title'] ?? '';
    this.crumbs = route.snapshot.data['crumbs'] ?? [];
  }
}
