import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { skip } from 'rxjs/operators';
import { AsistenciaService, fmtFecha } from './asistencia.service';
import { AuditService } from './audit.service';
import { parseFecha, soles } from './format';
import { GenericosService } from './genericos.service';
import { HrDataService } from './hr-data.service';
import { ItemsService } from './items.service';
import { Colaborador } from './models';
import { Ausencia, FECHA_CORTE, RECARGOS, Vacacion } from './sample/asistencia';
import { CONFIG_FORMS } from './sample/config-forms';
import {
  AprobacionHhee, ASIGNACIONES_TURNO, AsignacionTurno, CAMBIOS_TURNO, CambioTurno, CODIGOS_DIA, CodigoDia, CONTRATOS, EstadoHhee, EstadoJornada,
  HORA_CORTE, INICIO_MARCAS, LineaHhee, Marca, MARCAS_FALLIDAS, MARCAS_MANUALES, MarcaFallida, MetodoMarca, NOTAS_SUPERVISOR, NotaSupervisor,
  RECINTO_PRINCIPAL, Recinto, RECINTOS, TipoContrato, Turno, TURNOS, USA_APP
} from './sample/control-asistencia';
import { JEFES } from './sample/portal';

const DIA = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
/** 'HH:mm' → minutes after midnight. */
export const aMin = (h: string): number => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
/** Minutes after midnight → 'HH:mm'. */
export const aHora = (m: number): string => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad((((m % 60) + 60) % 60))}`;
/** Duration in minutes → 'h:mm'. */
export const dur = (m: number): string => `${Math.floor(Math.abs(m) / 60)}:${pad(Math.abs(m) % 60)}`;
/** dd/MM/yyyy ↔ yyyy-MM-dd (for <input type="date">). */
export const aIso = (f: string): string => f.split('/').reverse().join('-');
export const deIso = (iso: string): string => iso.split('-').reverse().join('/');
export const sumarDias = (f: string, n: number): string => { const d = parseFecha(f)!; d.setDate(d.getDate() + n); return fmtFecha(d); };
/** Every date from `desde` to `hasta`, both inclusive. */
export const rangoFechas = (desde: string, hasta: string): string[] => {
  const out: string[] = [];
  const d = parseFecha(desde), h = parseFecha(hasta);
  if (!d || !h) return out;
  for (const x = new Date(d); x <= h && out.length < 400; x.setDate(x.getDate() + 1)) out.push(fmtFecha(x));
  return out;
};
const cmpFecha = (a: string, b: string) => parseFecha(a)!.getTime() - parseFecha(b)!.getTime();
const enRango = (f: string, desde: string, hasta: string) => cmpFecha(f, desde) >= 0 && (!hasta || cmpFecha(f, hasta) <= 0);
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const diaSemana = (f: string): number => parseFecha(f)!.getDay();
const nombreCol = (c: Colaborador) => `${c.apellidos}, ${c.nombres}`;

/** Deterministic pseudo-random generator, so the sample punches are the same on every load. */
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Calculated working day of one collaborator (the `workday` of the data model). */
export interface Jornada {
  colaboradorId: number;
  fecha: string;
  turno: Turno | null;
  /** Shift code shown in grids: sigla, DES, LIB, COMP or — (no shift). */
  codigo: string;
  horario: string;
  marcas: Marca[];
  entrada?: Marca;
  salida?: Marca;
  /** Minutes. */
  planificado: number;
  ho: number;
  hnt: number;
  atraso: number;
  anticipada: number;
  /** Minutes over the shift counted as overtime (after the minimum). */
  exceso: number;
  tipoExceso: string;
  /** Worked on a rest day or holiday. */
  descansoTrabajado: boolean;
  estado: EstadoJornada | 'Por iniciar';
  detalle: string;
  /** Today and still inside the recinto (entry without exit). */
  trabajando: boolean;
}

export interface Exceso {
  key: string;
  colaboradorId: number;
  fecha: string;
  minutos: number;
  tipo: string;
  inicio: string;
  fin: string;
  descanso: boolean;
}

export interface Alerta { id: string; titulo: string; severidad: 'danger' | 'warning' | 'info'; colaboradores: { id: number; detalle: string }[]; }

export interface FiltroCa { recintoId: number; fecha: string; area: string; cargo: string; contrato: string; supervisor: string; }

/**
 * Control de Asistencia (module 04): recintos, shifts, punches, calculated working days and overtime. It reads the same
 * collaborators, absences and vacations as Administrativo, so changes show up at once (no synchronization).
 * In memory until there is an API; every change is audited.
 */
@Injectable({ providedIn: 'root' })
export class ControlAsistenciaService {
  readonly corte = FECHA_CORTE;
  readonly horaCorte = HORA_CORTE;
  readonly inicio = INICIO_MARCAS;
  readonly recintos$ = new BehaviorSubject<Recinto[]>(RECINTOS);
  readonly turnos$ = new BehaviorSubject<Turno[]>(TURNOS);
  readonly asignaciones: AsignacionTurno[] = ASIGNACIONES_TURNO;
  readonly cambiosTurno: CambioTurno[] = CAMBIOS_TURNO;
  readonly fallidas$ = new BehaviorSubject<MarcaFallida[]>(MARCAS_FALLIDAS);
  readonly notas$ = new BehaviorSubject<NotaSupervisor[]>(NOTAS_SUPERVISOR);
  readonly recintoDe: Record<number, number> = RECINTO_PRINCIPAL;
  /** Emits after any change that affects the calculated days; screens recalculate on it. */
  readonly cambios$ = new BehaviorSubject<number>(0);
  /** Shared header filters (P-04.0), kept while moving between screens of the module. */
  readonly filtro: FiltroCa = { recintoId: 0, fecha: FECHA_CORTE, area: '', cargo: '', contrato: '', supervisor: '' };
  /** Favorite reports (Reportes). */
  readonly favoritos = new Set<string>(['asistencias', 'atrasos']);

  colaboradores: Colaborador[] = [];
  private marcas: Marca[] = [];
  private porDia = new Map<string, Marca[]>();
  private cache = new Map<string, Jornada>();
  private excesosCache: Exceso[] | null = null;
  private readonly aprobaciones = new Map<string, AprobacionHhee>();

  constructor(private data: HrDataService, private asis: AsistenciaService, private audit: AuditService, private genericos: GenericosService,
              private items: ItemsService) {
    data.colaboradores().subscribe((cs) => { this.colaboradores = cs; this.invalidar(); });
    this.generarMarcas();
    this.sembrarAprobaciones();
    asis.ausencias$.pipe(skip(1)).subscribe(() => this.invalidar());
    asis.vacaciones$.pipe(skip(1)).subscribe(() => this.invalidar());
    genericos.configCambio$.subscribe((k) => { if (k.startsWith('ca-')) this.invalidar(); });
  }

  // --- Settings ----------------------------------------------------------------------------------------------------
  get tol(): Record<string, string | number | boolean> { return this.genericos.valores(CONFIG_FORMS['ca-tolerancias']); }
  get metodos(): Record<string, string | number | boolean> { return this.genericos.valores(CONFIG_FORMS['ca-metodos']); }

  private invalidar(): void {
    this.cache.clear();
    this.excesosCache = null;
    this.cambios$.next(this.cambios$.value + 1);
  }
  setFiltro(p: Partial<FiltroCa>): void { Object.assign(this.filtro, p); this.cambios$.next(this.cambios$.value + 1); }

  // --- Collaborators -----------------------------------------------------------------------------------------------
  col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }
  nombre(id: number): string { const c = this.col(id); return c ? nombreCol(c) : '—'; }
  recinto(id: number): Recinto | undefined { return this.recintos$.value.find((r) => r.id === id); }
  recintoNombre(colId: number): string { return this.recinto(this.recintoDe[colId])?.nombre ?? 'Sin recinto'; }
  contrato(id: number): TipoContrato { return (this.col(id)?.detalle?.contrato as TipoContrato) || CONTRATOS[id] || 'Indefinido'; }
  supervisor(id: number): string { const j = JEFES[id]; return j == null ? '—' : this.nombre(j); }
  usaApp(id: number): boolean { return USA_APP.has(id); }
  /** Collaborators of the selected recinto that match the quick filters. */
  visibles(f: FiltroCa = this.filtro, recintoId = f.recintoId): Colaborador[] {
    return this.colaboradores.filter((c) => (!recintoId || this.recintoDe[c.id] === recintoId) && (!f.area || c.area === f.area) && (!f.cargo || c.cargo === f.cargo)
      && (!f.contrato || this.contrato(c.id) === f.contrato) && (!f.supervisor || this.supervisor(c.id) === f.supervisor));
  }
  dotacion(recintoId: number): number { return this.colaboradores.filter((c) => this.recintoDe[c.id] === recintoId).length; }

  // --- Shifts --------------------------------------------------------------------------------------------------------
  turno(id: number): Turno | undefined { return this.turnos$.value.find((t) => t.id === id); }
  horarioTurno(t: Turno): string { return `${t.entrada}–${t.salida}`; }
  /** Planned minutes of a shift (without the meal break). */
  minutosTurno(t: Turno): number { let d = aMin(t.salida) - aMin(t.entrada); if (d <= 0) d += 1440; return d - t.colacion; }

  asignacionVigente(colId: number, fecha: string): AsignacionTurno | undefined {
    return this.asignaciones.filter((a) => a.colaboradorId === colId && enRango(fecha, a.desde, a.hasta)).sort((a, b) => cmpFecha(b.desde, a.desde))[0];
  }
  /** Shift of a collaborator on a date: one-day change, then the base assignment (weekdays or rotation cycle). */
  turnoDe(colId: number, fecha: string): { turno: Turno | null; codigo: string } {
    const cambio = this.cambiosTurno.find((x) => x.colaboradorId === colId && x.fecha === fecha);
    if (cambio) {
      if (typeof cambio.valor === 'number') { const t = this.turno(cambio.valor) ?? null; return { turno: t, codigo: t?.sigla ?? '—' }; }
      return { turno: null, codigo: cambio.valor };
    }
    const a = this.asignacionVigente(colId, fecha);
    const t = a ? this.turno(a.turnoId) : undefined;
    if (!t) return { turno: null, codigo: '—' };
    if (t.tipo === 'Rotativo' && t.ciclo) {
      const dias = Math.round((parseFecha(fecha)!.getTime() - parseFecha(a!.cicloInicio ?? a!.desde)!.getTime()) / DIA);
      const n = t.ciclo.trabajo + t.ciclo.descanso;
      return ((dias % n) + n) % n < t.ciclo.trabajo ? { turno: t, codigo: t.sigla } : { turno: null, codigo: 'DES' };
    }
    return t.dias.includes(diaSemana(fecha)) ? { turno: t, codigo: t.sigla } : { turno: null, codigo: 'DES' };
  }
  /** Collaborators whose shift on the cut-off date is this one. */
  enTurno(turnoId: number): number[] {
    return this.colaboradores.filter((c) => this.asignacionVigente(c.id, this.corte)?.turnoId === turnoId).map((c) => c.id);
  }
  etiquetaCodigo(codigo: string): string { return CODIGOS_DIA[codigo as CodigoDia] ?? (codigo === '—' ? 'Sin turno' : codigo); }

  guardarTurno(t: Omit<Turno, 'id'> & { id: number | null }): Turno {
    const list = this.turnos$.value;
    let res: Turno;
    if (t.id != null) {
      res = Object.assign(list.find((x) => x.id === t.id)!, t);
      this.registrar('—', '—', `Turno ${res.sigla}`, 'Modificar', `${res.nombre} · ${this.horarioTurno(res)}`);
    } else {
      res = { ...t, id: Math.max(0, ...list.map((x) => x.id)) + 1 };
      list.push(res);
      this.registrar('—', '—', `Turno ${res.sigla}`, 'Crear', `${res.nombre} · ${this.horarioTurno(res)}`);
    }
    this.turnos$.next([...list]);
    this.invalidar();
    return res;
  }
  /** Returns an error when the shift cannot be deactivated. */
  toggleTurno(t: Turno): string {
    if (t.activo && this.enTurno(t.id).length) return `No se puede desactivar: ${this.enTurno(t.id).length} colaborador(es) tienen este turno vigente.`;
    t.activo = !t.activo;
    this.registrar('—', '—', `Turno ${t.sigla}`, 'Modificar', t.activo ? 'Activo' : 'Inactivo', 'estado');
    this.turnos$.next([...this.turnos$.value]);
    return '';
  }

  /**
   * Edit assignment (P-04.7). `modo`: 'dia' = only that date; 'hasta' = from `fecha` to `hasta` on the chosen weekdays;
   * 'permanente' = new base shift from `fecha` (rest codes cannot be permanent).
   */
  asignarTurno(ids: number[], p: { fecha: string; valor: number | CodigoDia; modo: 'dia' | 'hasta' | 'permanente'; hasta: string; dias: number[] }): number {
    let n = 0;
    for (const id of ids) {
      const c = this.col(id);
      if (!c) continue;
      const etiqueta = typeof p.valor === 'number' ? this.turno(p.valor)?.sigla ?? '' : CODIGOS_DIA[p.valor];
      if (p.modo === 'permanente' && typeof p.valor === 'number') {
        for (const a of this.asignaciones.filter((x) => x.colaboradorId === id)) {
          if (cmpFecha(a.desde, p.fecha) >= 0) this.asignaciones.splice(this.asignaciones.indexOf(a), 1);
          else if (!a.hasta || cmpFecha(a.hasta, p.fecha) >= 0) a.hasta = sumarDias(p.fecha, -1);
        }
        const t = this.turno(p.valor)!;
        this.asignaciones.push({ id: Math.max(0, ...this.asignaciones.map((x) => x.id)) + 1, colaboradorId: id, turnoId: p.valor, desde: p.fecha, hasta: '',
          cicloInicio: t.tipo === 'Rotativo' ? p.fecha : undefined, creadoPor: this.data.usuario.nombre });
        for (let i = this.cambiosTurno.length - 1; i >= 0; i--) {
          const x = this.cambiosTurno[i];
          if (x.colaboradorId === id && cmpFecha(x.fecha, p.fecha) >= 0) this.cambiosTurno.splice(i, 1);
        }
        this.registrar(nombreCol(c), c.documento, 'Asignación de turno', 'Crear', `${etiqueta} desde el ${p.fecha} (permanente)`);
      } else {
        const fechas = p.modo === 'dia' ? [p.fecha] : rangoFechas(p.fecha, p.hasta).filter((f) => !p.dias.length || p.dias.includes(diaSemana(f)));
        for (const f of fechas) {
          const i = this.cambiosTurno.findIndex((x) => x.colaboradorId === id && x.fecha === f);
          if (i >= 0) this.cambiosTurno.splice(i, 1);
          this.cambiosTurno.push({ colaboradorId: id, fecha: f, valor: p.valor, creadoPor: this.data.usuario.nombre });
        }
        this.registrar(nombreCol(c), c.documento, 'Asignación de turno', 'Modificar',
          p.modo === 'dia' ? `${etiqueta} el ${p.fecha}` : `${etiqueta} del ${p.fecha} al ${p.hasta} (${fechas.length} días)`);
      }
      n++;
    }
    this.invalidar();
    return n;
  }
  historialTurnos(colId: number): { fecha: string; texto: string; autor: string }[] {
    const a = this.asignaciones.filter((x) => x.colaboradorId === colId).map((x) => ({
      fecha: x.desde, autor: x.creadoPor,
      texto: `${this.turno(x.turnoId)?.nombre ?? '—'} (${this.turno(x.turnoId)?.sigla ?? ''}) desde el ${x.desde}${x.hasta ? ' hasta el ' + x.hasta : ''}`,
    }));
    const b = this.cambiosTurno.filter((x) => x.colaboradorId === colId).map((x) => ({
      fecha: x.fecha, autor: x.creadoPor,
      texto: `${typeof x.valor === 'number' ? this.turno(x.valor)?.sigla : CODIGOS_DIA[x.valor]} solo el ${x.fecha}`,
    }));
    return [...a, ...b].sort((x, y) => cmpFecha(y.fecha, x.fecha));
  }

  // --- Recintos ----------------------------------------------------------------------------------------------------
  guardarRecinto(r: Omit<Recinto, 'id'> & { id: number | null }): Recinto {
    const list = this.recintos$.value;
    let res: Recinto;
    if (r.id != null) {
      const actual = list.find((x) => x.id === r.id)!;
      const campos: [keyof Recinto, string][] = [['nombre', 'nombre'], ['direccion', 'dirección'], ['distrito', 'distrito'], ['radio', 'radio'],
        ['jefaturaId', 'jefatura'], ['administrativoId', 'administrativo'], ['activo', 'estado'], ['lat', 'latitud'], ['lng', 'longitud'], ['emails', 'correos de alertas'], ['usuarios', 'usuarios con acceso'], ['info', 'información adicional'], ['clave', 'clave']];
      const cambiados = campos.filter(([k]) => String(actual[k]) !== String((r as Recinto)[k]));
      const fmt = (k: keyof Recinto, v: unknown) => (k === 'jefaturaId' || k === 'administrativoId') ? (v == null ? '—' : this.nombre(v as number)) : k === 'activo' ? (v ? 'Activo' : 'Inactivo') : k === 'usuarios' ? (v as number[]).map((x) => this.nombre(x)).join('; ') || '—' : k === 'emails' ? (v as string[]).join(', ') || '—' : String(v);
      for (const [k, label] of cambiados) {
        this.registrar('—', '—', `Recinto · ${actual.nombre}`, 'Modificar', fmt(k, (r as Recinto)[k]), label, fmt(k, actual[k]));
      }
      res = Object.assign(actual, r);
    } else {
      res = { ...r, id: Math.max(0, ...list.map((x) => x.id)) + 1 };
      list.push(res);
      this.registrar('—', '—', `Recinto · ${res.nombre}`, 'Crear', `${res.direccion}, ${res.distrito} · radio ${res.radio} m`);
    }
    this.recintos$.next([...list]);
    this.invalidar();
    return res;
  }
  /** Changes of a recinto from Historial de cambios (5.7). */
  historialRecinto(r: Recinto): { fecha: string; texto: string; usuario: string }[] {
    return this.audit.cambios.filter((x) => x.entidad === `Recinto · ${r.nombre}`).slice(0, 6).map((x) => ({
      fecha: x.fecha, usuario: x.usuario,
      texto: x.accion === 'Crear' ? `Creó el recinto (${x.actual})` : `${x.propiedad === '—' ? 'Cambio' : x.propiedad[0].toUpperCase() + x.propiedad.slice(1)}: ${x.anterior !== '—' ? x.anterior + ' → ' : ''}${x.actual}`,
    }));
  }

  // --- Punches -----------------------------------------------------------------------------------------------------
  marcasDe(colId: number, fecha: string): Marca[] { return this.porDia.get(`${colId}|${fecha}`) ?? []; }
  todasLasMarcas(): Marca[] { return this.marcas; }

  private indexar(): void {
    this.porDia.clear();
    for (const m of this.marcas) {
      const k = `${m.colaboradorId}|${m.fecha}`;
      if (!this.porDia.has(k)) this.porDia.set(k, []);
      this.porDia.get(k)!.push(m);
    }
    for (const l of this.porDia.values()) l.sort((a, b) => aMin(a.hora) - aMin(b.hora));
  }

  private coords(recintoId: number, r: () => number, dentro = true): { lat: number; lng: number } {
    const rc = this.recinto(recintoId)!;
    const m = dentro ? rc.radio * 0.7 : rc.radio * 3;
    return { lat: rc.lat + ((r() - 0.5) * 2 * m) / 111_000, lng: rc.lng + ((r() - 0.5) * 2 * m) / 108_000 };
  }

  /** Sample punches from 01/02/2026 to the cut-off, consistent with shifts, absences, vacations and Sunday work. */
  private generarMarcas(): void {
    const out: Marca[] = [];
    let id = 1;
    const fechas = rangoFechas(INICIO_MARCAS, FECHA_CORTE);
    const ausente = (c: number, f: string) => this.asis.ausencias$.value.some((a: Ausencia) => a.colaboradorId === c && enRango(f, a.desde, a.hasta))
      || this.asis.vacaciones$.value.some((v: Vacacion) => v.colaboradorId === c && enRango(f, v.desde, v.hasta));
    const NO_MARCA = new Set(['10|02/03/2026', '10|09/03/2026', '14|16/03/2026']);
    const SIN_SALIDA = new Set(['14|13/03/2026', '8|13/03/2026']);
    const SIN_FOTO = new Set(['7|05/03/2026', '7|06/03/2026', '4|11/03/2026']);
    const ahora = aMin(HORA_CORTE);
    for (const c of this.colaboradores) {
      const recintoId = this.recintoDe[c.id];
      fechas.forEach((f, di) => {
        if (cmpFecha(f, c.ingreso) < 0 || ausente(c.id, f) || this.asis.esFeriado(f) || NO_MARCA.has(`${c.id}|${f}`)) return;
        const r = rng(c.id * 7919 + di * 104729 + 17);
        if (c.id !== 0 && f !== FECHA_CORTE && r() < 0.035) return;
        const { turno: t } = this.turnoDe(c.id, f);
        const dow = diaSemana(f), marzo = f.endsWith('/03/2026');
        let ent: number, sal: number;
        if (!t) {
          const rec = RECARGOS.find((x) => x.colaboradorId === c.id && x.fecha === f);
          if (!rec) return;
          ent = 8 * 60 - 5 + Math.floor(r() * 10);
          sal = ent + rec.horas * 60 + Math.floor(r() * 8);
        } else {
          const ini = aMin(t.entrada);
          let fin = aMin(t.salida); if (fin <= ini) fin += 1440;
          if (t.tipo === 'Flexible') ent = ini - 30 + Math.floor(r() * 50);
          else ent = ini - 14 + Math.floor(r() * 15);
          if (t.tipo !== 'Flexible' && r() < 0.07) ent = ini + t.tolerancia + 3 + Math.floor(r() * 22);
          if (c.id === 9 && ['03/03/2026', '05/03/2026', '12/03/2026'].includes(f)) ent = ini + 22 + Math.floor(r() * 8);
          sal = (t.tipo === 'Flexible' ? ent + (fin - ini) : fin) + Math.floor(r() * 9);
          if (r() < 0.04) sal -= 20 + Math.floor(r() * 30);
          // Overtime patterns.
          if (c.id === 7 && (dow === 2 || dow === 4)) sal += marzo ? 100 + Math.floor(r() * 50) : 70 + Math.floor(r() * 30);
          if (c.id === 1 && dow === 5) sal += 60 + Math.floor(r() * 25);
          if (c.id === 13 && dow === 3) sal += 45 + Math.floor(r() * 20);
          if (c.id === 3 && dow === 3) sal += 60 + Math.floor(r() * 35);
          if (c.id === 9 && dow === 6) sal += 50 + Math.floor(r() * 15);
          if (c.id === 2 && f === '13/03/2026') sal += 75;
        }
        const metodo: MetodoMarca = c.id === 13 ? 'QR' : this.usaApp(c.id) ? 'App' : 'Web';
        const conFoto = metodo !== 'Web' && !SIN_FOTO.has(`${c.id}|${f}`);
        const nueva = (tipo: Marca['tipo'], min: number): Marca => ({
          id: id++, colaboradorId: c.id, recintoId, fecha: f, hora: aHora(min), tipo, metodo,
          ...(metodo === 'Web' ? { lat: this.recinto(recintoId)!.lat, lng: this.recinto(recintoId)!.lng } : this.coords(recintoId, r)),
          dentroRadio: true, foto: conFoto, observacion: '',
        });
        if (f === FECHA_CORTE) { if (ent <= ahora) out.push(nueva('Entrada', ent)); return; }
        out.push(nueva('Entrada', ent));
        if (!SIN_SALIDA.has(`${c.id}|${f}`)) out.push(nueva('Salida', sal));
      });
    }
    for (const m of MARCAS_MANUALES) {
      const i = out.findIndex((x) => x.colaboradorId === m.colaboradorId && x.fecha === m.fecha && x.tipo === m.tipo);
      const rc = this.recinto(this.recintoDe[m.colaboradorId])!;
      const manual: Marca = { ...m, id: id++, recintoId: rc.id, lat: rc.lat, lng: rc.lng, dentroRadio: true, foto: false };
      if (i >= 0) out.splice(i, 1, manual); else out.push(manual);
    }
    this.marcas = out;
    this.indexar();
  }

  /** Punch from Mi Portal (widget Registrar Asistencia) or the app; rejected punches go to Marcas Fallidas. */
  marcar(colId: number, recintoId: number, tipo: Marca['tipo'], metodo: MetodoMarca, hora: string): { ok: boolean; mensaje: string } {
    const c = this.col(colId), rc = this.recinto(recintoId);
    if (!c || !rc) return { ok: false, mensaje: 'Selecciona un recinto.' };
    const clave: Record<string, string> = { Web: 'web', App: 'app', QR: 'qr', Foto: 'foto' };
    const fallar = (motivo: MarcaFallida['motivo'], mensaje: string) => {
      const list = this.fallidas$.value;
      this.fallidas$.next([{ id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: colId, recintoId, fecha: this.corte, hora, tipo, metodo, motivo }, ...list]);
      return { ok: false, mensaje };
    };
    if (clave[metodo] && !this.metodos[clave[metodo]]) return fallar('Método no permitido', `La marcación por ${metodo === 'Web' ? 'portal web' : metodo} está desactivada. Avisa a RR.HH.`);
    const previas = this.marcasDe(colId, this.corte);
    const ultima = previas[previas.length - 1];
    if (tipo === 'Salida' && (!ultima || ultima.tipo === 'Salida')) return { ok: false, mensaje: 'Primero registra tu entrada de hoy.' };
    if (tipo === 'Entrada' && ultima?.tipo === 'Entrada') return { ok: false, mensaje: `Ya registraste tu entrada a las ${ultima.hora}.` };
    if (ultima && aMin(hora) < aMin(ultima.hora)) return { ok: false, mensaje: `La hora no puede ser anterior a tu última marca (${ultima.hora}).` };
    const m: Marca = { id: Math.max(0, ...this.marcas.map((x) => x.id)) + 1, colaboradorId: colId, recintoId, fecha: this.corte, hora, tipo, metodo,
      lat: rc.lat, lng: rc.lng, dentroRadio: true, foto: false, observacion: 'Desde Mi Portal' };
    this.marcas.push(m);
    this.indexar();
    this.invalidar();
    return { ok: true, mensaje: `${tipo} registrada a las ${hora} · ${rc.nombre}` };
  }

  agregarManual(c: Colaborador, p: { fecha: string; hora: string; tipo: Marca['tipo']; motivo: string }): Marca {
    const rc = this.recinto(this.recintoDe[c.id]) ?? this.recintos$.value[0];
    const m: Marca = { id: Math.max(0, ...this.marcas.map((x) => x.id)) + 1, colaboradorId: c.id, recintoId: rc.id, fecha: p.fecha, hora: p.hora, tipo: p.tipo,
      metodo: 'Manual', lat: rc.lat, lng: rc.lng, dentroRadio: true, foto: false, observacion: '', creadoPor: this.data.usuario.nombre, motivo: p.motivo };
    this.marcas.push(m);
    this.indexar();
    this.registrar(nombreCol(c), c.documento, `Marca manual #${m.id}`, 'Crear', `${p.tipo} ${p.fecha} ${p.hora} · ${p.motivo}`);
    this.invalidar();
    return m;
  }
  eliminarMarca(m: Marca): void {
    const c = this.col(m.colaboradorId);
    this.marcas = this.marcas.filter((x) => x !== m);
    this.indexar();
    this.registrar(c ? nombreCol(c) : '—', c?.documento ?? '—', `Marca manual #${m.id}`, 'Eliminar', undefined, undefined, `${m.tipo} ${m.fecha} ${m.hora}`);
    this.invalidar();
  }

  // --- Working days ------------------------------------------------------------------------------------------------
  private ausenciaEn(colId: number, f: string): Ausencia | undefined {
    return this.asis.ausencias$.value.find((a) => a.colaboradorId === colId && enRango(f, a.desde, a.hasta));
  }
  private vacacionEn(colId: number, f: string): Vacacion | undefined {
    return this.asis.vacaciones$.value.find((v) => v.colaboradorId === colId && enRango(f, v.desde, v.hasta));
  }

  jornada(colId: number, fecha: string): Jornada {
    const k = `${colId}|${fecha}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const j = this.calcular(colId, fecha);
    this.cache.set(k, j);
    return j;
  }

  private calcular(colId: number, fecha: string): Jornada {
    const c = this.col(colId);
    const { turno: t, codigo } = this.turnoDe(colId, fecha);
    const marcas = this.marcasDe(colId, fecha);
    const entrada = marcas.find((m) => m.tipo === 'Entrada');
    const salida = [...marcas].reverse().find((m) => m.tipo === 'Salida' && (!entrada || aMin(m.hora) >= aMin(entrada.hora)));
    const hoy = fecha === this.corte;
    const minExceso = Number(this.tol['minExceso']) || 30, tolSalida = Number(this.tol['toleranciaSalida']) || 0, contarAntes = !!this.tol['contarAntes'];
    const j: Jornada = {
      colaboradorId: colId, fecha, turno: t, codigo, horario: t ? this.horarioTurno(t) : this.etiquetaCodigo(codigo), marcas, entrada, salida,
      planificado: t ? this.minutosTurno(t) : 0, ho: 0, hnt: 0, atraso: 0, anticipada: 0, exceso: 0, tipoExceso: '', descansoTrabajado: false,
      estado: 'Asistencia', detalle: '', trabajando: hoy && !!entrada && !salida,
    };
    if (!c || cmpFecha(fecha, c.ingreso) < 0) { j.estado = 'Descanso'; j.detalle = 'Antes del ingreso'; return j; }
    if (cmpFecha(fecha, this.inicio) < 0) { j.estado = 'Descanso'; j.detalle = 'Sin registros en Control de Asistencia'; return j; }
    if (cmpFecha(fecha, this.corte) > 0) {
      const v = this.vacacionEn(colId, fecha), a = this.ausenciaEn(colId, fecha);
      j.estado = v ? 'Vacaciones' : a ? (a.tipo.startsWith('Permiso') ? 'Permiso' : a.tipo === 'Falta injustificada' ? 'Inasistencia' : 'Licencia') : t ? 'Por iniciar' : 'Descanso';
      j.detalle = v ? 'Vacaciones' : a?.tipo ?? '';
      return j;
    }
    const e = entrada ? aMin(entrada.hora) : null;
    let s = salida ? aMin(salida.hora) : null;
    if (e != null && s != null && s < e) s += 1440;
    const feriado = this.asis.esFeriado(fecha);
    if (t) {
      let ini = aMin(t.entrada), fin = aMin(t.salida);
      if (fin <= ini) fin += 1440;
      const largo = fin - ini;
      if (e != null) {
        if (t.tipo === 'Flexible') { j.atraso = e > ini + t.tolerancia ? e - ini : 0; if (e >= ini - 60 && e <= ini + t.tolerancia) { ini = e; fin = e + largo; } }
        else j.atraso = e - ini > t.tolerancia ? e - ini : 0;
      }
      if (e != null && s != null) {
        j.ho = Math.max(0, Math.min(s, fin) - Math.max(e, ini) - t.colacion);
        j.anticipada = s < fin - tolSalida ? fin - s : 0;
        const antes = contarAntes && t.tipo !== 'Flexible' ? Math.max(0, ini - e) : 0, despues = Math.max(0, s - fin);
        const a = antes >= minExceso ? antes : 0, d = despues >= minExceso ? despues : 0;
        j.exceso = a + d;
        j.tipoExceso = a && d ? 'Antes y después de la jornada' : a ? 'Antes de la jornada' : d ? 'Después de la jornada' : '';
        if (feriado) { j.exceso = s - e; j.tipoExceso = 'Feriado trabajado'; j.descansoTrabajado = true; }
      }
    } else if (e != null && s != null) {
      j.exceso = s - e;
      j.tipoExceso = 'Día de descanso trabajado';
      j.descansoTrabajado = true;
    }
    const vac = this.vacacionEn(colId, fecha), aus = this.ausenciaEn(colId, fecha);
    if (vac) { j.estado = 'Vacaciones'; j.detalle = 'Vacaciones'; }
    else if (aus) {
      j.detalle = aus.tipo;
      j.estado = aus.tipo === 'Falta injustificada' ? 'Inasistencia' : aus.tipo.startsWith('Permiso') ? 'Permiso' : 'Licencia';
      if (aus.tipo === 'Falta injustificada' || aus.tipo === 'Permiso sin goce') j.hnt = j.planificado;
    } else if (feriado && !entrada) { j.estado = 'Feriado'; j.detalle = feriado; }
    else if (!t) j.estado = marcas.length ? (entrada && salida ? 'Asistencia' : 'Incompleta') : 'Descanso';
    else if (!entrada && !salida) {
      if (hoy) j.estado = aMin(this.horaCorte) > aMin(t.entrada) + t.tolerancia ? 'Inasistencia' : 'Por iniciar';
      else { j.estado = 'Inasistencia'; j.detalle = 'Sin marcas'; j.hnt = j.planificado; }
    } else if (j.trabajando) j.estado = 'Asistencia';
    else if (!entrada || !salida) { j.estado = 'Incompleta'; j.detalle = entrada ? 'Falta la salida' : 'Falta la entrada'; }
    else { j.estado = 'Asistencia'; j.hnt = Math.max(0, j.planificado - j.ho); }
    if (j.estado !== 'Asistencia' && !j.descansoTrabajado) j.exceso = 0;
    return j;
  }

  /** Whether the day counts as attended (worked, even if late or incomplete). */
  asistio(j: Jornada): boolean { return !!j.entrada; }
  /** Whether the collaborator was expected to work that day. */
  esperado(j: Jornada): boolean { return !!j.turno && !['Vacaciones', 'Licencia', 'Permiso', 'Feriado', 'Por iniciar'].includes(j.estado); }

  /** Monthly summary of a collaborator up to `hasta`. */
  resumen(colId: number, desde: string, hasta: string) {
    let asistencias = 0, inasistencias = 0, atrasos = 0, minAtraso = 0, exceso = 0, ho = 0, hnt = 0, permisos = 0, ausencias = 0, incompletas = 0;
    for (const f of rangoFechas(desde, hasta)) {
      const j = this.jornada(colId, f);
      if (j.entrada) asistencias++;
      if (j.estado === 'Inasistencia') inasistencias++;
      if (j.estado === 'Incompleta') incompletas++;
      if (j.estado === 'Permiso') permisos++;
      if (['Licencia', 'Vacaciones', 'Inasistencia'].includes(j.estado)) ausencias++;
      if (j.atraso) { atrasos++; minAtraso += j.atraso; }
      exceso += j.exceso; ho += j.ho; hnt += j.hnt;
    }
    return { asistencias, inasistencias, atrasos, minAtraso, exceso, ho, hnt, permisos, ausencias, incompletas };
  }

  // --- Overtime ----------------------------------------------------------------------------------------------------
  /** Every excess over the shift since the first punch (today excluded while the day is open). */
  excesos(): Exceso[] {
    if (this.excesosCache) return this.excesosCache;
    const out: Exceso[] = [];
    for (const c of this.colaboradores) {
      for (const f of rangoFechas(INICIO_MARCAS, this.corte)) {
        const j = this.jornada(c.id, f);
        if (!j.exceso || j.trabajando) continue;
        const t = j.turno;
        const fin = t ? (t.tipo === 'Flexible' && j.entrada ? aHora(aMin(j.entrada.hora) + this.minutosTurno(t) + t.colacion) : t.salida) : j.entrada!.hora;
        out.push({
          key: `${c.id}|${f}`, colaboradorId: c.id, fecha: f, minutos: j.exceso, tipo: j.tipoExceso, descanso: j.descansoTrabajado,
          inicio: j.descansoTrabajado ? j.entrada!.hora : j.tipoExceso.startsWith('Antes') ? j.entrada!.hora : fin,
          fin: j.descansoTrabajado ? j.salida!.hora : j.tipoExceso === 'Antes de la jornada' ? t!.entrada : j.salida!.hora,
        });
      }
    }
    this.excesosCache = out.sort((a, b) => cmpFecha(b.fecha, a.fecha) || a.colaboradorId - b.colaboradorId);
    return this.excesosCache;
  }

  /** Suggested split: rest day or holiday at 100 %; otherwise the first 2 hours at 25 % and the rest at 35 % (D.S. 007-2002-TR). */
  sugeridas(e: Exceso): LineaHhee[] {
    if (e.descanso) return [{ minutos: e.minutos, tipo: 100 }];
    const a = Math.min(120, e.minutos), b = e.minutos - a;
    return b > 0 ? [{ minutos: a, tipo: 25 }, { minutos: b, tipo: 35 }] : [{ minutos: a, tipo: 25 }];
  }
  aprobacion(e: Exceso): AprobacionHhee {
    return this.aprobaciones.get(e.key) ?? { estado: 'En espera', lineas: this.sugeridas(e), observacion: '', aprobadoPor: '', enviado: false };
  }
  aprobadas(e: Exceso): number {
    const a = this.aprobacion(e);
    return a.estado === 'Aprobado' || a.estado === 'Aprobado parcial' ? a.lineas.reduce((s, l) => s + l.minutos, 0) : 0;
  }
  valorLinea(colId: number, l: LineaHhee): number {
    const c = this.col(colId);
    return c ? Math.round((l.minutos / 60) * this.asis.valorHora(c) * (1 + l.tipo / 100) * 100) / 100 : 0;
  }
  valor(e: Exceso): number {
    const a = this.aprobacion(e);
    return a.estado === 'Aprobado' || a.estado === 'Aprobado parcial' ? a.lineas.reduce((s, l) => s + this.valorLinea(e.colaboradorId, l), 0) : 0;
  }
  periodoDe(fecha: string): string { return fecha.slice(3); }
  get periodoAbierto(): string { return this.periodoDe(this.corte); }

  guardarAprobacion(e: Exceso, lineas: LineaHhee[], observacion: string): EstadoHhee {
    const total = lineas.reduce((s, l) => s + l.minutos, 0);
    const estado: EstadoHhee = total >= e.minutos ? 'Aprobado' : 'Aprobado parcial';
    const previo = this.aprobacion(e);
    this.aprobaciones.set(e.key, { estado, lineas: lineas.map((l) => ({ ...l })), observacion, aprobadoPor: this.data.usuario.nombre, enviado: false });
    const c = this.col(e.colaboradorId)!;
    this.registrar(nombreCol(c), c.documento, `Horas extras ${e.fecha}`, 'Modificar', `${estado} · ${dur(total)} h`, 'estado', previo.estado);
    if (previo.enviado) this.reenviar(e.colaboradorId, this.periodoDe(e.fecha));
    this.invalidar();
    return estado;
  }
  rechazar(e: Exceso, observacion: string): void {
    const previo = this.aprobacion(e);
    this.aprobaciones.set(e.key, { estado: 'Rechazado', lineas: [], observacion, aprobadoPor: this.data.usuario.nombre, enviado: false });
    const c = this.col(e.colaboradorId)!;
    this.registrar(nombreCol(c), c.documento, `Horas extras ${e.fecha}`, 'Modificar', 'Rechazado', 'estado', previo.estado);
    if (previo.enviado) this.reenviar(e.colaboradorId, this.periodoDe(e.fecha));
    this.invalidar();
  }
  revertir(e: Exceso): void {
    const previo = this.aprobacion(e);
    this.aprobaciones.delete(e.key);
    const c = this.col(e.colaboradorId)!;
    this.registrar(nombreCol(c), c.documento, `Horas extras ${e.fecha}`, 'Modificar', 'En espera', 'estado', previo.estado);
    if (previo.enviado) this.reenviar(e.colaboradorId, this.periodoDe(e.fecha));
    this.invalidar();
  }

  /**
   * Sends approved overtime of the open period to payroll: HHEE 25 % and 35 % become items HEX-25 / HEX-35 of the
   * period (one per collaborator, recalculated with everything sent); 100 % becomes a Recargo Domingo record.
   */
  enviarAPlanilla(lista: Exceso[]): { enviados: number; omitidos: string[] } {
    const omitidos: string[] = [];
    const tocados = new Set<number>();
    let enviados = 0;
    for (const e of lista) {
      const a = this.aprobacion(e);
      if (a.estado !== 'Aprobado' && a.estado !== 'Aprobado parcial') { omitidos.push(`${this.nombre(e.colaboradorId)} (${e.fecha}): no está aprobada`); continue; }
      if (this.periodoDe(e.fecha) !== this.periodoAbierto) { omitidos.push(`${this.nombre(e.colaboradorId)} (${e.fecha}): el período ${this.periodoDe(e.fecha)} está cerrado`); continue; }
      if (a.enviado) continue;
      a.enviado = true;
      this.aprobaciones.set(e.key, a);
      tocados.add(e.colaboradorId);
      const c = this.col(e.colaboradorId)!;
      const l100 = a.lineas.filter((l) => l.tipo === 100).reduce((s, l) => s + l.minutos, 0);
      if (l100 && !this.asis.recargos$.value.some((r) => r.colaboradorId === c.id && r.fecha === e.fecha)) {
        this.asis.registrarRecargo(c, { fecha: e.fecha, horas: Math.round((l100 / 60) * 100) / 100, descansoSustitutorio: false, observacion: 'Control de Asistencia · HHEE 100 %' });
      }
      enviados++;
    }
    for (const id of tocados) this.reenviar(id, this.periodoAbierto);
    this.invalidar();
    return { enviados, omitidos };
  }
  /** Recalculates the HEX items of a collaborator for a period from every overtime already sent. */
  private reenviar(colId: number, periodo: string): void {
    if (periodo !== this.periodoAbierto) return;
    const c = this.col(colId);
    if (!c) return;
    const sum = (tipo: number) => this.excesos().filter((e) => e.colaboradorId === colId && this.periodoDe(e.fecha) === periodo && this.aprobacion(e).enviado)
      .flatMap((e) => this.aprobacion(e).lineas).filter((l) => l.tipo === tipo).reduce((s, l) => s + l.minutos, 0);
    for (const [tipoId, pct] of [[3, 25], [4, 35]]) {
      for (const a of this.items.asignaciones$.value.filter((x) => x.colaboradorId === colId && x.tipoId === tipoId && x.desde === periodo && x.observacion.startsWith('Control de Asistencia'))) {
        this.items.quitar(a, c);
      }
      const min = sum(pct);
      if (min) {
        const monto = Math.round((min / 60) * this.asis.valorHora(c) * (1 + pct / 100) * 100) / 100;
        this.items.asignar(c, { tipoId, monto, desde: periodo, hasta: periodo, observacion: `Control de Asistencia · ${dur(min)} h al ${pct} %` });
      }
    }
  }

  private sembrarAprobaciones(): void {
    for (const e of this.excesos()) {
      const recargo = RECARGOS.find((r) => r.colaboradorId === e.colaboradorId && r.fecha === e.fecha);
      if (recargo) {
        this.aprobaciones.set(e.key, recargo.descansoSustitutorio
          ? { estado: 'Rechazado', lineas: [], observacion: 'Se otorgó descanso sustitutorio', aprobadoPor: 'Lucía Cáceres', enviado: false }
          : { estado: 'Aprobado', lineas: this.sugeridas(e), observacion: 'Registrado en Recargo Domingo', aprobadoPor: 'Lucía Cáceres', enviado: true });
      } else if (e.fecha.endsWith('/02/2026')) {
        this.aprobaciones.set(e.key, { estado: 'Aprobado', lineas: this.sugeridas(e), observacion: '', aprobadoPor: 'Lucía Cáceres', enviado: true });
      } else if (cmpFecha(e.fecha, '06/03/2026') <= 0) {
        if (e.colaboradorId === 13) this.aprobaciones.set(e.key, { estado: 'Rechazado', lineas: [], observacion: 'No fue solicitada por la jefatura', aprobadoPor: 'Diego Benavides', enviado: false });
        else if (e.colaboradorId === 3) this.aprobaciones.set(e.key, { estado: 'Aprobado parcial', lineas: [{ minutos: 60, tipo: 25 }], observacion: 'Se aprueba 1 hora; el resto no fue coordinado', aprobadoPor: 'Lucía Cáceres', enviado: false });
        else this.aprobaciones.set(e.key, { estado: 'Aprobado', lineas: this.sugeridas(e), observacion: '', aprobadoPor: 'Lucía Cáceres', enviado: false });
      }
    }
  }

  // --- Alerts ------------------------------------------------------------------------------------------------------
  /** Day before `fecha` with a working shift for most people (skips Sundays). */
  diaHabilAnterior(fecha: string): string { let f = sumarDias(fecha, -1); while (diaSemana(f) === 0) f = sumarDias(f, -1); return f; }

  porcentajeAsistencia(cs: Colaborador[], fecha: string): number | null {
    const js = cs.map((c) => this.jornada(c.id, fecha)).filter((j) => this.esperado(j));
    return js.length ? Math.round((js.filter((j) => j.entrada).length / js.length) * 100) : null;
  }

  alertas(cs: Colaborador[], fecha: string): Alerta[] {
    const tol = this.tol, out: Alerta[] = [];
    const ini = `01/${fecha.slice(3)}`;
    const mes = rangoFechas(ini, fecha);
    if (tol['alDisminucion']) {
      const hoy = this.porcentajeAsistencia(cs, fecha);
      const previos = [7, 14, 21, 28].map((n) => sumarDias(fecha, -n)).filter((f) => cmpFecha(f, this.inicio) >= 0)
        .map((f) => this.porcentajeAsistencia(cs, f)).filter((x): x is number => x != null);
      const prom = previos.length ? previos.reduce((s, x) => s + x, 0) / previos.length : null;
      if (hoy != null && prom != null && prom - hoy >= Number(tol['umbralDisminucion'])) {
        out.push({ id: 'dis', titulo: `Disminución anormal de asistencia: ${hoy} % frente a ${Math.round(prom)} % habitual`, severidad: 'danger',
          colaboradores: cs.filter((c) => { const j = this.jornada(c.id, fecha); return this.esperado(j) && !j.entrada; }).map((c) => ({ id: c.id, detalle: 'Sin marca de entrada' })) });
      }
    }
    if (tol['alIncompletos']) {
      const f = this.diaHabilAnterior(fecha);
      const l = cs.filter((c) => this.jornada(c.id, f).estado === 'Incompleta').map((c) => ({ id: c.id, detalle: `${f} · ${this.jornada(c.id, f).detalle}` }));
      if (l.length) out.push({ id: 'inc', titulo: `${l.length} ${l.length === 1 ? 'persona' : 'personas'} con registros incompletos el ${f}`, severidad: 'danger', colaboradores: l });
    }
    if (tol['alSinFoto'] && this.metodos['exigirFoto']) {
      const l = cs.map((c) => ({ c, n: mes.flatMap((f) => this.marcasDe(c.id, f)).filter((m) => (m.metodo === 'App' || m.metodo === 'QR') && !m.foto).length })).filter((x) => x.n);
      if (l.length) out.push({ id: 'foto', titulo: `Registros sin foto este mes (${l.reduce((s, x) => s + x.n, 0)})`, severidad: 'warning', colaboradores: l.map((x) => ({ id: x.c.id, detalle: `${x.n} marca(s) sin foto` })) });
    }
    if (tol['alHhee']) {
      const ids = new Set(cs.map((c) => c.id));
      const l = this.excesos().filter((e) => ids.has(e.colaboradorId) && this.periodoDe(e.fecha) === this.periodoDe(fecha) && this.aprobacion(e).estado === 'En espera');
      if (l.length) out.push({ id: 'hhee', titulo: `Posibles horas extras por aprobar (${l.length})`, severidad: 'info', colaboradores: l.map((e) => ({ id: e.colaboradorId, detalle: `${e.fecha} · ${dur(e.minutos)} h` })) });
    }
    if (tol['alLunes']) {
      const n = Number(tol['lunes']);
      const l = cs.map((c) => ({ c, n: mes.filter((f) => diaSemana(f) === 1 && this.jornada(c.id, f).estado === 'Inasistencia' && f !== this.corte).length })).filter((x) => x.n >= n);
      if (l.length) out.push({ id: 'lun', titulo: `Inasistencia ${n} o más lunes en el mes`, severidad: 'warning', colaboradores: l.map((x) => ({ id: x.c.id, detalle: `${x.n} lunes` })) });
    }
    if (tol['alInasistencias']) {
      const n = Number(tol['inasistencias']);
      const l = cs.map((c) => ({ c, n: mes.filter((f) => this.jornada(c.id, f).estado === 'Inasistencia').length })).filter((x) => x.n >= n);
      if (l.length) out.push({ id: 'ina', titulo: `Inasistencia ${n} o más días en el mes`, severidad: 'warning', colaboradores: l.map((x) => ({ id: x.c.id, detalle: `${x.n} días` })) });
    }
    if (tol['alDomingos']) {
      const n = Number(tol['domingos']);
      const l = cs.map((c) => ({ c, n: mes.filter((f) => diaSemana(f) === 0 && this.jornada(c.id, f).entrada).length })).filter((x) => x.n >= n);
      if (l.length) out.push({ id: 'dom', titulo: `${n} o más domingos trabajados en el mes`, severidad: 'info', colaboradores: l.map((x) => ({ id: x.c.id, detalle: `${x.n} domingos` })) });
    }
    return out;
  }

  // --- Supervisor notes --------------------------------------------------------------------------------------------
  agregarNota(c: Colaborador, texto: string): void {
    const list = this.notas$.value;
    this.notas$.next([{ id: Math.max(0, ...list.map((x) => x.id)) + 1, colaboradorId: c.id, fecha: fmtFecha(new Date()), texto, autor: this.data.usuario.nombre }, ...list]);
    this.registrar(nombreCol(c), c.documento, 'Observación del supervisor', 'Crear', texto.slice(0, 60));
  }

  // --- Misc ----------------------------------------------------------------------------------------------------------
  monto(n: number): string { return soles(Math.round(n * 100) / 100); }
  private registrar(colaborador: string, documento: string, entidad: string, accion: 'Crear' | 'Modificar' | 'Eliminar', actual?: string, propiedad?: string, anterior?: string): void {
    this.audit.registrar({ colaborador, documento, entidad, accion, actual, propiedad, anterior });
  }
}
