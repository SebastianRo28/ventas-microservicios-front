import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Tone } from '../../core/models';
import { Activo, EstadoActivo } from '../../core/sample/catalogos';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

export const ESTADO_ACTIVO_TONE: Record<EstadoActivo, Tone> = { Disponible: 'success', Asignado: 'info', Mantenimiento: 'orange', Inactivo: 'gray' };

const COLUMNS: Column[] = [
  { key: 'id', label: 'ID activo', w: '110px' },
  { key: 'n', label: 'Nombre del activo', w: 'minmax(220px, 1.8fr)' },
  { key: 'c', label: 'Categoría', filter: 'select', w: 'minmax(130px, 1fr)' },
  { key: 'm', label: 'Marca', filter: 'select', w: 'minmax(120px, 0.9fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '150px' },
  { key: 'a', label: 'Asignado a', w: 'minmax(190px, 1.3fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/** P-06.2 Gestión de Activos › Inventario, with P-06.4 history and a change-state/assign dialog. */
@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html'
})
export class InventarioComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['cambiar', 'historial', 'mas'];
  readonly tone = ESTADO_ACTIVO_TONE;
  readonly estados: EstadoActivo[] = ['Disponible', 'Asignado', 'Mantenimiento', 'Inactivo'];
  activos: Activo[] = [];
  rows: Row[] = [];
  personas: string[] = [];

  historial: Activo | null = null;
  cambio: Activo | null = null;
  form = { estado: 'Disponible' as EstadoActivo, asignado: '', comentario: '' };

  constructor(data: HrDataService, public ui: UiStateService) {
    data.activos().subscribe((a) => { this.activos = a; this.refresh(); });
    data.colaboradores().subscribe((l) => (this.personas = l.map((c) => `${c.apellidos}, ${c.nombres}`)));
  }

  count(e?: EstadoActivo): number { return e ? this.activos.filter((a) => a.estado === e).length : this.activos.length; }

  private refresh(): void {
    this.rows = this.activos.map((a) => ({
      id: a.id, n: a.nombre, c: a.categoria, m: a.marca, e: { text: a.estado, tone: ESTADO_ACTIVO_TONE[a.estado] }, a: a.asignado, x: '',
    }));
  }

  onAction(action: RowAction, row: Row): void {
    const a = this.activos.find((x) => x.id === row.id);
    if (!a) return;
    if (action === 'historial') this.historial = a;
    if (action === 'cambiar') this.openCambio(a);
  }

  openCambio(a: Activo): void {
    this.historial = null;
    this.cambio = a;
    this.form = { estado: a.estado, asignado: a.asignado === '—' ? '' : a.asignado, comentario: '' };
  }

  get cambioValido(): boolean { return this.form.estado !== 'Asignado' || !!this.form.asignado; }

  guardarCambio(): void {
    const a = this.cambio;
    if (!a || !this.cambioValido) return;
    const asignado = this.form.estado === 'Asignado' ? this.form.asignado : '—';
    const fecha = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    a.historial.unshift({ fecha, asignado, estado: this.form.estado, comentario: this.form.comentario.trim() || '—', admin: 'Rodrigo Paredes' });
    a.estado = this.form.estado;
    a.asignado = asignado;
    this.cambio = null;
    this.refresh();
    this.ui.toast(`Activo ${a.id} actualizado`);
  }
}
