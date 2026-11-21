import { Component } from '@angular/core';
import { ActivosService, CategoriaActivoApi, ProductoActivoApi } from '../../core/administracion.service';
import { mensajeError } from '../../core/auth.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const ACC: Column = { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' };
const CCOLS: Column[] = [
  { key: 'id', label: 'ID Categoría', w: '130px' },
  { key: 'n', label: 'Nombre', w: 'minmax(200px, 2fr)' },
  { key: 'c', label: 'Cantidad de productos', type: 'number', filter: 'none', w: 'minmax(180px, 1fr)' }, ACC,
];
const PCOLS: Column[] = [
  { key: 'n', label: 'Producto', w: 'minmax(220px, 2fr)' },
  { key: 'c', label: 'Categoría', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'm', label: 'Marca', filter: 'select', w: 'minmax(140px, 1fr)' },
  { key: 'a', label: 'Activos', type: 'number', filter: 'none', w: '110px' }, ACC,
];

/** P-06.1 Gestión de Activos › Configuraciones (Categorías, Productos) on the API. */
@Component({
  selector: 'app-activos-config',
  templateUrl: './activos-config.component.html'
})
export class ActivosConfigComponent {
  readonly ccols = CCOLS;
  readonly pcols = PCOLS;
  readonly actions: RowAction[] = ['editar', 'eliminar'];
  readonly prodActions: RowAction[] = ['eliminar'];
  tab = 0;
  catRows: Row[] = [];
  prodRows: Row[] = [];
  categorias: CategoriaActivoApi[] = [];
  private productos: ProductoActivoApi[] = [];

  catModal: { id: number | null; nombre: string } | null = null;
  prodModal = false;
  intento = false;
  error = '';
  ocupado = false;
  prod = { categoriaId: null as number | null, nombre: '', marca: '' };

  constructor(private api: ActivosService, private ui: UiStateService) { this.cargar(); }

  cargar(): void {
    this.api.datos().subscribe({
      next: (d) => {
        this.categorias = d.categorias;
        this.productos = d.productos;
        this.catRows = d.categorias.map((c) => ({ id: c.id, n: c.nombre, c: c.productos, x: '' }));
        this.prodRows = d.productos.map((p) => ({ id: p.id, n: p.nombre, c: p.categoria, m: p.marca, a: p.activos, x: '' }));
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  // --- Categorías -----------------------------------------------------------
  onCatAction(action: RowAction, row: Row): void {
    const cat = this.categorias.find((c) => c.id === row.id);
    if (!cat) return;
    if (action === 'editar') { this.intento = false; this.error = ''; this.catModal = { id: cat.id, nombre: cat.nombre }; }
    if (action === 'eliminar') {
      this.api.eliminarCategoria(cat.id).subscribe({
        next: () => { this.ui.toast(`Categoría “${cat.nombre}” eliminada`); this.cargar(); },
        error: (e) => this.ui.toast(mensajeError(e)),
      });
    }
  }

  newCategoria(): void { this.intento = false; this.error = ''; this.catModal = { id: null, nombre: '' }; }

  saveCategoria(): void {
    this.intento = true;
    const m = this.catModal;
    if (!m || !m.nombre.trim() || this.ocupado) return;
    const nombre = m.nombre.trim();
    this.ocupado = true;
    this.api.guardarCategoria(m.id, nombre).subscribe({
      next: () => { this.ocupado = false; this.catModal = null; this.ui.toast(`Categoría “${nombre}” guardada`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  // --- Productos ------------------------------------------------------------
  newProducto(): void {
    this.intento = false;
    this.error = '';
    this.prod = { categoriaId: this.categorias[0]?.id ?? null, nombre: '', marca: '' };
    this.prodModal = true;
  }

  saveProducto(): void {
    this.intento = true;
    const p = this.prod;
    if (!p.nombre.trim() || !p.marca.trim() || p.categoriaId === null || this.ocupado) return;
    this.ocupado = true;
    this.api.crearProducto({ nombre: p.nombre.trim(), categoriaId: p.categoriaId, marca: p.marca.trim() }).subscribe({
      next: () => { this.ocupado = false; this.prodModal = false; this.ui.toast(`Producto “${p.nombre.trim()}” creado`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  onProdAction(action: RowAction, row: Row): void {
    const p = this.productos.find((x) => x.id === row.id);
    if (!p || action !== 'eliminar') return;
    this.api.eliminarProducto(p.id).subscribe({
      next: () => { this.ui.toast(`Producto “${p.nombre}” eliminado`); this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
}
