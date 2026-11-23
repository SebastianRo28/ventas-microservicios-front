import { Component } from '@angular/core';
import { ConsolaService } from './consola.service';
import { UiStateService } from '../core/ui-state.service';

interface ItemConsola { label: string; icon: string; ruta: string | null; proximamente?: boolean; }

/** ConsolaNav + ConsolaTopbar (design: provider console, fixed Nexo RH theme). */
@Component({
  selector: 'app-consola-layout',
  template: `
    <div class="cx-app">
      <nav class="cx-nav" aria-label="Consola de plataforma">
        <div class="cx-nav__marca"><span class="cx-nav__logo">N</span><span><b>Nexo RH</b><small>Consola de plataforma</small></span></div>
        <ng-container *ngFor="let i of items">
          <a *ngIf="i.ruta; else prox" class="cx-nav__item" [routerLink]="i.ruta" routerLinkActive="is-active" ariaCurrentWhenActive="page">
            <app-icon [name]="i.icon" [size]="18"></app-icon>{{ i.label }}</a>
          <ng-template #prox><span class="cx-nav__item is-prox" aria-disabled="true"><app-icon [name]="i.icon" [size]="18"></app-icon>{{ i.label }}<em>Próx.</em></span></ng-template>
        </ng-container>
        <div class="cx-nav__pie">{{ host }}<br>Tema fijo Nexo RH</div>
      </nav>
      <div class="cx-cuerpo">
        <header class="cx-top">
          <span class="cx-top__entorno" [class.is-dev]="dev">{{ dev ? 'Desarrollo' : 'Producción' }}</span>
          <span class="nx-grow"></span>
          <div class="cx-top__usuario" *ngIf="c.usuario$ | async as u">
            <span class="cx-top__avatar">{{ iniciales(u.nombre) }}</span>
            <span class="cx-top__quien"><b>{{ u.nombre }}</b><small>{{ u.rol }}</small></span>
            <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Cerrar sesión" title="Cerrar sesión" (click)="c.salir()"><app-icon name="logout" [size]="18"></app-icon></button>
          </div>
        </header>
        <main class="cx-main" id="nx-main" tabindex="-1"><router-outlet></router-outlet></main>
        <div *ngIf="ui.toast$ | async as msg" class="nx-toast" role="status"><app-icon name="checkcircle" [size]="18"></app-icon>{{ msg }}</div>
      </div>
    </div>
  `
})
export class ConsolaLayoutComponent {
  readonly items: ItemConsola[] = [
    { label: 'Dashboard', icon: 'gauge', ruta: '/consola/dashboard' },
    { label: 'Tenants', icon: 'building', ruta: '/consola/tenants' },
    { label: 'Planes y precios', icon: 'tag', ruta: '/consola/planes' },
    { label: 'Catálogos globales', icon: 'book', ruta: '/consola/catalogos' },
    { label: 'Novedades', icon: 'megaphone', ruta: '/consola/novedades' },
    { label: 'Feature flags', icon: 'flag', ruta: '/consola/flags' },
    { label: 'Salud', icon: 'trend', ruta: '/consola/salud' },
    { label: 'Equipo', icon: 'users', ruta: null, proximamente: true },
  ];
  readonly host = location.host;
  readonly dev = /localhost/.test(location.hostname);

  constructor(public c: ConsolaService, public ui: UiStateService) {}

  iniciales(n: string): string { return n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase(); }
}
