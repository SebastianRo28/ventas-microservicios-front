import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, InicioDobleFactor, mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';

/**
 * Two-factor authentication of the signed-in user (outside the app layout): set up an authenticator app (TOTP) or turn
 * it off. Required before using the app when the company's policy demands it.
 */
@Component({
  selector: 'app-doble-factor',
  template: `
    <main class="nx-login">
      <section class="nx-card nx-login__card" aria-labelledby="df-title">
        <div class="nx-logo nx-login__logo"><b>Nexo</b><span>RH</span></div>
        <h1 id="df-title" class="nx-login__title">Doble factor</h1>

        <ng-container *ngIf="!activo; else yaActivo">
          <div *ngIf="obligatorio" class="nx-banner nx-banner--compact" role="status">
            <app-icon name="shield" [size]="17"></app-icon><span>Tu empresa exige el doble factor para tu perfil. Configúralo para continuar.</span>
          </div>
          <p class="nx-muted nx-mt-0">Además de tu contraseña, te pediremos un código de 6 dígitos de una app de autenticación
            (Google Authenticator, Microsoft Authenticator, 1Password…).</p>

          <button *ngIf="!clave" type="button" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="trabajando" (click)="iniciar()">
            {{ trabajando ? 'Generando…' : 'Configurar app de autenticación' }}</button>

          <form *ngIf="clave" class="nx-acceso__form" (ngSubmit)="confirmar()" novalidate>
            <ol class="nx-login__reglas">
              <li>En tu app, elige <b>Agregar cuenta</b> e ingresa esta clave (o abre el enlace desde tu teléfono).</li>
              <li>Escribe el código de 6 dígitos que muestra la app.</li>
            </ol>
            <div class="nx-clave-totp">
              <code>{{ claveAgrupada }}</code>
              <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Copiar clave" (click)="copiar()"><app-icon name="copy" [size]="16"></app-icon></button>
            </div>
            <span *ngIf="copiada" class="nx-muted" role="status">Clave copiada.</span>
            <a class="nx-link-btn" [href]="clave.uri">Abrir en la app de autenticación</a>
            <label class="nx-field">Código de la app
              <input class="nx-input nx-acceso__codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" [(ngModel)]="codigo" [disabled]="trabajando">
            </label>
            <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
            <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="trabajando">{{ trabajando ? 'Verificando…' : 'Activar doble factor' }}</button>
          </form>
          <span *ngIf="error && !clave" class="nx-error" role="alert">{{ error }}</span>
        </ng-container>

        <ng-template #yaActivo>
          <div class="nx-banner nx-banner--compact" role="status"><app-icon name="checkcircle" [size]="17"></app-icon><span>El doble factor está activo en tu cuenta.</span></div>
          <form class="nx-acceso__form" (ngSubmit)="desactivar()" novalidate>
            <p class="nx-muted nx-mt-0">Para desactivarlo, confirma tu contraseña. Tu empresa puede exigirlo según tu perfil.</p>
            <label class="nx-field">Contraseña
              <input class="nx-input" name="password" type="password" autocomplete="current-password" [(ngModel)]="password" [disabled]="trabajando">
            </label>
            <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
            <button type="submit" class="nx-btn nx-btn--outline nx-btn--block" [disabled]="trabajando">Desactivar doble factor</button>
          </form>
        </ng-template>

        <button *ngIf="!obligatorio" type="button" class="nx-btn nx-btn--outline nx-btn--block" (click)="volver()">{{ activo ? 'Volver' : 'Cancelar' }}</button>
        <button *ngIf="obligatorio" type="button" class="nx-link-btn" (click)="salir()">Cerrar sesión</button>
      </section>
    </main>
  `
})
export class DobleFactorComponent {
  clave: InicioDobleFactor | null = null;
  codigo = '';
  password = '';
  trabajando = false;
  copiada = false;
  error = '';
  private readonly vuelta: string;

  constructor(private auth: AuthService, private data: HrDataService, private router: Router, route: ActivatedRoute) {
    const v = route.snapshot.queryParamMap.get('vuelta') ?? '';
    this.vuelta = v.startsWith('/') && !/^\/(login|cambiar-password|seguridad)/.test(v) ? v : auth.inicio;
  }

  get activo(): boolean { return !!this.auth.usuario?.dobleFactor; }
  get obligatorio(): boolean { return this.auth.debeActivarDobleFactor; }
  get claveAgrupada(): string { return (this.clave?.clave ?? '').replace(/(.{4})/g, '$1 ').trim(); }

  iniciar(): void {
    this.error = '';
    this.trabajando = true;
    this.auth.iniciarDobleFactor().subscribe({
      next: (c) => { this.trabajando = false; this.clave = c; },
      error: (e) => { this.trabajando = false; this.error = mensajeError(e); },
    });
  }

  confirmar(): void {
    this.error = '';
    const c = this.codigo.replace(/\D/g, '');
    if (c.length !== 6) { this.error = 'Ingresa los 6 dígitos del código.'; return; }
    this.trabajando = true;
    this.auth.confirmarDobleFactor(c).subscribe({
      next: () => { this.clave = null; this.codigo = ''; this.data.cargar().subscribe({ complete: () => this.router.navigateByUrl(this.vuelta) }); },
      error: (e) => { this.trabajando = false; this.error = mensajeError(e); },
    });
  }

  desactivar(): void {
    this.error = '';
    if (!this.password) { this.error = 'Ingresa tu contraseña.'; return; }
    this.trabajando = true;
    this.auth.desactivarDobleFactor(this.password).subscribe({
      next: () => { this.trabajando = false; this.password = ''; },
      error: (e) => { this.trabajando = false; this.error = mensajeError(e); },
    });
  }

  copiar(): void {
    navigator.clipboard?.writeText(this.clave?.clave ?? '').then(() => { this.copiada = true; setTimeout(() => this.copiada = false, 2000); }, () => {});
  }

  volver(): void { this.router.navigateByUrl(this.vuelta); }
  salir(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
