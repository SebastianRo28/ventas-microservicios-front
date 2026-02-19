import { Component, OnInit } from '@angular/core';
import { KardexApiService } from '../../../core/api/kardex-api.service';

@Component({
  selector: 'app-kardex-list',
  templateUrl: './kardex-list.component.html',
  styleUrls: ['./kardex-list.component.css']
})
export class KardexListComponent implements OnInit {

  productos: any[] = [];
  products: any[] = [];
  movimientos: any[] = [];
  selectedProduct: any;

  constructor(private kardexApi: KardexApiService) {}

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
            PrecioVenta: item.precioVenta,
            costo: item.costo
          });
        }
  
        return acc;
      }, []);
  
      this.products = agrupado;
      this.productos = res;
    });
  }

  viewMovements(product: any) {
    this.selectedProduct = product;
    this.movimientos = this.productos.filter(p => 
      p.id_Producto === product.id_producto
    );
  }

}
