import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AsistenciaApi } from './asistencia-api.service';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { parseFecha } from './format';
import { Colaborador } from './models';
import {
  AUSENCIA_CON_GOCE, Ausencia, CONFIG_ASISTENCIA, ConfigAsistencia, DIAS_VACACIONES_ANUALES, FECHA_CORTE, FECHA_SALDO_INICIAL, Feriado, LicenciaMedica,
  RecargoDomingo, SolicitudAsistencia, TipoAusencia, Vacacion
} from './sample/asistencia';

const DIA = 86_400_000;

/** Days of [desde, hasta] that fall inside month `mes` (0-based) of `anio`. */
export const diasEnMes = (desde: string, hasta: string, anio: number, mes: number): number => {
  const ini = new Date(anio, mes, 1), fin = new Date(anio, mes + 1, 0);
  const d = parseFecha(desde)!, h = parseFecha(hasta)!;
  const a = d > ini ? d : ini, b = h < fin ? h : fin;
  return a <= b ? Math.round((b.getTime() - a.getTime()) / DIA) + 1 : 0;
};

/** Calendar days between two dd/MM/yyyy dates, both inclusive; 0 when invalid or reversed. */
export const diasCalendario = (desde: string, hasta: string): number => {
  const d = parseFecha(desde), h = parseFecha(hasta);
  return d && h && d <= h ? Math.round((h.getTime() - d.getTime()) / DIA) + 1 : 0;
};

/** True when [a1, a2] and [b1, b2] share at least one day. */
export const seCruzan = (a1: string, a2: string, b1: string, b2: string): boolean => {
  const [x1, x2, y1, y2] = [a1, a2, b1, b2].map((s) => parseFecha(s)!.getTime());
  return x1 <= y2 && y1 <= x2;
};

export const fmtFecha = (d: Date): string =>
  d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const nombre = (c: Colaborador) => `${c.apellidos}, ${c.nombres}`;

/**
 * Vacations, absences, medical certificates, attendance requests and Sunday surcharges, stored by the API
 * (GET /api/asistencia). Changes apply here at once and are sent to the API, which validates them, checks the role
 * and records them in Historial de cambios; when it rejects one, the data is reloaded from the server.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  readonly vacaciones$ = new BehaviorSubject<Vacacion[]>([]);
  readonly ausencias$ = new BehaviorSubject<Ausencia[]>([]);
  readonly licencias$ = new BehaviorSubject<LicenciaMedica[]>([]);
  readonly solicitudes$ = new BehaviorSubject<SolicitudAsistencia[]>([]);
  readonly recargos$ = new BehaviorSubject<RecargoDomingo[]>([]);
  readonly config: ConfigAsistencia = CONFIG_ASISTENCIA;
  /** Daily wage of collaborators paid by the day; others are monthly. */
  readonly jornales: Record<number, number> = {};
  private feriados: Feriado[] = [];
  private saldos: Record<number, number> = {};
  private corteApi = FECHA_CORTE;
  /** Temporary ids for records not yet confirmed by the API. */
  private tmp = -1;

  constructor(private audit: AuditService, private api: AsistenciaApi, private auth: AuthService) {
    api.datos$.subscribe((d) => {
      this.corteApi = d?.corte ?? FECHA_CORTE;
      this.feriados = d?.feriados ?? [];
      for (const k of Object.keys(this.jornales)) delete this.jornales[+k];
      this.saldos = {};
      for (const p of d?.perfiles ?? []) {
        if (p.jornal != null) this.jornales[p.colaboradorId] = p.jornal;
        this.saldos[p.colaboradorId] = p.saldoInicial;
      }
      this.licencias$.next(d?.licencias ?? []);
      this.solicitudes$.next(d?.solicitudes ?? []);
      this.recargos$.next(d?.recargos ?? []);
      this.vacaciones$.next(d?.vacaciones ?? []);
      this.ausencias$.next(d?.ausencias ?? []);
    });
  }

  /** "Today" of the module (cut-off date). */
  get corte(): string { return this.corteApi; }
  private get firma(): string { return this.auth.usuario?.nombre ?? '—'; }

  // --- Vacation balance -----------------------------------------------------
  readonly fechaSaldoInicial = FECHA_SALDO_INICIAL;
  /** Opening balance imported at FECHA_SALDO_INICIAL (0 for people hired later). */
  saldoInicial(c: Colaborador): number { return this.saldos[c.id] ?? 0; }
  /** Opening balance plus days accrued since then (or since hire): 30 per year, proportional. */
  devengado(c: Colaborador): number {
    const ingreso = parseFecha(c.ingreso), corte = parseFecha(this.corte)!, inicio = parseFecha(FECHA_SALDO_INICIAL)!;
    if (!ingreso || ingreso > corte) return 0;
    const desde = ingreso > inicio ? ingreso : inicio;
    const dias = Math.round((corte.getTime() - desde.getTime()) / DIA);
    return Math.round((this.saldoInicial(c) + (dias / 365) * DIAS_VACACIONES_ANUALES) * 100) / 100;
  }
  /** Days already taken (start date on or before the cut-off). */
  tomados(id: number): number { return this.sumar(id, (d) => d <= parseFecha(this.corte)!); }
  /** Days scheduled after the cut-off. */
  programados(id: number): number { return this.sumar(id, (d) => d > parseFecha(this.corte)!); }
  saldo(c: Colaborador): number {
    return Math.round((this.devengado(c) - this.tomados(c.id) - this.programados(c.id)) * 100) / 100;
  }
  /** Whether the worker completed the first year (record vacacional) and may take vacations. */
  cumplioRecord(c: Colaborador): boolean {
    const ingreso = parseFecha(c.ingreso)!, corte = parseFecha(this.corte)!;
    return new Date(ingreso.getFullYear() + 1, ingreso.getMonth(), ingreso.getDate()) <= corte;
  }
  private sumar(id: number, cond: (desde: Date) => boolean): number {
    return this.vacaciones$.value.filter((v) => v.colaboradorId === id && cond(parseFecha(v.desde)!)).reduce((s, v) => s + v.dias, 0);
  }

  /** Overlap with vacations or absences already on file, as a readable reason; '' when free. */
  conflicto(colaboradorId: number, desde: string, hasta: string, ignorarAusencia?: number): string {
    const v = this.vacaciones$.value.find((x) => x.colaboradorId === colaboradorId && seCruzan(desde, hasta, x.desde, x.hasta));
    if (v) return `Se cruza con vacaciones del ${v.desde} al ${v.hasta}.`;
    const a = this.ausencias$.value.find((x) => x.id !== ignorarAusencia && x.colaboradorId === colaboradorId && seCruzan(desde, hasta, x.desde, x.hasta));
    return a ? `Se cruza con “${a.tipo}” del ${a.desde} al ${a.hasta}.` : '';
  }

  // --- Pay values ----------------------------------------------------------
  /** Monthly base: sueldo base when known, otherwise the payroll amount on file. */
  base(c: Colaborador): number { return c.detalle?.sueldoBase ?? c.sueldoNeto ?? 0; }
  esDiario(c: Colaborador): boolean { return this.jornales[c.id] !== undefined; }
  /** Daily value: the jornal, or monthly base / 30 (Peruvian payroll uses 30-day months). */
  valorDia(c: Colaborador): number { return Math.round((this.esDiario(c) ? this.jornales[c.id] : this.base(c) / 30) * 100) / 100; }
  valorHora(c: Colaborador): number { return Math.round((this.valorDia(c) / this.config.horasJornada) * 100) / 100; }

  /** Days of absences without pay inside the given month. */
  diasSinGoce(id: number, anio: number, mes: number): number {
    return this.ausencias$.value.filter((a) => a.colaboradorId === id && !AUSENCIA_CON_GOCE[a.tipo])
      .reduce((s, a) => s + diasEnMes(a.desde, a.hasta, anio, mes), 0);
  }

  /** Holidays from the API (Configuración › Feriados). */
  get feriadosLista(): Feriado[] { return this.feriados; }
  esFeriado(fecha: string): string | undefined { return this.feriados.find((f) => f.fecha === fecha)?.nombre; }

  /** Surcharge amount: hours × hourly value × sobretasa, unless a substitute rest day was granted. */
  montoRecargo(r: RecargoDomingo, c: Colaborador): number {
    if (r.descansoSustitutorio) return 0;
    return Math.round(r.horas * this.valorHora(c) * (1 + this.config.sobretasaDomingo / 100) * 100) / 100;
  }

  // --- Mutations (local first, then the API) --------------------------------
  private vacacionLocal(c: Colaborador, desde: string, hasta: string, origen: Vacacion['origen'], observacion: string): Vacacion {
    const nueva: Vacacion = { id: this.tmp--, colaboradorId: c.id, desde, hasta, dias: diasCalendario(desde, hasta), origen, observacion };
    this.vacaciones$.next([...this.vacaciones$.value, nueva]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: 'Vacaciones', accion: 'Crear', actual: `${nueva.dias} días (${desde} al ${hasta})` }, false);
    return nueva;
  }
  private ausenciaLocal(c: Colaborador, tipo: TipoAusencia, desde: string, hasta: string, observacion: string): Ausencia {
    const nueva: Ausencia = { id: this.tmp--, colaboradorId: c.id, tipo, desde, hasta, dias: diasCalendario(desde, hasta), observacion };
    this.ausencias$.next([nueva, ...this.ausencias$.value]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: 'Ausencia', accion: 'Crear', actual: `${tipo} · ${nueva.dias} días` }, false);
    return nueva;
  }

  registrarVacacion(c: Colaborador, desde: string, hasta: string, origen: Vacacion['origen'], observacion: string): Vacacion {
    const nueva = this.vacacionLocal(c, desde, hasta, origen, observacion);
    this.api.enviar(this.api.post<Vacacion>('vacaciones', { colaboradorId: c.id, desde, hasta, origen, observacion }), (r) => { nueva.id = r.id; this.vacaciones$.next([...this.vacaciones$.value]); });
    return nueva;
  }

  eliminarVacacion(v: Vacacion, c: Colaborador): void {
    this.vacaciones$.next(this.vacaciones$.value.filter((x) => x !== v));
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Vacaciones #${v.id}`, accion: 'Eliminar', anterior: `${v.dias} días (${v.desde})` }, false);
    this.api.enviar(this.api.eliminar(`vacaciones/${v.id}`));
  }

  registrarAusencia(c: Colaborador, tipo: TipoAusencia, desde: string, hasta: string, observacion: string): Ausencia {
    const nueva = this.ausenciaLocal(c, tipo, desde, hasta, observacion);
    this.api.enviar(this.api.post<Ausencia>('ausencias', { colaboradorId: c.id, tipo, desde, hasta, observacion }), (r) => { nueva.id = r.id; this.ausencias$.next([...this.ausencias$.value]); });
    return nueva;
  }

  eliminarAusencia(x: Ausencia, c: Colaborador): void {
    this.ausencias$.next(this.ausencias$.value.filter((a) => a !== x));
    for (const l of this.licencias$.value) if (l.ausenciaId === x.id) delete l.ausenciaId;
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Ausencia #${x.id}`, accion: 'Eliminar', anterior: `${x.tipo} · ${x.dias} días` }, false);
    this.api.enviar(this.api.eliminar(`ausencias/${x.id}`));
  }

  crearSolicitud(c: Colaborador, tipo: SolicitudAsistencia['tipo'], desde: string, hasta: string, motivo: string): SolicitudAsistencia {
    const nueva: SolicitudAsistencia = {
      id: this.tmp--, colaboradorId: c.id, tipo, desde, hasta, dias: diasCalendario(desde, hasta),
      motivo, creada: fmtFecha(new Date()), estado: 'Pendiente', aprobador: '', comentario: '',
    };
    this.solicitudes$.next([nueva, ...this.solicitudes$.value]);
    this.api.enviar(this.api.post<SolicitudAsistencia>('solicitudes', { colaboradorId: c.id, tipo, desde, hasta, motivo }), (r) => { Object.assign(nueva, r); this.solicitudes$.next([...this.solicitudes$.value]); });
    return nueva;
  }

  /** Approves or rejects a request; approved vacations/permissions are written to the calendar (by the API too). */
  resolverSolicitud(s: SolicitudAsistencia, c: Colaborador, aprobar: boolean, comentario: string): void {
    s.estado = aprobar ? 'Aprobada' : 'Rechazada';
    s.comentario = comentario;
    s.aprobador = this.firma;
    let vac: Vacacion | undefined, aus: Ausencia | undefined;
    if (aprobar) {
      if (s.tipo === 'Vacaciones') vac = this.vacacionLocal(c, s.desde, s.hasta, 'Solicitud', s.motivo);
      else aus = this.ausenciaLocal(c, s.tipo, s.desde, s.hasta, s.motivo);
    }
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Solicitud #${s.id}`, accion: 'Modificar', propiedad: 'estado', anterior: 'Pendiente', actual: s.estado }, false);
    this.solicitudes$.next([...this.solicitudes$.value]);
    this.api.enviar(this.api.post<{ vacacion?: Vacacion; ausencia?: Ausencia }>(`solicitudes/${s.id}/resolver`, { aprobar, comentario }), (r) => {
      if (vac && r.vacacion) { vac.id = r.vacacion.id; this.vacaciones$.next([...this.vacaciones$.value]); }
      if (aus && r.ausencia) { aus.id = r.ausencia.id; this.ausencias$.next([...this.ausencias$.value]); }
    });
  }

  registrarRecargo(c: Colaborador, r: Omit<RecargoDomingo, 'id' | 'colaboradorId'>): RecargoDomingo {
    const nuevo: RecargoDomingo = { ...r, id: this.tmp--, colaboradorId: c.id };
    this.recargos$.next([nuevo, ...this.recargos$.value]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: 'Recargo domingo', accion: 'Crear', actual: `${r.fecha} · ${r.horas} h` }, false);
    this.api.enviar(this.api.post<RecargoDomingo>('recargos', { ...r, colaboradorId: c.id }), (x) => { nuevo.id = x.id; this.recargos$.next([...this.recargos$.value]); });
    return nuevo;
  }
  eliminarRecargo(r: RecargoDomingo, c: Colaborador): void {
    this.recargos$.next(this.recargos$.value.filter((x) => x !== r));
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Recargo domingo #${r.id}`, accion: 'Eliminar', anterior: `${r.fecha} · ${r.horas} h` }, false);
    this.api.enviar(this.api.eliminar(`recargos/${r.id}`));
  }
  cambiarJornal(c: Colaborador, jornal: number | null): void {
    const anterior = this.esDiario(c) ? `Diario S/ ${this.jornales[c.id].toFixed(2)}` : 'Mensual';
    if (jornal === null) delete this.jornales[c.id]; else this.jornales[c.id] = jornal;
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Trabajo · ${c.cargo}`, accion: 'Modificar', propiedad: 'tipo_remuneracion',
      anterior, actual: jornal === null ? 'Mensual' : `Diario S/ ${jornal.toFixed(2)}` }, false);
    this.api.enviar(this.api.put(`jornal/${c.id}`, { jornal }));
  }

  /** Validating a certificate creates the matching "Descanso médico" absence (the API does the same). */
  cambiarEstadoLicencia(l: LicenciaMedica, c: Colaborador, estado: LicenciaMedica['estado']): void {
    const anterior = l.estado;
    l.estado = estado;
    let aus: Ausencia | undefined;
    if (estado === 'Validada' && l.ausenciaId === undefined) {
      aus = this.ausenciaLocal(c, 'Descanso médico', l.desde, l.hasta, `${l.emisor} · ${l.folio}`);
      l.ausenciaId = aus.id;
    }
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Licencia ${l.folio}`, accion: 'Modificar', propiedad: 'estado', anterior, actual: estado }, false);
    this.licencias$.next([...this.licencias$.value]);
    this.api.enviar(this.api.post<{ ausencia?: Ausencia }>(`licencias/${l.id}/estado`, { estado }), (r) => {
      if (aus && r.ausencia) { aus.id = r.ausencia.id; l.ausenciaId = r.ausencia.id; this.ausencias$.next([...this.ausencias$.value]); this.licencias$.next([...this.licencias$.value]); }
    });
  }

  agregarLicencia(l: Omit<LicenciaMedica, 'id' | 'dias' | 'estado' | 'recibida'>, c: Colaborador): LicenciaMedica {
    const nueva: LicenciaMedica = { ...l, id: this.tmp--, dias: diasCalendario(l.desde, l.hasta), estado: 'Recibida', recibida: fmtFecha(new Date()) };
    this.licencias$.next([nueva, ...this.licencias$.value]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Licencia ${nueva.folio}`, accion: 'Crear', actual: 'Recibida' }, false);
    this.api.enviar(this.api.post<LicenciaMedica>('licencias', { colaboradorId: c.id, folio: l.folio, emisor: l.emisor, diagnostico: l.diagnostico, desde: l.desde, hasta: l.hasta }),
      (r) => { Object.assign(nueva, r); this.licencias$.next([...this.licencias$.value]); });
    return nueva;
  }
}
