import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PortalService } from '../../core/portal.service';
import { Beneficio, Canje, CategoriaBeneficio } from '../../core/sample/portal';
import { UiStateService } from '../../core/ui-state.service';

/** Mi Portal › Mis Beneficios: points balance, benefits catalog to redeem and redemption history. */
@Component({
  selector: 'app-mis-beneficios',
  template: `
    <app-page-header title="Mis Beneficios" [crumbs]="['Mi Portal']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Puntos disponibles</span><b>{{ portal.puntos | number }}</b></div>
      <div class="nx-card nx-stat"><span>Canjes este año</span><b>{{ canjesAnio }}</b></div>
      <div class="nx-card nx-stat"><span>Puntos usados este año</span><b>{{ usadosAnio | number }}</b></div>
      <div class="nx-card nx-stat"><span>Solicitudes en proceso</span><b>{{ enProceso }}</b></div>
    </div>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <ng-container *ngIf="tab === 0">
      <div class="nx-chips nx-mb-16" role="group" aria-label="Filtrar por categoría">
        <button *ngFor="let c of categorias" type="button" class="nx-chip" [class.is-on]="cat === c" [attr.aria-pressed]="cat === c" (click)="cat = c">{{ c }}</button>
      </div>
      <div class="nx-benefits">
        <article *ngFor="let b of visibles" class="nx-card nx-benefit">
          <span class="nx-iconbox nx-iconbox--38"><app-icon [name]="b.icono" [size]="18"></app-icon></span>
          <b>{{ b.nombre }}</b>
          <p class="nx-muted nx-small nx-mt-0 nx-mb-0">{{ b.descripcion }}</p>
          <div class="nx-benefit__foot">
            <span class="nx-benefit__pts">{{ b.puntos ? (b.puntos | number) + ' pts' : 'Gratis' }}</span>
            <span *ngIf="b.stock !== null" class="nx-muted nx-small">{{ b.stock ? b.stock + ' disponibles' : 'Agotado' }}</span>
          </div>
          <button type="button" class="nx-btn nx-btn--sm" [ngClass]="motivo(b) ? 'nx-btn--outline' : 'nx-btn--primary'" [disabled]="!!motivo(b)"
                  [attr.aria-label]="'Canjear ' + b.nombre" (click)="confirmar = b">{{ motivo(b) || 'Canjear' }}</button>
        </article>
      </div>
    </ng-container>
    <div *ngIf="tab === 1" class="nx-card nx-dt__scroll">
      <table class="nx-table" aria-label="Historial de canjes">
        <thead><tr><th>Beneficio</th><th>Fecha</th><th class="nx-num">Puntos</th><th>Estado</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of canjes"><td><b>{{ nombre(c) }}</b></td><td>{{ c.fecha }}</td><td class="nx-num">{{ c.puntos | number }}</td>
            <td><span class="nx-badge" [ngClass]="c.estado === 'Entregado' ? 'nx-tone-success' : 'nx-tone-warning'">{{ c.estado }}</span></td></tr>
          <tr *ngIf="!canjes.length"><td colspan="4"><div class="nx-empty nx-empty--compact"><b>Aún no has canjeado beneficios</b></div></td></tr>
        </tbody>
      </table>
    </div>

    <app-modal *ngIf="confirmar as b" title="Canjear beneficio" width="480px" (closed)="confirmar = null">
      <p class="nx-mt-0">Canjearás <b>{{ b.nombre }}</b> por {{ b.puntos | number }} puntos. Te quedarán {{ portal.puntos - b.puntos | number }} puntos.</p>
      <p class="nx-muted nx-small nx-mb-0">Recursos Humanos coordinará la entrega contigo.</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="confirmar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="canjear(b)">Confirmar canje</button>
      </ng-container>
    </app-modal>
  `
})
export class MisBeneficiosComponent implements OnDestroy {
  readonly tabs = ['Catálogo', 'Mis canjes'];
  readonly categorias: ('Todos' | CategoriaBeneficio)[] = ['Todos', 'Tiempo libre', 'Bienestar', 'Educación', 'Alimentación', 'Entretenimiento'];
  tab = 0;
  cat: 'Todos' | CategoriaBeneficio = 'Todos';
  canjes: Canje[] = [];
  confirmar: Beneficio | null = null;
  private readonly anio = new Date().getFullYear();
  private sub: Subscription;

  constructor(public portal: PortalService, private ui: UiStateService) {
    this.sub = portal.canjes$.subscribe((cs) => (this.canjes = cs));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private delAnio(c: Canje): boolean { return c.fecha.endsWith(String(this.anio)); }
  get canjesAnio(): number { return this.canjes.filter((c) => this.delAnio(c)).length; }
  get usadosAnio(): number { return this.canjes.filter((c) => this.delAnio(c)).reduce((s, c) => s + c.puntos, 0); }
  get enProceso(): number { return this.canjes.filter((c) => c.estado === 'Solicitado').length; }
  get visibles(): Beneficio[] { return this.portal.beneficios.filter((b) => this.cat === 'Todos' || b.categoria === this.cat); }
  nombre(c: Canje): string { return this.portal.beneficios.find((b) => b.id === c.beneficioId)?.nombre ?? '—'; }

  /** Why the benefit cannot be redeemed now; '' when it can. */
  motivo(b: Beneficio): string {
    if (b.stock === 0) return 'Agotado';
    if (b.puntos > this.portal.puntos) return `Te faltan ${(b.puntos - this.portal.puntos).toLocaleString('en-US')} pts`;
    if (!b.puntos && this.canjes.some((c) => c.beneficioId === b.id && this.delAnio(c))) return 'Ya lo usaste este año';
    return '';
  }

  canjear(b: Beneficio): void {
    if (this.motivo(b)) return;
    this.portal.canjear(b);
    this.confirmar = null;
    this.ui.toast(`Canje de “${b.nombre}” solicitado`);
  }
}
