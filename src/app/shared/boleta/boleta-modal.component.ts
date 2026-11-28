import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { BoletaDetalle, LineaBoleta } from '../../core/models';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "03/2026" → "Marzo 2026". */
export const nombrePeriodo = (p: string): string => { const [m, a] = p.split('/'); return `${MESES[+m - 1] ?? m} ${a}`; };

/** Payslip detail (boleta de pago) with income, deductions and employer contributions. Can be printed. */
@Component({
  selector: 'app-boleta-modal',
  template: `
    <app-modal [title]="b ? 'Boleta de pago · ' + nombrePeriodo(b.resumen.periodo) : 'Boleta de pago'" width="720px" (closed)="closed.emit()">
      <div *ngIf="!b && !error" class="nx-skel" role="status" aria-label="Cargando"><span></span><span></span><span></span></div>
      <p *ngIf="error" class="nx-error" role="alert">{{ error }}</p>
      <div *ngIf="b as d" class="nx-boleta">
        <div *ngIf="!d.resumen.definitiva" class="nx-banner nx-banner--warning nx-banner--compact nx-mb-12" role="note">
          <app-icon name="alert" [size]="17"></app-icon><span>Borrador: el período está abierto y la boleta puede cambiar hasta que se cierre.</span>
        </div>
        <div class="nx-fields nx-fields--3 nx-mb-12">
          <div class="nx-fieldrow"><span>Colaborador</span><span>{{ d.resumen.nombre }}</span></div>
          <div class="nx-fieldrow"><span>Documento</span><span>{{ d.resumen.documento }}</span></div>
          <div class="nx-fieldrow"><span>Cargo</span><span>{{ d.resumen.cargo }}</span></div>
          <div class="nx-fieldrow"><span>Régimen pensionario</span><span>{{ d.resumen.regimen }}</span></div>
          <div class="nx-fieldrow"><span>Días laborados</span><span>{{ d.resumen.diasLaborados }}</span></div>
          <div class="nx-fieldrow"><span>Vacaciones / no trabajados</span><span>{{ d.resumen.diasVacaciones }} / {{ d.resumen.diasNoTrabajados }}</span></div>
        </div>
        <ng-container *ngFor="let g of grupos">
          <h3 class="nx-section__title">{{ g.titulo }}</h3>
          <table class="nx-table nx-mb-12" [attr.aria-label]="g.titulo">
            <tbody>
              <tr *ngFor="let l of lineas(g.clase)">
                <td>{{ l.nombre }} <span class="nx-muted nx-small">{{ l.detalle }}</span></td>
                <td class="nx-num">{{ soles(l.monto) }}</td>
              </tr>
              <tr *ngIf="!lineas(g.clase).length"><td class="nx-muted">Sin conceptos</td><td></td></tr>
              <tr><td><b>Total {{ g.titulo.toLowerCase() }}</b></td><td class="nx-num"><b>{{ soles(total(g.clase)) }}</b></td></tr>
            </tbody>
          </table>
        </ng-container>
        <div class="nx-fieldrow nx-boleta__neto"><span><b>Neto a pagar</b></span><span><b>{{ soles(d.resumen.neto) }}</b></span></div>
        <ul *ngIf="d.resumen.observaciones.length" class="nx-small nx-muted">
          <li *ngFor="let o of d.resumen.observaciones">{{ o }}</li>
        </ul>
      </div>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="closed.emit()">Cerrar</button>
        <button type="button" class="nx-btn nx-btn--primary" [disabled]="!b" (click)="imprimir()"><app-icon name="download" [size]="16"></app-icon>Imprimir / PDF</button>
      </ng-container>
    </app-modal>`,
})
export class BoletaModalComponent implements OnChanges {
  @Input() boletaId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  b: BoletaDetalle | null = null;
  error = '';
  readonly soles = soles;
  readonly nombrePeriodo = nombrePeriodo;
  readonly grupos: { titulo: string; clase: LineaBoleta['clase'] }[] = [
    { titulo: 'Ingresos', clase: 'Haber' }, { titulo: 'Descuentos', clase: 'Descuento' }, { titulo: 'Aportes del empleador', clase: 'Aporte empleador' },
  ];

  constructor(private data: HrDataService) {}

  ngOnChanges(): void {
    this.b = null;
    this.error = '';
    if (this.boletaId == null) return;
    this.data.boleta(this.boletaId).subscribe({ next: (b) => (this.b = b), error: (e) => (this.error = mensajeError(e)) });
  }

  lineas(clase: LineaBoleta['clase']): LineaBoleta[] { return this.b?.lineas.filter((l) => l.clase === clase) ?? []; }
  total(clase: LineaBoleta['clase']): number { return Math.round(this.lineas(clase).reduce((s, l) => s + l.monto, 0) * 100) / 100; }

  /** Prints the payslip alone (the browser offers "Save as PDF"). */
  imprimir(): void {
    const el = document.querySelector('.nx-boleta');
    if (!el || !this.b) return;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Boleta ${this.b.resumen.periodo} · ${this.b.resumen.nombre}</title>
      <style>body{font:14px system-ui,sans-serif;margin:32px;color:#111}table{width:100%;border-collapse:collapse;margin:8px 0 16px}td{padding:4px 6px;border-bottom:1px solid #ddd}
      .nx-num{text-align:right}.nx-fieldrow{display:flex;justify-content:space-between;padding:3px 0}.nx-fields{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
      .nx-muted{color:#666}.nx-small{font-size:12px}h3{margin:12px 0 4px;font-size:15px}.nx-boleta__neto{font-size:16px;border-top:2px solid #111;padding-top:8px}
      svg,.nx-banner svg{display:none}</style></head><body><h2>Boleta de pago · ${nombrePeriodo(this.b.resumen.periodo)}</h2>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }
}
