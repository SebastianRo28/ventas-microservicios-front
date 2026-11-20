import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { AsistenciaApi } from './asistencia-api.service';
import { AuditService } from './audit.service';
import { CatalogoConfig, ConfigFormDef, FilaCatalogo } from './genericos';
import { FERIADOS_2026 } from './sample/asistencia';

/** Settings forms stored by the API (GET/PUT /api/configuracion/{clave}); the rest stay in memory for now. */
const EN_SERVIDOR = new Set(['ca-tolerancias', 'ca-metodos']);

/**
 * Rows of the generic catalogs and values of the generic settings forms. The attendance settings come from the API
 * (with the attendance data) and are saved there; the others are in memory until their module has an API.
 */
@Injectable({ providedIn: 'root' })
export class GenericosService {
  private readonly catalogos = new Map<string, BehaviorSubject<FilaCatalogo[]>>();
  private readonly configs = new Map<string, Record<string, string | number | boolean>>();

  /** Emits the key of a settings form when it is saved, so the modules that read it can recalculate. */
  readonly configCambio$ = new Subject<string>();

  constructor(private audit: AuditService, private api: AsistenciaApi) {
    api.datos$.subscribe((d) => {
      for (const clave of EN_SERVIDOR) {
        const v = d?.configuracion?.[clave];
        if (!v) continue;
        // Same object, so screens holding it see the new values.
        const actual = this.configs.get(clave);
        if (actual) Object.assign(actual, v); else this.configs.set(clave, { ...v });
        this.configCambio$.next(clave);
      }
    });
  }

  /** Rows of a catalog, seeded from its config the first time it is opened. */
  filas$(cfg: CatalogoConfig): BehaviorSubject<FilaCatalogo[]> {
    let s = this.catalogos.get(cfg.clave);
    if (!s) {
      s = new BehaviorSubject<FilaCatalogo[]>(cfg.filas.map((f, i) => ({ id: i + 1, ...f })));
      this.catalogos.set(cfg.clave, s);
    }
    return s;
  }
  /** Current rows of a catalog that may not have been opened yet (seeded on demand). */
  filas(cfg: CatalogoConfig): FilaCatalogo[] { return this.filas$(cfg).value; }

  guardar(cfg: CatalogoConfig, fila: FilaCatalogo | Omit<FilaCatalogo, 'id'>, etiqueta: string): FilaCatalogo {
    const s = this.filas$(cfg);
    const list = s.value;
    let res: FilaCatalogo;
    if ('id' in fila && list.some((x) => x.id === fila.id)) {
      res = Object.assign(list.find((x) => x.id === fila.id)!, fila);
      this.registrar(cfg, etiqueta, 'Modificar');
    } else {
      res = { ...fila, id: Math.max(0, ...list.map((x) => x.id)) + 1 } as FilaCatalogo;
      list.push(res);
      this.registrar(cfg, etiqueta, 'Crear');
    }
    s.next([...list]);
    this.sincronizar(cfg.clave, s.value);
    return res;
  }

  eliminar(cfg: CatalogoConfig, fila: FilaCatalogo, etiqueta: string): void {
    const s = this.filas$(cfg);
    s.next(s.value.filter((x) => x.id !== fila.id));
    this.registrar(cfg, etiqueta, 'Eliminar');
    this.sincronizar(cfg.clave, s.value);
  }

  /** Holidays feed Asistencia (Calendario, Recargo Domingo), so the shared list is kept in step. */
  private sincronizar(clave: string, filas: FilaCatalogo[]): void {
    if (clave !== 'feriados') return;
    FERIADOS_2026.splice(0, FERIADOS_2026.length, ...filas.map((f) => ({ fecha: String(f['fecha']), nombre: String(f['nombre']) })));
  }

  private registrar(cfg: CatalogoConfig, etiqueta: string, accion: 'Crear' | 'Modificar' | 'Eliminar'): void {
    this.audit.registrar({ colaborador: '—', documento: '—', entidad: `${cfg.singular} · ${etiqueta}`, accion });
  }

  valores(def: ConfigFormDef): Record<string, string | number | boolean> {
    if (!this.configs.has(def.clave)) this.configs.set(def.clave, { ...def.valores });
    return this.configs.get(def.clave)!;
  }

  guardarConfig(def: ConfigFormDef, titulo: string, valores: Record<string, string | number | boolean>): string[] {
    const actual = this.valores(def);
    const cambios = Object.keys(valores).filter((k) => String(valores[k]) !== String(actual[k]));
    Object.assign(actual, valores);
    const servidor = EN_SERVIDOR.has(def.clave);
    if (cambios.length) this.audit.registrar({ colaborador: '—', documento: '—', entidad: titulo, accion: 'Modificar', propiedad: cambios.join(', ') }, !servidor);
    if (cambios.length && servidor) this.api.enviar(this.api.guardarConfiguracion(def.clave, Object.fromEntries(cambios.map((k) => [k, valores[k]]))));
    if (cambios.length) this.configCambio$.next(def.clave);
    return cambios;
  }
}
