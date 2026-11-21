import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';
import { EstadoEvidencia } from './sample/sst';

export interface CumplimientoSst {
  id: number; nombre: string; normativa: string; categoria: string; descripcion: string;
  /** [vigentes, total] of active assignments. */
  colaboradores: [number, number]; empresas: [number, number]; cumple: boolean; actualizado: string;
}
export interface RequisitoSst {
  id: number; nombre: string; cumplimientoId: number; cumplimiento: string; aplicaA: 'Colaboradores' | 'Empresas'; vigenciaMeses: number | null;
  asignaciones: number; sinEvidencia: number; vigentes: number; porVencer: number; vencidas: number; actualizado: string;
}
export interface AsignacionSstApi {
  id: number; requisitoId: number; requisito: string; cumplimiento: string; aplicaA: 'Colaboradores' | 'Empresas'; colaboradorId: number | null; titular: string;
  documento: string | null; cargo: string | null; area: string | null; estado: EstadoEvidencia; vence: string | null; finalizada: boolean; actualizado: string;
}
export interface EvidenciaSst { id: number; fecha: string; vence: string | null; descripcion: string; registradaPor: string; registrada: string; archivo: string | null; tamano: number | null; }
export interface AsignacionDetalle { asignacion: AsignacionSstApi; evidencias: EvidenciaSst[]; }
export interface DatosSst {
  cumplimientos: CumplimientoSst[]; requisitos: RequisitoSst[]; asignaciones: AsignacionSstApi[];
  biblioteca: { nombre: string; normativa: string; categoria: string; agregado: boolean }[]; empresas: string[];
}

/** SST › Registro de evidencias on the API (administrators). */
@Injectable({ providedIn: 'root' })
export class SstService {
  private readonly url = `${API_URL}/sst`;
  constructor(private http: HttpClient) {}

  datos(): Observable<DatosSst> { return this.http.get<DatosSst>(this.url); }
  crearCumplimiento(c: { nombre: string; normativa: string; categoria: string; descripcion: string }): Observable<unknown> { return this.http.post(`${this.url}/cumplimientos`, c); }
  agregarBiblioteca(nombres: string[]): Observable<number> { return this.http.post<number>(`${this.url}/cumplimientos/biblioteca`, { nombres }); }
  eliminarCumplimiento(id: number): Observable<unknown> { return this.http.delete(`${this.url}/cumplimientos/${id}`); }
  crearRequisito(r: { nombre: string; cumplimientoId: number; aplicaA: string; vigenciaMeses: number | null; todos: boolean; colaboradorIds: number[]; empresas: string[] }): Observable<unknown> {
    return this.http.post(`${this.url}/requisitos`, r);
  }
  eliminarRequisito(id: number): Observable<unknown> { return this.http.delete(`${this.url}/requisitos/${id}`); }
  asignar(requisitoId: number, a: { todos: boolean; colaboradorIds: number[]; empresas: string[] }): Observable<unknown> {
    return this.http.post(`${this.url}/requisitos/${requisitoId}/asignaciones`, a);
  }
  asignacion(id: number): Observable<AsignacionDetalle> { return this.http.get<AsignacionDetalle>(`${this.url}/asignaciones/${id}`); }
  finalizar(id: number): Observable<unknown> { return this.http.post(`${this.url}/asignaciones/${id}/finalizar`, {}); }
  /** Evidence with optional PDF/JPG/PNG file (max 5 MB). */
  registrarEvidencia(id: number, fecha: string, descripcion: string, archivo: File | null): Observable<AsignacionDetalle> {
    const f = new FormData();
    f.append('fecha', fecha);
    f.append('descripcion', descripcion);
    if (archivo) f.append('archivo', archivo, archivo.name);
    return this.http.post<AsignacionDetalle>(`${this.url}/asignaciones/${id}/evidencias`, f);
  }
  /** Downloads the file with the session token (a plain link would not send it). */
  descargar(e: EvidenciaSst): void {
    this.http.get(`${this.url}/evidencias/${e.id}/archivo`, { responseType: 'blob' }).subscribe((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = e.archivo ?? 'evidencia';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
}
