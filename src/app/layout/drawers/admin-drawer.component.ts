import { Component } from '@angular/core';
import { UiStateService } from '../../core/ui-state.service';

interface AdminLink { label: string; icon: string; path: string; pro?: boolean; }

const LINKS: AdminLink[] = [
  { label: 'Parámetros generales', icon: 'gear', path: 'configuracion/parametros' },
  { label: 'Estado de cuenta', icon: 'wallet', path: 'configuracion/estado-de-cuenta' },
  { label: 'Atributos personalizados', icon: 'tag', path: 'configuracion/atributos' },
  { label: 'Recordatorios', icon: 'bell', path: 'configuracion/recordatorios' },
  { label: 'Empresas', icon: 'building', path: 'configuracion/empresas' },
  { label: 'Sindicatos', icon: 'users', path: 'configuracion/sindicatos' },
  { label: 'Cuentas contables', icon: 'book', path: 'configuracion/cuentas-contables' },
  { label: 'Centros de costo', icon: 'coins', path: 'configuracion/centros-de-costo' },
  { label: 'Estructuras contables', icon: 'table', path: 'configuracion/estructuras-contables' },
  { label: 'Usuarios y perfiles', icon: 'user', path: 'configuracion/usuarios' },
  { label: 'Historial de cambios', icon: 'history', path: 'configuracion/historial', pro: true },
  { label: 'Central de Notificaciones', icon: 'megaphone', path: 'configuracion/notificaciones' },
  { label: 'Localidades', icon: 'location', path: 'configuracion/localidades' },
  { label: 'Accesos API', icon: 'key', path: 'configuracion/api', pro: true },
  { label: 'Feriados', icon: 'calendar', path: 'configuracion/feriados' },
];

/** Settings pages reachable from the drawer; routed as placeholders until built. */
export const ADMIN_LINKS = LINKS;

@Component({
  selector: 'app-admin-drawer',
  template: `
    <aside class="nx-drawer" aria-label="Administración" role="dialog" aria-modal="true">
      <div class="nx-drawer__head">
        <h2>Administración</h2>
        <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Cerrar" (click)="ui.closeDrawer()">
          <app-icon name="x"></app-icon>
        </button>
      </div>
      <div class="nx-drawer__search">
        <label class="nx-input-icon">
          <app-icon name="search" [size]="16"></app-icon>
          <input #q aria-label="Buscar en Administración" placeholder="Buscar" (input)="query = q.value">
        </label>
      </div>
      <div class="nx-drawer__body nx-drawer__links">
        <a *ngFor="let l of visible" class="nx-drawer__link" [routerLink]="'/' + l.path" (click)="ui.closeDrawer()">
          <span class="nx-iconbox"><app-icon [name]="l.icon" [size]="18"></app-icon></span>
          <span class="nx-grow">{{ l.label }}</span>
          <span *ngIf="l.pro" class="nx-pro">PRO</span>
          <app-icon class="nx-faint" name="chevron-right" [size]="16"></app-icon>
        </a>
        <p *ngIf="!visible.length" class="nx-muted nx-pad">No hay resultados para “{{ query }}”.</p>
      </div>
    </aside>
  `
})
export class AdminDrawerComponent {
  query = '';
  constructor(public ui: UiStateService) {}

  get visible(): AdminLink[] {
    const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(this.query.trim());
    return LINKS.filter((l) => !q || norm(l.label).includes(q));
  }
}
