import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { aIso, aMin, ControlAsistenciaService, deIso, diaSemana, DIAS_CORTOS, DIAS_SEMANA, rangoFechas, sumarDias } from '../../core/control-asistencia.service';
import { downloadCsv } from '../../core/csv';
import { parseFecha } from '../../core/format';
import { Colaborador } from '../../core/models';
import { CODIGOS_DIA, CodigoDia, COLORES_TURNO, JornadaTurno, Turno, TipoTurno } from '../../core/sample/control-asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];
const COLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(180px, 1.2fr)' },
  { key: 's', label: 'Sigla', type: 'badge', w: '90px' },
  { key: 't', label: 'Tipo', filter: 'select', w: 'minmax(120px, 0.7fr)' },
  { key: 'j', label: 'Jornada', filter: 'select', w: 'minmax(110px, 0.6fr)' },
  { key: 'h', label: 'Horario', w: 'minmax(120px, 0.7fr)' },
  { key: 'd', label: 'Días', w: 'minmax(150px, 0.9fr)' },
  { key: 'c', label: 'Colación', w: '100px' },
  { key: 'hs', label: 'Horas semanales', type: 'number', filter: 'none', w: 'minmax(120px, 0.6fr)' },
  { key: 'co', label: 'Colaboradores', type: 'number', filter: 'none', w: 'minmax(120px, 0.6fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '110px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];
type FormTurno = Omit<Turno, 'id' | 'ciclo'> & { id: number | null; trabajo: number; descanso: number };

/** Control de Asistencia › Turnos › Listado de Turnos (P-04.6). */
@Component({
  selector: 'app-ca-turnos',
  template: `
    <app-page-header title="Listado de Turnos" [crumbs]="['Control de Asistencia', 'Turnos']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="abrir(null)"><app-icon name="plus" [size]="16"></app-icon>Crear Turno</button>
    </app-page-header>
    <div class="nx-row nx-mb-12">
      <div class="nx-chips" role="group" aria-label="Estado">
        <button *ngFor="let e of ['Activos', 'Inactivos', 'Todos']" type="button" class="nx-chip" [class.is-on]="estado === e" [attr.aria-pressed]="estado === e" (click)="estado = e; armar()">{{ e }}</button>
      </div>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="acciones" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Turnos" minWidth="1400px" exportName="turnos" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="f" [title]="f.id == null ? 'Crear turno' : 'Editar turno'" width="680px" (closed)="f = null">
      <form id="turno-form" class="nx-form" (ngSubmit)="guardar()" novalidate>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Nombre*<input class="nx-input" name="nombre" maxlength="40" [(ngModel)]="f.nombre"></label>
          <label class="nx-field">Sigla*<input class="nx-input" name="sigla" maxlength="4" placeholder="2 a 4 caracteres" [(ngModel)]="f.sigla"></label>
          <label class="nx-field">Tipo*
            <select class="nx-select" name="tipo" [attr.name]="'tipo'" [(ngModel)]="f.tipo"><option *ngFor="let t of tipos">{{ t }}</option></select></label>
          <label class="nx-field">Jornada*
            <select class="nx-select" name="jornada" [attr.name]="'jornada'" [(ngModel)]="f.jornada"><option *ngFor="let j of jornadas">{{ j }}</option></select></label>
          <label class="nx-field">Hora de entrada*<input type="time" class="nx-input" name="entrada" [(ngModel)]="f.entrada"></label>
          <label class="nx-field">Hora de salida*<input type="time" class="nx-input" name="salida" [(ngModel)]="f.salida"></label>
          <label class="nx-field">Colación (minutos)<input type="number" class="nx-input" name="colacion" min="0" max="120" [(ngModel)]="f.colacion"></label>
          <label class="nx-field">Tolerancia de atraso (minutos)<input type="number" class="nx-input" name="tolerancia" min="0" max="60" [(ngModel)]="f.tolerancia"></label>
        </div>
        <fieldset *ngIf="f.tipo !== 'Rotativo'" class="nx-field"><legend class="nx-field-label">Días de la semana*</legend>
          <div class="nx-row nx-wrap">
            <label *ngFor="let d of ordenDias" class="nx-check nx-check--plain"><input type="checkbox" [name]="'dia' + d" [checked]="f.dias.includes(d)" (change)="toggleDia(d)">{{ diasSemana[d] }}</label>
          </div></fieldset>
        <div *ngIf="f.tipo === 'Rotativo'" class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Días de trabajo del ciclo*<input type="number" class="nx-input" name="trabajo" min="1" max="14" [(ngModel)]="f.trabajo"></label>
          <label class="nx-field">Días de descanso del ciclo*<input type="number" class="nx-input" name="descanso" min="1" max="7" [(ngModel)]="f.descanso"></label>
        </div>
        <fieldset class="nx-field"><legend class="nx-field-label">Color de la celda en el calendario</legend>
          <div class="nx-row">
            <button *ngFor="let c of colores" type="button" class="nx-caswatch" [style.background]="c" [class.is-on]="f.color === c" [attr.aria-label]="'Color ' + c" [attr.aria-pressed]="f.color === c" (click)="f.color = c"></button>
          </div></fieldset>
        <p class="nx-small nx-muted nx-mb-0">{{ resumen }}</p>
        <span *ngIf="intento && error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="f = null">Cancelar</button>
        <button type="submit" form="turno-form" class="nx-btn nx-btn--primary">{{ f.id == null ? 'Crear turno' : 'Guardar' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class CaTurnosComponent implements OnDestroy {
  readonly cols = COLS;
  readonly acciones: RowAction[] = ['editar', 'pausa'];
  readonly tipos: TipoTurno[] = ['Permanente', 'Transitorio', 'Flexible', 'Rotativo'];
  readonly jornadas: JornadaTurno[] = ['Diurno', 'Nocturno', 'Mixto'];
  readonly colores = COLORES_TURNO;
  readonly ordenDias = ORDEN_DIAS;
  readonly diasSemana = DIAS_SEMANA;
  estado = 'Activos';
  rows: Row[] = [];
  f: FormTurno | null = null;
  intento = false;
  private turnos: Turno[] = [];
  private sub: Subscription;

  constructor(private ca: ControlAsistenciaService, private ui: UiStateService) {
    this.sub = combineLatest([ca.turnos$, ca.cambios$]).subscribe(([ts]) => { this.turnos = ts; this.armar(); });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private semanales(t: Pick<Turno, 'tipo' | 'dias' | 'entrada' | 'salida' | 'colacion'> & { ciclo?: { trabajo: number; descanso: number } }): number {
    const min = this.ca.minutosTurno(t as Turno);
    const dias = t.tipo === 'Rotativo' && t.ciclo ? (t.ciclo.trabajo * 7) / (t.ciclo.trabajo + t.ciclo.descanso) : t.dias.length;
    return Math.round((min * dias) / 6) / 10;
  }

  armar(): void {
    this.rows = this.turnos.filter((t) => this.estado === 'Todos' || t.activo === (this.estado === 'Activos')).map((t) => ({
      id: t.id, n: t.nombre, s: { text: t.sigla, tone: 'info' }, t: t.tipo, j: t.jornada, h: this.ca.horarioTurno(t),
      d: t.tipo === 'Rotativo' && t.ciclo ? `Ciclo ${t.ciclo.trabajo}×${t.ciclo.descanso}` : ORDEN_DIAS.filter((d) => t.dias.includes(d)).map((d) => DIAS_CORTOS[d]).join(' '),
      c: `${t.colacion} min`, hs: this.semanales(t), co: this.ca.enTurno(t.id).length,
      e: t.activo ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'gray' }, x: '',
    }));
  }

  onAction(a: RowAction, row: Row): void {
    const t = this.ca.turno(+row.id);
    if (!t) return;
    if (a === 'editar') this.abrir(t);
    if (a === 'pausa') {
      const err = this.ca.toggleTurno(t);
      this.ui.toast(err || `Turno ${t.sigla} ${t.activo ? 'activado' : 'desactivado'}`);
    }
  }

  abrir(t: Turno | null): void {
    this.intento = false;
    this.f = t ? { ...t, dias: [...t.dias], trabajo: t.ciclo?.trabajo ?? 5, descanso: t.ciclo?.descanso ?? 2 }
      : { id: null, nombre: '', sigla: '', tipo: 'Permanente', jornada: 'Diurno', entrada: '08:00', salida: '17:00', colacion: 60, dias: [1, 2, 3, 4, 5],
        tolerancia: 10, color: COLORES_TURNO[0], activo: true, trabajo: 5, descanso: 2 };
  }
  toggleDia(d: number): void { if (!this.f) return; this.f.dias = this.f.dias.includes(d) ? this.f.dias.filter((x) => x !== d) : [...this.f.dias, d]; }

  private turnoDe(f: FormTurno): Omit<Turno, 'id'> & { id: number | null } {
    const { trabajo, descanso, ...rest } = f;
    return { ...rest, sigla: f.sigla.trim().toUpperCase(), nombre: f.nombre.trim(), colacion: +f.colacion, tolerancia: +f.tolerancia,
      dias: f.tipo === 'Rotativo' ? [0, 1, 2, 3, 4, 5, 6] : f.dias, ciclo: f.tipo === 'Rotativo' ? { trabajo: +trabajo, descanso: +descanso } : undefined };
  }
  get resumen(): string {
    const f = this.f;
    if (!f || !HORA.test(f.entrada) || !HORA.test(f.salida)) return '';
    const t = this.turnoDe(f);
    const diario = this.ca.minutosTurno(t as Turno);
    return `Jornada diaria: ${Math.floor(diario / 60)} h ${diario % 60} min sin colación · ${this.semanales(t)} h semanales.`;
  }
  get error(): string {
    const f = this.f;
    if (!f) return '';
    if (!f.nombre.trim()) return 'Ingresa el nombre del turno.';
    if (!/^[A-Za-z0-9]{2,4}$/.test(f.sigla.trim())) return 'La sigla debe tener de 2 a 4 letras o números.';
    const otros = this.turnos.filter((t) => t.id !== f.id);
    if (otros.some((t) => t.nombre.toLowerCase() === f.nombre.trim().toLowerCase())) return 'Ya existe un turno con ese nombre.';
    if (otros.some((t) => t.sigla === f.sigla.trim().toUpperCase())) return 'Ya existe un turno con esa sigla.';
    if (Object.keys(CODIGOS_DIA).includes(f.sigla.trim().toUpperCase())) return 'Esa sigla está reservada para días de descanso.';
    if (!HORA.test(f.entrada) || !HORA.test(f.salida)) return 'Ingresa la hora de entrada y de salida (HH:mm).';
    if (f.entrada === f.salida) return 'La hora de salida debe ser distinta a la de entrada.';
    const e = aMin(f.entrada), s = aMin(f.salida);
    if (f.jornada === 'Diurno' && (s < e || e < 360 || s > 1320)) return 'Un turno diurno debe estar entre las 06:00 y las 22:00, sin pasar la medianoche.';
    if (f.jornada === 'Nocturno') {
      const fin = s <= e ? s + 1440 : s;
      let noct = 0;
      for (let m = e; m < fin; m++) { const h = m % 1440; if (h >= 1320 || h < 360) noct++; }
      if (noct < (fin - e) / 2) return 'Un turno nocturno debe tener al menos la mitad de sus horas entre las 22:00 y las 06:00.';
    }
    const col = Number(f.colacion), tol = Number(f.tolerancia);
    if (!Number.isInteger(col) || col < 0 || col > 120) return 'La colación debe estar entre 0 y 120 minutos.';
    if (!Number.isInteger(tol) || tol < 0 || tol > 60) return 'La tolerancia debe estar entre 0 y 60 minutos.';
    const t = this.turnoDe(f);
    const diario = this.ca.minutosTurno(t as Turno);
    if (diario <= 0) return 'La colación no puede ser mayor o igual a la duración del turno.';
    if (diario > 6 * 60 && col < 45) return 'En turnos de más de 6 horas la colación debe ser de al menos 45 minutos.';
    if (f.tipo === 'Rotativo') {
      if (!Number.isInteger(+f.trabajo) || +f.trabajo < 1 || +f.trabajo > 14) return 'Los días de trabajo del ciclo deben estar entre 1 y 14.';
      if (!Number.isInteger(+f.descanso) || +f.descanso < 1 || +f.descanso > 7) return 'Los días de descanso del ciclo deben estar entre 1 y 7.';
    } else if (!f.dias.length) return 'Elige al menos un día de la semana.';
    if (this.semanales(t) > 48) return `El turno suma ${this.semanales(t)} h semanales; la jornada máxima es de 48 horas.`;
    if (f.id != null && !f.activo && this.ca.enTurno(f.id).length) return 'No se puede dejar inactivo un turno con colaboradores asignados.';
    return '';
  }
  guardar(): void {
    this.intento = true;
    if (!this.f || this.error) return;
    const t = this.ca.guardarTurno(this.turnoDe(this.f));
    this.ui.toast(this.f.id == null ? `Turno ${t.sigla} creado` : `Turno ${t.sigla} actualizado`);
    this.f = null;
  }
}

type Vista = 'Diaria' | 'Semanal' | 'Bisemanal' | 'Mensual';
interface Celda { fecha: string; codigo: string; horario: string; color: string | null; cambio: boolean; }
interface EditAsig { ids: number[]; fecha: string; valor: string; modo: 'dia' | 'hasta' | 'permanente'; hasta: string; dias: number[]; mantener: boolean; historial: boolean; }

/** Control de Asistencia › Turnos › Asignación de Turnos (P-04.7). */
@Component({
  selector: 'app-ca-asignacion',
  template: `
    <app-page-header title="Asignación de Turnos" [crumbs]="['Control de Asistencia', 'Turnos']">
      <div class="nx-dt__menu-anchor">
        <button type="button" class="nx-btn nx-btn--outline" [attr.aria-expanded]="menu" (click)="menu = !menu">Acciones<app-icon name="chevron-down" [size]="15"></app-icon></button>
        <div *ngIf="menu" class="nx-popover nx-camenu">
          <button type="button" class="nx-menu-item" (click)="plantilla()">Descargar plantilla de turnos vigentes</button>
          <a class="nx-menu-item" routerLink="/rep/importadores" [queryParams]="{ categoria: 'Asistencia' }">Subir plantilla (hasta 6 meses)</a>
        </div>
      </div>
    </app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-card nx-cafil">
      <input class="nx-input nx-input--sm nx-w-280" placeholder="Buscar colaborador" [(ngModel)]="q" aria-label="Buscar colaborador">
      <select class="nx-select nx-select--sm nx-w-140" aria-label="Vista" [(ngModel)]="vista" (ngModelChange)="ir(0)">
        <option *ngFor="let v of vistas">{{ v }}</option></select>
      <button type="button" class="nx-icon-btn nx-icon-btn--34" aria-label="Período anterior" (click)="ir(-1)"><app-icon name="chevron-left" [size]="16"></app-icon></button>
      <b class="nx-small">{{ rangoLabel }}</b>
      <button type="button" class="nx-icon-btn nx-icon-btn--34" aria-label="Período siguiente" (click)="ir(1)"><app-icon name="chevron-right" [size]="16"></app-icon></button>
      <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="inicio = null; ir(0)">Hoy</button>
      <span class="nx-grow"></span>
      <button type="button" class="nx-btn nx-btn--primary nx-btn--sm" [disabled]="!sel.size" (click)="editar(null, null)">Editar asignación ({{ sel.size }})</button>
    </div>
    <div class="nx-card nx-dt__scroll">
      <table class="nx-shiftgrid" aria-label="Calendario de turnos">
        <thead><tr>
          <th class="nx-shiftgrid__who"><label class="nx-check nx-check--plain"><input type="checkbox" [checked]="todos" (change)="toggleTodos()" aria-label="Seleccionar todos">Colaborador</label></th>
          <th *ngFor="let f of fechas" [class.is-today]="f === ca.corte" [class.is-sun]="dow(f) === 0">{{ corto(f) }}<br><span>{{ f.slice(0, 5) }}</span></th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let r of filas">
            <th class="nx-shiftgrid__who"><label class="nx-check nx-check--plain"><input type="checkbox" [checked]="sel.has(r.c.id)" (change)="toggle(r.c.id)" [attr.aria-label]="'Seleccionar ' + r.c.nombres">
              <span><b>{{ r.c.apellidos }}, {{ r.c.nombres }}</b><br><span class="nx-small nx-muted">{{ r.c.documento }}</span></span></label></th>
            <td *ngFor="let x of r.celdas">
              <button type="button" class="nx-shiftgrid__cell" [style.background]="x.color" [class.is-rest]="!x.color" [class.is-change]="x.cambio"
                      [title]="r.c.nombres + ' · ' + x.fecha + ' · ' + x.horario" (click)="editar(r.c, x.fecha)"><b>{{ x.codigo }}</b><span *ngIf="vista !== 'Mensual'">{{ x.horario }}</span></button>
            </td>
          </tr>
          <tr *ngIf="!filas.length"><td [attr.colspan]="fechas.length + 1"><div class="nx-empty nx-empty--compact"><b>Sin colaboradores</b></div></td></tr>
        </tbody>
      </table>
    </div>
    <div class="nx-legend-row nx-small"><span *ngFor="let t of turnosActivos"><i class="nx-casw" [style.background]="t.color"></i>{{ t.sigla }} · {{ t.nombre }}</span>
      <span><i class="nx-casw is-rest"></i>DES / LIB / COMP</span><span><i class="nx-casw is-change"></i>Cambio de un día</span></div>

    <app-modal *ngIf="e" title="Editar asignación" width="640px" (closed)="e = null">
      <form id="asig-form" class="nx-form" (ngSubmit)="guardar()" novalidate>
        <div class="nx-fieldrow"><span>{{ e.ids.length === 1 ? 'Colaborador' : 'Colaboradores' }}</span><span>{{ nombres }}</span></div>
        <button *ngIf="e.ids.length === 1" type="button" class="nx-link-btn nx-self-start" (click)="e.historial = !e.historial">{{ e.historial ? 'Ocultar historial' : 'Ver historial' }}</button>
        <ul *ngIf="e.historial" class="nx-calog"><li *ngFor="let h of historial"><span class="nx-small nx-muted">{{ h.autor }}</span><span>{{ h.texto }}</span></li></ul>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Fecha*<input type="date" class="nx-input" name="fecha" [min]="minIso" [(ngModel)]="e.fecha"></label>
          <label class="nx-field">Turno*
            <select class="nx-select" name="turno" [attr.name]="'turno'" [(ngModel)]="e.valor">
              <option value="" disabled>Selecciona</option>
              <option *ngFor="let t of turnosActivos" [value]="'t' + t.id">{{ t.sigla }} · {{ t.nombre }} ({{ ca.horarioTurno(t) }})</option>
              <option *ngFor="let k of codigos" [value]="k">{{ etiquetas[k] }}</option></select></label>
        </div>
        <fieldset class="nx-field"><legend class="nx-field-label">Vigencia*</legend>
          <div class="nx-stack">
            <label class="nx-check nx-check--plain"><input type="radio" name="modo" [attr.name]="'modo'" value="dia" [(ngModel)]="e.modo">Solo este día</label>
            <label class="nx-check nx-check--plain"><input type="radio" name="modo" [attr.name]="'modo'" value="hasta" [(ngModel)]="e.modo">Hasta una fecha de término</label>
            <label class="nx-check nx-check--plain"><input type="radio" name="modo" [attr.name]="'modo'" value="permanente" [(ngModel)]="e.modo">Permanente (nuevo turno base)</label>
          </div></fieldset>
        <ng-container *ngIf="e.modo === 'hasta'">
          <label class="nx-field">Fecha de término*<input type="date" class="nx-input" name="hasta" [min]="e.fecha" [(ngModel)]="e.hasta"></label>
          <fieldset class="nx-field"><legend class="nx-field-label">Recurrencia (días de la semana)</legend>
            <div class="nx-row nx-wrap"><label *ngFor="let d of ordenDias" class="nx-check nx-check--plain"><input type="checkbox" [name]="'rd' + d" [checked]="e.dias.includes(d)" (change)="toggleRec(d)">{{ diasSemana[d] }}</label></div>
            <span class="nx-hint">Sin días marcados se aplica a todos los días del rango.</span></fieldset>
        </ng-container>
        <label class="nx-check nx-check--plain"><input type="checkbox" name="mantener" [(ngModel)]="e.mantener">Mantener los colaboradores seleccionados</label>
        <span *ngIf="intento && error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="e = null">Cancelar</button>
        <button type="submit" form="asig-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>
  `
})
export class CaAsignacionComponent implements OnDestroy {
  readonly vistas: Vista[] = ['Diaria', 'Semanal', 'Bisemanal', 'Mensual'];
  readonly ordenDias = ORDEN_DIAS;
  readonly diasSemana = DIAS_SEMANA;
  readonly codigos = Object.keys(CODIGOS_DIA) as CodigoDia[];
  readonly etiquetas = CODIGOS_DIA;
  readonly minIso: string;
  vista: Vista = 'Semanal';
  inicio: string | null = null;
  fechas: string[] = [];
  rangoLabel = '';
  q = '';
  menu = false;
  sel = new Set<number>();
  turnosActivos: Turno[] = [];
  e: EditAsig | null = null;
  intento = false;
  private cs: Colaborador[] = [];
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService, route: ActivatedRoute, private ui: UiStateService) {
    this.minIso = aIso(ca.inicio);
    for (const id of (route.snapshot.queryParamMap.get('ids') ?? '').split(',').filter((x) => x.trim() !== '').map(Number).filter((x) => Number.isInteger(x) && ca.col(x))) this.sel.add(id);
    this.sub = combineLatest([ca.cambios$, ca.turnos$]).subscribe(([, ts]) => { this.turnosActivos = ts.filter((t) => t.activo); this.cs = ca.visibles(); this.ir(0); });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  dow(f: string): number { return diaSemana(f); }
  corto(f: string): string { return DIAS_SEMANA[diaSemana(f)].slice(0, 3); }

  ir(paso: number): void {
    const base = this.inicio ?? this.ca.filtro.fecha;
    const lunes = (f: string) => sumarDias(f, -((diaSemana(f) + 6) % 7));
    let ini: string, n: number;
    if (this.vista === 'Diaria') { ini = sumarDias(this.inicio ?? this.ca.filtro.fecha, paso); n = 1; }
    else if (this.vista === 'Mensual') {
      const d = parseFecha(base)!; d.setDate(1); d.setMonth(d.getMonth() + paso);
      ini = `01/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    } else { n = this.vista === 'Semanal' ? 7 : 14; ini = sumarDias(lunes(base), paso * n); }
    this.inicio = ini;
    this.fechas = rangoFechas(ini, sumarDias(ini, n - 1));
    const fin = this.fechas[this.fechas.length - 1];
    this.rangoLabel = n === 1 ? `${DIAS_SEMANA[diaSemana(ini)]} ${ini}` : `${ini} – ${fin}`;
  }

  get filas(): { c: Colaborador; celdas: Celda[] }[] {
    const q = this.q.trim().toLowerCase();
    return this.cs.filter((c) => !q || `${c.apellidos} ${c.nombres} ${c.documento}`.toLowerCase().includes(q)).map((c) => ({
      c, celdas: this.fechas.map((f) => {
        const t = this.ca.turnoDe(c.id, f);
        return { fecha: f, codigo: t.codigo, horario: t.turno ? this.ca.horarioTurno(t.turno) : this.ca.etiquetaCodigo(t.codigo),
          color: t.turno?.color ?? null, cambio: this.ca.cambiosTurno.some((x) => x.colaboradorId === c.id && x.fecha === f) };
      }),
    }));
  }
  get todos(): boolean { return this.cs.length > 0 && this.cs.every((c) => this.sel.has(c.id)); }
  toggle(id: number): void { this.sel.has(id) ? this.sel.delete(id) : this.sel.add(id); }
  toggleTodos(): void { if (this.todos) this.sel.clear(); else this.cs.forEach((c) => this.sel.add(c.id)); }
  toggleRec(d: number): void { if (this.e) this.e.dias = this.e.dias.includes(d) ? this.e.dias.filter((x) => x !== d) : [...this.e.dias, d]; }

  editar(c: Colaborador | null, fecha: string | null): void {
    const ids = c && !this.sel.has(c.id) ? [c.id] : [...this.sel];
    if (!ids.length) return;
    const f = fecha ?? this.fechas[0];
    const actual = this.ca.turnoDe(ids[0], f);
    this.intento = false;
    this.e = { ids, fecha: aIso(f), valor: actual.turno ? 't' + actual.turno.id : actual.codigo === '—' ? '' : actual.codigo, modo: 'dia', hasta: aIso(f), dias: [], mantener: true, historial: false };
  }
  get nombres(): string { return this.e ? this.e.ids.map((id) => this.ca.nombre(id)).join('; ') : ''; }
  get historial() { return this.e ? this.ca.historialTurnos(this.e.ids[0]) : []; }

  get error(): string {
    const e = this.e;
    if (!e) return '';
    if (!e.fecha) return 'Elige la fecha.';
    if (e.fecha < this.minIso) return `La fecha no puede ser anterior al ${this.ca.inicio}.`;
    if (!e.valor) return 'Elige el turno.';
    if (e.modo === 'permanente' && !e.valor.startsWith('t')) return 'Un descanso, libre o compensado no puede ser permanente; usa “Solo este día” o una fecha de término.';
    if (e.modo === 'hasta') {
      if (!e.hasta || e.hasta < e.fecha) return 'La fecha de término debe ser igual o posterior a la fecha.';
      const d = parseFecha(deIso(e.fecha))!; d.setMonth(d.getMonth() + 6);
      if (parseFecha(deIso(e.hasta))! > d) return 'El rango máximo es de 6 meses.';
      if (!rangoFechas(deIso(e.fecha), deIso(e.hasta)).some((f) => !e.dias.length || e.dias.includes(diaSemana(f)))) return 'Ningún día del rango coincide con la recurrencia elegida.';
    }
    return '';
  }
  guardar(): void {
    this.intento = true;
    const e = this.e;
    if (!e || this.error) return;
    const valor: number | CodigoDia = e.valor.startsWith('t') ? +e.valor.slice(1) : (e.valor as CodigoDia);
    const n = this.ca.asignarTurno(e.ids, { fecha: deIso(e.fecha), valor, modo: e.modo, hasta: deIso(e.hasta), dias: e.dias });
    this.ui.toast(`Asignación guardada para ${n} ${n === 1 ? 'colaborador' : 'colaboradores'}`);
    if (!e.mantener) this.sel.clear();
    this.e = null;
  }

  plantilla(): void {
    this.menu = false;
    downloadCsv(`plantilla-turnos-${this.fechas[0].replace(/\//g, '-')}`, ['Documento', 'Colaborador', ...this.fechas],
      this.filas.map((r) => [r.c.documento, `${r.c.apellidos}, ${r.c.nombres}`, ...r.celdas.map((x) => x.codigo)]));
    this.ui.toast('Plantilla descargada. Edita las siglas y súbela en Reportería › Importadores');
  }
}
