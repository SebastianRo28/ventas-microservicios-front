import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AnuncioTenant, BannerEstado, ContextoService } from '../core/contexto.service';
import { ExportacionService } from '../features/login/cuenta-suspendida.component';
import { UiStateService } from '../core/ui-state.service';
import { mensajeError } from '../core/auth.service';

/**
 * P-MT.7 status banners under the topbar (admins only): pending invoices (yellow) and plan limits. The trial is a
 * badge in the topbar; on narrow screens, where the badge is hidden, it shows here.
 */
@Component({
  selector: 'app-banners',
  template: `
    <div *ngFor="let b of banners$ | async" class="nx-estado" [class.nx-estado--moroso]="b.tipo === 'moroso'" [class.nx-estado--limite]="b.tipo === 'limite'" [class.nx-estado--trial]="b.tipo === 'trial'" [class.nx-estado--moroso]="b.tipo === 'cancelado'" role="status">
      <app-icon [name]="b.tipo === 'moroso' ? 'alert' : 'info'" [size]="17"></app-icon>
      <span class="nx-grow">{{ b.texto }}</span>
      <a *ngIf="b.ruta && b.accion && b.tipo !== 'cancelado'" [routerLink]="b.ruta">{{ b.accion }}</a>
      <button *ngIf="b.tipo === 'cancelado'" type="button" class="nx-link-btn" [disabled]="descargando" (click)="descargar()">{{ descargando ? 'Preparando…' : b.accion }}</button>
      <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Ocultar aviso" (click)="ocultar(b)"><app-icon name="x" [size]="15"></app-icon></button>
    </div>
    <div *ngFor="let a of anuncios$ | async" class="nx-estado nx-estado--anuncio" role="status">
      <app-icon [name]="a.tipo === 'Mantenimiento' ? 'alert' : 'megaphone'" [size]="17"></app-icon>
      <span class="nx-grow"><b>{{ a.titulo }}</b> · {{ a.cuerpo }}</span>
      <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" aria-label="Ocultar anuncio" (click)="ocultarAnuncio(a.id)"><app-icon name="x" [size]="15"></app-icon></button>
    </div>
    <app-modal *ngIf="modal$ | async as a" [title]="a.titulo" width="480px" (closed)="ocultarAnuncio(a.id)">
      <p class="nx-mt-0" style="white-space: pre-line">{{ a.cuerpo }}</p>
      <ng-container modal-footer><button type="button" class="nx-btn nx-btn--primary" (click)="ocultarAnuncio(a.id)">Entendido</button></ng-container>
    </app-modal>
  `
})
export class BannersComponent {
  private ocultos = new Set<string>();
  readonly banners$: Observable<BannerEstado[]>;
  /** Announcements of the console: banners, and the first "modal" one once per browser session. */
  readonly anuncios$: Observable<AnuncioTenant[]>;
  readonly modal$: Observable<AnuncioTenant | null>;
  private anunciosOcultos = new Set<number>();

  descargando = false;

  constructor(private ctx: ContextoService, private exportacion: ExportacionService, private ui: UiStateService) {
    try { this.ocultos = new Set(JSON.parse(sessionStorage.getItem('nexo-rh.banners-ocultos') ?? '[]')); } catch { /* ignore */ }
    this.banners$ = ctx.contexto$.pipe(map((c) => (c?.banners ?? []).filter((b) => !this.ocultos.has(b.texto))));
    try { this.anunciosOcultos = new Set(JSON.parse(sessionStorage.getItem('nexo-rh.anuncios-ocultos') ?? '[]')); } catch { /* ignore */ }
    this.anuncios$ = ctx.contexto$.pipe(map((c) => (c?.anuncios ?? []).filter((a) => a.canal !== 'modal' && !this.anunciosOcultos.has(a.id))));
    this.modal$ = ctx.contexto$.pipe(map((c) => (c?.anuncios ?? []).find((a) => a.canal === 'modal' && !this.anunciosOcultos.has(a.id)) ?? null));
  }

  descargar(): void {
    this.descargando = true;
    this.exportacion.descargar().subscribe({ next: () => this.descargando = false, error: (e) => { this.descargando = false; this.ui.toast(mensajeError(e)); } });
  }

  ocultarAnuncio(id: number): void {
    this.anunciosOcultos.add(id);
    try { sessionStorage.setItem('nexo-rh.anuncios-ocultos', JSON.stringify([...this.anunciosOcultos])); } catch { /* ignore */ }
    this.ctx.contexto$.next(this.ctx.contexto);
  }

  /** Hidden for this browser session (it comes back next time while the situation lasts). */
  ocultar(b: BannerEstado): void {
    this.ocultos.add(b.texto);
    try { sessionStorage.setItem('nexo-rh.banners-ocultos', JSON.stringify([...this.ocultos])); } catch { /* ignore */ }
    this.ctx.contexto$.next(this.ctx.contexto);
  }
}
