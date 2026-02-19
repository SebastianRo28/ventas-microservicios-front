import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductsApiService } from '../../../core/api/products-api.service';
import { PurchasesApiService } from '../../../core/api/purchases-api.service';
import { ProductModalComponent } from '../../products/product-modal/product-modal.component';

type Product = {
  id_producto: number;
  nombre_producto: string;
  nroLote: string;
  costo: number;
  precioVenta: number;
};

type PurchaseItemUI = {
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio: number;      // precio compra (costo)
  subtotal: number;
};

@Component({
  selector: 'app-purchase-create',
  templateUrl: './purchase-create.component.html',
  styleUrls: ['./purchase-create.component.css']
})
export class PurchaseCreateComponent implements OnInit {

  @ViewChild(ProductModalComponent) productModal!: ProductModalComponent;

  products: Product[] = [];
  selectedProductId: number | null = null;

  cantidad = 1;
  precioCompra = 0;

  items: PurchaseItemUI[] = [];

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(
    private productsApi: ProductsApiService,
    private purchasesApi: PurchasesApiService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.productsApi.list().subscribe({
      next: (res: any) => {
        this.products = res as Product[];
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar productos.';
      }
    });
  }

  get selectedProduct(): Product | undefined {
    return this.products.find(p => p.id_producto === this.selectedProductId!);
  }

  openNewProductModal() {
    this.productModal.open();
  }

  onProductCreated() {
    this.loadProducts();
    this.successMsg = 'Producto creado. Ya puedes seleccionarlo.';
    setTimeout(() => this.successMsg = '', 3000);
  }

  addItem() {
    this.errorMsg = '';
    this.successMsg = '';

    const p = this.selectedProduct;
    if (!p) {
      this.errorMsg = 'Seleccione un producto.';
      return;
    }
    if (this.cantidad <= 0) {
      this.errorMsg = 'Cantidad debe ser mayor a 0.';
      return;
    }
    if (this.precioCompra <= 0) {
      this.errorMsg = 'Precio de compra debe ser mayor a 0.';
      return;
    }

    // Si ya existe en la lista, acumula cantidad y recalcula
    const existing = this.items.find(i => i.id_producto === p.id_producto);
    if (existing) {
      existing.cantidad += this.cantidad;
      existing.precio = this.precioCompra; // toma el último precio ingresado
      existing.subtotal = +(existing.cantidad * existing.precio).toFixed(2);
    } else {
      const subtotal = +(this.cantidad * this.precioCompra).toFixed(2);
      this.items.push({
        id_producto: p.id_producto,
        nombre_producto: p.nombre_producto,
        cantidad: this.cantidad,
        precio: this.precioCompra,
        subtotal
      });
    }

    // reset inputs
    this.cantidad = 1;
    this.precioCompra = 0;
  }

  removeItem(idx: number) {
    this.items.splice(idx, 1);
  }

  get totalCompra(): number {
    return +(this.items.reduce((acc, x) => acc + x.subtotal, 0)).toFixed(2);
  }

  savePurchase() {
    this.errorMsg = '';
    this.successMsg = '';

    if (this.items.length === 0) {
      this.errorMsg = 'Agrega al menos 1 producto.';
      return;
    }

    const payload = {
      items: this.items.map(i => ({
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio: i.precio
      }))
    };

    this.loading = true;
    this.purchasesApi.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.items = [];
        this.successMsg = '✅ Compra registrada correctamente (incluye movimiento Entrada).';
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'Error registrando compra.';
      }
    });
  }

}
