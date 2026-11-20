import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuditService } from './audit.service';
import { parseFecha } from './format';
import { Colaborador } from './models';
import {
  AUSENCIAS, AUSENCIA_CON_GOCE, Ausencia, CONFIG_ASISTENCIA, ConfigAsistencia, DIAS_VACACIONES_ANUALES, FERIADOS_2026, JORNALES, RECARGOS, RecargoDomingo, FECHA_CORTE, FECHA_SALDO_INICIAL, SALDOS_INICIALES, LICENCIAS, LicenciaMedica, SOLICITUDES_ASISTENCIA,
  SolicitudAsistencia, TipoAusencia, VACACIONES, Vacacion
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
 * Vacations, absences, medical certificates and attendance requests. In memory until there is an API;
 * every change goes to the audit log so it shows in Historial de cambios.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  readonly corte = FECHA_CORTE;
  readonly vacaciones$ = new BehaviorSubject<Vacacion[]>(VACACIONES);
  readonly ausencias$ = new BehaviorSubject<Ausencia[]>(AUSENCIAS);
  readonly licencias$ = new BehaviorSubject<LicenciaMedica[]>(LICENCIAS);
  readonly solicitudes$ = new BehaviorSubject<SolicitudAsistencia[]>(SOLICITUDES_ASISTENCIA);
  readonly recargos$ = new BehaviorSubject<RecargoDomingo[]>(RECARGOS);
  readonly config: ConfigAsistencia = CONFIG_ASISTENCIA;
  /** Daily wage of collaborators paid by the day; others are monthly. */
  readonly jornales: Record<number, number> = JORNALES;

  constructor(private audit: AuditService) {}

  // --- Vacation balance -----------------------------------------------------
  readonly fechaSaldoInicial = FECHA_SALDO_INICIAL;
  /** Opening balance imported at FECHA_SALDO_INICIAL (0 for people hired later). */
  saldoInicial(c: Colaborador): number { return SALDOS_INICIALES[c.id] ?? 0; }
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
  base(c: Colaborador): number { return c.detalle?.sueldoBase ?? c.sueldoNeto; }
  esDiario(c: Colaborador): boolean { return this.jornales[c.id] !== undefined; }
  /** Daily value: the jornal, or monthly base / 30 (Peruvian payroll uses 30-day months). */
  valorDia(c: Colaborador): number { return Math.round((this.esDiario(c) ? this.jornales[c.id] : this.base(c) / 30) * 100) / 100; }
  valorHora(c: Colaborador): number { return Math.round((this.valorDia(c) / this.config.horasJornada) * 100) / 100; }

  /** Days of absences without pay inside the given month. */
  diasSinGoce(id: number, anio: number, mes: number): number {
    return this.ausencias$.value.filter((a) => a.colaboradorId === id && !AUSENCIA_CON_GOCE[a.tipo])
      .reduce((s, a) => s + diasEnMes(a.desde, a.hasta, anio, mes), 0);
  }

  esFeriado(fecha: string): string | undefined { return FERIADOS_2026.find((f) => f.fecha === fecha)?.nombre; }

  /** Surcharge amount: hours × hourly value × sobretasa, unless a substitute rest day was granted. */
  montoRecargo(r: RecargoDomingo, c: Colaborador): number {
    if (r.descansoSustitutorio) return 0;
    return Math.round(r.horas * this.valorHora(c) * (1 + this.config.sobretasaDomingo / 100) * 100) / 100;
  }

  // --- Mutations ------------------------------------------------------------
  registrarVacacion(c: Colaborador, desde: string, hasta: string, origen: Vacacion['origen'], observacion: string): Vacacion {
    const list = this.vacaciones$.value;
    const nueva: Vacacion = { id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: c.id, desde, hasta, dias: diasCalendario(desde, hasta), origen, observacion };
    this.vacaciones$.next([...list, nueva]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Vacaciones #${nueva.id}`, accion: 'Crear', actual: `${nueva.dias} días (${desde} al ${hasta})` });
    return nueva;
  }

  eliminarVacacion(v: Vacacion, c: Colaborador): void {
    this.vacaciones$.next(this.vacaciones$.value.filter((x) => x !== v));
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Vacaciones #${v.id}`, accion: 'Eliminar', anterior: `${v.dias} días (${v.desde})` });
  }

  registrarAusencia(c: Colaborador, tipo: TipoAusencia, desde: string, hasta: string, observacion: string): Ausencia {
    const list = this.ausencias$.value;
    const nueva: Ausencia = { id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: c.id, tipo, desde, hasta, dias: diasCalendario(desde, hasta), observacion };
    this.ausencias$.next([nueva, ...list]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Ausencia #${nueva.id}`, accion: 'Crear', actual: `${tipo} · ${nueva.dias} días` });
    return nueva;
  }

  eliminarAusencia(x: Ausencia, c: Colaborador): void {
    this.ausencias$.next(this.ausencias$.value.filter((a) => a !== x));
    for (const l of this.licencias$.value) if (l.ausenciaId === x.id) delete l.ausenciaId;
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Ausencia #${x.id}`, accion: 'Eliminar', anterior: `${x.tipo} · ${x.dias} días` });
  }

  crearSolicitud(c: Colaborador, tipo: SolicitudAsistencia['tipo'], desde: string, hasta: string, motivo: string): SolicitudAsistencia {
    const list = this.solicitudes$.value;
    const nueva: SolicitudAsistencia = {
      id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: c.id, tipo, desde, hasta, dias: diasCalendario(desde, hasta),
      motivo, creada: fmtFecha(new Date()), estado: 'Pendiente', aprobador: 'Rodrigo Paredes', comentario: '',
    };
    this.solicitudes$.next([nueva, ...list]);
    return nueva;
  }

  /** Approves or rejects a request; approved vacations/permissions are written to the calendar. */
  resolverSolicitud(s: SolicitudAsistencia, c: Colaborador, aprobar: boolean, comentario: string): void {
    s.estado = aprobar ? 'Aprobada' : 'Rechazada';
    s.comentario = comentario;
    s.aprobador = 'Rodrigo Paredes';
    if (aprobar) {
      if (s.tipo === 'Vacaciones') this.registrarVacacion(c, s.desde, s.hasta, 'Solicitud', s.motivo);
      else this.registrarAusencia(c, s.tipo, s.desde, s.hasta, s.motivo);
    } else {
      this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Solicitud #${s.id}`, accion: 'Modificar', propiedad: 'estado', anterior: 'Pendiente', actual: 'Rechazada' });
    }
    this.solicitudes$.next([...this.solicitudes$.value]);
  }

  registrarRecargo(c: Colaborador, r: Omit<RecargoDomingo, 'id' | 'colaboradorId'>): RecargoDomingo {
    const list = this.recargos$.value;
    const nuevo: RecargoDomingo = { ...r, id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: c.id };
    this.recargos$.next([nuevo, ...list]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Recargo domingo #${nuevo.id}`, accion: 'Crear', actual: `${r.fecha} · ${r.horas} h` });
    return nuevo;
  }
  eliminarRecargo(r: RecargoDomingo, c: Colaborador): void {
    this.recargos$.next(this.recargos$.value.filter((x) => x !== r));
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Recargo domingo #${r.id}`, accion: 'Eliminar', anterior: `${r.fecha} · ${r.horas} h` });
  }
  cambiarJornal(c: Colaborador, jornal: number | null): void {
    const anterior = this.esDiario(c) ? `Diario S/ ${this.jornales[c.id].toFixed(2)}` : 'Mensual';
    if (jornal === null) delete this.jornales[c.id]; else this.jornales[c.id] = jornal;
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Trabajo · ${c.cargo}`, accion: 'Modificar', propiedad: 'tipo_remuneracion',
      anterior, actual: jornal === null ? 'Mensual' : `Diario S/ ${jornal.toFixed(2)}` });
  }

  /** Validating a certificate creates the matching "Descanso médico" absence. */
  cambiarEstadoLicencia(l: LicenciaMedica, c: Colaborador, estado: LicenciaMedica['estado']): void {
    const anterior = l.estado;
    l.estado = estado;
    if (estado === 'Validada' && l.ausenciaId === undefined) {
      l.ausenciaId = this.registrarAusencia(c, 'Descanso médico', l.desde, l.hasta, `${l.emisor} · ${l.folio}`).id;
    }
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Licencia ${l.folio}`, accion: 'Modificar', propiedad: 'estado', anterior, actual: estado });
    this.licencias$.next([...this.licencias$.value]);
  }

  agregarLicencia(l: Omit<LicenciaMedica, 'id' | 'dias' | 'estado' | 'recibida'>, c: Colaborador): LicenciaMedica {
    const list = this.licencias$.value;
    const nueva: LicenciaMedica = { ...l, id: Math.max(0, ...list.map((x) => x.id)) + 1, dias: diasCalendario(l.desde, l.hasta), estado: 'Recibida', recibida: fmtFecha(new Date()) };
    this.licencias$.next([nueva, ...list]);
    this.audit.registrar({ colaborador: nombre(c), documento: c.documento, entidad: `Licencia ${nueva.folio}`, accion: 'Crear', actual: 'Recibida' });
    return nueva;
  }
}
