import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, RespuestaLogin, mensajeError } from '../../core/auth.service';
import { Entrada, EntradaService, EntradaTenant, inicialesEmpresa } from '../../core/entrada.service';
import { HrDataService } from '../../core/hr-data.service';
import { MarcaService } from '../../core/marca.service';

/**
 * Sign-in page (outside the app layout). What it shows depends on the host: the company login (P-MT.1) on
 * {slug}.{domain}, the global entry with the account selector on app.{domain}, or "link not found" (P-MT.0).
 * /acceso?codigo=… (link from the account selector) also lands here.
 */
@Component({
  selector: 'app-login',
  template: `
    <main *ngIf="cargando" class="nx-login" aria-busy="true"><span class="nx-muted">Cargando…</span></main>

    <ng-container *ngIf="!cargando" [ngSwitch]="entrada?.tipo">
      <app-entrada-global *ngSwitchCase="'global'"></app-entrada-global>

      <main *ngSwitchCase="'no_encontrado'" class="nx-login">
        <section class="nx-card nx-login__card nx-acceso__estado" aria-labelledby="ne-title">
          <div class="nx-logo nx-login__logo"><b>Nexo</b><span>RH</span></div>
          <span class="nx-acceso__estado-icono nx-acceso__estado-icono--alerta"><app-icon name="alert" [size]="24"></app-icon></span>
          <h1 id="ne-title">Enlace no encontrado</h1>
          <p>No encontramos ninguna empresa con esta dirección. Revisa que esté bien escrita o recibe por correo el enlace de tu empresa.</p>
          <app-buscar-enlace></app-buscar-enlace>
        </section>
      </main>

      <main *ngSwitchCase="'consola'" class="nx-login">
        <section class="nx-card nx-login__card nx-acceso__estado">
          <div class="nx-logo nx-login__logo"><b>Nexo</b><span>RH</span></div>
          <h1>Consola del proveedor</h1>
          <p>La consola de administración de la plataforma estará disponible en una próxima versión.</p>
        </section>
      </main>

      <main *ngSwitchDefault class="nx-acceso">
        <section class="nx-acceso__hero" [class.con-imagen]="!!imagenLogin" [style.background-image]="imagenLogin" aria-hidden="true">
          <div class="nx-acceso__marca">
            <img *ngIf="marcas.marca?.logos?.horizontal as logo; else marcaTexto" class="nx-acceso__marca-logo" [src]="logo" alt="">
            <ng-template #marcaTexto><span class="nx-acceso__sello">{{ iniciales }}</span>{{ tenant?.nombre ?? 'Nexo RH' }}</ng-template>
          </div>
          <p class="nx-acceso__lema">Tu información laboral, tus boletas y tus solicitudes, en un solo lugar.</p>
        </section>

        <section class="nx-acceso__panel">
          <!-- Company suspended or cancelled -->
          <div *ngIf="suspendida; else formularios" class="nx-acceso__form nx-acceso__estado" role="alert">
            <app-sello-empresa></app-sello-empresa>
            <span class="nx-acceso__estado-icono nx-acceso__estado-icono--alerta"><app-icon name="lock" [size]="24"></app-icon></span>
            <h1>La plataforma de tu empresa no está disponible</h1>
            <p *ngIf="tenant?.estado === 'Eliminado'; else pausada">La cuenta de {{ tenant?.nombre ?? 'tu empresa' }} en Nexo RH fue cerrada y sus datos eliminados. Si crees que es un error, contacta a tu área de Recursos Humanos.</p>
            <ng-template #pausada><p>El acceso a {{ tenant?.nombre ?? 'tu empresa' }} está suspendido por el momento. Contacta a tu área de Recursos Humanos.</p></ng-template>
            <p *ngIf="tenant?.ayuda" class="nx-acceso__ayuda">{{ tenant?.ayuda }}</p>
          </div>

          <ng-template #formularios>
            <!-- Step 1: user and password -->
            <form *ngIf="paso === 'credenciales'" class="nx-acceso__form" (ngSubmit)="entrar()" novalidate aria-labelledby="login-title">
              <app-sello-empresa></app-sello-empresa>
              <h1 id="login-title" class="nx-acceso__titulo">{{ tenant?.titulo ?? 'Inicia sesión' }}</h1>
              <p class="nx-acceso__mensaje">{{ tenant?.mensaje ?? 'Ingresa con tu correo corporativo.' }}</p>
              <div *ngIf="aviso" class="nx-banner nx-banner--compact" role="status"><app-icon name="info" [size]="17"></app-icon><span>{{ aviso }}</span></div>
              <label class="nx-field">{{ conDocumento ? 'Correo o N° de documento' : 'Correo' }}
                <input class="nx-input" name="correo" [type]="conDocumento ? 'text' : 'email'" autocomplete="username" [(ngModel)]="correo" [disabled]="enviando" required>
              </label>
              <label class="nx-field">Contraseña
                <span class="nx-input-group">
                  <input class="nx-input" name="password" [type]="ver ? 'text' : 'password'" autocomplete="current-password" [(ngModel)]="password" [disabled]="enviando" required>
                  <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="ver ? 'Ocultar contraseña' : 'Mostrar contraseña'" (click)="ver = !ver">
                    <app-icon [name]="ver ? 'eye-off' : 'eye'" [size]="17"></app-icon></button>
                </span>
              </label>
              <div class="nx-acceso__fila">
                <label class="nx-check"><input type="checkbox" name="recordar" [(ngModel)]="recordar"> Recordarme</label>
                <a class="nx-link-btn" routerLink="/olvide" [queryParams]="correo.includes('@') ? { correo: correo.trim() } : {}">¿Olvidaste tu contraseña?</a>
              </div>
              <div *ngIf="bloqueada" class="nx-banner nx-banner--compact" role="alert"><app-icon name="lock" [size]="17"></app-icon><span>{{ error }}</span></div>
              <span *ngIf="error && !bloqueada" class="nx-error" role="alert">{{ error }}</span>
              <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">{{ enviando ? 'Ingresando…' : 'Iniciar sesión' }}</button>
              <ng-container *ngIf="tenant?.metodos as m">
                <ng-container *ngIf="m.google || m.microsoft || m.saml">
                  <div class="nx-acceso__o">o</div>
                  <div class="nx-acceso__sso">
                    <button *ngIf="m.google" type="button" class="nx-btn nx-btn--outline" (click)="sso()">Google</button>
                    <button *ngIf="m.microsoft" type="button" class="nx-btn nx-btn--outline" (click)="sso()">Microsoft</button>
                    <button *ngIf="m.saml" type="button" class="nx-btn nx-btn--outline" (click)="sso()">SSO</button>
                  </div>
                </ng-container>
              </ng-container>
              <p *ngIf="tenant?.ayuda" class="nx-acceso__ayuda">{{ tenant?.ayuda }}</p>
              <ng-container *ngTemplateOutlet="pie"></ng-container>
            </form>

            <!-- Step 2: authenticator code -->
            <form *ngIf="paso === 'codigo'" class="nx-acceso__form" (ngSubmit)="verificar()" novalidate aria-labelledby="mfa-title">
              <app-sello-empresa></app-sello-empresa>
              <h1 id="mfa-title" class="nx-acceso__titulo">Verificación en dos pasos</h1>
              <p class="nx-acceso__mensaje">Abre tu app de autenticación e ingresa el código de 6 dígitos de {{ tenant?.nombre ?? 'Nexo RH' }}.</p>
              <label class="nx-field">Código
                <input class="nx-input nx-acceso__codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" [(ngModel)]="codigo" [disabled]="enviando" required>
              </label>
              <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
              <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="enviando">{{ enviando ? 'Verificando…' : 'Verificar' }}</button>
              <button type="button" class="nx-link-btn" (click)="volverACredenciales()">Usar otra cuenta</button>
              <p class="nx-acceso__ayuda">¿Perdiste tu teléfono? Pide a un administrador de tu empresa que quite el doble factor de tu cuenta.</p>
            </form>
          </ng-template>
        </section>
      </main>
    </ng-container>

    <ng-template #pie>
      <div class="nx-acceso__pie">
        <span *ngIf="tenant?.poweredBy !== false">Powered by Nexo RH</span>
        <a *ngIf="tenant?.privacidadUrl" [href]="tenant?.privacidadUrl" target="_blank" rel="noopener">Privacidad</a>
      </div>
    </ng-template>
  `
})
export class LoginComponent implements OnDestroy {
  entrada: Entrada | null = null;
  cargando = true;
  paso: 'credenciales' | 'codigo' = 'credenciales';
  correo = '';
  password = '';
  codigo = '';
  recordar = false;
  ver = false;
  enviando = false;
  error = '';
  bloqueada = false;
  suspendidaPorApi = false;
  aviso: string;
  private mfaToken = '';
  private readonly vuelta: string;
  private readonly sub: Subscription;

  constructor(private auth: AuthService, private data: HrDataService, private router: Router, route: ActivatedRoute, entradas: EntradaService,
    public marcas: MarcaService) {
    const q = route.snapshot.queryParamMap;
    this.vuelta = q.get('vuelta') || '/';
    this.aviso = ({
      sesion: 'Tu sesión terminó. Vuelve a ingresar.',
      restablecida: 'Tu contraseña se actualizó. Ingresa con la nueva.',
      activada: 'Tu cuenta está activa. Ingresa con la contraseña que creaste.',
      soporte: 'La sesión de soporte de Nexo RH terminó.',
      eliminada: 'La cuenta de esta empresa fue cerrada y sus datos eliminados.',
    } as Record<string, string>)[q.get('motivo') ?? ''] ?? '';
    this.recordar = auth.recordar;
    const codigoAcceso = q.get('codigo');
    if (auth.autenticado && !codigoAcceso) { this.continuar(); }
    this.sub = entradas.entrada$.subscribe((e) => {
      if (e?.tipo === 'consola') { this.router.navigateByUrl('/consola'); return; }
      this.entrada = e;
      this.cargando = false;
      if (codigoAcceso && e?.tipo === 'tenant') this.canjear(codigoAcceso);
    });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get tenant(): EntradaTenant | null { return this.entrada?.tenant ?? null; }
  /** Main image of the login (1000×1000) as CSS background; without one, the brand color with a pattern. */
  get imagenLogin(): string | null { const u = this.marcas.marca?.login.imagen; return u ? 'url("' + u + '")' : null; }
  get iniciales(): string { return inicialesEmpresa(this.tenant?.nombre ?? 'Nexo RH'); }
  get conDocumento(): boolean { return !!this.tenant?.metodos.documento; }
  get suspendida(): boolean { return this.suspendidaPorApi || ['Suspendido', 'Cancelado', 'Eliminado'].includes(this.tenant?.estado ?? ''); }

  entrar(): void {
    this.limpiar();
    if (!this.correo.trim() || !this.password) { this.error = this.conDocumento ? 'Ingresa tu correo o N° de documento y tu contraseña.' : 'Ingresa tu correo y tu contraseña.'; return; }
    this.enviando = true;
    this.auth.login(this.correo.trim(), this.password, this.recordar).subscribe({ next: (r) => this.resultado(r), error: (e) => this.fallo(e) });
  }

  verificar(): void {
    this.limpiar();
    const c = this.codigo.replace(/\D/g, '');
    if (c.length !== 6) { this.error = 'Ingresa los 6 dígitos del código.'; return; }
    this.enviando = true;
    this.auth.verificarCodigo(this.mfaToken, c).subscribe({ next: (r) => this.resultado(r), error: (e) => this.fallo(e) });
  }

  volverACredenciales(): void { this.limpiar(); this.paso = 'credenciales'; this.codigo = ''; this.mfaToken = ''; }

  /** SSO buttons are prepared for when the providers are connected. */
  sso(): void { this.limpiar(); this.error = 'Este método de acceso aún no está disponible. Ingresa con tu correo y contraseña.'; }

  private canjear(codigo: string): void {
    this.enviando = true;
    this.auth.canjear(codigo).subscribe({
      next: (r) => this.resultado(r),
      error: (e) => { this.fallo(e); this.router.navigate(['/login'], { replaceUrl: true }); },
    });
  }

  private resultado(r: RespuestaLogin): void {
    this.enviando = false;
    this.password = '';
    if (r.mfaRequerido && r.mfaToken) { this.mfaToken = r.mfaToken; this.paso = 'codigo'; this.codigo = ''; return; }
    this.continuar();
  }

  private continuar(): void {
    const paso = this.auth.pasoPendiente;
    if (paso) { this.router.navigate([paso], { queryParams: { vuelta: this.vuelta } }); return; }
    const destino = this.vuelta === '/' || this.vuelta.startsWith('/login') || this.vuelta.startsWith('/acceso') ? this.auth.inicio : this.vuelta;
    this.data.cargar().subscribe({ complete: () => this.router.navigateByUrl(destino) });
  }

  private fallo(e: unknown): void {
    this.enviando = false;
    const err = e as HttpErrorResponse;
    const codigo = (err?.error as { codigo?: string } | null)?.codigo;
    if (codigo === 'tenant_suspended' || codigo === 'tenant_cancelled' || codigo === 'tenant_deleted') { this.suspendidaPorApi = true; return; }
    if (codigo === 'mfa_vencido') this.volverACredenciales();
    this.bloqueada = codigo === 'cuenta_bloqueada';
    this.error = err?.status === 429 ? 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.' : mensajeError(e);
  }

  private limpiar(): void { this.error = ''; this.aviso = ''; this.bloqueada = false; }
}
