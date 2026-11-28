import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { API_URL } from '../../core/api';
import { mensajeError } from '../../core/auth.service';
import { UiStateService } from '../../core/ui-state.service';

export interface RegistroDns { tipo: string; nombre: string; valor: string; ttl: number; ok: boolean | null; }
export interface DominioPropio {
  id: number; host: string; tipo: 'Subdominio' | 'Personalizado'; verificado: boolean; principal: boolean; estadoCertificado: 'Pendiente' | 'Emitiendo' | 'Activo';
  verificadoEn: string | null; certificadoEn: string | null; ultimaRevision: string | null; error: string | null; registros: RegistroDns[];
}
export interface CorreoDominio {
  dominio: string; remitente: string; direccion: string; verificado: boolean; spfOk: boolean; dkimOk: boolean; dmarcOk: boolean;
  verificadoEn: string | null; ultimaRevision: string | null; enUso: boolean; registros: RegistroDns[];
}
interface DominiosEdicion {
  permiteDominio: boolean; permiteCorreo: boolean; plan: string; subdominio: string; dominios: DominioPropio[]; correo: CorreoDominio | null;
  dnsSimulado: boolean; remitentePlataforma: string; maximoDominios: number;
}

const B = `${API_URL}/dominio`;

/** Copies a DNS value to the clipboard. */
export function copiarTexto(ui: UiStateService, texto: string): void {
  navigator.clipboard?.writeText(texto).then(() => ui.toast('Copiado'), () => ui.toast('No se pudo copiar: selecciona el texto.'));
}

/**
 * ⚙ Administración › Dominio y correo (Enterprise): own domain (rrhh.tuempresa.pe) with an automatic certificate, and
 * emails sent from the company's domain (SPF, DKIM and DMARC). Other plans see the page with the plan notice.
 */
@Component({
  selector: 'app-dominio',
  template: `
    <app-page-header title="Dominio y correo" [crumbs]="['Administración']" [askAi]="false"></app-page-header>
    <div *ngIf="!e" class="nx-skel" role="status" aria-label="Cargando"><span></span><span></span><span></span></div>
    <ng-container *ngIf="e">
      <div *ngIf="!e.permiteDominio || !e.permiteCorreo" class="nx-banner nx-mb-16" role="status">
        <app-icon name="star" [size]="16"></app-icon>
        <span>El dominio propio y los correos desde tu dominio son parte del plan <b>Enterprise</b> (tu plan: {{ e.plan }}). Escríbenos a ventas&#64;nexorh.pe o a tu ejecutivo de cuenta para activarlo.</span>
      </div>
      <p *ngIf="e.dnsSimulado" class="nx-hint nx-mb-16">Entorno de desarrollo: el DNS es simulado (los registros se publican con POST /api/dev/dns).</p>

      <section class="nx-card nx-settings nx-mb-16">
        <h3 class="nx-settings__title nx-mt-0">Dirección de tu plataforma</h3>
        <p class="nx-muted nx-small nx-mt-0">Tus colaboradores entran por el subdominio de Nexo RH o por un dominio de tu empresa. El certificado HTTPS del dominio propio se emite solo al verificarlo.</p>
        <div class="nx-dt__scroll">
          <table class="nx-table nx-dns-tabla">
            <thead><tr><th>Dominio</th><th>Estado</th><th>Certificado</th><th></th></tr></thead>
            <tbody>
              <ng-container *ngFor="let d of e.dominios">
                <tr>
                  <td><b>{{ d.host }}</b> <span *ngIf="d.principal" class="nx-badge nx-badge--sm nx-tone-info">Principal</span>
                    <div class="nx-small nx-muted">{{ d.tipo === 'Subdominio' ? 'Subdominio de Nexo RH' : 'Dominio propio' }}</div></td>
                  <td><span class="nx-badge nx-badge--sm" [ngClass]="d.verificado ? 'nx-tone-success' : 'nx-tone-warning'">{{ d.verificado ? 'Verificado' : 'Pendiente de DNS' }}</span>
                    <div *ngIf="d.error" class="nx-small nx-error">{{ d.error }}</div></td>
                  <td><span class="nx-badge nx-badge--sm" [ngClass]="tonoCertificado(d)">{{ textoCertificado(d) }}</span></td>
                  <td class="nx-text-right nx-nowrap">
                    <ng-container *ngIf="d.tipo === 'Personalizado'">
                      <button *ngIf="!d.verificado" type="button" class="nx-btn nx-btn--outline nx-btn--sm" [disabled]="ocupado" (click)="verificar(d)">Verificar</button>
                      <button *ngIf="d.verificado && !d.principal" type="button" class="nx-btn nx-btn--outline nx-btn--sm" [disabled]="ocupado" (click)="principal(d)">Hacer principal</button>
                      <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Quitar dominio" [disabled]="ocupado" (click)="quitar(d)"><app-icon name="trash" [size]="16"></app-icon></button>
                    </ng-container>
                  </td>
                </tr>
                <tr *ngIf="d.tipo === 'Personalizado' && !d.verificado" class="nx-dns-fila">
                  <td colspan="4">
                    <p class="nx-small nx-mt-0">Publica estos registros en el DNS de <b>{{ raiz(d.host) }}</b> y luego pulsa “Verificar” (el DNS puede tardar unos minutos):</p>
                    <ng-container *ngTemplateOutlet="registros; context: { $implicit: d.registros }"></ng-container>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
        <form *ngIf="e.permiteDominio && propios < e.maximoDominios" class="nx-dns-alta" (ngSubmit)="agregar()">
          <label class="nx-field">Agregar un dominio de tu empresa
            <input class="nx-input" name="host" placeholder="rrhh.tuempresa.pe" autocomplete="off" [(ngModel)]="nuevoHost"></label>
          <button type="submit" class="nx-btn nx-btn--primary" [disabled]="!nuevoHost.trim() || ocupado">Agregar dominio</button>
        </form>
        <span *ngIf="errorDominio" class="nx-error" role="alert">{{ errorDominio }}</span>
      </section>

      <section class="nx-card nx-settings">
        <h3 class="nx-settings__title nx-mt-0">Correos desde tu dominio</h3>
        <p class="nx-muted nx-small nx-mt-0">Las invitaciones, recuperaciones de contraseña y avisos saldrán desde una dirección de tu empresa, firmados con DKIM.
          Mientras no esté verificado, salen desde {{ e.remitentePlataforma }}.</p>
        <ng-container *ngIf="e.correo as c; else sinCorreo">
          <div class="nx-fieldrow"><span>Remitente</span><span><b>{{ c.direccion }}</b>
            <span class="nx-badge nx-badge--sm" [ngClass]="c.enUso ? 'nx-tone-success' : c.verificado ? 'nx-tone-info' : 'nx-tone-warning'">{{ c.enUso ? 'En uso' : c.verificado ? 'Verificado (fuera de tu plan)' : 'Pendiente de DNS' }}</span></span></div>
          <div class="nx-fieldrow"><span>Registros</span><span class="nx-dns-checks">
            <span [class.is-ok]="c.spfOk"><app-icon [name]="c.spfOk ? 'checkcircle' : 'clock'" [size]="14"></app-icon>SPF</span>
            <span [class.is-ok]="c.dkimOk"><app-icon [name]="c.dkimOk ? 'checkcircle' : 'clock'" [size]="14"></app-icon>DKIM</span>
            <span [class.is-ok]="c.dmarcOk"><app-icon [name]="c.dmarcOk ? 'checkcircle' : 'clock'" [size]="14"></app-icon>DMARC</span></span></div>
          <div *ngIf="!c.verificado" class="nx-mt-8">
            <p class="nx-small nx-mt-0">Publica estos registros TXT en el DNS de <b>{{ c.dominio }}</b>. Si ya tienes un registro SPF, agrega el <code>include</code> al existente (solo puede haber uno).</p>
            <ng-container *ngTemplateOutlet="registros; context: { $implicit: c.registros }"></ng-container>
          </div>
          <div class="nx-settings__foot">
            <button type="button" class="nx-btn nx-btn--outline nx-btn--danger" [disabled]="ocupado" (click)="quitarCorreo()">Quitar</button>
            <button type="button" class="nx-btn nx-btn--outline" [disabled]="ocupado" (click)="editarCorreo(c)">Cambiar</button>
            <button type="button" class="nx-btn nx-btn--primary" [disabled]="ocupado" (click)="verificarCorreo()">Verificar</button>
          </div>
        </ng-container>
        <ng-template #sinCorreo>
          <p *ngIf="!e.permiteCorreo && !formCorreo" class="nx-muted nx-small">Disponible en el plan Enterprise.</p>
        </ng-template>
        <form *ngIf="formCorreo" class="nx-form-grid nx-mt-8" (ngSubmit)="guardarCorreo()">
          <label class="nx-field">Remitente<input class="nx-input" name="rem" placeholder="rrhh" autocomplete="off" [(ngModel)]="formCorreo.remitente"></label>
          <label class="nx-field">Dominio de tu correo<input class="nx-input" name="dom" placeholder="tuempresa.pe" autocomplete="off" [(ngModel)]="formCorreo.dominio">
            <span class="nx-hint">Los correos saldrán desde {{ (formCorreo.remitente || 'rrhh') + '@' + (formCorreo.dominio || 'tuempresa.pe') }}</span></label>
          <div class="nx-settings__foot nx-span-3">
            <span *ngIf="errorCorreo" class="nx-error" role="alert">{{ errorCorreo }}</span>
            <button *ngIf="e.correo" type="button" class="nx-btn nx-btn--outline" (click)="formCorreo = null">Cancelar</button>
            <button type="submit" class="nx-btn nx-btn--primary" [disabled]="!formCorreo.dominio.trim() || !formCorreo.remitente.trim() || ocupado">Guardar y ver los registros</button>
          </div>
        </form>
      </section>
    </ng-container>

    <ng-template #registros let-lista>
      <div class="nx-dns">
        <div *ngFor="let r of lista" class="nx-dns__registro">
          <span class="nx-badge nx-badge--sm">{{ r.tipo }}</span>
          <span class="nx-dns__campo"><small>Nombre</small><code>{{ r.nombre }}</code>
            <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Copiar nombre" (click)="copiar(r.nombre)"><app-icon name="copy" [size]="14"></app-icon></button></span>
          <span class="nx-dns__campo nx-dns__campo--valor"><small>Valor</small><code>{{ r.valor }}</code>
            <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Copiar valor" (click)="copiar(r.valor)"><app-icon name="copy" [size]="14"></app-icon></button></span>
          <app-icon *ngIf="r.ok !== null" [name]="r.ok ? 'checkcircle' : 'alert'" [size]="16" [class.nx-ok]="r.ok" [class.nx-ko]="!r.ok"></app-icon>
        </div>
      </div>
    </ng-template>
  `,
})
export class DominioComponent {
  e: DominiosEdicion | null = null;
  nuevoHost = '';
  errorDominio = '';
  errorCorreo = '';
  ocupado = false;
  formCorreo: { dominio: string; remitente: string } | null = null;

  constructor(private http: HttpClient, private ui: UiStateService) { this.cargar(); }

  get propios(): number { return this.e?.dominios.filter((d) => d.tipo === 'Personalizado').length ?? 0; }

  cargar(): void {
    this.http.get<DominiosEdicion>(B).subscribe({
      next: (e) => {
        this.e = e;
        if (!e.correo && e.permiteCorreo && !this.formCorreo) this.formCorreo = { dominio: '', remitente: 'rrhh' };
      },
      error: (err) => this.ui.toast(mensajeError(err)),
    });
  }

  raiz(host: string): string { return host.split('.').slice(-2).join('.'); }
  copiar(t: string): void { copiarTexto(this.ui, t); }

  textoCertificado(d: DominioPropio): string {
    if (d.tipo === 'Subdominio') return 'Activo (comodín)';
    return { Pendiente: 'Pendiente', Emitiendo: 'Se emite al primer acceso', Activo: 'Activo' }[d.estadoCertificado];
  }
  tonoCertificado(d: DominioPropio): string {
    return d.tipo === 'Subdominio' || d.estadoCertificado === 'Activo' ? 'nx-tone-success' : d.estadoCertificado === 'Emitiendo' ? 'nx-tone-info' : '';
  }

  private accion<T>(o: import('rxjs').Observable<T>, ok: (r: T) => void, error?: (m: string) => void): void {
    this.ocupado = true;
    o.subscribe({
      next: (r) => { this.ocupado = false; ok(r); },
      error: (err) => { this.ocupado = false; const m = mensajeError(err); if (error) error(m); else this.ui.toast(m); },
    });
  }

  agregar(): void {
    this.errorDominio = '';
    this.accion(this.http.post<DominioPropio>(`${B}/dominios`, { host: this.nuevoHost.trim() }), () => { this.nuevoHost = ''; this.cargar(); }, (m) => this.errorDominio = m);
  }

  verificar(d: DominioPropio): void {
    this.accion(this.http.post<DominioPropio>(`${B}/dominios/${d.id}/verificar`, {}), (r) => {
      this.ui.toast(r.verificado ? `${r.host} verificado: el certificado se emite al primer acceso` : 'Todavía no encontramos los registros');
      this.cargar();
    });
  }

  principal(d: DominioPropio): void {
    this.accion(this.http.post(`${B}/dominios/${d.id}/principal`, {}), () => { this.ui.toast(`${d.host} es ahora la dirección principal`); this.cargar(); });
  }

  quitar(d: DominioPropio): void {
    if (!confirm(`¿Quitar ${d.host}? Dejará de abrir la plataforma de tu empresa.`)) return;
    this.accion(this.http.delete(`${B}/dominios/${d.id}`), () => { this.ui.toast(`${d.host} quitado`); this.cargar(); });
  }

  editarCorreo(c: CorreoDominio): void { this.errorCorreo = ''; this.formCorreo = { dominio: c.dominio, remitente: c.remitente }; }

  guardarCorreo(): void {
    this.errorCorreo = '';
    this.accion(this.http.put<CorreoDominio>(`${B}/correo`, this.formCorreo), () => { this.formCorreo = null; this.cargar(); }, (m) => this.errorCorreo = m);
  }

  verificarCorreo(): void {
    this.accion(this.http.post<CorreoDominio>(`${B}/correo/verificar`, {}), (c) => {
      this.ui.toast(c.verificado ? `Listo: los correos saldrán desde ${c.direccion}` : 'Faltan registros por publicar');
      this.cargar();
    });
  }

  quitarCorreo(): void {
    if (!confirm('¿Quitar el remitente? Los correos volverán a salir desde la dirección de Nexo RH.')) return;
    this.accion(this.http.delete(`${B}/correo`), () => { this.ui.toast('Remitente quitado'); this.cargar(); });
  }
}
