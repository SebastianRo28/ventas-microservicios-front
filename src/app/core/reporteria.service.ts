import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { API_URL } from './api';

export type TipoPlantillaReporte = 'blank' | 'pre' | 'custom';
export interface PlantillaReporteApi { titulo: string; categoria: string; tipo: TipoPlantillaReporte; descripcion: string; generable: boolean; requierePeriodo: boolean; }
export interface ReporteApi { id: number; nombre: string; plantilla: string; categoria: string; creado: string; creadoPor: string; generable: boolean; requierePeriodo: boolean; }
export interface EjecucionApi { id: number; reporte: string; plantilla: string; periodo: string | null; usuario: string; fecha: string; filas: number; }
export interface DatosReportes { reportes: ReporteApi[]; historial: EjecucionApi[]; plantillas: PlantillaReporteApi[]; periodos: string[]; }
export interface ErrorCargaApi { fila: number; campo: string; mensaje: string; }
export interface ResultadoImportacion { archivo: string; filas: number; creados: number; errores: ErrorCargaApi[]; cargaId: number | null; estado: 'Exitosa' | 'Con errores' | 'Fallida'; }
export interface CargaApi { id: number; importador: string; archivo: string; usuario: string; fecha: string; registros: number; estado: 'Exitosa' | 'Con errores' | 'Fallida'; errores: ErrorCargaApi[]; }
export interface ColumnaImportacion { columna: string; obligatoria: boolean; formato: string; }

/** Template of the Colaboradores importer (same order and rules as the API). */
export const COLUMNAS_COLABORADORES: ColumnaImportacion[] = [
  { columna: 'Apellidos', obligatoria: true, formato: 'Máximo 80 caracteres' },
  { columna: 'Nombres', obligatoria: true, formato: 'Máximo 80 caracteres' },
  { columna: 'Tipo de documento', obligatoria: false, formato: 'DNI, Carné de extranjería o Pasaporte (vacío = DNI)' },
  { columna: 'Número de documento', obligatoria: true, formato: 'DNI: 8 dígitos; otros: 6 a 12 letras o números. No debe existir en Nexo RH' },
  { columna: 'Cargo', obligatoria: true, formato: 'Nombre exacto de un cargo activo de Organización › Cargos' },
  { columna: 'División', obligatoria: true, formato: 'Texto' },
  { columna: 'Área', obligatoria: true, formato: 'Texto' },
  { columna: 'Sub-área', obligatoria: true, formato: 'Texto' },
  { columna: 'Fecha de ingreso', obligatoria: true, formato: 'DD/MM/AAAA' },
  { columna: 'Sueldo neto', obligatoria: true, formato: 'Número mayor a 0 (ej. 3500.00)' },
  { columna: 'Sueldo base', obligatoria: false, formato: 'Número mayor a 0' },
  { columna: 'Correo corporativo', obligatoria: false, formato: 'nombre@empresa.pe' },
  { columna: 'Teléfono', obligatoria: false, formato: 'Texto' },
  { columna: 'Fecha de nacimiento', obligatoria: false, formato: 'DD/MM/AAAA (mínimo 14 años)' },
  { columna: 'Jefatura', obligatoria: false, formato: '“Apellidos, Nombres” de un colaborador ya registrado' },
];

/** Reportería on the API (administrators): Exportadores, Importador de colaboradores and Historial de Cargas. */
@Injectable({ providedIn: 'root' })
export class ReporteriaService {
  private readonly url = `${API_URL}/reportes`;
  constructor(private http: HttpClient) {}

  datos(): Observable<DatosReportes> { return this.http.get<DatosReportes>(this.url); }
  crear(plantilla: string): Observable<ReporteApi> { return this.http.post<ReporteApi>(this.url, { plantilla }); }
  duplicar(id: number): Observable<ReporteApi> { return this.http.post<ReporteApi>(`${this.url}/${id}/duplicar`, {}); }
  eliminar(ids: number[]): Observable<unknown> { return this.http.post(`${this.url}/eliminar`, { ids }); }
  generar(id: number, periodo: string | null): Observable<void> {
    return this.archivo(`${this.url}/${id}/archivo`, periodo ? { periodo } : {});
  }
  regenerar(ejecucionId: number): Observable<void> { return this.archivo(`${this.url}/historial/${ejecucionId}/archivo`, {}); }

  templateColaboradores(): Observable<void> { return this.archivo(`${API_URL}/colaboradores/importar/template`, {}); }
  importarColaboradores(archivo: File, validar: boolean): Observable<ResultadoImportacion> {
    const f = new FormData();
    f.append('archivo', archivo, archivo.name);
    return this.http.post<ResultadoImportacion>(`${API_URL}/colaboradores/importar`, f, { params: validar ? { validar: true } : {} });
  }
  cargas(): Observable<CargaApi[]> { return this.http.get<CargaApi[]>(`${API_URL}/cargas`); }

  /** Downloads a file from the API using the name it sends; JSON errors inside a blob are turned back into normal errors. */
  private archivo(url: string, params: Record<string, string>): Observable<void> {
    return this.http.get(url, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((r: HttpResponse<Blob>) => {
        const cd = r.headers.get('content-disposition') ?? '';
        const nombre = decodeURIComponent(/filename\*=UTF-8''([^;]+)/i.exec(cd)?.[1] ?? /filename="?([^";]+)"?/i.exec(cd)?.[1] ?? 'reporte.csv');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(r.body!);
        a.download = nombre;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }),
      catchError((e: HttpErrorResponse) => e.error instanceof Blob
        ? from(e.error.text()).pipe(switchMap((t) => {
            let error: unknown = t;
            try { error = JSON.parse(t); } catch { /* not JSON */ }
            return throwError(() => new HttpErrorResponse({ error, status: e.status, statusText: e.statusText, url: e.url ?? undefined }));
          }))
        : throwError(() => e)),
    );
  }
}
