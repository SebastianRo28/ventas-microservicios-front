import { Component, EventEmitter, Output } from '@angular/core';
import { ProductsApiService } from '../../../core/api/products-api.service';

declare var bootstrap: any;

@Component({
  selector: 'app-product-modal',
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.css']
})
export class ProductModalComponent {

  @Output() productCreated = new EventEmitter<void>();

  model = {
    nombre_producto: '',
    nroLote: '',
    costo: 0,
    precioVenta: 0
  };

  loading = false;
  errorMsg = '';
  isDisabled = true;

  constructor(private productsApi: ProductsApiService) {}

  open() {
    this.reset();
    const modalEl = document.getElementById('productModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  close() {
    const modalEl = document.getElementById('productModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
  }

  calcularPrecioVenta(): void {
    const costo = Number(this.model.costo) || 0;
    this.model.precioVenta = +(costo * 1.35).toFixed(2);
  }

  reset() {
    this.model = {
      nombre_producto: '',
      nroLote: '',
      costo: 0,
      precioVenta: 0
    };
    this.errorMsg = '';
  }

  save() {
    this.errorMsg = '';
    if (!this.model.nombre_producto?.trim()) {
      this.errorMsg = 'Ingrese nombre de producto.';
      return;
    }
    if (!this.model.nroLote?.trim()) {
      this.errorMsg = 'Ingrese nro de lote.';
      return;
    }
    if (this.model.costo <= 0) {
      this.errorMsg = 'El costo debe ser mayor a 0.';
      return;
    }

    // Requisito: precio venta = costo * 1.35 (si tu backend también lo hace, esto igual ayuda UX)
    if (!this.model.precioVenta || this.model.precioVenta <= 0) {
      this.model.precioVenta = +(this.model.costo * 1.35).toFixed(2);
    }

    this.loading = true;

    this.productsApi.register(this.model).subscribe({
      next: () => {
        this.loading = false;
        this.productCreated.emit();
        this.close();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'Error registrando producto.';
      }
    });
  }

}
