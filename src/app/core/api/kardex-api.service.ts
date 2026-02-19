import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface KardexMovement {
    id_MovimientoCab: number;
    fec_registro: string;         // viene como string ISO desde API
    id_TipoMovimiento: number;    // 1 entrada, 2 salida
    id_DocumentoOrigen: number;
  
    id_MovimientoDet: number;
    id_Producto: number;
    nombre_producto: string;
    nroLote: string;
    precioVenta: number;
    costo: number;
    cantidad: number;
    entrada: number;
    salida: number;
  }

@Injectable({ providedIn: 'root' })
export class KardexApiService {
  private base = 'https://localhost:7095/api/Kardex'; // ajusta

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<KardexMovement[]>(`${this.base}/list`);
  }
}