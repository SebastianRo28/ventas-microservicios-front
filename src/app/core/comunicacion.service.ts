import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export type EstadoEncuestaApi = 'Pendiente' | 'En curso' | 'Finalizada';
export interface EncuestaAdmin {
  id: number; nombre: string; tipo: 'Clima' | 'Libre'; descripcion: string; anonima: boolean; creada: string; inicio: string; termino: string;
  participantes: number; respondidas: number; avance: number; estado: EstadoEncuestaApi; preguntas: number;
}
export interface ResultadoPregunta { id: string; texto: string; tipo: 'escala' | 'opcion' | 'texto'; promedio: number | null; conteo: Record<string, number>; comentarios: string[]; }
export interface ResultadosEncuesta { encuesta: EncuestaAdmin; ocultos: boolean; minimo: number; preguntas: ResultadoPregunta[]; }
export interface EncuestaNueva { nombre: string; tipo: 'Clima' | 'Libre'; plantilla: string; inicio: string; termino: string; anonima: boolean; descripcion: string; }

export type EstadoDenunciaApi = 'Nueva' | 'En curso' | 'Finalizada' | 'Descartada';
export interface MensajeDenuncia { autor: 'Denunciante' | 'Comité'; texto: string; fecha: string; }
export interface DenunciaResumen { id: number; codigo: string; nuevosMensajes: number; tipo: string; relacion: string; creada: string; estado: EstadoDenunciaApi; actualizada: string; }
export interface DenunciaDetalle { resumen: DenunciaResumen; descripcion: string; anonima: boolean; denunciante: string | null; resolucion: string; mensajes: MensajeDenuncia[]; }
export interface SeguimientoDenuncia { codigo: string; tipo: string; relacion: string; estado: EstadoDenunciaApi; creada: string; actualizada: string; resolucion: string; mensajes: MensajeDenuncia[]; }
export interface OpcionesDenuncia { tipos: string[]; relaciones: string[]; anonimo: boolean; }

export interface PublicacionApi {
  id: number; titulo: string; texto: string; autor: string; fijada: boolean; estado: 'Publicado' | 'Programado' | 'Borrador';
  publicada: string; expira: string; vistas: number; comentarios: number; reacciones: number; engagement: number | null;
}
export interface PublicacionGuardar { titulo: string; texto: string; autor: string; fijada: boolean; publicarEl: string; expira: string; }

/** Desarrollo Organizacional on the API: surveys, whistleblowing channel and portal publications. */
@Injectable({ providedIn: 'root' })
export class ComunicacionService {
  constructor(private http: HttpClient) {}

  // Encuestas (administración)
  encuestas(tipo: 'Clima' | 'Libre'): Observable<EncuestaAdmin[]> { return this.http.get<EncuestaAdmin[]>(`${API_URL}/encuestas`, { params: { tipo } }); }
  plantillasEncuesta(): Observable<{ clima: string[]; libre: string[] }> { return this.http.get<{ clima: string[]; libre: string[] }>(`${API_URL}/encuestas/plantillas`); }
  crearEncuesta(e: EncuestaNueva): Observable<EncuestaAdmin> { return this.http.post<EncuestaAdmin>(`${API_URL}/encuestas`, e); }
  cerrarEncuesta(id: number): Observable<EncuestaAdmin> { return this.http.post<EncuestaAdmin>(`${API_URL}/encuestas/${id}/cerrar`, {}); }
  eliminarEncuesta(id: number): Observable<unknown> { return this.http.delete(`${API_URL}/encuestas/${id}`); }
  resultados(id: number): Observable<ResultadosEncuesta> { return this.http.get<ResultadosEncuesta>(`${API_URL}/encuestas/${id}/resultados`); }

  // Canal de denuncias
  opcionesDenuncia(): Observable<OpcionesDenuncia> { return this.http.get<OpcionesDenuncia>(`${API_URL}/denuncias/opciones`); }
  crearDenuncia(d: { tipo: string; relacion: string; descripcion: string; anonima: boolean }): Observable<{ codigo: string; estado: string }> {
    return this.http.post<{ codigo: string; estado: string }>(`${API_URL}/denuncias`, d);
  }
  seguimiento(codigo: string): Observable<SeguimientoDenuncia> { return this.http.get<SeguimientoDenuncia>(`${API_URL}/denuncias/seguimiento/${encodeURIComponent(codigo.trim().toUpperCase())}`); }
  mensajeSeguimiento(codigo: string, texto: string): Observable<SeguimientoDenuncia> {
    return this.http.post<SeguimientoDenuncia>(`${API_URL}/denuncias/seguimiento/${encodeURIComponent(codigo)}/mensajes`, { texto });
  }
  denuncias(): Observable<DenunciaResumen[]> { return this.http.get<DenunciaResumen[]>(`${API_URL}/denuncias`); }
  denuncia(id: number): Observable<DenunciaDetalle> { return this.http.get<DenunciaDetalle>(`${API_URL}/denuncias/${id}`); }
  responderDenuncia(id: number, texto: string): Observable<DenunciaDetalle> { return this.http.post<DenunciaDetalle>(`${API_URL}/denuncias/${id}/mensajes`, { texto }); }
  estadoDenuncia(id: number, estado: EstadoDenunciaApi, resolucion: string): Observable<DenunciaDetalle> {
    return this.http.post<DenunciaDetalle>(`${API_URL}/denuncias/${id}/estado`, { estado, resolucion });
  }

  // Publicaciones
  muro(): Observable<PublicacionApi[]> { return this.http.get<PublicacionApi[]>(`${API_URL}/publicaciones/muro`); }
  publicaciones(): Observable<PublicacionApi[]> { return this.http.get<PublicacionApi[]>(`${API_URL}/publicaciones`); }
  guardarPublicacion(id: number | null, p: PublicacionGuardar): Observable<PublicacionApi> {
    return id === null ? this.http.post<PublicacionApi>(`${API_URL}/publicaciones`, p) : this.http.put<PublicacionApi>(`${API_URL}/publicaciones/${id}`, p);
  }
  eliminarPublicacion(id: number): Observable<unknown> { return this.http.delete(`${API_URL}/publicaciones/${id}`); }
}
