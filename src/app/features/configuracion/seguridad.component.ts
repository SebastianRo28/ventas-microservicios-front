import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { API_URL } from '../../core/api';
import { mensajeError } from '../../core/auth.service';
import { UiStateService } from '../../core/ui-state.service';

interface PoliticaAcceso {
  loginDocumento: boolean; passwordMinimo: number; maxIntentos: number; bloqueoMinutos: number;
  dobleFactor: 'Opcional' | 'Administradores' | 'Obligatorio'; sesionMinutos: number; google: boolean; microsoft: boolean; saml: boolean;
}
interface SeguridadEdicion { acceso: PoliticaAcceso; privacidadUrl: string | null; soporteHasta: string | null; permitidos: { ssoSocial: boolean; saml: boolean }; plan: string; }

/**
 * ⚙ Administración › Seguridad y acceso (P-MT.3): login methods, password policy, two-factor authentication, session
 * length, privacy policy and "Permitir acceso de soporte" for the Nexo RH team (with an expiry date).
 */
@Component({
  selector: 'app-seguridad',
  template: `
    <app-page-header title="Seguridad y acceso" [crumbs]="['Administración']" [askAi]="false"></app-page-header>
    <p *ngIf="!e" class="nx-muted">Cargando…</p>
    <form *ngIf="e && a" class="nx-stack" (ngSubmit)="guardar()">
      <section class="nx-card nx-settings">
        <h3 class="nx-settings__title nx-mt-0">Métodos de inicio de sesión</h3>
        <div class="nx-stack">
          <label class="nx-switch-row"><button type="button" role="switch" class="nx-switch is-on" aria-checked="true" disabled aria-label="Correo y contraseña"><span></span></button>Correo y contraseña <span class="nx-hint">Siempre disponible</span></label>
          <ng-container *ngTemplateOutlet="sw; context: { campo: 'loginDocumento', texto: 'N° de documento y contraseña', ayuda: 'Para operarios sin correo corporativo.', permitido: true }"></ng-container>
          <ng-container *ngTemplateOutlet="sw; context: { campo: 'google', texto: 'Google', ayuda: e.permitidos.ssoSocial ? 'Restringido a los dominios de tu empresa.' : 'Disponible desde el plan Pro.', permitido: e.permitidos.ssoSocial }"></ng-container>
          <ng-container *ngTemplateOutlet="sw; context: { campo: 'microsoft', texto: 'Microsoft', ayuda: e.permitidos.ssoSocial ? 'Restringido a los dominios de tu empresa.' : 'Disponible desde el plan Pro.', permitido: e.permitidos.ssoSocial }"></ng-container>
          <ng-container *ngTemplateOutlet="sw; context: { campo: 'saml', texto: 'SSO de tu empresa (SAML 2.0)', ayuda: e.permitidos.saml ? 'Metadatos del proveedor de identidad.' : 'Disponible en el plan Enterprise.', permitido: e.permitidos.saml }"></ng-container>
          <p class="nx-hint">Google, Microsoft y SAML aparecerán en el login cuando la conexión con el proveedor esté lista. Mientras tanto se ingresa con correo y contraseña.</p>
        </div>
      </section>

      <section class="nx-card nx-settings">
        <h3 class="nx-settings__title nx-mt-0">Contraseñas y bloqueo</h3>
        <div class="nx-form-grid">
          <label class="nx-field">Largo mínimo de la contraseña<input class="nx-input" type="number" name="min" min="8" max="64" [(ngModel)]="a.passwordMinimo" [class.is-invalid]="err('acceso.passwordMinimo')">
            <span class="nx-error" *ngIf="err('acceso.passwordMinimo')">{{ err('acceso.passwordMinimo') }}</span></label>
          <label class="nx-field">Intentos fallidos antes del bloqueo<input class="nx-input" type="number" name="int" min="3" max="20" [(ngModel)]="a.maxIntentos" [class.is-invalid]="err('acceso.maxIntentos')">
            <span class="nx-error" *ngIf="err('acceso.maxIntentos')">{{ err('acceso.maxIntentos') }}</span></label>
          <label class="nx-field">Minutos de bloqueo<input class="nx-input" type="number" name="blo" min="1" max="1440" [(ngModel)]="a.bloqueoMinutos" [class.is-invalid]="err('acceso.bloqueoMinutos')">
            <span class="nx-error" *ngIf="err('acceso.bloqueoMinutos')">{{ err('acceso.bloqueoMinutos') }}</span></label>
        </div>
      </section>

      <section class="nx-card nx-settings">
        <h3 class="nx-settings__title nx-mt-0">Doble factor y sesión</h3>
        <div class="nx-form-grid">
          <label class="nx-field">Doble factor (app de autenticación)
            <select class="nx-select" name="df" [(ngModel)]="a.dobleFactor">
              <option value="Opcional">Opcional: cada persona decide</option>
              <option value="Administradores">Obligatorio para administradores</option>
              <option value="Obligatorio">Obligatorio para todos</option>
            </select>
            <span class="nx-hint">Quien no lo tenga configurado deberá hacerlo al ingresar.</span>
          </label>
          <label class="nx-field">Duración de la sesión
            <select class="nx-select" name="ses" [(ngModel)]="a.sesionMinutos">
              <option *ngFor="let m of sesiones" [ngValue]="m">{{ m < 60 ? m + ' minutos' : m / 60 + (m === 60 ? ' hora' : ' horas') }}</option>
            </select>
          </label>
        </div>
      </section>

      <section class="nx-card nx-settings">
        <h3 class="nx-settings__title nx-mt-0">Privacidad y acceso de soporte</h3>
        <div class="nx-stack">
          <label class="nx-field">Política de privacidad de tu empresa (URL)
            <input class="nx-input" name="priv" type="url" placeholder="https://tuempresa.pe/privacidad" [(ngModel)]="privacidadUrl" [class.is-invalid]="err('privacidadUrl')">
            <span class="nx-hint">Se muestra en el login y se acepta al activar la cuenta (Ley N° 29733).</span>
            <span class="nx-error" *ngIf="err('privacidadUrl')">{{ err('privacidadUrl') }}</span>
          </label>
          <label class="nx-switch-row">
            <button type="button" role="switch" class="nx-switch" [class.is-on]="soporte" [attr.aria-checked]="soporte" aria-label="Permitir acceso de soporte" (click)="soporte = !soporte"><span></span></button>
            Permitir acceso de soporte
          </label>
          <p class="nx-hint nx-mt-0">El equipo de Nexo RH podrá entrar a tu cuenta en modo lectura para ayudarte. Cada acceso queda en el historial de cambios y se notifica a los administradores.</p>
          <label *ngIf="soporte" class="nx-field nx-seg-dias">Durante
            <select class="nx-select" name="dias" [(ngModel)]="dias"><option *ngFor="let d of [1, 3, 7, 15, 30]" [ngValue]="d">{{ d }} {{ d === 1 ? 'día' : 'días' }}</option></select>
            <span class="nx-error" *ngIf="err('diasSoporte')">{{ err('diasSoporte') }}</span>
          </label>
          <p *ngIf="e.soporteHasta" class="nx-banner nx-banner--compact"><app-icon name="info" [size]="16"></app-icon>
            <span>Acceso de soporte autorizado hasta el {{ e.soporteHasta | date: 'dd/MM/yyyy HH:mm' }}.</span></p>
        </div>
      </section>

      <div class="nx-settings__foot"><button type="submit" class="nx-btn nx-btn--primary" [disabled]="guardando">{{ guardando ? 'Guardando…' : 'Guardar cambios' }}</button></div>
    </form>

    <ng-template #sw let-campo="campo" let-texto="texto" let-ayuda="ayuda" let-permitido="permitido">
      <label class="nx-switch-row" [class.is-disabled]="!permitido">
        <button type="button" role="switch" class="nx-switch" [class.is-on]="$any(a)[campo]" [attr.aria-checked]="$any(a)[campo]" [attr.aria-label]="texto"
                [disabled]="!permitido" (click)="$any(a)[campo] = !$any(a)[campo]"><span></span></button>
        {{ texto }} <span class="nx-hint">{{ ayuda }}</span>
        <span *ngIf="err('acceso.' + campo)" class="nx-error">{{ err('acceso.' + campo) }}</span>
      </label>
    </ng-template>
  `
})
export class SeguridadComponent {
  readonly sesiones = [30, 60, 120, 240, 480, 720, 1440];
  e: SeguridadEdicion | null = null;
  a: PoliticaAcceso | null = null;
  privacidadUrl = '';
  soporte = false;
  dias = 7;
  guardando = false;
  private errores: Record<string, string> = {};

  constructor(private http: HttpClient, private ui: UiStateService) {
    this.http.get<SeguridadEdicion>(`${API_URL}/seguridad`).subscribe({ next: (e) => this.recibir(e), error: (x) => this.ui.toast(mensajeError(x)) });
  }

  private recibir(e: SeguridadEdicion): void {
    this.e = e;
    this.a = { ...e.acceso };
    if (!this.sesiones.includes(this.a.sesionMinutos)) this.sesiones.push(this.a.sesionMinutos);
    this.privacidadUrl = e.privacidadUrl ?? '';
    this.soporte = !!e.soporteHasta;
    this.errores = {};
  }

  err(campo: string): string | undefined { return this.errores[campo]; }

  guardar(): void {
    if (!this.a) return;
    this.guardando = true;
    this.errores = {};
    this.http.put<SeguridadEdicion>(`${API_URL}/seguridad`, {
      acceso: this.a, privacidadUrl: this.privacidadUrl.trim() || null, permitirSoporte: this.soporte, diasSoporte: this.soporte ? this.dias : null,
    }).subscribe({
      next: (e) => { this.guardando = false; this.recibir(e); this.ui.toast('Configuración de seguridad guardada'); },
      error: (x: HttpErrorResponse) => {
        this.guardando = false;
        const errs = (x.error as { errors?: Record<string, string[]> } | null)?.errors;
        if (errs) { this.errores = Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])); this.ui.toast('Revisa los campos marcados.'); }
        else this.ui.toast(mensajeError(x));
      },
    });
  }
}
