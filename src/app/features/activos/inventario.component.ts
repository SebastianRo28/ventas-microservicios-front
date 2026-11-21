import { Component } from '@angular/core';
import { ActivoApi, ActivosService, EstadoActivo, MovimientoActivoApi, ProductoActivoApi } from '../../core/administracion.service';
import { mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { Tone } from '../../core/models';
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

/**
 * P-06.2 Gestión de Activos › Inventario (API), with P-06.4 history and a change-state/assign dialog. Every change is
 * saved as a movement in the asset's history.
 */
@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html'
})
export class InventarioComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['cambiar', 'historial'];
  readonly tone = ESTADO_ACTIVO_TONE;
  readonly estados: EstadoActivo[] = ['Disponible', 'Asignado', 'Mantenimiento', 'Inactivo'];
  activos: ActivoApi[] = [];
  productos: ProductoActivoApi[] = [];
  rows: Row[] = [];
  personas: { id: number; nombre: string }[] = [];

  historial: { activo: ActivoApi; movimientos: MovimientoActivoApi[] } | null = null;
  cambio: ActivoApi | null = null;
  form = { estado: 'Disponible' as EstadoActivo, asignadoId: null as number | null, comentario: '' };
  alta: { productoId: number | null; cantidad: number; comentario: string } | null = null;
  error = '';
  ocupado = false;

  constructor(private api: ActivosService, data: HrDataService, public ui: UiStateService) {
    data.colaboradores().subscribe((l) => (this.personas = l.map((c) => ({ id: c.id, nombre: `${c.apellidos}, ${c.nombres}` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))));
    this.cargar();
  }

  cargar(): void {
    this.api.datos().subscribe({
      next: (d) => {
        this.activos = d.activos;
        this.productos = d.productos;
        this.rows = d.activos.map((a) => ({
          id: a.codigo, n: a.producto, c: a.categoria, m: a.marca, e: { text: a.estado, tone: ESTADO_ACTIVO_TONE[a.estado] }, a: a.asignado, x: '',
        }));
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  count(e?: EstadoActivo): number { return e ? this.activos.filter((a) => a.estado === e).length : this.activos.length; }

  onAction(action: RowAction, row: Row): void {
    const a = this.activos.find((x) => x.codigo === row.id);
    if (!a) return;
    if (action === 'historial') this.verHistorial(a);
    if (action === 'cambiar') this.openCambio(a);
  }

  verHistorial(a: ActivoApi): void {
    this.api.historial(a.codigo).subscribe({ next: (m) => (this.historial = { activo: a, movimientos: m }), error: (e) => this.ui.toast(mensajeError(e)) });
  }

  openCambio(a: ActivoApi): void {
    this.historial = null;
    this.error = '';
    this.cambio = a;
    this.form = { estado: a.estado, asignadoId: a.asignadoId, comentario: '' };
  }

  get cambioValido(): boolean { return this.form.estado !== 'Asignado' || this.form.asignadoId !== null; }

  guardarCambio(): void {
    const a = this.cambio;
    if (!a || !this.cambioValido || this.ocupado) return;
    this.ocupado = true;
    this.api.cambiar(a.codigo, { estado: this.form.estado, asignadoId: this.form.estado === 'Asignado' ? this.form.asignadoId : null, comentario: this.form.comentario.trim() }).subscribe({
      next: () => { this.ocupado = false; this.cambio = null; this.ui.toast(`Activo ${a.codigo} actualizado`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  // --- Alta de unidades --------------------------------------------------------------------------------------------
  abrirAlta(): void {
    this.error = '';
    this.alta = { productoId: this.productos[0]?.id ?? null, cantidad: 1, comentario: '' };
  }

  guardarAlta(): void {
    const m = this.alta;
    if (!m || this.ocupado) return;
    if (m.productoId === null) { this.error = 'Elige el producto (créalo antes en Configuraciones).'; return; }
    if (!(Number.isInteger(+m.cantidad) && +m.cantidad >= 1 && +m.cantidad <= 100)) { this.error = 'La cantidad debe estar entre 1 y 100.'; return; }
    this.ocupado = true;
    this.api.ingresar(m.productoId, +m.cantidad, m.comentario.trim()).subscribe({
      next: (c) => { this.ocupado = false; this.alta = null; this.ui.toast(c.length === 1 ? `Activo ${c[0]} ingresado` : `${c.length} activos ingresados (${c[0]} a ${c[c.length - 1]})`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }
}
