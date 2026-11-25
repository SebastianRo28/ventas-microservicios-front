import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { aIso, ControlAsistenciaService, deIso, diaSemana, dur, Jornada, rangoFechas, sumarDias } from '../../core/control-asistencia.service';
import { parseFecha } from '../../core/format';
import { Colaborador } from '../../core/models';
import { Column, Row } from '../../shared/data-table/data-table.models';

interface Tabla { cols: Column[]; rows: Row[]; }
interface DefReporte { id: string; titulo: string; categoria: string; descripcion: string; rangoFijo?: string; generar: (cs: Colaborador[], desde: string, hasta: string) => Tabla; }
const CATEGORIAS = ['Mis favoritos', 'Asistencias', 'Ausencias', 'Gestión', 'Colaboradores', 'Fiscalización'];

const col = (key: string, label: string, extra: Partial<Column> = {}): Column => ({ key, label, w: 'minmax(120px, 1fr)', ...extra });
const nombre = (c: Colaborador) => ({ text: `${c.apellidos}, ${c.nombres}`, link: `/ca/colaboradores/perfil/${c.id}` });

/** Control de Asistencia › Reportes (P-04.11). Also listed in Reportería › Exportadores, category "Asistencia". */
@Component({
  selector: 'app-ca-reportes',
  template: `
    <app-page-header title="Reportes" [crumbs]="['Control de Asistencia']"></app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-row nx-mb-16 nx-wrap">
      <input class="nx-input nx-w-280" placeholder="Buscar reporte" [(ngModel)]="q" aria-label="Buscar reporte">
      <div class="nx-chips" role="group" aria-label="Categoría">
        <button *ngFor="let c of categorias" type="button" class="nx-chip" [class.is-on]="cat === c" [attr.aria-pressed]="cat === c" (click)="cat = c">{{ c }}</button>
        <button type="button" class="nx-chip" [class.is-on]="!cat" [attr.aria-pressed]="!cat" (click)="cat = ''">Todos</button>
      </div>
    </div>
    <div class="nx-benefits nx-mb-20">
      <div *ngFor="let r of lista" class="nx-card nx-benefit nx-careport" [class.is-on]="sel?.id === r.id">
        <div class="nx-row"><span class="nx-iconbox nx-iconbox--34"><app-icon name="filebar" [size]="17"></app-icon></span><span class="nx-grow"></span>
          <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [class.is-fav]="ca.favoritos.has(r.id)" [attr.aria-pressed]="ca.favoritos.has(r.id)"
                  [attr.aria-label]="(ca.favoritos.has(r.id) ? 'Quitar de favoritos: ' : 'Marcar como favorito: ') + r.titulo" (click)="fav(r.id)"><app-icon name="heart" [size]="16"></app-icon></button></div>
        <b>{{ r.titulo }}</b><span class="nx-badge nx-badge--sm nx-tone-gray nx-self-start">{{ r.categoria }}</span>
        <span class="nx-muted nx-small nx-grow">{{ r.descripcion }}</span>
        <button type="button" class="nx-btn nx-btn--outline nx-btn--sm nx-self-start" (click)="abrir(r)">Ver reporte</button>
      </div>
      <p *ngIf="!lista.length" class="nx-muted">{{ cat === 'Mis favoritos' ? 'Aún no marcas reportes como favoritos (corazón).' : 'Sin reportes para la búsqueda.' }}</p>
    </div>
    <section *ngIf="sel && tabla" class="nx-card nx-pad" [attr.aria-label]="sel.titulo">
      <div class="nx-section__head"><h2>{{ sel.titulo }}</h2>
        <ng-container *ngIf="!sel.rangoFijo">
          <label class="nx-cafil__f">Desde<span class="nx-input-icon nx-input-icon--end"><input nxFecha nxFechaIso class="nx-input nx-input--sm" [nxFechaMin]="minIso" [nxFechaMax]="maxIso" [(ngModel)]="desde" (ngModelChange)="generar()"><app-icon name="calendar" [size]="14"></app-icon></span></label>
          <label class="nx-cafil__f">Hasta<span class="nx-input-icon nx-input-icon--end"><input nxFecha nxFechaIso class="nx-input nx-input--sm" [nxFechaMin]="minIso" [nxFechaMax]="maxIso" [(ngModel)]="hasta" (ngModelChange)="generar()"><app-icon name="calendar" [size]="14"></app-icon></span></label>
        </ng-container>
        <span *ngIf="sel.rangoFijo" class="nx-small nx-muted">{{ sel.rangoFijo }}</span>
      </div>
      <span *ngIf="error" class="nx-error">{{ error }}</span>
      <app-data-table [columns]="tabla.cols" [rows]="tabla.rows" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false" [rowActions]="[]"
                      [tableLabel]="sel.titulo" minWidth="1100px" [exportName]="'ca-' + sel.id" emptyTitle="Sin datos" emptyText="No hay datos para el rango y filtros elegidos."></app-data-table>
    </section>
  `
})
export class CaReportesComponent implements OnDestroy {
  readonly categorias = CATEGORIAS;
  readonly minIso: string;
  readonly maxIso: string;
  q = '';
  cat = '';
  desde: string;
  hasta: string;
  sel: DefReporte | null = null;
  tabla: Tabla | null = null;
  error = '';
  readonly reportes: DefReporte[];
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService) {
    this.minIso = aIso(ca.inicio);
    this.maxIso = aIso(ca.corte);
    this.desde = aIso(`01/${ca.filtro.fecha.slice(3)}`);
    this.hasta = aIso(ca.filtro.fecha);
    this.reportes = this.definir();
    this.sub = ca.cambios$.subscribe(() => this.generar());
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get lista(): DefReporte[] {
    const q = this.q.trim().toLowerCase();
    return this.reportes.filter((r) => (!this.cat || (this.cat === 'Mis favoritos' ? this.ca.favoritos.has(r.id) : r.categoria === this.cat))
      && (!q || `${r.titulo} ${r.descripcion}`.toLowerCase().includes(q)));
  }
  fav(id: string): void { this.ca.favoritos.has(id) ? this.ca.favoritos.delete(id) : this.ca.favoritos.add(id); }
  abrir(r: DefReporte): void { this.sel = r; this.generar(); }

  generar(): void {
    if (!this.sel) return;
    if (!this.desde || !this.hasta || this.desde > this.hasta) { this.error = 'Revisa el rango: “Desde” debe ser anterior o igual a “Hasta”.'; return; }
    this.error = '';
    this.tabla = this.sel.generar(this.ca.visibles(), deIso(this.desde), deIso(this.hasta));
  }

  private definir(): DefReporte[] {
    const ca = this.ca;
    const dias = (cs: Colaborador[], d: string, h: string, f: (j: Jornada) => boolean) =>
      cs.flatMap((c) => rangoFechas(d, h).map((x) => ({ c, j: ca.jornada(c.id, x) }))).filter((x) => f(x.j));
    const resumen = (cs: Colaborador[], d: string, h: string): Tabla => ({
      cols: [col('c', 'Colaborador', { type: 'link' }), col('r', 'Recinto', { filter: 'select' }), col('a', 'Días asistidos', { type: 'number', filter: 'none' }),
        col('i', 'Inasistencias', { type: 'number', filter: 'none' }), col('t', 'Atrasos', { type: 'number', filter: 'none' }), col('ho', 'HO', { filter: 'none' }),
        col('hn', 'HNT', { filter: 'none' }), col('he', 'HHEE', { filter: 'none' })],
      rows: cs.map((c) => { const s = ca.resumen(c.id, d, h); return { id: c.id, c: nombre(c), r: ca.recintoNombre(c.id), a: s.asistencias, i: s.inasistencias, t: s.atrasos, ho: dur(s.ho), hn: dur(s.hnt), he: dur(s.exceso) }; }),
    });
    const lunes = sumarDias(ca.filtro.fecha, -((diaSemana(ca.filtro.fecha) + 6) % 7) - 7);
    const listaDias = (cs: Colaborador[], d: string, h: string, f: (j: Jornada) => boolean, extra: Column[], val: (j: Jornada) => Record<string, string | number>): Tabla => ({
      cols: [col('f', 'Fecha', { type: 'date', filter: 'date' }), col('c', 'Colaborador', { type: 'link' }), col('r', 'Recinto', { filter: 'select' }), col('t', 'Turno'), ...extra],
      rows: dias(cs, d, h, f).map(({ c, j }) => ({ id: `${c.id}|${j.fecha}`, f: j.fecha, c: nombre(c), r: ca.recintoNombre(c.id), t: j.turno ? `${j.codigo} · ${j.horario}` : j.horario, ...val(j) })),
    });
    return [
      { id: 'asistencias', titulo: 'Asistencias', categoria: 'Asistencias', descripcion: 'Cada jornada con entrada, salida, estado y horas ordinarias.',
        generar: (cs, d, h) => listaDias(cs, d, h, (j) => !!j.turno || j.marcas.length > 0,
          [col('e', 'Entrada'), col('s', 'Salida'), col('es', 'Estado', { type: 'badge', filter: 'select' }), col('ho', 'HO', { filter: 'none' })],
          (j) => ({ e: j.entrada?.hora ?? '—', s: j.salida?.hora ?? '—', es: j.estado, ho: dur(j.ho) })) },
      { id: 'semana', titulo: 'Semana anterior', categoria: 'Asistencias', descripcion: 'Resumen por colaborador de la semana pasada (lunes a domingo).',
        rangoFijo: `Del ${lunes} al ${sumarDias(lunes, 6)}`, generar: (cs) => resumen(cs, lunes, sumarDias(lunes, 6)) },
      { id: 'mensual', titulo: 'Mensual por horas', categoria: 'Asistencias', descripcion: 'Horas ordinarias, no trabajadas y extras por colaborador en el rango.', generar: resumen },
      { id: 'ubicacion', titulo: 'Por ubicación', categoria: 'Gestión', descripcion: 'Marcas por recinto y método, con las rechazadas por estar fuera del radio.',
        generar: (cs, d, h) => {
          const ids = new Set(cs.map((c) => c.id)), fechas = new Set(rangoFechas(d, h));
          const ms = ca.todasLasMarcas().filter((m) => ids.has(m.colaboradorId) && fechas.has(m.fecha));
          const fs = ca.fallidas$.value.filter((m) => ids.has(m.colaboradorId) && fechas.has(m.fecha));
          return {
            cols: [col('r', 'Recinto'), col('t', 'Marcas', { type: 'number', filter: 'none' }), col('p', 'Personas', { type: 'number', filter: 'none' }),
              ...['Web', 'App', 'QR', 'Manual'].map((x) => col(x, x, { type: 'number', filter: 'none' })), col('f', 'Fuera del radio', { type: 'number', filter: 'none' })],
            rows: ca.recintos$.value.map((r) => {
              const l = ms.filter((m) => m.recintoId === r.id);
              return { id: r.id, r: r.nombre, t: l.length, p: new Set(l.map((m) => m.colaboradorId)).size,
                ...Object.fromEntries(['Web', 'App', 'QR', 'Manual'].map((x) => [x, l.filter((m) => m.metodo === x).length])),
                f: fs.filter((m) => m.recintoId === r.id && m.motivo === 'Fuera del radio').length };
            }).filter((r) => r.t || r.f),
          };
        } },
      { id: 'dotacion', titulo: 'Dotación del mes', categoria: 'Colaboradores', descripcion: 'Colaboradores por recinto y área, ingresos del mes y personas sin turno.',
        generar: (cs, d, h) => {
          const g = new Map<string, Colaborador[]>();
          for (const c of cs) { const k = `${ca.recintoNombre(c.id)}|${c.area}`; g.set(k, [...(g.get(k) ?? []), c]); }
          return {
            cols: [col('r', 'Recinto', { filter: 'select' }), col('a', 'Área', { filter: 'select' }), col('n', 'Dotación', { type: 'number', filter: 'none' }),
              col('i', 'Ingresos en el rango', { type: 'number', filter: 'none' }), col('s', 'Sin turno al cierre', { type: 'number', filter: 'none' })],
            rows: [...g.entries()].map(([k, l], i) => ({ id: i, r: k.split('|')[0], a: k.split('|')[1], n: l.length,
              i: l.filter((c) => parseFecha(c.ingreso)! >= parseFecha(d)! && parseFecha(c.ingreso)! <= parseFecha(h)!).length,
              s: l.filter((c) => !ca.asignacionVigente(c.id, h)).length })),
          };
        } },
      { id: 'fallidas', titulo: 'Marcas fallidas', categoria: 'Gestión', descripcion: 'Intentos de marca rechazados y su motivo.',
        generar: (cs, d, h) => {
          const ids = new Set(cs.map((c) => c.id)), fechas = new Set(rangoFechas(d, h));
          return {
            cols: [col('f', 'Fecha y hora', { type: 'date', filter: 'date' }), col('c', 'Colaborador', { type: 'link' }), col('r', 'Recinto', { filter: 'select' }),
              col('m', 'Método', { filter: 'select' }), col('mo', 'Motivo', { filter: 'select' })],
            rows: ca.fallidas$.value.filter((m) => ids.has(m.colaboradorId) && fechas.has(m.fecha)).map((m) => ({
              id: m.id, f: `${m.fecha} ${m.hora}`, c: nombre(ca.col(m.colaboradorId)!), r: ca.recinto(m.recintoId)?.nombre ?? '—', m: m.metodo, mo: m.motivo })),
          };
        } },
      { id: 'anticipadas', titulo: 'Salidas anticipadas', categoria: 'Gestión', descripcion: 'Jornadas con salida antes del fin del turno, fuera de la tolerancia.',
        generar: (cs, d, h) => listaDias(cs, d, h, (j) => j.anticipada > 0, [col('s', 'Salida'), col('m', 'Minutos', { type: 'number', filter: 'none' })],
          (j) => ({ s: j.salida?.hora ?? '—', m: j.anticipada })) },
      { id: 'atrasos', titulo: 'Atrasos', categoria: 'Gestión', descripcion: 'Llegadas después de la tolerancia del turno.',
        generar: (cs, d, h) => listaDias(cs, d, h, (j) => j.atraso > 0, [col('e', 'Entrada'), col('m', 'Minutos de atraso', { type: 'number', filter: 'none' })],
          (j) => ({ e: j.entrada?.hora ?? '—', m: j.atraso })) },
      { id: 'incompletas', titulo: 'Jornadas incompletas', categoria: 'Gestión', descripcion: 'Días con entrada sin salida o salida sin entrada.',
        generar: (cs, d, h) => listaDias(cs, d, h, (j) => j.estado === 'Incompleta', [col('e', 'Entrada'), col('s', 'Salida'), col('de', 'Detalle')],
          (j) => ({ e: j.entrada?.hora ?? '—', s: j.salida?.hora ?? '—', de: j.detalle })) },
      { id: 'ausencias', titulo: 'Ausencias por tipo', categoria: 'Ausencias', descripcion: 'Días de vacaciones, licencias, permisos e inasistencias por colaborador.',
        generar: (cs, d, h) => ({
          cols: [col('c', 'Colaborador', { type: 'link' }), col('r', 'Recinto', { filter: 'select' }),
            ...['Vacaciones', 'Licencia', 'Permiso', 'Inasistencia'].map((x) => col(x, x === 'Licencia' ? 'Licencias' : x === 'Permiso' ? 'Permisos' : x === 'Inasistencia' ? 'Inasistencias' : x, { type: 'number', filter: 'none' }))],
          rows: cs.map((c) => {
            const js = rangoFechas(d, h).map((x) => ca.jornada(c.id, x));
            return { id: c.id, c: nombre(c), r: ca.recintoNombre(c.id), ...Object.fromEntries(['Vacaciones', 'Licencia', 'Permiso', 'Inasistencia'].map((x) => [x, js.filter((j) => j.estado === x).length])) };
          }),
        }) },
      { id: 'registro', titulo: 'Registro de control de asistencia', categoria: 'Fiscalización',
        descripcion: 'Registro de ingreso y salida exigible en una inspección laboral (D.S. 004-2006-TR): fecha, trabajador, hora de ingreso y de salida.',
        generar: (cs, d, h) => ({
          cols: [col('f', 'Fecha', { type: 'date', filter: 'date' }), col('c', 'Trabajador', { type: 'link' }), col('dni', 'DNI'), col('e', 'Hora de ingreso'),
            col('s', 'Hora de salida'), col('m', 'Medio de registro', { filter: 'select' }), col('o', 'Observación')],
          rows: dias(cs, d, h, (j) => j.marcas.length > 0).map(({ c, j }) => ({ id: `${c.id}|${j.fecha}`, f: j.fecha, c: nombre(c), dni: c.documento,
            e: j.entrada?.hora ?? '—', s: j.salida?.hora ?? '—', m: j.entrada?.metodo ?? j.salida?.metodo ?? '—',
            o: j.marcas.some((m) => m.metodo === 'Manual') ? 'Incluye marca manual' : '' })),
        }) },
    ];
  }
}

/** Control de Asistencia › Vista Consolidada (P-04.12): every recinto of the user on one screen. */
@Component({
  selector: 'app-ca-consolidada',
  template: `
    <app-page-header title="Vista Consolidada" [crumbs]="['Control de Asistencia']"></app-page-header>
    <app-ca-filtros [recinto]="false" [rapidos]="false"></app-ca-filtros>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Recintos activos</span><b>{{ kpi.recintos }}</b></div>
      <div class="nx-card nx-stat"><span>Trabajando ahora</span><b>{{ esHoy ? kpi.trabajando : '—' }}</b></div>
      <div class="nx-card nx-stat"><span>Asistencia {{ esHoy ? 'hoy' : 'del día' }}</span><b>{{ kpi.pct }} %</b></div>
      <div class="nx-card nx-stat"><span>HHEE del mes</span><b>{{ kpi.hhee }}</b></div>
    </div>
    <section class="nx-card nx-pad nx-mb-16" aria-label="Asistencia por recinto, todos los trabajadores">
      <h2 class="nx-section__title">Asistencia por recinto · todos los trabajadores</h2>
      <div class="nx-dt__scroll"><table class="nx-table">
        <thead><tr><th>Recinto</th><th>Empresa</th><th class="nx-num">Asistencia</th><th class="nx-num">Trabajando</th><th class="nx-num">Marcas registradas</th><th class="nx-num">% Asistencia</th><th class="nx-num">Total</th></tr></thead>
        <tbody><tr *ngFor="let r of filas"><td><a [routerLink]="['/ca/panel']" [queryParams]="{ recinto: r.id }" (click)="ca.setFiltro({ recintoId: r.id })">{{ r.nombre }}</a></td><td>{{ r.empresa }}</td>
          <td class="nx-num">{{ r.asistencia }}</td><td class="nx-num">{{ esHoy ? r.trabajando : '—' }}</td><td class="nx-num">{{ r.marcas }}</td><td class="nx-num">{{ r.pct }}</td><td class="nx-num">{{ r.total }}</td></tr></tbody>
      </table></div>
      <p class="nx-small nx-muted nx-mb-0">Haz clic en un recinto para abrir su Panel de Control.</p>
    </section>
    <div class="nx-grid nx-grid--2">
      <section class="nx-card nx-pad" aria-label="Solo personal propio">
        <h2 class="nx-section__title">Solo personal propio</h2>
        <div class="nx-dt__scroll"><table class="nx-table nx-mini-table">
          <colgroup><col style="width: 34%"></colgroup>
          <thead><tr><th>Recinto</th><th class="nx-num">Dotación</th><th class="nx-num">Asistencia</th><th class="nx-num">Permisos</th><th class="nx-num">Vacaciones</th><th class="nx-num">Licencias</th></tr></thead>
          <tbody><tr *ngFor="let r of filas"><td>{{ r.nombre }}</td><td class="nx-num">{{ r.total }}</td><td class="nx-num">{{ r.asistencia }}</td><td class="nx-num">{{ r.permisos }}</td>
            <td class="nx-num">{{ r.vacaciones }}</td><td class="nx-num">{{ r.licencias }}</td></tr></tbody>
        </table></div>
      </section>
      <section class="nx-card nx-pad" aria-label="Horas extras acumuladas del mes">
        <h2 class="nx-section__title">% de horas extras acumuladas del mes</h2>
        <div class="nx-dt__scroll"><table class="nx-table nx-mini-table">
          <colgroup><col style="width: 34%"></colgroup>
          <thead><tr><th>Recinto</th><th class="nx-num">Horas ordinarias</th><th class="nx-num">HHEE</th><th class="nx-num">% HHEE</th><th class="nx-num">Aprobadas</th></tr></thead>
          <tbody><tr *ngFor="let r of filas"><td>{{ r.nombre }}</td><td class="nx-num">{{ r.ho }}</td><td class="nx-num">{{ r.he }}</td><td class="nx-num">{{ r.pctHe }}</td><td class="nx-num">{{ r.heAprob }}</td></tr></tbody>
        </table></div>
      </section>
    </div>
  `
})
export class CaConsolidadaComponent implements OnDestroy {
  esHoy = true;
  kpi = { recintos: 0, trabajando: 0, pct: 0, hhee: '' };
  filas: { id: number; nombre: string; empresa: string; asistencia: number; trabajando: number; marcas: number; pct: string; total: number;
    permisos: number; vacaciones: number; licencias: number; ho: string; he: string; pctHe: string; heAprob: string }[] = [];
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService) { this.sub = ca.cambios$.subscribe(() => this.armar()); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private armar(): void {
    const ca = this.ca, f = ca.filtro.fecha;
    this.esHoy = f === ca.corte;
    const mes = rangoFechas(`01/${f.slice(3)}`, f);
    let trab = 0, asis = 0, esp = 0, heTot = 0;
    this.filas = ca.recintos$.value.filter((r) => r.activo || ca.dotacion(r.id)).map((r) => {
      const cs = ca.colaboradores.filter((c) => ca.recintoDe[c.id] === r.id);
      const js = cs.map((c) => ca.jornada(c.id, f));
      const asistencia = js.filter((j) => j.entrada).length, esperados = js.filter((j) => ca.esperado(j) || j.entrada).length;
      const trabajando = js.filter((j) => j.trabajando).length;
      let ho = 0, he = 0;
      for (const c of cs) for (const d of mes) { const j = ca.jornada(c.id, d); ho += j.ho; he += j.exceso; }
      const ids = new Set(cs.map((c) => c.id));
      const heAprob = ca.excesos().filter((e) => ids.has(e.colaboradorId) && e.fecha.slice(3) === f.slice(3) && +e.fecha.slice(0, 2) <= +f.slice(0, 2)).reduce((s, e) => s + ca.aprobadas(e), 0);
      trab += trabajando; asis += asistencia; esp += esperados; heTot += he;
      return {
        id: r.id, nombre: r.nombre, empresa: r.empresa, asistencia, trabajando, marcas: cs.reduce((s, c) => s + ca.marcasDe(c.id, f).length, 0),
        pct: esperados ? `${Math.round((asistencia / esperados) * 100)} %` : '—', total: cs.length,
        permisos: js.filter((j) => j.estado === 'Permiso').length, vacaciones: js.filter((j) => j.estado === 'Vacaciones').length, licencias: js.filter((j) => j.estado === 'Licencia').length,
        ho: dur(ho), he: dur(he), pctHe: ho ? `${((he / ho) * 100).toFixed(1)} %` : '—', heAprob: dur(heAprob),
      };
    });
    this.kpi = { recintos: ca.recintos$.value.filter((r) => r.activo).length, trabajando: trab, pct: esp ? Math.round((asis / esp) * 100) : 0, hhee: `${dur(heTot)} h` };
  }
}
