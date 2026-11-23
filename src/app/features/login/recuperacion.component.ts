import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, InfoToken, mensajeError } from '../../core/auth.service';
import { Entrada, EntradaService, inicialesEmpresa } from '../../core/entrada.service';

/** "¿Olvidaste tu contraseña?" (P-MT.1): sends a one-hour link. The message is the same whether the account exists or not. */
@Component({
  selector: 'app-olvide',
  template: `
    <main class="nx-login">
      <section class="nx-card nx-login__card" aria-labelledby="ol-title">
        <app-sello-empresa></app-sello-empresa>
        <h1 id="ol-title" class="nx-login__title">¿Olvidaste tu contraseña?</h1>
        <ng-container *ngIf="!enviado; else listo">
          <p class="nx-muted nx-mt-0">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva. El enlace vence en 1 hora.</p>
          <form class="nx-acceso__form" (ngSubmit)="enviar()" novalidate>
            <label class="nx-field">Correo
              <input class="nx-input" name="correo" type="email" autocomplete="username" [(ngModel)]="correo" [disabled]="enviando" required>
            </label>
            <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
            <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">{{ enviando ? 'Enviando…' : 'Enviar enlace' }}</button>
          </form>
        </ng-container>
        <ng-template #listo>
          <div class="nx-banner nx-banner--compact" role="status"><app-icon name="checkcircle" [size]="17"></app-icon><span>{{ enviado }}</span></div>
          <p class="nx-muted nx-mt-0">Revisa también tu carpeta de spam. Si no lo recibes en unos minutos, consulta con tu área de RR.HH.</p>
        </ng-template>
        <a class="nx-link-btn" routerLink="/login">Volver a iniciar sesión</a>
      </section>
    </main>
  `
})
export class OlvideComponent {
  readonly entrada$: Observable<Entrada | null>;
  correo: string;
  enviando = false;
  enviado = '';
  error = '';

  constructor(private auth: AuthService, entradas: EntradaService, route: ActivatedRoute) {
    this.entrada$ = entradas.entrada$;
    this.correo = route.snapshot.queryParamMap.get('correo') ?? '';
  }

  ini(nombre: string | undefined): string { return inicialesEmpresa(nombre ?? 'Nexo RH'); }

  enviar(): void {
    this.error = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.correo.trim())) { this.error = 'Ingresa un correo válido.'; return; }
    this.enviando = true;
    this.auth.olvide(this.correo.trim()).subscribe({
      next: (r) => { this.enviando = false; this.enviado = r.mensaje; },
      error: (e: HttpErrorResponse) => { this.enviando = false; this.error = e.status === 429 ? 'Demasiados intentos. Espera un minuto.' : mensajeError(e); },
    });
  }
}

/**
 * Password from an e-mailed link: /restablecer (reset, 1 hour) or /activar ("Activa tu cuenta", 72 hours, also accepts
 * the company's privacy policy). The route data says which one.
 */
@Component({
  selector: 'app-nueva-password',
  template: `
    <main class="nx-login">
      <section class="nx-card nx-login__card" aria-labelledby="np-title">
        <app-sello-empresa></app-sello-empresa>
        <p *ngIf="cargando" class="nx-muted">Verificando el enlace…</p>

        <div *ngIf="invalido" class="nx-acceso__estado" role="alert">
          <span class="nx-acceso__estado-icono nx-acceso__estado-icono--alerta"><app-icon name="alert" [size]="24"></app-icon></span>
          <h1 id="np-title">{{ activacion ? 'La invitación ya no es válida' : 'El enlace ya no es válido' }}</h1>
          <p>{{ invalido }}</p>
          <a *ngIf="!activacion" class="nx-btn nx-btn--primary" routerLink="/olvide">Solicitar un enlace nuevo</a>
          <a class="nx-link-btn" routerLink="/login">Ir a iniciar sesión</a>
        </div>

        <form *ngIf="info" class="nx-acceso__form" (ngSubmit)="guardar()" novalidate>
          <h1 id="np-title" class="nx-login__title">{{ activacion ? 'Activa tu cuenta' : 'Crea una nueva contraseña' }}</h1>
          <p class="nx-muted nx-mt-0">{{ activacion ? 'Hola ' + primerNombre + ', crea tu contraseña para empezar a usar la plataforma de ' + empresa + '.' : 'Cuenta ' + info.correo + '.' }}</p>
          <label class="nx-field">Nueva contraseña
            <input class="nx-input" name="nueva" [type]="ver ? 'text' : 'password'" autocomplete="new-password" [(ngModel)]="nueva" [disabled]="guardando" aria-describedby="np-reglas">
          </label>
          <ul id="np-reglas" class="nx-login__reglas">
            <li [class.is-ok]="nueva.length >= info.passwordMinimo">Al menos {{ info.passwordMinimo }} caracteres</li>
            <li [class.is-ok]="tieneLetra && tieneNumero">Letras y números</li>
          </ul>
          <label class="nx-field">Repite la contraseña
            <input class="nx-input" name="repetir" [type]="ver ? 'text' : 'password'" autocomplete="new-password" [(ngModel)]="repetir" [disabled]="guardando">
          </label>
          <label class="nx-check"><input type="checkbox" name="ver" [(ngModel)]="ver"> Mostrar contraseñas</label>
          <label *ngIf="activacion" class="nx-check">
            <input type="checkbox" name="privacidad" [(ngModel)]="acepta">
            <span>Acepto la <a *ngIf="info.privacidadUrl; else sinUrl" [href]="info.privacidadUrl" target="_blank" rel="noopener">política de privacidad</a><ng-template #sinUrl>política de privacidad</ng-template> de {{ empresa }}.</span>
          </label>
          <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
          <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="guardando">
            {{ guardando ? 'Guardando…' : activacion ? 'Activar mi cuenta' : 'Guardar contraseña' }}</button>
        </form>
      </section>
    </main>
  `
})
export class NuevaPasswordComponent {
  readonly activacion: boolean;
  private readonly token: string;
  info: InfoToken | null = null;
  invalido = '';
  cargando = true;
  empresa = 'Nexo RH';
  nueva = '';
  repetir = '';
  ver = false;
  acepta = false;
  guardando = false;
  error = '';

  constructor(private auth: AuthService, private router: Router, route: ActivatedRoute, entradas: EntradaService) {
    this.activacion = route.snapshot.data['tipo'] === 'Activacion';
    this.token = route.snapshot.queryParamMap.get('token') ?? '';
    entradas.entrada$.subscribe((e) => { if (e?.tenant) this.empresa = e.tenant.nombre; });
    if (!this.token) { this.cargando = false; this.invalido = 'El enlace está incompleto. Ábrelo de nuevo desde el correo.'; return; }
    auth.verToken(this.activacion ? 'Activacion' : 'Restablecer', this.token).subscribe({
      next: (i) => { this.cargando = false; this.info = i; },
      error: (e) => { this.cargando = false; this.invalido = mensajeError(e); },
    });
  }

  get primerNombre(): string { return this.info?.nombre.split(' ')[0] ?? ''; }
  get tieneLetra(): boolean { return /\p{L}/u.test(this.nueva); }
  get tieneNumero(): boolean { return /\d/.test(this.nueva); }
  ini(nombre: string): string { return inicialesEmpresa(nombre); }

  guardar(): void {
    this.error = '';
    const min = this.info?.passwordMinimo ?? 10;
    if (this.nueva.length < min || !this.tieneLetra || !this.tieneNumero) { this.error = `La contraseña debe tener al menos ${min} caracteres y combinar letras y números.`; return; }
    if (this.nueva !== this.repetir) { this.error = 'Las contraseñas no coinciden.'; return; }
    if (this.activacion && !this.acepta) { this.error = 'Acepta la política de privacidad para activar tu cuenta.'; return; }
    this.guardando = true;
    this.auth.nuevaPassword(this.activacion ? 'Activacion' : 'Restablecer', this.token, this.nueva, this.activacion ? this.acepta : undefined).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { motivo: this.activacion ? 'activada' : 'restablecida' }, replaceUrl: true }),
      error: (e) => { this.guardando = false; this.error = mensajeError(e); },
    });
  }
}
