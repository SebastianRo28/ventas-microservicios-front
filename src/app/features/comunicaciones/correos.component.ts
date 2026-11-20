import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { CorreoAutomatico } from '../../core/sample/sst';
import { UiStateService } from '../../core/ui-state.service';

/** P-12.6 Comunicaciones › Correos automáticos. */
@Component({
  selector: 'app-correos',
  template: `
    <app-page-header title="Correos automáticos" [crumbs]="['Desarrollo Organizacional', 'Comunicaciones']" [askAi]="false"></app-page-header>
    <div class="nx-card nx-dt__scroll">
      <table class="nx-table" aria-label="Correos automáticos">
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Autor</th><th>Estado</th><th>Hora de envío</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of correos">
            <td><b>{{ c.nombre }}</b></td>
            <td>{{ c.tipo }}</td>
            <td>{{ c.autor }}</td>
            <td><span class="nx-badge" [ngClass]="c.activo ? 'nx-tone-success' : 'nx-tone-danger'">{{ c.activo ? 'Activo' : 'Detenido' }}</span></td>
            <td>{{ c.hora }}</td>
            <td class="nx-dt__actions">
              <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="(c.activo ? 'Detener ' : 'Activar ') + c.nombre"
                      [title]="c.activo ? 'Detener' : 'Activar'" (click)="toggle(c)">
                <app-icon [name]="c.activo ? 'pause' : 'play'" [size]="16"></app-icon>
              </button>
              <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Editar ' + c.nombre" title="Editar correo"
                      (click)="ui.toast('El editor de correos llegará en la próxima versión')">
                <app-icon name="edit" [size]="16"></app-icon>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class CorreosComponent {
  correos: CorreoAutomatico[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.correos().subscribe((c) => (this.correos = c));
  }

  toggle(c: CorreoAutomatico): void {
    c.activo = !c.activo;
    this.ui.toast(`“${c.nombre}” ${c.activo ? 'activado' : 'detenido'}`);
  }
}
