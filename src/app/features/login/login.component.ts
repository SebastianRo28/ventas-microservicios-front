import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';

/** Sign-in page (outside the app layout). */
@Component({
  selector: 'app-login',
  template: `
    <main class="nx-login">
      <form class="nx-card nx-login__card" (ngSubmit)="entrar()" novalidate aria-labelledby="login-title">
        <div class="nx-logo nx-login__logo"><b>Nexo</b><span>RH</span></div>
        <h1 id="login-title" class="nx-login__title">Inicia sesión</h1>
        <p class="nx-muted nx-mt-0">Ingresa con tu correo corporativo.</p>
        <div *ngIf="aviso" class="nx-banner nx-banner--compact" role="status"><app-icon name="info" [size]="17"></app-icon><span>{{ aviso }}</span></div>
        <label class="nx-field">Correo
          <input class="nx-input" name="correo" type="email" autocomplete="username" [(ngModel)]="correo" [disabled]="cargando" required>
        </label>
        <label class="nx-field">Contraseña
          <span class="nx-input-group">
            <input class="nx-input" name="password" [type]="ver ? 'text' : 'password'" autocomplete="current-password" [(ngModel)]="password" [disabled]="cargando" required>
            <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="ver ? 'Ocultar contraseña' : 'Mostrar contraseña'" (click)="ver = !ver">
              <app-icon [name]="ver ? 'eye-off' : 'eye'" [size]="17"></app-icon></button>
          </span>
        </label>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
        <button type="submit" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="cargando">{{ cargando ? 'Ingresando…' : 'Ingresar' }}</button>
      </form>
    </main>
  `
})
export class LoginComponent {
  correo = '';
  password = '';
  ver = false;
  cargando = false;
  error = '';
  aviso: string;
  private readonly vuelta: string;

  constructor(private auth: AuthService, private data: HrDataService, private router: Router, route: ActivatedRoute) {
    const q = route.snapshot.queryParamMap;
    this.vuelta = q.get('vuelta') || '/';
    this.aviso = q.get('motivo') === 'sesion' ? 'Tu sesión terminó. Vuelve a ingresar.' : '';
    if (auth.autenticado) router.navigateByUrl(auth.debeCambiarPassword ? '/cambiar-password' : this.vuelta);
  }

  entrar(): void {
    this.error = '';
    this.aviso = '';
    if (!this.correo.trim() || !this.password) { this.error = 'Ingresa tu correo y tu contraseña.'; return; }
    this.cargando = true;
    this.auth.login(this.correo.trim(), this.password).subscribe({
      next: () => {
        this.password = '';
        if (this.auth.debeCambiarPassword) { this.router.navigate(['/cambiar-password'], { queryParams: { vuelta: this.vuelta } }); return; }
        this.data.cargar().subscribe({ complete: () => this.router.navigateByUrl(this.vuelta.startsWith('/login') ? '/' : this.vuelta) });
      },
      error: (e) => { this.cargando = false; this.error = mensajeError(e); },
    });
  }
}
