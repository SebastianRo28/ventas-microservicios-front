import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, diasCalendario, seCruzan } from '../../core/asistencia.service';
import { aIso, ControlAsistenciaService, deIso, diaSemana, DIAS_SEMANA, dur, rangoFechas } from '../../core/control-asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { Colaborador } from '../../core/models';
import { AUSENCIA_CON_GOCE, Ausencia, FERIADOS_2026, TIPOS_AUSENCIA, TipoAusencia, Vacacion } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

type VistaAus = 'ausencias' | 'hnt' | 'feriados' | 'descansos' | 'vacaciones' | 'permisos';
interface DefVista { titulo: string; nota: string; registrar?: string; tipos?: TipoAusencia[]; cols: Column[]; minWidth: string; }

const C = {
  c: { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' } as Column,
  r: { key: 'r', label: 'Recinto', filter: 'select', w: 'minmax(170px, 1fr)' } as Column,
  d: { key: 'd', label: 'Desde', type: 'date', filter: 'date', w: 'minmax(110px, 0.6fr)' } as Column,
  h: { key: 'h', label: 'Hasta', type: 'date', filter: 'date', w: 'minmax(110px, 0.6fr)' } as Column,
  n: { key: 'n', label: 'Días', type: 'number', filter: 'none', w: '80px' } as Column,
  o: { key: 'o', label: 'Observación', w: 'minmax(180px, 1.2fr)' } as Column,
  x: { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '90px' } as Column,
};
const PERMISOS: TipoAusencia[] = ['Permiso con goce', 'Permiso sin goce'];

const VISTAS: Record<VistaAus, DefVista> = {
  ausencias: {
    titulo: 'Ausencias', nota: 'Todas las ausencias registradas en Administrativo › Gestión de Ausencia, filtradas por recinto y período. Lo que registres aquí aparece allí y en la boleta.',
    registrar: 'Registrar ausencia', tipos: TIPOS_AUSENCIA, minWidth: '1300px',
    cols: [C.c, C.r, { key: 't', label: 'Tipo', type: 'badge', filter: 'select', w: 'minmax(180px, 1fr)' }, C.d, C.h, C.n,
      { key: 'g', label: 'Con goce', filter: 'select', w: '100px' }, C.o, C.x],
  },
  hnt: {
    titulo: 'Horas no Trabajadas', nota: 'Calculadas desde las marcas: inasistencias, permisos sin goce y la diferencia entre las horas del turno y las horas ordinarias trabajadas. Se descuentan en la boleta del período.',
    minWidth: '1300px',
    cols: [{ key: 'f', label: 'Fecha', type: 'date', filter: 'date', w: 'minmax(110px, 0.6fr)' }, C.c, C.r, { key: 't', label: 'Turno', w: 'minmax(120px, 0.7fr)' },
      { key: 'm', label: 'Motivo', type: 'badge', filter: 'select', w: 'minmax(150px, 0.9fr)' }, { key: 'at', label: 'Atraso (min)', type: 'number', filter: 'none', w: '110px' },
      { key: 'sa', label: 'Salida anticipada (min)', type: 'number', filter: 'none', w: 'minmax(150px, 0.7fr)' },
      { key: 'hn', label: 'HNT', filter: 'none', w: '90px' }, { key: 'v', label: 'Descuento estimado', type: 'money', filter: 'none', w: 'minmax(140px, 0.7fr)' }],
  },
  feriados: {
    titulo: 'Feriados', nota: 'Feriados del año según Administración › Feriados. Quien trabaja un feriado sin descanso sustitutorio cobra la sobretasa en Recargo Domingo.',
    minWidth: '1000px',
    cols: [{ key: 'f', label: 'Fecha', type: 'date', filter: 'date', w: 'minmax(110px, 0.6fr)' }, { key: 'di', label: 'Día', filter: 'select', w: '110px' },
      { key: 'no', label: 'Feriado', w: 'minmax(220px, 1.5fr)' }, { key: 'p', label: 'Con turno ese día', type: 'number', filter: 'none', w: 'minmax(130px, 0.7fr)' },
      { key: 't', label: 'Trabajaron', type: 'number', filter: 'none', w: 'minmax(110px, 0.6fr)' }, { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '110px' }],
  },
  descansos: {
    titulo: 'Descansos Médicos', nota: 'El empleador paga los primeros 20 días de incapacidad del año; desde el día 21 paga EsSalud (subsidio). Validar un certificado en Licencias Médicas Electrónicas también los registra.',
    registrar: 'Registrar descanso médico', tipos: ['Descanso médico'], minWidth: '1300px',
    cols: [C.c, C.r, C.d, C.h, C.n, { key: 'ac', label: 'Acumulado en el año', type: 'number', filter: 'none', w: 'minmax(140px, 0.7fr)' },
      { key: 'pa', label: 'A cargo de', type: 'badge', filter: 'select', w: 'minmax(170px, 0.9fr)' }, C.o, C.x],
  },
  vacaciones: {
    titulo: 'Vacaciones', nota: 'Las mismas vacaciones de Administrativo › Vacaciones y de la ficha. Los días registrados se descuentan del saldo.',
    registrar: 'Registrar vacaciones', minWidth: '1200px',
    cols: [C.c, C.r, C.d, C.h, C.n, { key: 'or', label: 'Origen', filter: 'select', w: 'minmax(130px, 0.7fr)' },
      { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(120px, 0.7fr)' }, { key: 's', label: 'Saldo', filter: 'none', w: '90px' }, C.o, C.x],
  },
  permisos: {
    titulo: 'Permisos', nota: 'Permisos con y sin goce. Los permisos sin goce generan horas no trabajadas y se descuentan en la boleta.',
    registrar: 'Registrar permiso', tipos: PERMISOS, minWidth: '1200px',
    cols: [C.c, C.r, { key: 't', label: 'Tipo', type: 'badge', filter: 'select', w: 'minmax(150px, 0.9fr)' }, C.d, C.h, C.n, C.o, C.x],
  },
};

/** Control de Asistencia › Ausencias (P-04.9): one screen per route data `vista`, over the same records as Administrativo. */
@Component({
  selector: 'app-ca-ausencias',
  template: `
    <app-page-header [title]="def.titulo" [crumbs]="['Control de Asistencia', 'Ausencias']">
      <button *ngIf="def.registrar" type="button" class="nx-btn nx-btn--primary" (click)="abrir()"><app-icon name="plus" [size]="16"></app-icon>{{ def.registrar }}</button>
      <a *ngIf="vista === 'feriados'" class="nx-btn nx-btn--outline" routerLink="/configuracion/feriados">Editar feriados</a>
    </app-page-header>
    <app-ca-filtros [rapidos]="vista !== 'feriados'"></app-ca-filtros>
    <div class="nx-row nx-mb-12">
      <div class="nx-chips" role="group" aria-label="Período">
        <button type="button" class="nx-chip" [class.is-on]="!todo" [attr.aria-pressed]="!todo" (click)="todo = false; armar()">{{ mesLabel }}</button>
        <button type="button" class="nx-chip" [class.is-on]="todo" [attr.aria-pressed]="todo" (click)="todo = true; armar()">{{ vista === 'feriados' ? 'Todo el año' : 'Desde el ' + ca.inicio }}</button>
      </div>
      <span class="nx-grow"></span><span class="nx-small nx-muted">{{ resumen }}</span>
    </div>
    <div class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon><span class="nx-grow">{{ def.nota }}</span></div>
    <app-data-table [columns]="def.cols" [rows]="rows" [rowActions]="acciones" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    [tableLabel]="def.titulo" [minWidth]="def.minWidth" [exportName]="'ca-' + vista" emptyTitle="Sin registros" emptyText="No hay registros para los filtros elegidos."
                    (action)="pedirBorrar($event.row)"></app-data-table>

    <app-modal *ngIf="m" [title]="def.registrar || ''" width="580px" (closed)="m = null">
      <form id="aus-form" class="nx-form" (ngSubmit)="guardar()" novalidate>
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [attr.name]="'colaborador'" [(ngModel)]="m.colaboradorId">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option></select></label>
        <label *ngIf="def.tipos && def.tipos.length > 1" class="nx-field">Tipo*
          <select class="nx-select" name="tipo" [attr.name]="'tipo'" [(ngModel)]="m.tipo"><option *ngFor="let t of def.tipos">{{ t }}</option></select></label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Desde*<input type="date" class="nx-input" name="desde" [(ngModel)]="m.desde"></label>
          <label class="nx-field">Hasta*<input type="date" class="nx-input" name="hasta" [min]="m.desde" [(ngModel)]="m.hasta"></label>
        </div>
        <label class="nx-field">Observación<input class="nx-input" name="obs" maxlength="120" [(ngModel)]="m.observacion"></label>
        <div *ngIf="!error && previa" class="nx-ok-note" role="status"><app-icon name="checkcircle" [size]="16"></app-icon>{{ previa }}</div>
        <span *ngIf="intento && error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="m = null">Cancelar</button>
        <button type="submit" form="aus-form" class="nx-btn nx-btn--primary">Registrar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar" title="Eliminar registro" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará {{ borrar.texto }}. El cambio también se verá en Administrativo y en la boleta.</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class CaAusenciasComponent implements OnDestroy {
  vista: VistaAus;
  def: DefVista;
  acciones: RowAction[] = [];
  rows: Row[] = [];
  todo = false;
  mesLabel = '';
  resumen = '';
  colaboradores: Colaborador[] = [];
  m: { colaboradorId: number | null; tipo: TipoAusencia; desde: string; hasta: string; observacion: string } | null = null;
  intento = false;
  borrar: { texto: string; aus?: Ausencia; vac?: Vacacion } | null = null;
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService, private asis: AsistenciaService, route: ActivatedRoute, private ui: UiStateService) {
    this.vista = (route.snapshot.data['vista'] as VistaAus) ?? 'ausencias';
    this.def = VISTAS[this.vista];
    this.acciones = this.def.cols.some((c) => c.type === 'actions') ? ['eliminar'] : [];
    this.sub = combineLatest([ca.cambios$, asis.ausencias$, asis.vacaciones$]).subscribe(() => this.armar());
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private get periodo(): [string, string] {
    const f = this.ca.filtro.fecha;
    if (this.todo) return this.vista === 'feriados' ? [`01/01/${f.slice(6)}`, `31/12/${f.slice(6)}`] : [this.ca.inicio, '31/12/2026'];
    const d = parseFecha(f)!;
    return [`01/${f.slice(3)}`, `${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}/${f.slice(3)}`];
  }
  private fila(id: number) { const c = this.ca.col(id); return { c: c ? { text: `${c.apellidos}, ${c.nombres}`, link: `/ca/colaboradores/perfil/${c.id}` } : '—', r: this.ca.recintoNombre(id) }; }

  armar(): void {
    const ca = this.ca, f = ca.filtro.fecha;
    this.mesLabel = parseFecha(f)!.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).replace(/^./, (x) => x.toUpperCase());
    this.colaboradores = ca.visibles();
    const ids = new Set(this.colaboradores.map((c) => c.id));
    const [p1, p2] = this.periodo;
    const enPer = (d: string, h: string) => seCruzan(d, h, p1, p2);
    const aus = this.asis.ausencias$.value.filter((a) => ids.has(a.colaboradorId) && enPer(a.desde, a.hasta))
      .sort((a, b) => parseFecha(b.desde)!.getTime() - parseFecha(a.desde)!.getTime());
    switch (this.vista) {
      case 'ausencias':
        this.rows = aus.map((a) => ({ id: 'a' + a.id, ...this.fila(a.colaboradorId), t: { text: a.tipo, tone: a.tipo === 'Falta injustificada' ? 'orange' : 'info' },
          d: a.desde, h: a.hasta, n: a.dias, g: AUSENCIA_CON_GOCE[a.tipo] ? 'Sí' : 'No', o: a.observacion || '—', x: '' }));
        this.resumen = `${aus.length} registros · ${aus.reduce((s, a) => s + a.dias, 0)} días`;
        break;
      case 'permisos': {
        const l = aus.filter((a) => PERMISOS.includes(a.tipo));
        this.rows = l.map((a) => ({ id: 'a' + a.id, ...this.fila(a.colaboradorId), t: { text: a.tipo, tone: AUSENCIA_CON_GOCE[a.tipo] ? 'info' : 'orange' },
          d: a.desde, h: a.hasta, n: a.dias, o: a.observacion || '—', x: '' }));
        this.resumen = `${l.length} permisos · ${l.filter((a) => !AUSENCIA_CON_GOCE[a.tipo]).reduce((s, a) => s + a.dias, 0)} días sin goce`;
        break;
      }
      case 'descansos': {
        const todos = this.asis.ausencias$.value.filter((a) => a.tipo === 'Descanso médico');
        const l = aus.filter((a) => a.tipo === 'Descanso médico');
        this.rows = l.map((a) => {
          const anio = a.desde.slice(6);
          const previos = todos.filter((x) => x.colaboradorId === a.colaboradorId && x.desde.slice(6) === anio && parseFecha(x.desde)! <= parseFecha(a.desde)!)
            .reduce((s, x) => s + x.dias, 0);
          const pagador = previos <= 20 ? { text: 'Empleador', tone: 'info' as const } : previos - a.dias >= 20 ? { text: 'Subsidio EsSalud', tone: 'success' as const }
            : { text: `Empleador ${20 - (previos - a.dias)} d · EsSalud ${previos - 20} d`, tone: 'warning' as const };
          return { id: 'a' + a.id, ...this.fila(a.colaboradorId), d: a.desde, h: a.hasta, n: a.dias, ac: previos, pa: pagador, o: a.observacion || '—', x: '' };
        });
        this.resumen = `${l.length} descansos médicos · ${l.reduce((s, a) => s + a.dias, 0)} días`;
        break;
      }
      case 'vacaciones': {
        const l = this.asis.vacaciones$.value.filter((v) => ids.has(v.colaboradorId) && enPer(v.desde, v.hasta))
          .sort((a, b) => parseFecha(b.desde)!.getTime() - parseFecha(a.desde)!.getTime());
        const corte = parseFecha(ca.corte)!;
        this.rows = l.map((v) => {
          const d = parseFecha(v.desde)!, h = parseFecha(v.hasta)!;
          const estado = h < corte ? { text: 'Tomadas', tone: 'gray' as const } : d > corte ? { text: 'Programadas', tone: 'info' as const } : { text: 'En curso', tone: 'success' as const };
          const c = ca.col(v.colaboradorId);
          return { id: 'v' + v.id, ...this.fila(v.colaboradorId), d: v.desde, h: v.hasta, n: v.dias, or: v.origen, e: estado, s: c ? this.asis.saldo(c).toFixed(2) : '—', o: v.observacion || '—', x: '' };
        });
        this.resumen = `${l.length} registros · ${l.reduce((s, v) => s + v.dias, 0)} días`;
        break;
      }
      case 'hnt': {
        const fechas = rangoFechas(p1, parseFecha(p2)! > parseFecha(ca.corte)! ? ca.corte : p2);
        const out: Row[] = [];
        let total = 0, monto = 0;
        for (const c of this.colaboradores) for (const d of fechas) {
          const j = ca.jornada(c.id, d);
          if (!j.hnt) continue;
          const motivo = j.estado === 'Inasistencia' ? 'Inasistencia' : j.detalle === 'Permiso sin goce' ? 'Permiso sin goce' : j.atraso && j.anticipada ? 'Atraso y salida anticipada'
            : j.atraso ? 'Atraso' : j.anticipada ? 'Salida anticipada' : 'Jornada incompleta';
          const v = Math.round((j.hnt / 60) * this.asis.valorHora(c) * 100) / 100;
          total += j.hnt; monto += v;
          out.push({ id: `${c.id}|${d}`, f: d, ...this.fila(c.id), t: j.turno ? `${j.codigo} · ${j.horario}` : '—',
            m: { text: motivo, tone: motivo === 'Inasistencia' ? 'orange' : 'warning' }, at: j.atraso, sa: j.anticipada, hn: dur(j.hnt), v: soles(v) });
        }
        this.rows = out.sort((a, b) => parseFecha(String(b['f']))!.getTime() - parseFecha(String(a['f']))!.getTime());
        this.resumen = `${dur(total)} h no trabajadas · ${soles(Math.round(monto * 100) / 100)} de descuento estimado`;
        break;
      }
      case 'feriados': {
        const l = FERIADOS_2026.filter((x) => enPer(x.fecha, x.fecha)).sort((a, b) => parseFecha(a.fecha)!.getTime() - parseFecha(b.fecha)!.getTime());
        this.rows = l.map((x, i) => {
          const pasado = parseFecha(x.fecha)! <= parseFecha(ca.corte)!;
          const conTurno = this.colaboradores.filter((c) => ca.turnoDe(c.id, x.fecha).turno).length;
          const trabajaron = pasado && parseFecha(x.fecha)! >= parseFecha(ca.inicio)! ? this.colaboradores.filter((c) => ca.jornada(c.id, x.fecha).entrada).length : 0;
          return { id: i + 1, f: x.fecha, di: DIAS_SEMANA[diaSemana(x.fecha)], no: x.nombre, p: conTurno, t: trabajaron,
            e: pasado ? { text: 'Pasado', tone: 'gray' } : { text: 'Próximo', tone: 'info' } };
        });
        this.resumen = `${l.length} feriados`;
        break;
      }
    }
  }

  abrir(): void {
    this.intento = false;
    const f = aIso(this.ca.filtro.fecha);
    this.m = { colaboradorId: null, tipo: this.def.tipos?.[0] ?? 'Permiso con goce', desde: f, hasta: f, observacion: '' };
  }
  get previa(): string {
    const m = this.m;
    if (!m || !m.desde || !m.hasta) return '';
    const dias = diasCalendario(deIso(m.desde), deIso(m.hasta));
    return dias ? `${dias} ${dias === 1 ? 'día calendario' : 'días calendario'}${this.vista !== 'vacaciones' && !AUSENCIA_CON_GOCE[m.tipo] ? ', sin goce de haber' : ''}.` : '';
  }
  get error(): string {
    const m = this.m;
    if (!m) return '';
    if (m.colaboradorId == null) return 'Selecciona un colaborador.';
    if (!m.desde || !m.hasta) return 'Ingresa las fechas desde y hasta.';
    const d = deIso(m.desde), h = deIso(m.hasta);
    const dias = diasCalendario(d, h);
    if (!dias) return 'La fecha “Hasta” debe ser igual o posterior a “Desde”.';
    if (dias > 365) return 'El registro no puede superar los 365 días.';
    const c = this.ca.col(+m.colaboradorId)!;
    if (parseFecha(d)! < parseFecha(c.ingreso)!) return `La fecha es anterior al ingreso del colaborador (${c.ingreso}).`;
    const choque = this.asis.conflicto(c.id, d, h);
    if (choque) return choque;
    if (this.vista === 'vacaciones') {
      if (!this.asis.cumplioRecord(c)) return `${c.nombres} aún no cumple un año de servicio (récord vacacional).`;
      if (!this.asis.config.permitirAdelanto && dias > this.asis.saldo(c)) return `Supera el saldo disponible (${this.asis.saldo(c).toFixed(2)} días). El adelanto de vacaciones está desactivado en Configuraciones.`;
    }
    if (m.tipo === 'Falta injustificada' && parseFecha(d)! > parseFecha(this.ca.corte)!) return 'No se puede registrar una falta injustificada en una fecha futura.';
    return '';
  }
  guardar(): void {
    this.intento = true;
    const m = this.m;
    if (!m || this.error) return;
    const c = this.ca.col(+m.colaboradorId!)!;
    const d = deIso(m.desde), h = deIso(m.hasta);
    if (this.vista === 'vacaciones') this.asis.registrarVacacion(c, d, h, 'Registro manual', m.observacion.trim());
    else this.asis.registrarAusencia(c, m.tipo, d, h, m.observacion.trim());
    this.ui.toast(`${this.vista === 'vacaciones' ? 'Vacaciones registradas' : m.tipo + ' registrado'} para ${c.nombres} ${c.apellidos}`);
    this.m = null;
  }

  pedirBorrar(row: Row): void {
    const id = String(row.id);
    if (id.startsWith('a')) {
      const a = this.asis.ausencias$.value.find((x) => x.id === +id.slice(1));
      if (a) this.borrar = { aus: a, texto: `“${a.tipo}” del ${a.desde} al ${a.hasta} de ${this.ca.nombre(a.colaboradorId)}` };
    } else if (id.startsWith('v')) {
      const v = this.asis.vacaciones$.value.find((x) => x.id === +id.slice(1));
      if (v) this.borrar = { vac: v, texto: `las vacaciones del ${v.desde} al ${v.hasta} de ${this.ca.nombre(v.colaboradorId)}` };
    }
  }
  confirmarBorrar(): void {
    const b = this.borrar;
    if (b?.aus) { const c = this.ca.col(b.aus.colaboradorId); if (c) this.asis.eliminarAusencia(b.aus, c); }
    if (b?.vac) { const c = this.ca.col(b.vac.colaboradorId); if (c) this.asis.eliminarVacacion(b.vac, c); }
    this.borrar = null;
    this.ui.toast('Registro eliminado');
  }
}
