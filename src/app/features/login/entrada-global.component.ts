import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { CuentaEncontrada, EntradaService, inicialesEmpresa } from '../../core/entrada.service';

/**
 * "¿No conoces tu enlace?" (P-MT.0): the person writes their e-mail and receives the links of their companies. The
 * answer on screen is always the same, so it never reveals which accounts exist.
 */
@Component({
  selector: 'app-buscar-enlace',
  template: `
    <div *ngIf="enviado; else formulario" class="nx-banner nx-banner--compact" role="status">
      <app-icon name="checkcircle" [size]="17"></app-icon><span>{{ enviado }}</span>
    </div>
    <ng-template #formulario>
      <form class="nx-acceso__form" (ngSubmit)="enviar()" novalidate>
        <label class="nx-field">Tu correo
          <input class="nx-input" name="correo" type="email" autocomplete="email" [(ngModel)]="correo" [disabled]="enviando" required>
        </label>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
        <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">
          <app-icon name="send" [size]="16"></app-icon>{{ enviando ? 'Enviando…' : 'Enviarme el enlace' }}</button>
      </form>
    </ng-template>
  `
})
export class BuscarEnlaceComponent {
  correo = '';
  enviando = false;
  enviado = '';
  error = '';

  constructor(private entradas: EntradaService) {}

  enviar(): void {
    this.error = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.correo.trim())) { this.error = 'Ingresa un correo válido.'; return; }
    this.enviando = true;
    this.entradas.enviarEnlaces(this.correo.trim()).subscribe({
      next: (r) => { this.enviando = false; this.enviado = r.mensaje; },
      error: (e: HttpErrorResponse) => { this.enviando = false; this.error = e.status === 429 ? 'Demasiados intentos. Espera un minuto.' : mensajeError(e); },
    });
  }
}

/**
 * Global entry app.{domain} (P-MT.0): sign in with e-mail and password and choose the company ("Elige a qué empresa
 * entrar"), or ask for the company link by e-mail.
 */
@Component({
  selector: 'app-entrada-global',
  template: `
    <main class="nx-login">
      <section class="nx-card nx-login__card" aria-labelledby="eg-title">
        <div class="nx-logo nx-login__logo"><b>Nexo</b><span>RH</span></div>

        <ng-container *ngIf="vista === 'login'">
          <h1 id="eg-title" class="nx-login__title">Ingresa a tu empresa</h1>
          <p class="nx-muted nx-mt-0">Si tu empresa usa Nexo RH, ingresa con tu correo y tu contraseña.</p>
          <form class="nx-acceso__form" (ngSubmit)="buscar()" novalidate>
            <label class="nx-field">Correo
              <input class="nx-input" name="correo" type="email" autocomplete="username" [(ngModel)]="correo" [disabled]="enviando" required>
            </label>
            <label class="nx-field">Contraseña
              <input class="nx-input" name="password" type="password" autocomplete="current-password" [(ngModel)]="password" [disabled]="enviando" required>
            </label>
            <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
            <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">{{ enviando ? 'Buscando…' : 'Continuar' }}</button>
          </form>
          <button type="button" class="nx-link-btn" (click)="vista = 'enlace'">¿No conoces tu enlace?</button>
        </ng-container>

        <ng-container *ngIf="vista === 'cuentas'">
          <h1 id="eg-title" class="nx-login__title">Elige a qué empresa entrar</h1>
          <p class="nx-muted nx-mt-0">Tu cuenta está en varias empresas. Cada una tiene su propio enlace y sus propios datos.</p>
          <ul class="nx-cuentas">
            <li *ngFor="let c of cuentas">
              <button type="button" (click)="ir(c)">
                <span class="nx-cuentas__sello" aria-hidden="true">{{ ini(c.nombre) }}</span>
                <span class="nx-cuentas__texto"><b>{{ c.nombre }}</b><small>{{ host(c) }}</small></span>
                <app-icon name="chevron-right" [size]="18"></app-icon>
              </button>
            </li>
          </ul>
          <button type="button" class="nx-link-btn" (click)="volver()">Usar otra cuenta</button>
        </ng-container>

        <ng-container *ngIf="vista === 'enlace'">
          <h1 id="eg-title" class="nx-login__title">¿No conoces tu enlace?</h1>
          <p class="nx-muted nx-mt-0">Escribe tu correo y te enviaremos el enlace de acceso de tu empresa.</p>
          <app-buscar-enlace></app-buscar-enlace>
          <button type="button" class="nx-link-btn" (click)="volver()">Volver</button>
        </ng-container>

        <div class="nx-acceso__pie">Nexo RH · Plataforma de Recursos Humanos</div>
      </section>
    </main>
  `
})
export class EntradaGlobalComponent {
  vista: 'login' | 'cuentas' | 'enlace' = 'login';
  correo = '';
  password = '';
  enviando = false;
  error = '';
  cuentas: CuentaEncontrada[] = [];

  constructor(private entradas: EntradaService) {}

  buscar(): void {
    this.error = '';
    if (!this.correo.trim() || !this.password) { this.error = 'Ingresa tu correo y tu contraseña.'; return; }
    this.enviando = true;
    this.entradas.cuentas(this.correo.trim(), this.password).subscribe({
      next: (c) => {
        this.password = '';
        if (c.length === 1) { this.ir(c[0]); return; }
        this.enviando = false;
        this.cuentas = c;
        this.vista = 'cuentas';
      },
      error: (e: HttpErrorResponse) => { this.enviando = false; this.error = e.status === 429 ? 'Demasiados intentos. Espera un minuto.' : mensajeError(e); },
    });
  }

  /** The one-time link opens the company's own address, where the session is created. */
  ir(c: CuentaEncontrada): void { window.location.assign(c.enlace); }
  volver(): void { this.vista = 'login'; this.error = ''; this.cuentas = []; }
  ini(nombre: string): string { return inicialesEmpresa(nombre); }
  host(c: CuentaEncontrada): string { try { return new URL(c.enlace).host; } catch { return c.slug; } }
}
