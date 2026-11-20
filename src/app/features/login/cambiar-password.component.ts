import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';

/**
 * Change password (outside the app layout). Required after an administrator creates the account or resets its
 * password; also reachable from the user menu.
 */
@Component({
  selector: 'app-cambiar-password',
  template: `
    <main class="nx-login">
      <form class="nx-card nx-login__card" (ngSubmit)="guardar()" novalidate aria-labelledby="cp-title">
        <div class="nx-logo nx-login__logo"><b>Nexo</b><span>RH</span></div>
        <h1 id="cp-title" class="nx-login__title">Cambia tu contraseña</h1>
        <div *ngIf="obligatorio" class="nx-banner nx-banner--compact" role="status">
          <app-icon name="info" [size]="17"></app-icon><span>Tu contraseña es temporal. Crea una nueva para continuar.</span>
        </div>
        <p *ngIf="!obligatorio" class="nx-muted nx-mt-0">Al cambiarla se cerrarán tus sesiones en otros navegadores.</p>
        <label class="nx-field">Contraseña actual
          <input class="nx-input" name="actual" type="password" autocomplete="current-password" [(ngModel)]="actual" [disabled]="guardando">
        </label>
        <label class="nx-field">Nueva contraseña
          <input class="nx-input" name="nueva" [type]="ver ? 'text' : 'password'" autocomplete="new-password" [(ngModel)]="nueva" [disabled]="guardando"
                 aria-describedby="cp-reglas">
        </label>
        <ul id="cp-reglas" class="nx-login__reglas">
          <li [class.is-ok]="nueva.length >= 10">Al menos 10 caracteres</li>
          <li [class.is-ok]="tieneLetra && tieneNumero">Letras y números</li>
        </ul>
        <label class="nx-field">Repite la nueva contraseña
          <input class="nx-input" name="repetir" [type]="ver ? 'text' : 'password'" autocomplete="new-password" [(ngModel)]="repetir" [disabled]="guardando">
        </label>
        <label class="nx-check"><input type="checkbox" name="ver" [(ngModel)]="ver"> Mostrar contraseñas</label>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
        <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="guardando">{{ guardando ? 'Guardando…' : 'Cambiar contraseña' }}</button>
        <button *ngIf="!obligatorio" type="button" class="nx-btn nx-btn--outline nx-btn--block" (click)="volver()">Cancelar</button>
        <button *ngIf="obligatorio" type="button" class="nx-link-btn" (click)="salir()">Cerrar sesión</button>
      </form>
    </main>
  `
})
export class CambiarPasswordComponent {
  actual = '';
  nueva = '';
  repetir = '';
  ver = false;
  guardando = false;
  error = '';
  readonly obligatorio: boolean;
  private readonly vuelta: string;

  constructor(private auth: AuthService, private data: HrDataService, private router: Router, route: ActivatedRoute) {
    this.obligatorio = auth.debeCambiarPassword;
    const v = route.snapshot.queryParamMap.get('vuelta') ?? '';
    this.vuelta = v.startsWith('/') && !v.startsWith('/login') && !v.startsWith('/cambiar-password') ? v : auth.inicio;
  }

  get tieneLetra(): boolean { return /\p{L}/u.test(this.nueva); }
  get tieneNumero(): boolean { return /\d/.test(this.nueva); }

  guardar(): void {
    this.error = '';
    if (!this.actual) { this.error = 'Ingresa tu contraseña actual.'; return; }
    if (this.nueva.length < 10 || !this.tieneLetra || !this.tieneNumero) { this.error = 'La nueva contraseña debe tener al menos 10 caracteres y combinar letras y números.'; return; }
    if (this.nueva !== this.repetir) { this.error = 'Las contraseñas nuevas no coinciden.'; return; }
    this.guardando = true;
    this.auth.cambiarPassword(this.actual, this.nueva).subscribe({
      next: () => {
        this.actual = this.nueva = this.repetir = '';
        this.data.cargar().subscribe({ complete: () => this.router.navigateByUrl(this.vuelta) });
      },
      error: (e) => { this.guardando = false; this.error = mensajeError(e); },
    });
  }

  volver(): void { this.router.navigateByUrl(this.vuelta); }
  salir(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
