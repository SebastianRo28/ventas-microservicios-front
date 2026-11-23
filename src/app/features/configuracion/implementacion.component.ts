import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { API_URL } from '../../core/api';
import { mensajeError } from '../../core/auth.service';
import { ContextoService } from '../../core/contexto.service';
import { UiStateService } from '../../core/ui-state.service';

/** ⚙ Administración › Implementación: the checklist page and the "Modo implementación" switch. */
@Component({
  selector: 'app-implementacion',
  template: `
    <app-page-header title="Implementación" [crumbs]="['Administración']" [askAi]="false"></app-page-header>
    <section class="nx-card nx-settings nx-mb-16">
      <label class="nx-switch-row">
        <button type="button" role="switch" class="nx-switch" [class.is-on]="activo" [attr.aria-checked]="activo" aria-label="Modo implementación"
                [disabled]="guardando" (click)="cambiar(!activo)"><span></span></button>
        Modo implementación
      </label>
      <p class="nx-hint nx-mb-0">Mientras esté activo, los administradores ven el checklist en el Panel de Control. Desactívalo después de la puesta en marcha.</p>
    </section>
    <app-checklist-implementacion></app-checklist-implementacion>
  `
})
export class ImplementacionComponent {
  guardando = false;

  constructor(private http: HttpClient, private ctx: ContextoService, private ui: UiStateService) {}

  get activo(): boolean { return !!this.ctx.contexto?.implementacion; }

  cambiar(activo: boolean): void {
    this.guardando = true;
    this.http.put(`${API_URL}/cuenta/implementacion`, { activo }).subscribe({
      next: () => this.ctx.cargar().subscribe(() => { this.guardando = false; this.ui.toast(activo ? 'Modo implementación activado' : 'Modo implementación desactivado'); }),
      error: (e) => { this.guardando = false; this.ui.toast(mensajeError(e)); },
    });
  }
}
