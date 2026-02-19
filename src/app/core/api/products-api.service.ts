import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

export interface Product {
  id_producto: number;
  nombre_producto: string;
  nroLote: string;
  costo: number;
  precioVenta: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private base = 'https://localhost:7040/api/Products';

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<Product[]>(`${this.base}/list`);
  }

  register(payload: any) {
    return this.http.post(`${this.base}/register`, payload);
  }

  update(payload: any) {
    return this.http.put(`${this.base}/update`, payload);
  }
}