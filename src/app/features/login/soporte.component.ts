import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AuthService, mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';

/** /soporte?token=… : entry of a Nexo RH support session opened from the provider console (one-time link). */
@Component({
  selector: 'app-soporte-entrada',
  template: `
    <main class="nx-login">
      <section class="nx-card nx-login__card nx-acceso__estado" role="status">
        <app-sello-empresa></app-sello-empresa>
        <ng-container *ngIf="!error"><h1>Abriendo la sesión de soporte…</h1><p>Verificando el enlace de un solo uso.</p></ng-container>
        <ng-container *ngIf="error">
          <span class="nx-acceso__estado-icono nx-acceso__estado-icono--alerta"><app-icon name="alert" [size]="24"></app-icon></span>
          <h1>No se pudo abrir la sesión de soporte</h1><p>{{ error }}</p>
          <a class="nx-link-btn" routerLink="/login">Ir a iniciar sesión</a>
        </ng-container>
      </section>
    </main>
  `
})
export class SoporteEntradaComponent {
  error = '';
  constructor(auth: AuthService, data: HrDataService, router: Router, route: ActivatedRoute) {
    const token = route.snapshot.queryParamMap.get('token');
    if (!token) { this.error = 'El enlace está incompleto.'; return; }
    auth.entrarSoporte(token).subscribe({
      next: () => data.cargar().subscribe({ complete: () => router.navigateByUrl(auth.inicio, { replaceUrl: true }) }),
      error: (e) => this.error = mensajeError(e),
    });
  }
}

/**
 * P-SA.5 SupportBanner: red, cannot be hidden, with the agent, ticket, reason, mode and time left. "Terminar sesión"
 * closes it in the console; when the 60 minutes run out the session ends by itself.
 */
@Component({
  selector: 'app-banner-soporte',
  template: `
    <div *ngIf="auth.soporte as s" class="nx-soporte" role="alert">
      <app-icon name="shield" [size]="18"></app-icon>
      <b>Sesión de soporte · {{ s.modo === 'lectura' ? 'Solo lectura' : 'Escritura con justificación' }}</b>
      <span class="nx-soporte__detalle">{{ s.agente }} (Nexo RH){{ s.ticket ? ' · Ticket ' + s.ticket : '' }} · Motivo: {{ s.motivo }}</span>
      <span class="nx-grow"></span>
      <span class="nx-soporte__reloj"><app-icon name="clock" [size]="15"></app-icon> {{ restante }} restantes</span>
      <button type="button" class="nx-soporte__fin" [disabled]="terminando" (click)="terminar()">Terminar sesión</button>
    </div>
  `
})
export class BannerSoporteComponent implements OnDestroy {
  restante = '';
  terminando = false;
  private readonly sub: Subscription;

  constructor(public auth: AuthService, private router: Router) {
    this.tic();
    this.sub = interval(1000).subscribe(() => this.tic());
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private tic(): void {
    const s = this.auth.soporte;
    if (!s) return;
    const ms = new Date(s.expira).getTime() - Date.now();
    if (ms <= 0) { this.auth.logout(); this.router.navigate(['/login'], { queryParams: { motivo: 'soporte' } }); return; }
    const m = Math.floor(ms / 60000), seg = Math.floor(ms / 1000) % 60;
    this.restante = `${m}:${seg.toString().padStart(2, '0')}`;
  }

  terminar(): void {
    this.terminando = true;
    this.auth.terminarSoporte().subscribe({ complete: () => this.router.navigate(['/login'], { queryParams: { motivo: 'soporte' } }) });
  }
}

