import { HttpClient } from '@angular/common/http';
import { Component, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../core/api';
import { AuthService, mensajeError } from '../../core/auth.service';
import { ContextoService } from '../../core/contexto.service';

/** "Descargar todos mis datos": ZIP with one CSV per table (opens in Excel) and the stored files. */
@Injectable({ providedIn: 'root' })
export class ExportacionService {
  constructor(private http: HttpClient) {}

  descargar(): Observable<void> {
    return this.http.get(`${API_URL}/exportacion`, { responseType: 'blob', observe: 'response' }).pipe(
      tap((r) => {
        const nombre = /filename="?([^";]+)"?/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'nexo-rh-datos.zip';
        const url = URL.createObjectURL(r.body!);
        Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
      map(() => undefined));
  }
}

interface ResumenCuenta { estado: string; facturas: { numero: string; periodo: string; total: number; estado: string; vence: string }[]; }

/**
 * Suspended account (spec. 8): only administrators get here, with the account status, the pending invoices and the
 * full data download. Collaborators see "platform not available" on the sign-in page.
 */
@Component({
  selector: 'app-cuenta-suspendida',
  template: `
    <main class="nx-login">
      <section class="nx-card nx-login__card nx-suspendida" aria-labelledby="cs-title">
        <app-sello-empresa></app-sello-empresa>
        <span class="nx-acceso__estado-icono nx-acceso__estado-icono--alerta"><app-icon name="lock" [size]="24"></app-icon></span>
        <h1 id="cs-title" class="nx-login__title">Cuenta suspendida</h1>
        <p class="nx-muted nx-mt-0">La plataforma de {{ empresa }} está suspendida{{ motivo ? ': ' + motivo.toLowerCase() : '' }}. Los colaboradores no pueden ingresar hasta que se regularice. No se borró ningún dato.</p>
        <div *ngIf="pendientes.length" class="nx-suspendida__facturas">
          <b>Facturas pendientes</b>
          <div *ngFor="let f of pendientes" class="nx-fieldrow"><span>{{ f.numero }} · vence {{ f.vence }}</span><span>S/ {{ f.total | number: '1.2-2' }} <small class="nx-muted">{{ f.estado }}</small></span></div>
          <div class="nx-fieldrow"><b>Total</b><b>S/ {{ total | number: '1.2-2' }}</b></div>
        </div>
        <p class="nx-hint">Para reactivar el servicio, paga las facturas pendientes o contrata un plan: escribe a tu ejecutivo de cuenta o a ventas&#64;nexorh.pe.</p>
        <button type="button" class="nx-btn nx-btn--primary nx-btn--block" [disabled]="descargando" (click)="descargar()">
          <app-icon name="download" [size]="16"></app-icon>{{ descargando ? 'Preparando el archivo…' : 'Descargar todos mis datos' }}</button>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
        <button type="button" class="nx-link-btn" (click)="salir()">Cerrar sesión</button>
      </section>
    </main>
  `
})
export class CuentaSuspendidaComponent {
  pendientes: ResumenCuenta['facturas'] = [];
  descargando = false;
  error = '';

  constructor(private http: HttpClient, private exportacion: ExportacionService, private auth: AuthService, private ctx: ContextoService, private router: Router) {
    http.get<ResumenCuenta>(`${API_URL}/cuenta`).subscribe({ next: (c) => this.pendientes = c.facturas.filter((f) => f.estado !== 'Pagada'), error: () => { /* the screen works without it */ } });
    // If the account is no longer suspended, go back to the app.
    ctx.cargar().subscribe((c) => { if (c && c.tenant.estado !== 'Suspendido') router.navigateByUrl(auth.inicio); });
  }

  get empresa(): string { return this.ctx.contexto?.tenant.nombre ?? 'tu empresa'; }
  get motivo(): string | null { return this.ctx.contexto?.tenant.motivoSuspension ?? null; }
  get total(): number { return this.pendientes.reduce((a, f) => a + f.total, 0); }

  descargar(): void {
    this.descargando = true;
    this.error = '';
    this.exportacion.descargar().subscribe({ next: () => this.descargando = false, error: (e) => { this.descargando = false; this.error = mensajeError(e); } });
  }

  salir(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
