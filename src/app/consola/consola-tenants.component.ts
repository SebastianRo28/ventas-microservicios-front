import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { UiStateService } from '../core/ui-state.service';
import { TenantModal } from './consola-modales.component';
import { ConsolaService, PaginaTenants, TONOS_ESTADO, TenantFila, errorConsola, soles } from './consola.service';

/** P-SA.2 Tenants: status segments, filters, server paging and per-row actions (view, suspend/reactivate, support). */
@Component({
  selector: 'app-consola-tenants',
  template: `
    <div class="cx-cab">
      <div><span class="cx-ruta">Consola › Tenants</span><h1>Tenants</h1>
        <p class="nx-muted nx-mt-0" *ngIf="p">{{ totalTodos }} clientes · {{ colaboradores | number }} colaboradores en esta vista</p></div>
      <div class="cx-acciones">
        <button type="button" class="nx-btn nx-btn--outline" (click)="exportar()" [disabled]="!p"><app-icon name="download" [size]="16"></app-icon>Exportar</button>
        <a *ngIf="c.esAdmin" class="nx-btn nx-btn--primary" routerLink="/consola/tenants/nuevo"><app-icon name="plus" [size]="16"></app-icon>Crear tenant</a>
      </div>
    </div>

    <div class="cx-segmentos" role="tablist">
      <button type="button" role="tab" [class.is-on]="!estado" (click)="filtrarEstado('')">Todos<b>{{ totalTodos }}</b></button>
      <button *ngFor="let e of estados" type="button" role="tab" [class.is-on]="estado === e" (click)="filtrarEstado(e)">{{ e }}<b>{{ p?.porEstado?.[e] ?? 0 }}</b></button>
    </div>

    <div class="cx-filtros">
      <input class="nx-input" placeholder="Buscar por nombre, slug, razón social o RUC" [(ngModel)]="q" (ngModelChange)="buscar$.next()" aria-label="Buscar tenants">
      <select class="nx-select" [(ngModel)]="plan" (ngModelChange)="cargar(1)" aria-label="Plan"><option value="">Todos los planes</option><option *ngFor="let x of planes" [value]="x">{{ x }}</option></select>
      <select class="nx-select" [(ngModel)]="ejecutivo" (ngModelChange)="cargar(1)" aria-label="Ejecutivo"><option value="">Todos los ejecutivos</option><option *ngFor="let x of p?.ejecutivos" [value]="x">{{ x }}</option></select>
      <select class="nx-select" [(ngModel)]="orden" (ngModelChange)="cargar(1)" aria-label="Orden"><option value="">Nombre</option><option value="colaboradores">Más colaboradores</option><option value="alta">Alta más reciente</option><option value="trial">Fin de trial</option></select>
    </div>

    <div *ngIf="error" class="cx-alerta" role="alert"><app-icon name="alert" [size]="16"></app-icon>{{ error }} <button type="button" class="nx-link-btn" (click)="cargar()">Reintentar</button></div>
    <section class="nx-card nx-dt__scroll">
      <table class="nx-table cx-tabla" aria-label="Tenants">
        <thead><tr><th>Nombre</th><th>Slug / dominio</th><th>Plan</th><th>Módulos</th><th>Estado</th><th class="nx-num">Colab.</th><th>Alta</th><th>Fin de trial</th><th>Ejecutivo</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr *ngFor="let t of p?.items">
            <td><a [routerLink]="['/consola/tenants', t.id]"><b>{{ t.nombre }}</b></a></td>
            <td><span class="cx-mono">{{ t.slug }}</span><br><small class="nx-muted">{{ t.dominioPrincipal }}</small></td>
            <td>{{ t.planNombre }}</td>
            <td><span class="cx-chips"><span *ngFor="let m of t.modulos.slice(0, 4)" class="cx-chip">{{ m }}</span><span *ngIf="t.modulos.length > 4" class="cx-chip">+{{ t.modulos.length - 4 }}</span></span></td>
            <td><span class="nx-badge" [ngClass]="tono(t.estado)">{{ t.estado }}</span></td>
            <td class="nx-num">{{ t.colaboradores | number }}</td>
            <td>{{ t.creadoEn | date: 'dd/MM/yyyy' }}</td>
            <td>{{ t.trialHasta ? (t.trialHasta | date: 'dd/MM/yyyy') : '—' }}</td>
            <td>{{ t.ejecutivo || '—' }}</td>
            <td class="cx-acciones">
              <a class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [routerLink]="['/consola/tenants', t.id]" [attr.aria-label]="'Ver ' + t.nombre" title="Ver"><app-icon name="eye" [size]="16"></app-icon></a>
              <ng-container *ngIf="c.esAdmin">
                <button *ngIf="!suspendido(t)" type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" title="Suspender" [attr.aria-label]="'Suspender ' + t.nombre" (click)="suspender = modal(t)"><app-icon name="pause" [size]="16"></app-icon></button>
                <button *ngIf="suspendido(t)" type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" title="Reactivar" [attr.aria-label]="'Reactivar ' + t.nombre" (click)="reactivar(t)"><app-icon name="play" [size]="16"></app-icon></button>
              </ng-container>
              <button *ngIf="c.puedeSoporte && t.estado !== 'Cancelado'" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="soporte = modal(t)">Soporte</button>
            </td>
          </tr>
          <tr *ngIf="p && !p.items.length"><td colspan="10" class="cx-vacio">No hay tenants con estos filtros. <button type="button" class="nx-link-btn" (click)="limpiar()">Limpiar filtros</button></td></tr>
          <tr *ngIf="!p && !error"><td colspan="10" class="cx-vacio">Cargando…</td></tr>
        </tbody>
      </table>
    </section>
    <div class="cx-paginas" *ngIf="p && p.total > tamano">
      <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" [disabled]="pagina === 1" (click)="cargar(pagina - 1)">Anterior</button>
      <span>Página {{ pagina }} de {{ paginas }}</span>
      <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" [disabled]="pagina >= paginas" (click)="cargar(pagina + 1)">Siguiente</button>
    </div>

    <app-cx-suspender *ngIf="suspender" [t]="suspender" (cerrado)="suspender = null" (hecho)="suspendido_()"></app-cx-suspender>
    <app-cx-soporte *ngIf="soporte" [t]="soporte" (cerrado)="soporte = null"></app-cx-soporte>
  `
})
export class ConsolaTenantsComponent {
  readonly estados = ['Trial', 'Activo', 'Moroso', 'Suspendido', 'Cancelado'];
  readonly planes = ['BASICO', 'PRO', 'ENTERPRISE'];
  readonly buscar$ = new Subject<void>();
  readonly tamano = 25;
  p: PaginaTenants | null = null;
  q = '';
  estado = '';
  plan = '';
  ejecutivo = '';
  orden = '';
  pagina = 1;
  error = '';
  suspender: TenantModal | null = null;
  soporte: TenantModal | null = null;

  constructor(public c: ConsolaService, private ui: UiStateService, route: ActivatedRoute) {
    this.estado = route.snapshot.queryParamMap.get('estado') ?? '';
    this.buscar$.pipe(debounceTime(300)).subscribe(() => this.cargar(1));
    this.cargar();
  }

  get totalTodos(): number { return Object.values(this.p?.porEstado ?? {}).reduce((a, n) => a + n, 0); }
  get colaboradores(): number { return (this.p?.items ?? []).reduce((a, t) => a + t.colaboradores, 0); }
  get paginas(): number { return Math.max(1, Math.ceil((this.p?.total ?? 0) / this.tamano)); }
  tono(e: string): string { return TONOS_ESTADO[e] ?? ''; }
  suspendido(t: TenantFila): boolean { return t.estado === 'Suspendido' || t.estado === 'Cancelado'; }
  modal(t: TenantFila): TenantModal { return { id: t.id, nombre: t.nombre, slug: t.slug, soporteAutorizado: t.soporteAutorizado }; }

  cargar(pagina = this.pagina): void {
    this.pagina = pagina;
    this.error = '';
    this.c.get<PaginaTenants>('tenants', { q: this.q, estado: this.estado, plan: this.plan, ejecutivo: this.ejecutivo, sort: this.orden, page: pagina, pageSize: this.tamano })
      .subscribe({ next: (p) => this.p = p, error: (e) => this.error = errorConsola(e) });
  }
  filtrarEstado(e: string): void { this.estado = e; this.cargar(1); }
  limpiar(): void { this.q = this.estado = this.plan = this.ejecutivo = ''; this.cargar(1); }

  suspendido_(): void { this.ui.toast(`${this.suspender?.nombre} suspendido`); this.suspender = null; this.cargar(); }
  reactivar(t: TenantFila): void {
    this.c.post(`tenants/${t.id}/reactivate`, {}).subscribe({ next: () => { this.ui.toast(`${t.nombre} reactivado`); this.cargar(); }, error: (e) => this.ui.toast(errorConsola(e)) });
  }

  exportar(): void {
    const filas = [['Nombre', 'Slug', 'Plan', 'Estado', 'Colaboradores', 'Precio por colaborador', 'Alta', 'Fin de trial', 'Ejecutivo'],
      ...(this.p?.items ?? []).map((t) => [t.nombre, t.slug, t.planNombre, t.estado, String(t.colaboradores), soles(t.precio), t.creadoEn.slice(0, 10), t.trialHasta ?? '', t.ejecutivo ?? ''])];
    const csv = '﻿' + filas.map((f) => f.map((x) => `"${x.replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: 'tenants.csv' }).click();
    URL.revokeObjectURL(url);
  }
}
