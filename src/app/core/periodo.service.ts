import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, distinctUntilChanged, map } from 'rxjs';
import { AsistenciaService } from './asistencia.service';
import { AuthService } from './auth.service';
import { ContextoService } from './contexto.service';
import { HrDataService } from './hr-data.service';
import { PeriodoPlanilla } from './models';
import { parseFecha } from './format';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "03/2026" → "Marzo 2026". */
export function nombreMes(p: string | null | undefined): string {
  const [mm, yyyy] = (p ?? '').split('/');
  const m = Number(mm);
  return m >= 1 && m <= 12 && yyyy ? `${MESES[m - 1]} ${yyyy}` : p ?? '';
}

/**
 * Screens whose data is monthly and follow the topbar period. Everything else (people, organization, settings,
 * documents, attendance with its own date filters…) does not depend on it, and there the selector shows disabled.
 */
export const RUTAS_CON_PERIODO = ['/admin/panel', '/rem/panel', '/rem/procesos', '/rem/items/asignacion', '/rem/kpi/datos',
  '/admin/asistencia/sueldos-diarios', '/rep/exportadores'];

export function rutaUsaPeriodo(url: string): boolean {
  const ruta = url.split(/[?#]/)[0];
  return RUTAS_CON_PERIODO.some((r) => ruta === r || ruta.startsWith(r + '/'));
}

/**
 * Work period of the topbar ("Marzo 2026"): the company's payroll periods (GET /api/remuneraciones/periodos), starting
 * on the open one. Only administrators with the Payroll module choose it; for everyone else it is the month of the
 * attendance cut-off date and the selector is hidden. The choice lasts while the tab is open and resets on sign-in.
 */
@Injectable({ providedIn: 'root' })
export class PeriodoService {
  readonly periodos$ = new BehaviorSubject<PeriodoPlanilla[]>([]);
  private readonly elegido$ = new BehaviorSubject<string | null>(null);
  /** Selected period, "MM/YYYY". */
  readonly seleccionado$: Observable<string>;

  constructor(private data: HrDataService, private auth: AuthService, private ctx: ContextoService, private asis: AsistenciaService) {
    this.seleccionado$ = combineLatest([this.periodos$, this.elegido$]).pipe(map(() => this.seleccionado), distinctUntilChanged());
    let clave: string | null = null;
    ctx.contexto$.subscribe((c) => {
      const nueva = c ? `${c.tenant.id}:${c.usuario.id}` : null;
      if (nueva === clave) return;
      clave = nueva;
      this.periodos$.next([]);
      this.elegido$.next(this.guardado());
      if (c) this.recargar();
    });
    auth.usuario$.subscribe((u) => { if (!u) { this.elegido$.next(null); this.guardar(null); } });
  }

  /** The selector is shown only when there are payroll periods to choose (administrators with Payroll). */
  get disponible(): boolean { return this.periodos$.value.length > 0; }

  get abierto(): string | null { return this.periodos$.value.find((p) => !p.cerrado)?.periodo ?? null; }

  /** Month of the attendance cut-off date ("today" for the company), used when there are no payroll periods. */
  private get mesCorte(): string {
    const d = parseFecha(this.asis.corte) ?? new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  get seleccionado(): string {
    const e = this.elegido$.value, ps = this.periodos$.value;
    if (e && ps.some((p) => p.periodo === e)) return e;
    return this.abierto ?? ps[0]?.periodo ?? this.mesCorte;
  }

  get etiqueta(): string { return nombreMes(this.seleccionado); }
  /** True when looking at a period other than the open one (closed: read-only). */
  get viendoOtro(): boolean { return !!this.abierto && this.seleccionado !== this.abierto; }
  cerrado(p = this.seleccionado): boolean { return this.periodos$.value.find((x) => x.periodo === p)?.cerrado ?? false; }

  seleccionar(p: string): void { this.elegido$.next(p); this.guardar(p); }
  volverAlAbierto(): void { this.elegido$.next(null); this.guardar(null); }

  /** Reloads the list (after processing or closing a period). */
  recargar(): void {
    const c = this.ctx.contexto;
    if (!this.auth.esAdmin || !c?.modulos.includes('PAYROLL')) { this.periodos$.next([]); return; }
    this.data.periodosPlanilla().subscribe({ next: (ps) => this.periodos$.next(ps), error: () => this.periodos$.next([]) });
  }

  private guardado(): string | null { try { return sessionStorage.getItem('nx-periodo'); } catch { return null; } }
  private guardar(p: string | null): void {
    try { if (p) sessionStorage.setItem('nx-periodo', p); else sessionStorage.removeItem('nx-periodo'); } catch { /* sin almacenamiento */ }
  }
}
