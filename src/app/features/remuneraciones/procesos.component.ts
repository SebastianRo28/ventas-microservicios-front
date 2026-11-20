import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { ESTADO_TONE, PeriodoProcesos } from '../../core/sample/remuneraciones';
import { UiStateService } from '../../core/ui-state.service';

/** P-03.2 Procesos, with P-03.3 modal "Procesar". */
@Component({
  selector: 'app-procesos',
  templateUrl: './procesos.component.html'
})
export class ProcesosComponent {
  readonly tone = ESTADO_TONE;
  anio = '2026';
  periodos: PeriodoProcesos[] = [];
  open = new Set<number>([0]);
  procesado = false;
  procesarModal = false;
  cerrarModal = false;
  etapas = { recalcular: true, archivos: true };

  constructor(data: HrDataService, private ui: UiStateService) {
    data.periodosProcesos().subscribe((p) => (this.periodos = p));
  }

  get visibles(): PeriodoProcesos[] {
    return this.periodos.filter((p) => p.label.endsWith(this.anio.slice(2)));
  }

  toggle(i: number): void { this.open.has(i) ? this.open.delete(i) : this.open.add(i); }

  /** Runs the selected stages of the general process for the open period. */
  procesar(): void {
    const abierto = this.periodos.find((p) => p.abierto);
    if (!abierto || (!this.etapas.recalcular && !this.etapas.archivos)) return;
    if (this.etapas.archivos) abierto.archivos?.forEach((a) => (a.estado = 'Actualizado'));
    this.procesado = true;
    this.procesarModal = false;
  }

  cerrarPeriodo(): void {
    const abierto = this.periodos.find((p) => p.abierto);
    if (abierto) {
      abierto.abierto = false;
      this.ui.toast(`Período ${abierto.label} cerrado`);
    }
    this.cerrarModal = false;
  }
}
