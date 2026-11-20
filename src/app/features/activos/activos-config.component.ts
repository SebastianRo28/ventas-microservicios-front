import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Categoria, Producto } from '../../core/sample/operaciones';
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

/** P-06.1 Gestión de Activos › Configuraciones (Categorías, Productos) with modal "Crear Producto". */
@Component({
  selector: 'app-activos-config',
  templateUrl: './activos-config.component.html'
})
export class ActivosConfigComponent {
  readonly ccols = CCOLS;
  readonly pcols = PCOLS;
  readonly actions: RowAction[] = ['editar', 'eliminar'];
  tab = 0;
  catRows: Row[] = [];
  prodRows: Row[] = [];
  categorias: Categoria[] = [];
  private productos: Producto[] = [];

  /** Modals */
  catModal: { id: number | null; nombre: string } | null = null;
  prodModal = false;
  intento = false;
  avanzado = true;
  docsAuto = true;
  prod = { categoria: 'Uniformes', nombre: '', marca: '' };

  constructor(data: HrDataService, private ui: UiStateService) {
    data.categorias().subscribe((c) => (this.categorias = c));
    data.productos().subscribe((p) => { this.productos = p; this.refresh(); });
  }

  private refresh(): void {
    const count = (cat: string) => this.productos.filter((p) => p.categoria === cat).length;
    this.catRows = this.categorias.map((c) => ({ id: c.id, n: c.nombre, c: count(c.nombre), x: '' }));
    this.prodRows = this.productos.map((p) => ({ id: p.id, n: p.nombre, c: p.categoria, m: p.marca, a: p.activos, x: '' }));
  }

  // --- Categorías -----------------------------------------------------------
  onCatAction(action: RowAction, row: Row): void {
    const cat = this.categorias.find((c) => c.id === row.id);
    if (!cat) return;
    if (action === 'editar') { this.intento = false; this.catModal = { id: cat.id, nombre: cat.nombre }; }
    if (action === 'eliminar') {
      const n = this.productos.filter((p) => p.categoria === cat.nombre).length;
      if (n > 0) { this.ui.toast(`No se puede eliminar “${cat.nombre}”: tiene ${n} producto(s)`); return; }
      this.categorias.splice(this.categorias.indexOf(cat), 1);
      this.ui.toast(`Categoría “${cat.nombre}” eliminada`);
      this.refresh();
    }
  }

  newCategoria(): void { this.intento = false; this.catModal = { id: null, nombre: '' }; }

  saveCategoria(): void {
    this.intento = true;
    const m = this.catModal;
    if (!m || !m.nombre.trim()) return;
    const nombre = m.nombre.trim();
    if (m.id === null) {
      this.categorias.push({ id: Math.max(0, ...this.categorias.map((c) => c.id)) + 1, nombre });
    } else {
      const cat = this.categorias.find((c) => c.id === m.id);
      if (cat) {
        this.productos.filter((p) => p.categoria === cat.nombre).forEach((p) => (p.categoria = nombre));
        cat.nombre = nombre;
      }
    }
    this.catModal = null;
    this.refresh();
    this.ui.toast(`Categoría “${nombre}” guardada`);
  }

  // --- Productos ------------------------------------------------------------
  newProducto(): void {
    this.intento = false;
    this.prod = { categoria: this.categorias[0]?.nombre ?? '', nombre: '', marca: '' };
    this.prodModal = true;
  }

  saveProducto(): void {
    this.intento = true;
    if (!this.prod.nombre.trim() || !this.prod.marca.trim()) return;
    this.productos.push({ id: Math.max(0, ...this.productos.map((p) => p.id)) + 1, nombre: this.prod.nombre.trim(),
      categoria: this.prod.categoria, marca: this.prod.marca.trim(), activos: 0 });
    this.prodModal = false;
    this.refresh();
    this.ui.toast(`Producto “${this.prod.nombre.trim()}” creado`);
  }

  onProdAction(action: RowAction, row: Row): void {
    const p = this.productos.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'eliminar') {
      if (p.activos > 0) { this.ui.toast(`No se puede eliminar “${p.nombre}”: tiene ${p.activos} activo(s) en el inventario`); return; }
      this.productos.splice(this.productos.indexOf(p), 1);
      this.refresh();
      this.ui.toast(`Producto “${p.nombre}” eliminado`);
    }
    if (action === 'editar') this.ui.toast('La edición de productos llegará en la próxima versión');
  }
}
