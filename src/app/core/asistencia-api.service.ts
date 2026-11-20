import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { API_URL } from './api';
import { AuthService, mensajeError } from './auth.service';
import { UiStateService } from './ui-state.service';
import {
  AprobacionHhee, AsignacionTurno, CambioTurno, Marca, MarcaFallida, NotaSupervisor, Recinto, TipoContrato, Turno
} from './sample/control-asistencia';
import { Ausencia, Feriado, LicenciaMedica, RecargoDomingo, SolicitudAsistencia, Vacacion } from './sample/asistencia';

/** Attendance data of one collaborator that lives with the collaborator record. */
export interface PerfilAsistencia { colaboradorId: number; recintoId: number | null; usaApp: boolean; jornal: number | null; saldoInicial: number; contrato: TipoContrato; }
export type AprobacionApi = AprobacionHhee & { colaboradorId: number; fecha: string };

/** Everything the signed-in user may see of Asistencia and Control de Asistencia (GET /api/asistencia). */
export interface AsistenciaDatos {
  /** "Today" of the module (dd/MM/yyyy) and the clock time used for the day's calculations. */
  corte: string;
  horaCorte: string;
  inicioMarcas: string;
  puedeGestionar: boolean;
  feriados: Feriado[];
  recintos: Recinto[];
  turnos: Turno[];
  perfiles: PerfilAsistencia[];
  asignaciones: AsignacionTurno[];
  cambiosTurno: CambioTurno[];
  marcas: Marca[];
  fallidas: MarcaFallida[];
  notas: NotaSupervisor[];
  vacaciones: Vacacion[];
  ausencias: Ausencia[];
  licencias: LicenciaMedica[];
  solicitudes: SolicitudAsistencia[];
  recargos: RecargoDomingo[];
  aprobaciones: AprobacionApi[];
  /** Settings of the module ('ca-tolerancias', 'ca-metodos'). */
  configuracion: Record<string, Record<string, string | number | boolean>>;
}

/**
 * Attendance API. The services keep working on their in-memory lists (so screens update at once) and send every change
 * here; the API validates it, applies the role limits and records it in Historial de cambios. When it rejects a change
 * the reason is shown and the data is reloaded from the server, which undoes the local change.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaApi {
  readonly datos$ = new BehaviorSubject<AsistenciaDatos | null>(null);

  constructor(private http: HttpClient, private auth: AuthService, private ui: UiStateService) {
    auth.usuario$.subscribe((u) => { if (!u) this.datos$.next(null); });
  }

  cargar(): Observable<void> {
    if (!this.auth.autenticado || this.auth.debeCambiarPassword) return of(undefined);
    return this.http.get<AsistenciaDatos>(`${API_URL}/asistencia`).pipe(
      tap((d) => this.datos$.next(d)),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  post<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.http.post<T>(`${API_URL}/asistencia/${ruta}`, cuerpo); }
  put<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.http.put<T>(`${API_URL}/asistencia/${ruta}`, cuerpo); }
  /** Saves fields of a module setting (PUT /api/configuracion/{clave}; administrators only). */
  guardarConfiguracion(clave: string, valores: Record<string, string | number | boolean>): Observable<unknown> {
    return this.http.put(`${API_URL}/configuracion/${clave}`, valores);
  }
  eliminar(ruta: string): Observable<unknown> { return this.http.delete(`${API_URL}/asistencia/${ruta}`); }

  /** Sends a change already applied locally; on rejection shows why and reloads the server data. */
  enviar<T>(peticion: Observable<T>, alGuardar?: (r: T) => void): void {
    peticion.subscribe({
      next: (r) => alGuardar?.(r),
      error: (e) => {
        if (e?.status === 401) return; // the interceptor sends the user to the login page
        this.ui.toast(`No se guardó el cambio: ${mensajeError(e)}`);
        this.cargar().subscribe();
      },
    });
  }
}
