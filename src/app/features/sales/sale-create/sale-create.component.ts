import { Component, OnInit } from '@angular/core';
import { SalesApiService } from '../../../core/api/sales-api.service';
import { KardexApiService } from '../../../core/api/kardex-api.service';

@Component({
  selector: 'app-sale-create',
  templateUrl: './sale-create.component.html',
  styleUrls: ['./sale-create.component.css']
})
export class SaleCreateComponent implements OnInit {

  products: any[] = [];
  selectedProduct: any;

  cantidad: number = 1;
  items: any[] = [];

  constructor(
    private salesApi: SalesApiService,
    private kardexApi: KardexApiService
  ) {}

  ngOnInit(): void {
    this.kardexApi.list().subscribe(res => {
      console.log(res);
      const agrupado = res.reduce((acc: any[], item: any) => {

        const existente = acc.find(p => p.nombre_producto === item.nombre_producto);
  
        if (existente) {
          existente.cantidad += item.cantidad;
        } else {
          acc.push({
            id_producto: item.id_Producto,
            nombre_producto: item.nombre_producto,
            cantidad: item.cantidad,
            PrecioVenta: item.precioVenta
          });
        }
  
        return acc;
      }, []);
  
      this.products = agrupado;
    });
  }

  addItem() {
    if (this.cantidad > this.selectedProduct.cantidad) {
      alert('Cantidad no puede ser mayor al stock');
      return;
    }

    const precio = this.selectedProduct.PrecioVenta;
    const subtotal = this.cantidad * precio;
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    console.log(this.selectedProduct);
    this.items.push({
      id_producto: this.selectedProduct.id_producto,
      nombre: this.selectedProduct.nombre_producto,
      cantidad: this.cantidad,
      precio: precio,
      subtotal: subtotal,
      igv: igv,
      total: total
    });
  }

  saveSale() {
    const payload = {
      items: this.items.map(i => ({
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio: i.precio
      }))
    };

    this.salesApi.register(payload).subscribe(() => {
      alert('Venta registrada');
      this.items = [];
    });
  }

}
