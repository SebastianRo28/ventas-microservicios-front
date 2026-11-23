import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConsolaService, LoginConsola, errorConsola } from './consola.service';

/** P-SA.0 Platform login: Nexo RH team only, second factor mandatory (enrolled on the first sign-in). */
@Component({
  selector: 'app-consola-login',
  template: `
    <main class="cx-login">
      <div class="cx-login__card">
        <div class="cx-login__marca"><span class="cx-nav__logo">N</span><span><b>Nexo RH</b><small>Consola de plataforma · {{ host }}</small></span></div>

        <form *ngIf="!paso" (ngSubmit)="entrar()" novalidate class="nx-acceso__form">
          <h1 class="cx-login__titulo">Iniciar sesión</h1>
          <label class="nx-field">Correo corporativo
            <input class="nx-input" name="correo" type="email" autocomplete="username" placeholder="nombre@nexorh.pe" [(ngModel)]="correo" [disabled]="enviando">
          </label>
          <label class="nx-field">Contraseña
            <input class="nx-input" name="password" type="password" autocomplete="current-password" [(ngModel)]="password" [disabled]="enviando">
          </label>
          <div *ngIf="error" class="cx-alerta" role="alert"><app-icon name="alert" [size]="16"></app-icon>{{ error }}</div>
          <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">{{ enviando ? 'Verificando…' : 'Continuar' }}</button>
        </form>

        <form *ngIf="paso" (ngSubmit)="verificar()" novalidate class="nx-acceso__form">
          <button type="button" class="nx-link-btn" (click)="volver()"><app-icon name="chevron-left" [size]="15"></app-icon> Volver</button>
          <h1 class="cx-login__titulo">{{ paso.enrolar ? 'Configura el doble factor' : 'Verificación en dos pasos' }}</h1>
          <ng-container *ngIf="paso.enrolar">
            <p class="nx-muted nx-mt-0">Es tu primer ingreso. Agrega esta clave en tu app de autenticación (Google Authenticator, Microsoft Authenticator, 1Password…) y escribe el código que muestra.</p>
            <div class="nx-clave-totp"><code>{{ agrupar(paso.clave) }}</code></div>
            <a *ngIf="paso.uri" class="nx-link-btn" [href]="paso.uri">Abrir en la app de autenticación</a>
          </ng-container>
          <p *ngIf="!paso.enrolar" class="nx-muted nx-mt-0">Ingresa el código de 6 dígitos de tu app autenticadora para <b>{{ correo }}</b>. El segundo factor es obligatorio para todo el equipo de plataforma.</p>
          <label class="nx-field">Código de verificación
            <input class="nx-input nx-acceso__codigo" name="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" [(ngModel)]="codigo" [disabled]="enviando" [class.is-invalid]="error">
          </label>
          <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
          <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">{{ enviando ? 'Verificando…' : 'Verificar e ingresar' }}</button>
          <span class="nx-hint" style="text-align: center">¿Perdiste tu dispositivo? Escribe a seguridad&#64;nexorh.pe; no hay recuperación por correo.</span>
        </form>
      </div>
      <p class="cx-login__pie"><app-icon name="lock" [size]="13"></app-icon> Acceso exclusivo para el equipo de Nexo RH. Cada inicio de sesión y acción queda registrada en la auditoría de plataforma.</p>
    </main>
  `
})
export class ConsolaLoginComponent {
  readonly host = location.host;
  correo = '';
  password = '';
  codigo = '';
  enviando = false;
  error = '';
  /** In memory only (never in storage). */
  paso: LoginConsola | null = null;
  private readonly vuelta: string;

  constructor(private c: ConsolaService, private router: Router, route: ActivatedRoute) {
    this.vuelta = route.snapshot.queryParamMap.get('vuelta') || '/consola/dashboard';
    if (c.autenticado) router.navigateByUrl(this.vuelta);
  }

  agrupar(k: string | null): string { return (k ?? '').replace(/(.{4})/g, '$1 ').trim(); }

  entrar(): void {
    this.error = '';
    if (!this.correo.trim() || !this.password) { this.error = 'Ingresa tu correo y tu contraseña.'; return; }
    this.enviando = true;
    this.c.login(this.correo.trim(), this.password).subscribe({
      next: (r) => { this.enviando = false; this.password = ''; this.paso = r; this.codigo = ''; },
      error: (e: HttpErrorResponse) => { this.enviando = false; this.error = e.status === 429 ? 'Demasiados intentos. Espera un minuto.' : errorConsola(e); },
    });
  }

  verificar(): void {
    this.error = '';
    const c = this.codigo.replace(/\D/g, '');
    if (c.length !== 6 || !this.paso) { this.error = 'Ingresa los 6 dígitos del código.'; return; }
    this.enviando = true;
    this.c.verificar(this.paso.mfaToken, c).subscribe({
      next: () => this.router.navigateByUrl(this.vuelta),
      error: (e: HttpErrorResponse) => {
        this.enviando = false;
        if (e.status === 410) { this.volver(); this.error = 'El paso de verificación expiró. Vuelve a iniciar sesión.'; return; }
        this.error = errorConsola(e);
      },
    });
  }

  volver(): void { this.paso = null; this.codigo = ''; this.error = ''; }
}
