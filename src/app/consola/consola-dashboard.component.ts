import { Component } from '@angular/core';
import { ConsolaService, Dashboard, MESES, errorConsola, soles } from './consola.service';
import { UiStateService } from '../core/ui-state.service';

/** P-SA.1 Platform dashboard: KPIs, MRR (12 months), tenants per plan, trials ending soon and module requests. */
@Component({
  selector: 'app-consola-dashboard',
  template: `
    <div class="cx-cab">
      <div><span class="cx-ruta">Consola › Dashboard</span><h1>Dashboard</h1><p class="nx-muted nx-mt-0">Al {{ hoy | date: 'dd/MM/yyyy' }} · datos del catálogo de la plataforma</p></div>
      <a *ngIf="c.esAdmin" class="nx-btn nx-btn--primary" routerLink="/consola/tenants/nuevo"><app-icon name="plus" [size]="16"></app-icon>Crear tenant</a>
    </div>
    <div *ngIf="error" class="cx-alerta" role="alert"><app-icon name="alert" [size]="16"></app-icon>{{ error }} <button type="button" class="nx-link-btn" (click)="cargar()">Reintentar</button></div>
    <div *ngIf="!d && !error" class="cx-esqueleto"></div>

    <ng-container *ngIf="d">
      <div class="cx-kpis">
        <div class="nx-card cx-kpi"><span>Tenants activos</span><b>{{ d.kpis.tenantsActivos }}</b><small>+{{ d.kpis.altasMes }} este mes</small></div>
        <div class="nx-card cx-kpi"><span>En trial</span><b>{{ d.kpis.tenantsTrial }}</b><small>{{ d.trialsPorVencer.length }} vencen en 7 días</small></div>
        <div class="nx-card cx-kpi"><span>Suspendidos</span><b>{{ d.kpis.tenantsSuspendidos }}</b><small>{{ d.kpis.tenantsMorosos }} morosos</small></div>
        <div class="nx-card cx-kpi"><span>Colaboradores facturables</span><b>{{ d.kpis.colaboradoresFacturables | number }}</b><small>Activos y morosos</small></div>
        <div class="nx-card cx-kpi"><span>MRR</span><b>{{ soles(d.kpis.mrr) }}</b><small>Sin IGV</small></div>
        <div class="nx-card cx-kpi"><span>Churn mensual</span><b>{{ d.kpis.churnPct }} %</b><small>Cancelaciones del mes</small></div>
      </div>

      <div class="cx-grid-2">
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title nx-mt-0">MRR · últimos 12 meses</h2>
          <p class="nx-muted nx-small nx-mt-0">S/ sin IGV · facturado por mes (el mes actual, estimado)</p>
          <svg class="cx-grafico" viewBox="0 0 600 200" role="img" [attr.aria-label]="'MRR de ' + etiqueta(d.serieMrr[0].periodo) + ' a ' + etiqueta(d.serieMrr[11].periodo)">
            <line *ngFor="let y of [40, 90, 140]" x1="40" x2="590" [attr.y1]="y" [attr.y2]="y" class="cx-grafico__guia"></line>
            <path [attr.d]="area" class="cx-grafico__area"></path>
            <path [attr.d]="linea" class="cx-grafico__linea"></path>
            <g *ngFor="let p of puntos; let i = index">
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" class="cx-grafico__punto"><title>{{ etiqueta(d.serieMrr[i].periodo) }}: {{ soles(d.serieMrr[i].monto) }}</title></circle>
              <text [attr.x]="p.x" y="196" text-anchor="middle" class="cx-grafico__eje">{{ mes(d.serieMrr[i].periodo) }}</text>
            </g>
          </svg>
        </section>
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title nx-mt-0">Tenants por plan</h2>
          <div class="cx-planes-barra"><span *ngFor="let p of d.planes; let i = index" [style.flex]="p.tenants || 0.0001" [class]="'cx-tono-' + i" [title]="p.nombre + ': ' + p.tenants"></span></div>
          <ul class="cx-leyenda">
            <li *ngFor="let p of d.planes; let i = index"><i [class]="'cx-tono-' + i"></i>{{ p.nombre }}<b>{{ p.tenants }}</b><span>{{ pct(p.tenants) }} %</span></li>
          </ul>
          <div *ngIf="d.tenantsMorososVencidos" class="cx-aviso"><app-icon name="alert" [size]="16"></app-icon>
            Morosidad: {{ d.tenantsMorososVencidos }} {{ d.tenantsMorososVencidos === 1 ? 'tenant' : 'tenants' }} con facturas vencidas &gt; 30 días ({{ soles(d.morosidad) }}). <a routerLink="/consola/tenants" [queryParams]="{ estado: 'Moroso' }">Ver en Tenants</a></div>
        </section>
      </div>

      <section class="nx-card nx-mb-16">
        <div class="cx-tabla__cab"><h2 class="nx-section__title nx-mt-0">Trials que vencen en 7 días</h2><span class="nx-badge">{{ d.trialsPorVencer.length }}</span></div>
        <table class="nx-table cx-tabla" *ngIf="d.trialsPorVencer.length; else sinTrials">
          <thead><tr><th>Tenant</th><th>Slug</th><th>Plan</th><th class="nx-num">Colab.</th><th>Fin de trial</th><th>Ejecutivo</th><th></th></tr></thead>
          <tbody><tr *ngFor="let t of d.trialsPorVencer">
            <td><a [routerLink]="['/consola/tenants', t.tenantId]"><b>{{ t.nombre }}</b></a></td><td>{{ t.slug }}</td><td>{{ t.plan }}</td><td class="nx-num">{{ t.colaboradores }}</td>
            <td>{{ t.trialHasta | date: 'dd/MM/yyyy' }} <span class="nx-badge nx-badge--sm nx-tone-warning">{{ t.dias }} {{ t.dias === 1 ? 'día' : 'días' }}</span></td>
            <td>{{ t.ejecutivo || '—' }}</td><td class="nx-text-right"><a class="nx-btn nx-btn--outline nx-btn--sm" [routerLink]="['/consola/tenants', t.tenantId]" [queryParams]="{ tab: 'modulos' }">Convertir</a></td>
          </tr></tbody>
        </table>
        <ng-template #sinTrials><p class="nx-muted cx-vacio">No hay trials que venzan en los próximos 7 días.</p></ng-template>
      </section>

      <section class="nx-card">
        <div class="cx-tabla__cab"><h2 class="nx-section__title nx-mt-0">Solicitudes de módulos</h2><span class="nx-badge">{{ d.solicitudes.length }}</span></div>
        <table class="nx-table cx-tabla" *ngIf="d.solicitudes.length; else sinSol">
          <thead><tr><th>Tenant</th><th>Módulo</th><th>Solicitado por</th><th>Mensaje</th><th>Fecha</th><th></th></tr></thead>
          <tbody><tr *ngFor="let s of d.solicitudes">
            <td><a [routerLink]="['/consola/tenants', s.tenantId]">{{ s.tenant }}</a></td><td>{{ s.moduloNombre }}</td><td>{{ s.usuario }}</td><td class="nx-muted">{{ s.mensaje || '—' }}</td>
            <td>{{ s.creadaEn | date: 'dd/MM/yyyy HH:mm' }}</td>
            <td class="nx-text-right cx-acciones">
              <ng-container *ngIf="c.esAdmin">
                <button type="button" class="nx-btn nx-btn--primary nx-btn--sm" (click)="resolver(s.id, true)">Aprobar</button>
                <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="resolver(s.id, false)">Rechazar</button>
              </ng-container>
            </td>
          </tr></tbody>
        </table>
        <ng-template #sinSol><p class="nx-muted cx-vacio">Sin solicitudes pendientes.</p></ng-template>
      </section>
    </ng-container>
  `
})
export class ConsolaDashboardComponent {
  readonly hoy = new Date();
  readonly soles = soles;
  d: Dashboard | null = null;
  error = '';
  puntos: { x: number; y: number }[] = [];
  linea = '';
  area = '';

  constructor(public c: ConsolaService, private ui: UiStateService) { this.cargar(); }

  cargar(): void {
    this.error = '';
    this.c.get<Dashboard>('dashboard').subscribe({ next: (d) => { this.d = d; this.dibujar(); }, error: (e) => this.error = errorConsola(e) });
  }

  private dibujar(): void {
    const s = this.d!.serieMrr;
    const max = Math.max(1, ...s.map((p) => p.monto)), min = Math.min(...s.map((p) => p.monto));
    const rango = Math.max(1, max - min * 0.9);
    this.puntos = s.map((p, i) => ({ x: 50 + i * 49, y: 170 - ((p.monto - min * 0.9) / rango) * 140 }));
    this.linea = this.puntos.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    this.area = `${this.linea} L${this.puntos[this.puntos.length - 1].x},175 L${this.puntos[0].x},175 Z`;
  }

  mes(p: string): string { return MESES[+p.split('-')[1] - 1]; }
  etiqueta(p: string): string { return `${this.mes(p)} ${p.split('-')[0]}`; }
  pct(n: number): number { const t = this.d!.planes.reduce((a, p) => a + p.tenants, 0); return t ? Math.round(n * 100 / t) : 0; }

  resolver(id: number, aprobar: boolean): void {
    this.c.post(`solicitudes/${id}/${aprobar ? 'aprobar' : 'rechazar'}`, {}).subscribe({
      next: () => { this.ui.toast(aprobar ? 'Módulo contratado desde hoy' : 'Solicitud rechazada'); this.cargar(); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }
}
