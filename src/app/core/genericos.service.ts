import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, forkJoin, map, of, tap } from 'rxjs';
import { API_URL } from './api';
import { AsistenciaApi } from './asistencia-api.service';
import { AuditService } from './audit.service';
import { AuthService, mensajeError } from './auth.service';
import { CatalogoConfig, ConfigFormDef, FilaCatalogo } from './genericos';
import { UiStateService } from './ui-state.service';

type Valores = Record<string, string | number | boolean>;

/**
 * Rows of the generic catalogs (GET/POST/PUT/DELETE /api/catalogos/{clave}) and values of the settings forms
 * (GET/PUT /api/configuracion/{clave}), stored by the API, which validates them with the same definitions and records
 * every change in Historial de cambios. Administrators load everything; other users only get the attendance settings
 * (with the attendance data). Changes apply here at once; when the API rejects one, the reason is shown and the data is
 * reloaded from the server.
 */
@Injectable({ providedIn: 'root' })
export class GenericosService {
  private readonly catalogos = new Map<string, BehaviorSubject<FilaCatalogo[]>>();
  private readonly configs = new Map<string, Valores>();
  private tmp = -1;

  /** Emits the key of a settings form when it is saved, so the modules that read it can recalculate. */
  readonly configCambio$ = new Subject<string>();

  constructor(private audit: AuditService, private api: AsistenciaApi, private http: HttpClient, private auth: AuthService, private ui: UiStateService) {
    api.datos$.subscribe((d) => { for (const [clave, v] of Object.entries(d?.configuracion ?? {})) this.fijarConfig(clave, v); });
    auth.usuario$.subscribe((u) => { if (!u) { for (const s of this.catalogos.values()) s.next([]); } });
  }

  /** Loads every catalog and setting (administrators). */
  cargar(): Observable<void> {
    if (!this.auth.esAdmin || this.auth.debeCambiarPassword) return of(undefined);
    return forkJoin([
      this.http.get<Record<string, FilaCatalogo[]>>(`${API_URL}/catalogos`),
      this.http.get<Record<string, Valores>>(`${API_URL}/configuracion`),
    ]).pipe(
      tap(([cats, cfgs]) => {
        for (const [clave, filas] of Object.entries(cats)) this.sujeto(clave).next(filas);
        for (const [clave, v] of Object.entries(cfgs)) this.fijarConfig(clave, v);
      }),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  /** Same object, so screens holding it see the new values. */
  private fijarConfig(clave: string, v: Valores): void {
    const actual = this.configs.get(clave);
    if (actual) Object.assign(actual, v); else this.configs.set(clave, { ...v });
    this.configCambio$.next(clave);
  }

  private sujeto(clave: string): BehaviorSubject<FilaCatalogo[]> {
    let s = this.catalogos.get(clave);
    if (!s) { s = new BehaviorSubject<FilaCatalogo[]>([]); this.catalogos.set(clave, s); }
    return s;
  }

  /** Rows of a catalog (from the API; empty until loaded). */
  filas$(cfg: CatalogoConfig): BehaviorSubject<FilaCatalogo[]> { return this.sujeto(cfg.clave); }
  filas(cfg: CatalogoConfig): FilaCatalogo[] { return this.sujeto(cfg.clave).value; }

  private enviar<T>(peticion: Observable<T>, alGuardar?: (r: T) => void): void {
    peticion.subscribe({
      next: (r) => alGuardar?.(r),
      error: (e) => {
        if (e?.status === 401) return;
        this.ui.toast(`No se guardó el cambio: ${mensajeError(e)}`);
        this.cargar().subscribe();
      },
    });
  }

  guardar(cfg: CatalogoConfig, fila: FilaCatalogo | Omit<FilaCatalogo, 'id'>, etiqueta: string): FilaCatalogo {
    const s = this.sujeto(cfg.clave);
    const list = s.value;
    const { id: _id, ...datos } = fila as FilaCatalogo;
    let res: FilaCatalogo;
    if ('id' in fila && list.some((x) => x.id === fila.id)) {
      res = Object.assign(list.find((x) => x.id === fila.id)!, fila);
      this.registrar(cfg, etiqueta, 'Modificar');
      this.enviar(this.http.put<FilaCatalogo>(`${API_URL}/catalogos/${cfg.clave}/${res.id}`, datos), (r) => this.confirmar(cfg, res, r));
    } else {
      res = { ...datos, id: this.tmp-- } as FilaCatalogo;
      list.push(res);
      this.registrar(cfg, etiqueta, 'Crear');
      this.enviar(this.http.post<FilaCatalogo>(`${API_URL}/catalogos/${cfg.clave}`, datos), (r) => this.confirmar(cfg, res, r));
    }
    s.next([...list]);
    return res;
  }

  eliminar(cfg: CatalogoConfig, fila: FilaCatalogo, etiqueta: string): void {
    const s = this.sujeto(cfg.clave);
    s.next(s.value.filter((x) => x.id !== fila.id));
    this.registrar(cfg, etiqueta, 'Eliminar');
    this.enviar(this.http.delete(`${API_URL}/catalogos/${cfg.clave}/${fila.id}`), () => this.alCambiar(cfg.clave));
  }

  /** Takes the row as the API saved it (real id, trimmed values). */
  private confirmar(cfg: CatalogoConfig, local: FilaCatalogo, r: FilaCatalogo): void {
    Object.assign(local, r);
    this.sujeto(cfg.clave).next([...this.sujeto(cfg.clave).value]);
    this.alCambiar(cfg.clave);
  }

  /** Holidays feed Asistencia (Calendario, Recargo Domingo, working days), so its data is reloaded. */
  private alCambiar(clave: string): void { if (clave === 'feriados') this.api.cargar().subscribe(); }

  /** Shows the change in Historial at once; the API records it (so it is not sent from here). */
  private registrar(cfg: CatalogoConfig, etiqueta: string, accion: 'Crear' | 'Modificar' | 'Eliminar'): void {
    this.audit.registrar({ colaborador: '—', documento: '—', entidad: `${cfg.singular} · ${etiqueta}`, accion }, false);
  }

  valores(def: ConfigFormDef): Valores {
    if (!this.configs.has(def.clave)) this.configs.set(def.clave, { ...def.valores });
    return this.configs.get(def.clave)!;
  }

  guardarConfig(def: ConfigFormDef, titulo: string, valores: Valores): string[] {
    const actual = this.valores(def);
    const cambios = Object.keys(valores).filter((k) => String(valores[k]) !== String(actual[k]));
    Object.assign(actual, valores);
    if (cambios.length) {
      this.audit.registrar({ colaborador: '—', documento: '—', entidad: titulo, accion: 'Modificar', propiedad: cambios.join(', ') }, false);
      this.api.enviar(this.api.guardarConfiguracion(def.clave, Object.fromEntries(cambios.map((k) => [k, valores[k]]))));
      this.configCambio$.next(def.clave);
    }
    return cambios;
  }
}
