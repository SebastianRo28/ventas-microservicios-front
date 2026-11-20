import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_URL } from './api';
import { AuditService } from './audit.service';
import { AuthService, mensajeError } from './auth.service';
import {
  COMISIONES_AFP, CONFIG_REM, ComisionAfp, ConfigRem, PARAMETROS_GENERALES, ParametroGeneral, TRAMOS_RENTA, TramoRenta
} from './sample/parametros-rem';
import { UiStateService } from './ui-state.service';

const URL = `${API_URL}/remuneraciones`;

/**
 * Legal payroll parameters, stored by the API (the payroll is calculated there with them). Administrators load and
 * edit them; other users keep the reference values for the screens that show RMV or asignación familiar.
 * Payroll settings (Remuneraciones › Configuraciones) are still local.
 */
@Injectable({ providedIn: 'root' })
export class ParametrosRemService {
  readonly generales: ParametroGeneral[] = PARAMETROS_GENERALES.map((p) => ({ ...p }));
  readonly afp: ComisionAfp[] = COMISIONES_AFP.map((a) => ({ ...a }));
  readonly tramos: TramoRenta[] = TRAMOS_RENTA.map((t) => ({ ...t }));
  readonly config: ConfigRem = CONFIG_REM;

  constructor(private audit: AuditService, private http: HttpClient, private auth: AuthService, private ui: UiStateService) {}

  /** Same arrays, so screens holding them see the server values. */
  cargar(): Observable<void> {
    if (!this.auth.esAdmin || this.auth.debeCambiarPassword) return of(undefined);
    return this.http.get<{ generales: ParametroGeneral[]; afp: ComisionAfp[]; tramos: TramoRenta[] }>(`${URL}/parametros`).pipe(
      tap((r) => {
        this.generales.splice(0, this.generales.length, ...r.generales);
        this.afp.splice(0, this.afp.length, ...r.afp);
        this.tramos.splice(0, this.tramos.length, ...r.tramos);
      }),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  valor(clave: ParametroGeneral['clave']): number { return this.generales.find((p) => p.clave === clave)?.valor ?? 0; }
  get rmv(): number { return this.valor('rmv'); }
  /** Asignación familiar in soles: % of the RMV, rounded to cents. */
  get asignacionFamiliar(): number { return Math.round(this.rmv * this.valor('asigFamiliarPct')) / 100; }
  /** Minimum daily wage: RMV / 30. */
  get jornalMinimo(): number { return Math.round((this.rmv / 30) * 100) / 100; }

  actualizar(p: ParametroGeneral, valor: number, vigenteDesde: string): void {
    const antes = { ...p };
    p.valor = valor;
    p.vigenteDesde = vigenteDesde;
    this.guardar(this.http.put(`${URL}/parametros/${p.clave}`, { valor, vigenteDesde }), () => Object.assign(p, antes));
  }

  actualizarAfp(a: ComisionAfp, flujo: number, saldo: number): void {
    const antes = { ...a };
    a.comisionFlujoPct = flujo;
    a.comisionSaldoPct = saldo;
    this.guardar(this.http.put(`${URL}/afp/${encodeURIComponent(a.afp)}`, { afp: a.afp, comisionFlujoPct: flujo, comisionSaldoPct: saldo }), () => Object.assign(a, antes));
  }

  actualizarTramo(t: TramoRenta, tasa: number): void {
    const antes = t.tasaPct;
    t.tasaPct = tasa;
    this.guardar(this.http.put(`${URL}/tramos/${t.id}`, { tasaPct: tasa }), () => (t.tasaPct = antes));
  }

  /** The API records the change in Historial de cambios; on rejection the previous value comes back. */
  private guardar(peticion: Observable<unknown>, deshacer: () => void): void {
    peticion.subscribe({
      next: () => this.audit.cargar().subscribe(),
      error: (e) => { deshacer(); this.ui.toast(`No se guardó el cambio: ${mensajeError(e)}`); },
    });
  }
}
