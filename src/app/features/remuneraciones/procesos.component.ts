import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Boleta, PeriodoPlanilla } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';
import { nombrePeriodo } from '../../shared/boleta/boleta-modal.component';

/**
 * P-03.2 Procesos: payroll periods from the API. The open period is processed (payslips recalculated with the current
 * data: salary, absences, vacations, items, overtime sent from Control de Asistencia, pension and taxes) as many times
 * as needed; closing it makes its payslips final, publishes them to each person and opens the next month.
 */
@Component({
  selector: 'app-procesos',
  templateUrl: './procesos.component.html'
})
export class ProcesosComponent {
  readonly soles = soles;
  readonly nombrePeriodo = nombrePeriodo;
  anio = '';
  anios: string[] = [];
  periodos: PeriodoPlanilla[] = [];
  open = new Set<string>();
  boletas = new Map<string, Boleta[]>();
  procesarModal = false;
  cerrarModal = false;
  ocupado = false;
  boletaVer: number | null = null;

  constructor(private data: HrDataService, private ui: UiStateService) { this.cargar(); }

  private cargar(): void {
    this.data.periodosPlanilla().subscribe({
      next: (p) => {
        this.periodos = p;
        this.anios = [...new Set(p.map((x) => x.periodo.slice(3)))];
        if (!this.anio) this.anio = this.abierto?.periodo.slice(3) ?? this.anios[0] ?? '';
        if (!this.open.size && this.abierto) this.toggle(this.abierto.periodo);
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  get abierto(): PeriodoPlanilla | undefined { return this.periodos.find((p) => !p.cerrado); }
  get visibles(): PeriodoPlanilla[] { return this.periodos.filter((p) => p.periodo.endsWith(this.anio)); }

  toggle(periodo: string): void {
    if (this.open.has(periodo)) { this.open.delete(periodo); return; }
    this.open.add(periodo);
    this.cargarBoletas(periodo);
  }
  private cargarBoletas(periodo: string): void {
    this.data.boletasPeriodo(periodo).subscribe({ next: (b) => this.boletas.set(periodo, b), error: () => this.boletas.set(periodo, []) });
  }
  conObservaciones(periodo: string): number { return (this.boletas.get(periodo) ?? []).filter((b) => b.observaciones.length).length; }

  procesar(): void {
    const p = this.abierto;
    if (!p || this.ocupado) return;
    this.ocupado = true;
    this.data.procesarPeriodo(p.periodo).subscribe({
      next: (r) => {
        this.ocupado = false;
        this.procesarModal = false;
        this.ui.toast(`Planilla de ${nombrePeriodo(r.periodo)} procesada: ${r.boletas} boletas, neto ${soles(r.neto)}`);
        this.cargar();
        this.cargarBoletas(r.periodo);
      },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }

  cerrarPeriodo(): void {
    const p = this.abierto;
    if (!p || this.ocupado) return;
    this.ocupado = true;
    this.data.cerrarPeriodo(p.periodo).subscribe({
      next: (r) => {
        this.ocupado = false;
        this.cerrarModal = false;
        this.ui.toast(`Período ${nombrePeriodo(r.periodo)} cerrado: ${r.boletas} boletas publicadas`);
        this.open.clear();
        this.cargar();
      },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }
}
