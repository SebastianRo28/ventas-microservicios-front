import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { API_URL } from '../../core/api';
import { mensajeError } from '../../core/auth.service';
import { ContextoService } from '../../core/contexto.service';
import { soles } from '../../core/format';
import { UiStateService } from '../../core/ui-state.service';
import { ExportacionService } from '../login/cuenta-suspendida.component';

interface PlanInfo { codigo: string; nombre: string; precio: number; limiteEmpresas: number; limiteAlmacenamientoGb: number; limiteAdmins: number; limiteApiPorMinuto: number; }
interface ModuloCuenta { codigo: string; nombre: string; descripcion: string; beneficios: string[]; precio: number; estado: 'Incluido' | 'Contratado' | 'Disponible'; solicitudPendiente: boolean; }
interface Factura { numero: string; periodo: string; emitida: string; vence: string; colaboradores: number; subtotal: number; igv: number; total: number; estado: string; sunatEstado: string; }
interface DatosFacturacion { razonSocial: string; ruc: string; direccionFiscal: string | null; correoFacturacion: string | null; }
interface UsoLimite { clave: string; nombre: string; usado: number; maximo: number; unidad: string; pct: number; estado: 'ok' | 'aviso' | 'bloqueado'; }
interface EstadoCuenta {
  plan: PlanInfo; estado: string; trialHasta: string | null; modulos: ModuloCuenta[]; colaboradores: number;
  estimado: { precioPorColaborador: number; subtotal: number; igv: number; total: number };
  facturas: Factura[]; facturacion: DatosFacturacion; limites: UsoLimite[]; planes: PlanInfo[];
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * ⚙ Administración › Estado de cuenta (P-MT.4): plan, módulos contratados y disponibles (con "Solicitar
 * información"), colaboradores facturables, próxima factura estimada, facturas, límites del plan y datos de facturación.
 */
@Component({
  selector: 'app-estado-cuenta',
  template: `
    <app-page-header title="Estado de cuenta" [crumbs]="['Administración']" [askAi]="false">
      <button type="button" class="nx-btn nx-btn--outline" [disabled]="descargando" (click)="descargarDatos()"><app-icon name="download" [size]="16"></app-icon>{{ descargando ? 'Preparando…' : 'Descargar todos mis datos' }}</button>
    </app-page-header>
    <p *ngIf="!c" class="nx-muted">Cargando…</p>
    <ng-container *ngIf="c">
      <div class="nx-grid nx-grid--4 nx-mb-16">
        <div class="nx-card nx-stat"><span>Plan</span><b class="nx-stat__text">Nexo RH {{ c.plan.nombre }}</b>
          <span class="nx-badge nx-badge--sm" [ngClass]="tonoEstado">{{ c.estado === 'Trial' ? 'Prueba gratuita' : c.estado }}</span></div>
        <div class="nx-card nx-stat"><span>Colaboradores facturables</span><b>{{ c.colaboradores }}</b></div>
        <div class="nx-card nx-stat"><span>Próxima factura estimada</span><b class="nx-stat__text">{{ fmt(c.estimado.total) }}</b></div>
        <div class="nx-card nx-stat"><span>Saldo pendiente</span><b class="nx-stat__text">{{ fmt(pendiente) }}</b></div>
      </div>

      <div class="nx-grid nx-grid--2 nx-mb-16">
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title">Tu suscripción</h2>
          <div class="nx-fieldrow"><span>Precio por colaborador</span><span>{{ fmt(c.estimado.precioPorColaborador) }} al mes + IGV (plan {{ fmt(c.plan.precio) }} + módulos)</span></div>
          <div class="nx-fieldrow"><span>Facturación</span><span>Mensual, el día 1 de cada mes · vence a fin de mes</span></div>
          <div class="nx-fieldrow"><span>Cálculo de la próxima factura</span><span>{{ c.colaboradores }} × {{ fmt(c.estimado.precioPorColaborador) }} = {{ fmt(c.estimado.subtotal) }} + IGV {{ fmt(c.estimado.igv) }}</span></div>
          <div *ngIf="c.trialHasta" class="nx-fieldrow"><span>Fin de la prueba gratuita</span><span>{{ c.trialHasta | date: 'dd/MM/yyyy' }}</span></div>
        </section>
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title">Límites del plan</h2>
          <div *ngFor="let l of c.limites" class="nx-limite">
            <div class="nx-fieldrow"><span>{{ l.nombre }}</span><span>{{ l.maximo === 0 ? 'No incluido' : (l.usado | number: '1.0-3') + ' de ' + l.maximo + (l.unidad ? ' ' + l.unidad : '') }}</span></div>
            <div *ngIf="l.maximo > 0" class="nx-limite__barra" [class.is-aviso]="l.estado === 'aviso'" [class.is-mal]="l.estado === 'bloqueado'"><span [style.width.%]="l.pct"></span></div>
          </div>
        </section>
      </div>

      <section class="nx-card nx-pad nx-mb-16">
        <h2 class="nx-section__title">Módulos</h2>
        <div class="nx-cuenta-modulos">
          <article *ngFor="let m of c.modulos" class="nx-cuenta-modulo" [class.is-disponible]="m.estado === 'Disponible'">
            <div class="nx-acceso__fila">
              <b>{{ m.nombre }}</b>
              <span class="nx-badge nx-badge--sm" [ngClass]="m.estado === 'Disponible' ? '' : 'nx-tone-success'">{{ m.estado }}</span>
            </div>
            <p class="nx-muted nx-small nx-mt-0">{{ m.descripcion }}</p>
            <div class="nx-acceso__fila">
              <span class="nx-small">{{ m.estado === 'Incluido' ? 'Incluido en tu plan' : fmt(m.precio) + ' por colaborador' }}</span>
              <ng-container *ngIf="m.estado === 'Disponible'">
                <span *ngIf="m.solicitudPendiente" class="nx-small nx-muted">Solicitud enviada</span>
                <button *ngIf="!m.solicitudPendiente" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="ctx.mostrarBloqueado(m.codigo)">Solicitar información</button>
              </ng-container>
            </div>
          </article>
        </div>
      </section>

      <section class="nx-card nx-dt__scroll nx-mb-16">
        <table class="nx-table" aria-label="Facturas">
          <thead><tr><th>Factura</th><th>Período</th><th>Emitida</th><th>Vence</th><th class="nx-num">Colaboradores</th><th class="nx-num">Subtotal</th><th class="nx-num">Total (con IGV)</th><th>Estado</th><th>SUNAT</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr *ngFor="let x of c.facturas">
              <td><b>{{ x.numero }}</b></td><td>{{ periodo(x.periodo) }}</td><td>{{ x.emitida }}</td><td>{{ x.vence }}</td>
              <td class="nx-num">{{ x.colaboradores }}</td><td class="nx-num">{{ fmt(x.subtotal) }}</td><td class="nx-num">{{ fmt(x.total) }}</td>
              <td><span class="nx-badge" [ngClass]="x.estado === 'Pagada' ? 'nx-tone-success' : x.estado === 'Vencida' ? 'nx-tone-danger' : 'nx-tone-warning'">{{ x.estado }}</span></td>
              <td class="nx-small nx-muted">{{ x.sunatEstado }}</td>
              <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Descargar ' + x.numero" (click)="descargar(x)"><app-icon name="download" [size]="16"></app-icon></button></td>
            </tr>
            <tr *ngIf="!c.facturas.length"><td colspan="10" class="nx-muted">Todavía no hay facturas.</td></tr>
          </tbody>
        </table>
      </section>

      <form class="nx-card nx-settings" (ngSubmit)="guardarFacturacion()">
        <h2 class="nx-section__title nx-mt-0">Datos de facturación</h2>
        <div class="nx-form-grid">
          <label class="nx-field">Razón social*<input class="nx-input" name="rs" maxlength="160" [(ngModel)]="f.razonSocial" [class.is-invalid]="errores['razonSocial']">
            <span *ngIf="errores['razonSocial']" class="nx-error">{{ errores['razonSocial'] }}</span></label>
          <label class="nx-field">RUC*<input class="nx-input" name="ruc" maxlength="11" inputmode="numeric" [(ngModel)]="f.ruc" [class.is-invalid]="errores['ruc']">
            <span *ngIf="errores['ruc']" class="nx-error">{{ errores['ruc'] }}</span></label>
          <label class="nx-field">Correo para las facturas<input class="nx-input" name="cf" type="email" [(ngModel)]="f.correoFacturacion" [class.is-invalid]="errores['correoFacturacion']">
            <span *ngIf="errores['correoFacturacion']" class="nx-error">{{ errores['correoFacturacion'] }}</span></label>
          <label class="nx-field nx-span-3">Dirección fiscal<input class="nx-input" name="df" maxlength="200" [(ngModel)]="f.direccionFiscal"></label>
        </div>
        <p class="nx-hint">La factura electrónica se emitirá a través de un proveedor autorizado por SUNAT (OSE/PSE); la integración está pendiente.</p>
        <div class="nx-settings__foot"><button type="submit" class="nx-btn nx-btn--primary" [disabled]="guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</button></div>
      </form>
    </ng-container>
  `
})
export class EstadoCuentaComponent implements OnDestroy {
  private readonly sub: Subscription;
  c: EstadoCuenta | null = null;
  f: DatosFacturacion = { razonSocial: '', ruc: '', direccionFiscal: null, correoFacturacion: null };
  errores: Record<string, string> = {};
  guardando = false;
  descargando = false;

  constructor(private http: HttpClient, public ctx: ContextoService, private ui: UiStateService, private exportacion: ExportacionService) {
    this.cargar();
    // After "Solicitar información" in the modal, show the request as sent.
    this.sub = ctx.bloqueado$.subscribe((m) => { if (!m && this.c) this.cargar(); });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private cargar(): void {
    this.http.get<EstadoCuenta>(`${API_URL}/cuenta`).subscribe({
      next: (c) => { this.c = c; this.f = { ...c.facturacion }; },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  fmt(n: number): string { return soles(Math.round(n * 100) / 100); }
  periodo(p: string): string { const [a, m] = p.split('-'); return `${MESES[+m - 1]} ${a}`; }
  get pendiente(): number { return (this.c?.facturas ?? []).filter((x) => x.estado !== 'Pagada').reduce((s, x) => s + x.total, 0); }
  get tonoEstado(): string {
    const e = this.c?.estado;
    return e === 'Activo' ? 'nx-tone-success' : e === 'Trial' ? 'nx-tone-info' : e === 'Moroso' ? 'nx-tone-warning' : 'nx-tone-danger';
  }

  /** ZIP with one CSV per table (opens in Excel) and the stored files; it is recorded in the change log. */
  descargarDatos(): void {
    this.descargando = true;
    this.exportacion.descargar().subscribe({ next: () => { this.descargando = false; this.ui.toast('Descarga lista'); }, error: (e) => { this.descargando = false; this.ui.toast(mensajeError(e)); } });
  }

  guardarFacturacion(): void {
    this.guardando = true;
    this.errores = {};
    this.http.put<DatosFacturacion>(`${API_URL}/cuenta/facturacion`, this.f).subscribe({
      next: (d) => { this.guardando = false; this.f = { ...d }; if (this.c) this.c.facturacion = d; this.ui.toast('Datos de facturación guardados'); },
      error: (e: HttpErrorResponse) => {
        this.guardando = false;
        const errs = (e.error as { errors?: Record<string, string[]> } | null)?.errors;
        if (errs) this.errores = Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]]));
        else this.ui.toast(mensajeError(e));
      },
    });
  }

  /** Printable HTML copy of the invoice (the legal electronic invoice will come from the OSE/PSE). */
  descargar(x: Factura): void {
    const c = this.c!;
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[ch]);
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${x.numero}</title>
<body style="font-family:system-ui,sans-serif;padding:40px;color:#1C2433;max-width:720px">
<h1 style="margin:0">Factura ${x.numero}</h1><p>Copia de referencia · ${this.periodo(x.periodo)}</p>
<p><b>Cliente:</b> ${esc(c.facturacion.razonSocial)} · RUC ${esc(c.facturacion.ruc)}<br><b>Emitida:</b> ${x.emitida} · <b>Vence:</b> ${x.vence}</p>
<table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><tr><th align="left">Concepto</th><th align="right">Monto</th></tr>
<tr><td>Nexo RH · ${x.colaboradores} colaboradores</td><td align="right">${this.fmt(x.subtotal)}</td></tr>
<tr><td>IGV (18 %)</td><td align="right">${this.fmt(x.igv)}</td></tr>
<tr><td><b>Total</b></td><td align="right"><b>${this.fmt(x.total)}</b></td></tr></table>
<p style="color:#5B6475;font-size:13px">Estado: ${x.estado}. SUNAT: ${x.sunatEstado}. Documento de referencia; no reemplaza el comprobante electrónico.</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `${x.numero}.html` }).click();
    URL.revokeObjectURL(url);
  }
}
