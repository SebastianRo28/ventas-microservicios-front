import { Component, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { mensajeError } from '../core/auth.service';
import { ContextoService, ModuloBloqueado } from '../core/contexto.service';

/**
 * P-MT.5 "Este módulo no está incluido en tu plan": benefits of the module and "Solicitar información", which creates a
 * lead for the Nexo RH sales team. Opened from a lock in the menu, a blocked route or a 403 module_not_enabled.
 */
@Component({
  selector: 'app-modulo-bloqueado',
  template: `
    <app-modal *ngIf="ctx.bloqueado$ | async as m" [title]="m.proximamente ? 'Próximamente en Nexo RH' : 'Este módulo no está incluido en tu plan'" width="520px" (closed)="cerrar()">
      <div class="nx-bloqueado">
        <span class="nx-bloqueado__icono"><app-icon [name]="m.proximamente ? 'rocket' : 'lock'" [size]="24"></app-icon></span>
        <div>
          <h3 class="nx-bloqueado__titulo">{{ m.nombre }}</h3>
          <p class="nx-muted nx-mt-0">{{ m.descripcion }}</p>
        </div>
      </div>
      <ul *ngIf="m.beneficios.length" class="nx-bloqueado__beneficios">
        <li *ngFor="let b of m.beneficios"><app-icon name="checkcircle" [size]="16"></app-icon>{{ b }}</li>
      </ul>
      <div *ngIf="enviado" class="nx-banner nx-banner--compact" role="status"><app-icon name="checkcircle" [size]="17"></app-icon><span>{{ enviado }}</span></div>
      <label *ngIf="!enviado" class="nx-field">Mensaje (opcional)
        <textarea class="nx-input" rows="2" maxlength="500" [(ngModel)]="mensaje" placeholder="Cuéntanos qué necesitas o cuántos colaboradores lo usarían."></textarea>
      </label>
      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cerrar()">{{ enviado ? 'Cerrar' : 'Ahora no' }}</button>
        <button *ngIf="!enviado" type="button" class="nx-btn nx-btn--primary" [disabled]="enviando" (click)="solicitar(m)">
          {{ enviando ? 'Enviando…' : m.proximamente ? 'Avísame cuando esté disponible' : 'Solicitar información' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class ModuloBloqueadoComponent {
  mensaje = '';
  enviando = false;
  enviado = '';
  error = '';

  constructor(public ctx: ContextoService) {}

  solicitar(m: ModuloBloqueado): void {
    this.enviando = true;
    this.error = '';
    this.ctx.solicitarInformacion(m.codigo ?? m.nombre, this.mensaje.trim()).subscribe({
      next: (r) => { this.enviando = false; this.enviado = r.mensaje; },
      error: (e) => { this.enviando = false; this.error = mensajeError(e); },
    });
  }

  cerrar(): void { this.ctx.bloqueado$.next(null); this.mensaje = ''; this.enviado = ''; this.error = ''; }
}

/** Routes of a module the company has not contracted open the commercial modal instead of the screen. */
export const moduloGuard: CanActivateFn = (route) => {
  const ctx = inject(ContextoService);
  const modulo = route.data['modulo'] as string | undefined;
  if (ctx.modulo(modulo)) return true;
  ctx.mostrarBloqueado(modulo ?? null);
  const router = inject(Router);
  // Typed or bookmarked URL (no previous screen): go to the home page.
  return router.navigated ? false : router.parseUrl('/');
};
