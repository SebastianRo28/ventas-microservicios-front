import { Component } from '@angular/core';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';

interface Factura { numero: string; periodo: string; emitida: string; vence: string; colaboradores: number; subtotal: number; estado: 'Pagada' | 'Pendiente'; }

/** Sample subscription: price per active collaborator per month (before IGV). */
const PRECIO = 18;
const IGV = 0.18;
const f = (numero: string, periodo: string, emitida: string, vence: string, colaboradores: number, estado: Factura['estado']): Factura =>
  ({ numero, periodo, emitida, vence, colaboradores, subtotal: colaboradores * PRECIO, estado });
const FACTURAS: Factura[] = [
  f('F001-000318', 'Marzo 2026', '01/03/2026', '31/03/2026', 16, 'Pendiente'),
  f('F001-000297', 'Febrero 2026', '01/02/2026', '28/02/2026', 15, 'Pagada'),
  f('F001-000271', 'Enero 2026', '01/01/2026', '31/01/2026', 15, 'Pagada'),
  f('F001-000250', 'Diciembre 2025', '01/12/2025', '31/12/2025', 15, 'Pagada'),
];
const MODULOS = ['Administrativo', 'Remuneraciones', 'Mi Portal', 'Desarrollo Organizacional', 'Seguridad y Salud en el Trabajo', 'Reportería'];

/** Administración › Estado de cuenta: Nexo RH subscription, monthly estimate and invoices. Sample values. */
@Component({
  selector: 'app-estado-cuenta',
  template: `
    <app-page-header title="Estado de cuenta" [crumbs]="['Administración']" [askAi]="false"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Plan</span><b class="nx-stat__text">Nexo RH Pro</b></div>
      <div class="nx-card nx-stat"><span>Colaboradores activos</span><b>{{ activos }}</b></div>
      <div class="nx-card nx-stat"><span>Próxima factura estimada</span><b class="nx-stat__text">{{ fmt(total(activos * precio)) }}</b></div>
      <div class="nx-card nx-stat"><span>Saldo pendiente</span><b class="nx-stat__text">{{ fmt(pendiente) }}</b></div>
    </div>
    <div class="nx-grid nx-grid--2 nx-mb-16">
      <section class="nx-card nx-pad">
        <h2 class="nx-section__title">Tu suscripción</h2>
        <div class="nx-fieldrow"><span>Precio</span><span>{{ fmt(precio) }} por colaborador activo al mes + IGV</span></div>
        <div class="nx-fieldrow"><span>Facturación</span><span>Mensual, el día 1 de cada mes · vence a fin de mes</span></div>
        <div class="nx-fieldrow"><span>Cálculo de la próxima factura</span><span>{{ activos }} × {{ fmt(precio) }} = {{ fmt(activos * precio) }} + IGV {{ fmt(activos * precio * igv) }}</span></div>
        <div class="nx-fieldrow"><span>Facturar a</span><span>{{ data.empresa }}</span></div>
      </section>
      <section class="nx-card nx-pad">
        <h2 class="nx-section__title">Módulos incluidos</h2>
        <ul class="nx-modlist"><li *ngFor="let m of modulos"><app-icon name="checkcircle" [size]="16"></app-icon>{{ m }}</li></ul>
        <p class="nx-muted nx-small nx-mb-0">Talento, Selección y Onboarding no están en tu plan. Para agregarlos, contacta a tu ejecutivo de cuenta.</p>
      </section>
    </div>
    <section class="nx-card nx-dt__scroll">
      <table class="nx-table" aria-label="Facturas">
        <thead><tr><th>Factura</th><th>Período</th><th>Emitida</th><th>Vence</th><th class="nx-num">Colaboradores</th><th class="nx-num">Subtotal</th><th class="nx-num">Total (con IGV)</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr *ngFor="let x of facturas">
            <td><b>{{ x.numero }}</b></td><td>{{ x.periodo }}</td><td>{{ x.emitida }}</td><td>{{ x.vence }}</td>
            <td class="nx-num">{{ x.colaboradores }}</td><td class="nx-num">{{ fmt(x.subtotal) }}</td><td class="nx-num">{{ fmt(total(x.subtotal)) }}</td>
            <td><span class="nx-badge" [ngClass]="x.estado === 'Pagada' ? 'nx-tone-success' : 'nx-tone-warning'">{{ x.estado }}</span></td>
            <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Descargar ' + x.numero" (click)="descargar(x)"><app-icon name="download" [size]="16"></app-icon></button></td>
          </tr>
        </tbody>
      </table>
    </section>
    <p class="nx-muted nx-small">Montos de ejemplo del prototipo. Los pagos se realizan con el enlace de cada factura enviada al correo de facturación.</p>
  `
})
export class EstadoCuentaComponent {
  readonly precio = PRECIO;
  readonly igv = IGV;
  readonly facturas = FACTURAS;
  readonly modulos = MODULOS;
  activos = 0;

  constructor(public data: HrDataService) { data.colaboradores().subscribe((cs) => (this.activos = cs.length)); }

  fmt(n: number): string { return soles(Math.round(n * 100) / 100); }
  total(subtotal: number): number { return Math.round(subtotal * (1 + IGV) * 100) / 100; }
  get pendiente(): number { return this.facturas.filter((x) => x.estado === 'Pendiente').reduce((s, x) => s + this.total(x.subtotal), 0); }

  /** Printable HTML copy of the invoice (the legal electronic invoice comes from the billing system). */
  descargar(x: Factura): void {
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${x.numero}</title>
<body style="font-family:system-ui,sans-serif;padding:40px;color:#1C2433;max-width:720px">
<h1 style="margin:0">Factura ${x.numero}</h1><p>Copia de referencia · ${x.periodo}</p>
<p><b>Cliente:</b> ${this.data.empresa}<br><b>Emitida:</b> ${x.emitida} · <b>Vence:</b> ${x.vence}</p>
<table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><tr><th align="left">Concepto</th><th align="right">Monto</th></tr>
<tr><td>Nexo RH Pro · ${x.colaboradores} colaboradores × ${this.fmt(PRECIO)}</td><td align="right">${this.fmt(x.subtotal)}</td></tr>
<tr><td>IGV (18 %)</td><td align="right">${this.fmt(x.subtotal * IGV)}</td></tr>
<tr><td><b>Total</b></td><td align="right"><b>${this.fmt(this.total(x.subtotal))}</b></td></tr></table>
<p style="color:#5B6475;font-size:13px">Estado: ${x.estado}. Documento de referencia generado por el prototipo de Nexo RH; no reemplaza el comprobante electrónico.</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `${x.numero}.html` }).click();
    URL.revokeObjectURL(url);
  }
}
