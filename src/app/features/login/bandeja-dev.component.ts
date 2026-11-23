import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { API_URL } from '../../core/api';

interface CorreoBandeja { id: number; para: string; asunto: string; enlace: string | null; estado: string; creadoEn: string; remitente: string | null; dkimDominio: string | null; }

/**
 * Development only (the route does not exist in production builds and the API answers 404 outside Development): the
 * e-mails the platform would have sent (invitations, password resets, company links), until an e-mail provider is set.
 */
@Component({
  selector: 'app-bandeja-dev',
  template: `
    <main style="padding: 24px 16px; max-width: 1200px; margin: 0 auto">
      <div class="nx-acceso__fila" style="margin-bottom: 16px">
        <div><h1 class="nx-login__title">Bandeja de correos (desarrollo)</h1>
          <p class="nx-muted nx-mt-0">Correos que la plataforma habría enviado. Se configura un proveedor real en Correo:Proveedor.</p></div>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cargar()"><app-icon name="refresh" [size]="16"></app-icon>Actualizar</button>
      </div>
      <p *ngIf="error" class="nx-error" role="alert">{{ error }}</p>
      <p *ngIf="!error && correos.length === 0" class="nx-muted">Todavía no hay correos.</p>
      <div *ngIf="correos.length" class="nx-bandeja">
        <ul class="nx-bandeja__lista">
          <li *ngFor="let c of correos">
            <button type="button" [class.is-activo]="c.id === actual?.id" (click)="ver(c)">
              <b>{{ c.asunto }}</b><small>{{ c.para }} · {{ c.creadoEn | date: 'dd/MM HH:mm' }}</small><small *ngIf="c.remitente">De {{ c.remitente }}{{ c.dkimDominio ? ' · firmado DKIM (' + c.dkimDominio + ')' : '' }}</small>
            </button>
          </li>
        </ul>
        <div *ngIf="actual">
          <p *ngIf="actual.enlace" style="margin: 0 0 8px"><a [href]="actual.enlace">Abrir el enlace del correo</a></p>
          <!-- srcdoc + sandbox without allow-scripts: the e-mail HTML is shown without running any script. -->
          <iframe [srcdoc]="html" title="Vista del correo" sandbox="allow-same-origin"></iframe>
        </div>
      </div>
    </main>
  `
})
export class BandejaDevComponent {
  correos: CorreoBandeja[] = [];
  actual: CorreoBandeja | null = null;
  html: SafeHtml | null = null;
  error = '';

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { this.cargar(); }

  cargar(): void {
    this.http.get<CorreoBandeja[]>(`${API_URL}/dev/correos`).subscribe({
      next: (c) => { this.error = ''; this.correos = c; if (c.length && !this.actual) this.ver(c[0]); },
      error: () => this.error = 'La bandeja solo está disponible con la API en modo desarrollo.',
    });
  }

  ver(c: CorreoBandeja): void {
    this.actual = c;
    this.html = null;
    this.http.get(`${API_URL}/dev/correos/${c.id}`, { responseType: 'text' })
      .subscribe((h) => { if (this.actual === c) this.html = this.sanitizer.bypassSecurityTrustHtml(h); });
  }
}
