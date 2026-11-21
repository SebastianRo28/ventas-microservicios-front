import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export type EstadoActivo = 'Disponible' | 'Asignado' | 'Mantenimiento' | 'Inactivo';
export type EstadoOrden = 'Pendiente' | 'Atrasado' | 'Asignada' | 'Rechazada';
export interface ActivoApi { codigo: string; productoId: number; producto: string; categoria: string; marca: string; estado: EstadoActivo; asignadoId: number | null; asignado: string; }
export interface MovimientoActivoApi { fecha: string; asignado: string; estado: EstadoActivo; comentario: string; admin: string; }
export interface OrdenActivoApi {
  id: number; origen: string; productoId: number; producto: string; categoria: string; paraId: number | null; para: string; area: string; cargo: string;
  solicitante: string; solicitada: string; asignarEl: string; estado: EstadoOrden; activoCodigo: string | null; comentario: string;
}
export interface CategoriaActivoApi { id: number; nombre: string; productos: number; }
export interface ProductoActivoApi { id: number; nombre: string; categoriaId: number; categoria: string; marca: string; activos: number; }
export interface DatosActivos { activos: ActivoApi[]; ordenes: OrdenActivoApi[]; categorias: CategoriaActivoApi[]; productos: ProductoActivoApi[]; }

/** Gestión de Activos on the API (administrators). */
@Injectable({ providedIn: 'root' })
export class ActivosService {
  private readonly url = `${API_URL}/activos`;
  constructor(private http: HttpClient) {}

  datos(): Observable<DatosActivos> { return this.http.get<DatosActivos>(this.url); }
  historial(codigo: string): Observable<MovimientoActivoApi[]> { return this.http.get<MovimientoActivoApi[]>(`${this.url}/${codigo}/historial`); }
  cambiar(codigo: string, c: { estado: EstadoActivo; asignadoId: number | null; comentario: string }): Observable<unknown> { return this.http.put(`${this.url}/${codigo}`, c); }
  ingresar(productoId: number, cantidad: number, comentario: string): Observable<string[]> { return this.http.post<string[]>(this.url, { productoId, cantidad, comentario }); }
  crearOrden(o: { productoId: number; paraId: number; asignarEl: string; comentario: string }): Observable<number> { return this.http.post<number>(`${this.url}/ordenes`, o); }
  atender(id: number): Observable<{ activoCodigo: string }> { return this.http.post<{ activoCodigo: string }>(`${this.url}/ordenes/${id}/asignar`, {}); }
  rechazar(id: number, comentario: string): Observable<unknown> { return this.http.post(`${this.url}/ordenes/${id}/rechazar`, { comentario }); }
  guardarCategoria(id: number | null, nombre: string): Observable<unknown> {
    return id === null ? this.http.post(`${this.url}/categorias`, { nombre }) : this.http.put(`${this.url}/categorias/${id}`, { nombre });
  }
  eliminarCategoria(id: number): Observable<unknown> { return this.http.delete(`${this.url}/categorias/${id}`); }
  crearProducto(p: { nombre: string; categoriaId: number; marca: string }): Observable<unknown> { return this.http.post(`${this.url}/productos`, p); }
  eliminarProducto(id: number): Observable<unknown> { return this.http.delete(`${this.url}/productos/${id}`); }
}

export type Check = 'si' | 'no' | 'na';
export interface DocumentoApi { id: number; colaboradorId: number; colaborador: string; empresa: string; archivo: string; fecha: string; revision: Check; firmaColaborador: Check; firmaEmpresa: Check; oculto: boolean; }
export interface DocumentoEliminadoApi { id: number; colaborador: string; empresa: string; archivo: string; fecha: string; eliminado: string; eliminadoPor: string; disponibleHasta: string; }
export interface PlantillaDocumentoApi { id: number; nombre: string; tipo: string; carpeta: string; activa: boolean; }
export interface DatosDocumentos { documentos: DocumentoApi[]; papelera: DocumentoEliminadoApi[]; plantillas: PlantillaDocumentoApi[]; }
export interface ResultadoLote { procesados: number; omitidos: number; }

/** Documentos y Firma on the API (administrators). */
@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly url = `${API_URL}/documentos`;
  constructor(private http: HttpClient) {}

  datos(): Observable<DatosDocumentos> { return this.http.get<DatosDocumentos>(this.url); }
  estadoPlantilla(id: number, activa: boolean): Observable<unknown> { return this.http.post(`${this.url}/plantillas/${id}/estado`, { activa }); }
  firmar(ids: number[]): Observable<ResultadoLote> { return this.http.post<ResultadoLote>(`${this.url}/firmar`, { ids }); }
  revisar(ids: number[]): Observable<ResultadoLote> { return this.http.post<ResultadoLote>(`${this.url}/revisar`, { ids }); }
  ocultar(ids: number[], oculto: boolean): Observable<ResultadoLote> { return this.http.post<ResultadoLote>(`${this.url}/ocultar`, { ids, oculto }); }
  eliminar(ids: number[]): Observable<ResultadoLote> { return this.http.post<ResultadoLote>(`${this.url}/eliminar`, { ids }); }
  restaurar(id: number): Observable<unknown> { return this.http.post(`${this.url}/papelera/${id}/restaurar`, {}); }
  eliminarDefinitivo(id: number): Observable<unknown> { return this.http.delete(`${this.url}/papelera/${id}`); }
}

export interface BandaApi { id: number; cargo: string; objetivo: number; pctMin: number; pctMax: number; activo: boolean; }
export interface RemuneracionApi { colaboradorId: number; sueldoBase: number; ultimaModificacion: string; evaluacion: string; compTeorica: number | null; }
export interface CargoMercadoApi { id: number; cargo: string; interno: string | null; descripcion: string; industria: string; tamano: string; p25: number; p50: number; p75: number; p90: number; }
export interface DatosCompensaciones { bandas: BandaApi[]; remuneraciones: RemuneracionApi[]; estudio: CargoMercadoApi[]; }

/** Compensaciones on the API (administrators). */
@Injectable({ providedIn: 'root' })
export class CompensacionesService {
  private readonly url = `${API_URL}/compensaciones`;
  constructor(private http: HttpClient) {}

  datos(): Observable<DatosCompensaciones> { return this.http.get<DatosCompensaciones>(this.url); }
  guardarBanda(id: number | null, b: { cargo: string; objetivo: number; pctMin: number; pctMax: number }): Observable<BandaApi> {
    return id === null ? this.http.post<BandaApi>(`${this.url}/bandas`, b) : this.http.put<BandaApi>(`${this.url}/bandas/${id}`, b);
  }
  eliminarBanda(id: number): Observable<unknown> { return this.http.delete(`${this.url}/bandas/${id}`); }
  compTeorica(colaboradorId: number, monto: number, comentario: string): Observable<unknown> {
    return this.http.put(`${this.url}/remuneraciones/${colaboradorId}/teorica`, { monto, comentario });
  }
  emparejar(id: number, interno: string | null): Observable<unknown> { return this.http.put(`${this.url}/estudio/${id}/interno`, { interno }); }
}

export interface PosicionApi { id: string; cargo: string; division: string; area: string; subArea: string; ingreso: string; termino: string; vigente: boolean; }
export interface DatosHeadcount { posiciones: PosicionApi[]; planArea: Record<string, number>; planCargo: Record<string, number>; }

/** Headcount on the API (administrators). */
@Injectable({ providedIn: 'root' })
export class HeadcountService {
  private readonly url = `${API_URL}/headcount`;
  constructor(private http: HttpClient) {}

  datos(): Observable<DatosHeadcount> { return this.http.get<DatosHeadcount>(this.url); }
  crear(p: { cargo: string; division: string; area: string; subArea: string; ingreso: string; termino: string; cantidad: number }): Observable<string[]> {
    return this.http.post<string[]>(`${this.url}/posiciones`, p);
  }
  eliminar(codigo: string): Observable<unknown> { return this.http.delete(`${this.url}/posiciones/${codigo}`); }
}
