import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { aIso, aMin, ControlAsistenciaService, deIso, dur, Exceso } from '../../core/control-asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { ESTADO_HHEE_TONE, EstadoHhee, LineaHhee, TipoHhee } from '../../core/sample/control-asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 'd', label: 'Documento', w: '110px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(130px, 0.7fr)' },
  { key: 'f', label: 'Fecha de la jornada', type: 'date', filter: 'date', w: 'minmax(130px, 0.7fr)' },
  { key: 'ex', label: 'Exceso', filter: 'none', w: '90px' },
  { key: 'te', label: 'Tipo de exceso', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 'th', label: 'Tipo de HHEE', filter: 'none', w: 'minmax(140px, 0.8fr)' },
  { key: 'ap', label: 'HHEE aprobadas', filter: 'none', w: 'minmax(120px, 0.6fr)' },
  { key: 'v', label: 'Valor', type: 'money', filter: 'none', w: 'minmax(110px, 0.6fr)' },
  { key: 'pl', label: 'Enviado a planilla', type: 'badge', filter: 'select', w: 'minmax(130px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '130px' },
];
const ESTADOS: (EstadoHhee | 'Todos')[] = ['Todos', 'En espera', 'Aprobado', 'Aprobado parcial', 'Rechazado'];

/** Control de Asistencia › Horas Extras › Aprobación de Horas Extras (P-04.10). */
@Component({
  selector: 'app-ca-hhee',
  template: `
    <app-page-header title="Aprobación de Horas Extras" [crumbs]="['Control de Asistencia', 'Horas Extras']"></app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-card nx-cafil">
      <label class="nx-cafil__f">Fecha inicio<input type="date" class="nx-input nx-input--sm" [min]="minIso" [max]="maxIso" [(ngModel)]="desde" (ngModelChange)="armar()"></label>
      <label class="nx-cafil__f">Fecha término<input type="date" class="nx-input nx-input--sm" [min]="minIso" [max]="maxIso" [(ngModel)]="hasta" (ngModelChange)="armar()"></label>
      <label class="nx-cafil__f">Exceso desde (hora)<input type="time" class="nx-input nx-input--sm" [(ngModel)]="horaIni" (ngModelChange)="armar()"></label>
      <label class="nx-cafil__f">Exceso hasta (hora)<input type="time" class="nx-input nx-input--sm" [(ngModel)]="horaFin" (ngModelChange)="armar()"></label>
      <label class="nx-cafil__f">Valor mínimo (S/)<input type="number" min="0" class="nx-input nx-input--sm nx-w-140" [(ngModel)]="vmin" (ngModelChange)="armar()"></label>
      <label class="nx-cafil__f">Valor máximo (S/)<input type="number" min="0" class="nx-input nx-input--sm nx-w-140" [(ngModel)]="vmax" (ngModelChange)="armar()"></label>
    </div>
    <div class="nx-row nx-mb-12">
      <div class="nx-chips" role="group" aria-label="Estado">
        <button *ngFor="let e of estados" type="button" class="nx-chip" [class.is-on]="estado === e" [attr.aria-pressed]="estado === e" (click)="estado = e; armar()">{{ e }} ({{ conteo[e] || 0 }})</button>
      </div>
      <span class="nx-grow"></span><span class="nx-small nx-muted">Período abierto: {{ periodoAbierto }}</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="acciones" [bulkActions]="bulk" tableLabel="Horas extras" minWidth="1600px" exportName="horas-extras"
                    emptyTitle="Sin horas extras" emptyText="No hay excesos para los filtros elegidos." (action)="onAction($event.action, $event.row)" (bulk)="onBulk($event.action, $event.rows)"></app-data-table>
    <p class="nx-small nx-muted">Las dos primeras horas extras se pagan con 25 % y las siguientes con 35 %; el trabajo en día de descanso o feriado, con 100 %. Valor hora = sueldo ÷ 30 ÷ {{ asis.config.horasJornada }}.</p>

    <app-modal *ngIf="ed" title="Modificar aprobación" width="680px" (closed)="ed = null">
      <div class="nx-grid nx-grid--2 nx-gap-16 nx-mb-12">
        <div class="nx-fieldrow"><span>Colaborador</span><span>{{ ca.nombre(ed.e.colaboradorId) }}</span></div>
        <div class="nx-fieldrow"><span>Fecha</span><span>{{ ed.e.fecha }}</span></div>
        <div class="nx-fieldrow"><span>Inicio y término del exceso</span><span>{{ ed.e.inicio }} – {{ ed.e.fin }}</span></div>
        <div class="nx-fieldrow"><span>Total del exceso</span><span>{{ dur(ed.e.minutos) }} h · {{ ed.e.tipo }}</span></div>
      </div>
      <div class="nx-dt__scroll"><table class="nx-table" aria-label="Líneas de horas extras">
        <thead><tr><th>Minutos</th><th>Tipo de HHEE</th><th class="nx-num">Valor de la hora</th><th class="nx-num">Valor</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let l of ed.lineas; let i = index">
            <td><input type="number" class="nx-input nx-input--sm nx-w-140" min="1" [name]="'min' + i" [(ngModel)]="l.minutos" [attr.aria-label]="'Minutos de la línea ' + (i + 1)"></td>
            <td><select class="nx-select nx-select--sm" [name]="'tipo' + i" [(ngModel)]="l.tipo" [attr.aria-label]="'Tipo de la línea ' + (i + 1)">
              <option *ngFor="let t of tipos" [ngValue]="t">{{ t }} %</option></select></td>
            <td class="nx-num">{{ soles(valorHora(l.tipo)) }}</td>
            <td class="nx-num">{{ soles(ca.valorLinea(ed.e.colaboradorId, num(l))) }}</td>
            <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Quitar línea ' + (i + 1)" (click)="ed.lineas.splice(i, 1)"><app-icon name="trash" [size]="15"></app-icon></button></td>
          </tr>
        </tbody>
      </table></div>
      <div class="nx-row nx-mt-12">
        <button type="button" class="nx-link-btn" (click)="ed.lineas.push({ minutos: restan > 0 ? restan : 30, tipo: ed.e.descanso ? 100 : 35 })"><app-icon name="plus" [size]="14"></app-icon>Añadir otra línea</button>
        <span class="nx-grow"></span><b class="nx-small" [class.nx-text-danger]="restan < 0">{{ restan < 0 ? 'Excede en ' + dur(-restan) : 'Restan ' + dur(restan) + ':00' }}</b>
      </div>
      <label class="nx-field nx-mt-12">Observación<textarea class="nx-textarea" rows="2" maxlength="200" [(ngModel)]="ed.observacion" aria-label="Observación"></textarea></label>
      <span *ngIf="edIntento && edError" class="nx-error" role="alert">{{ edError }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="ed = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--outline" (click)="revertir()">Revertir</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="guardarEd()">Guardar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="rech" [title]="rech.length === 1 ? 'Rechazar horas extras' : 'Rechazar ' + rech.length + ' horas extras'" width="480px" (closed)="rech = null">
      <label class="nx-field">Motivo del rechazo*<textarea class="nx-textarea" rows="3" maxlength="200" [(ngModel)]="motivo" aria-label="Motivo del rechazo"></textarea></label>
      <span *ngIf="rechIntento && motivo.trim().length < 5" class="nx-error">Escribe el motivo (al menos 5 caracteres).</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="rech = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarRechazo()">Rechazar</button>
      </ng-container>
    </app-modal>
  `
})
export class CaHorasExtrasComponent implements OnDestroy {
  readonly cols = COLS;
  readonly acciones: RowAction[] = ['editar', 'aprobar', 'rechazar'];
  /** Sending to payroll is for administrators. */
  get bulk(): string[] { return this.ca.esAdmin ? ['Aprobar seleccionadas', 'Rechazar seleccionadas', 'Enviar a planilla'] : ['Aprobar seleccionadas', 'Rechazar seleccionadas']; }
  readonly estados = ESTADOS;
  readonly tipos: TipoHhee[] = [25, 35, 100];
  readonly dur = dur;
  readonly soles = soles;
  readonly minIso: string;
  readonly maxIso: string;
  desde: string;
  hasta: string;
  horaIni = '';
  horaFin = '';
  vmin: number | null = null;
  vmax: number | null = null;
  estado: EstadoHhee | 'Todos' = 'Todos';
  conteo: Record<string, number> = {};
  rows: Row[] = [];
  ed: { e: Exceso; lineas: LineaHhee[]; observacion: string } | null = null;
  edIntento = false;
  rech: Exceso[] | null = null;
  rechIntento = false;
  motivo = '';
  private lista: Exceso[] = [];
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService, public asis: AsistenciaService, private ui: UiStateService) {
    this.minIso = aIso(ca.inicio);
    this.maxIso = aIso(ca.corte);
    this.desde = aIso(`01/${ca.filtro.fecha.slice(3)}`);
    this.hasta = aIso(ca.filtro.fecha);
    this.sub = ca.cambios$.subscribe(() => this.armar());
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get periodoAbierto(): string { const p = this.ca.periodoAbierto; return parseFecha(`01/${p}`)!.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }); }

  armar(): void {
    const ca = this.ca;
    const ids = new Set(ca.visibles().map((c) => c.id));
    const d = this.desde ? parseFecha(deIso(this.desde))! : null, h = this.hasta ? parseFecha(deIso(this.hasta))! : null;
    const base = ca.excesos().filter((e) => {
      const f = parseFecha(e.fecha)!;
      if (!ids.has(e.colaboradorId) || (d && f < d) || (h && f > h)) return false;
      if (this.horaIni && aMin(e.inicio) < aMin(this.horaIni)) return false;
      if (this.horaFin && aMin(e.fin) > aMin(this.horaFin)) return false;
      const v = this.valorEstimado(e);
      if (this.vmin != null && String(this.vmin) !== '' && v < +this.vmin) return false;
      if (this.vmax != null && String(this.vmax) !== '' && v > +this.vmax) return false;
      return true;
    });
    this.conteo = { Todos: base.length };
    for (const e of base) { const s = ca.aprobacion(e).estado; this.conteo[s] = (this.conteo[s] ?? 0) + 1; }
    this.lista = base.filter((e) => this.estado === 'Todos' || ca.aprobacion(e).estado === this.estado);
    this.rows = this.lista.map((e) => {
      const a = ca.aprobacion(e), c = ca.col(e.colaboradorId);
      const aprob = ca.aprobadas(e);
      return {
        id: e.key, c: { text: ca.nombre(e.colaboradorId), link: `/ca/colaboradores/perfil/${e.colaboradorId}` }, d: c?.documento ?? '—',
        e: { text: a.estado, tone: ESTADO_HHEE_TONE[a.estado] }, f: e.fecha, ex: dur(e.minutos), te: e.tipo,
        th: (a.estado === 'Rechazado' ? ca.sugeridas(e) : a.lineas).map((l) => `${l.tipo} %`).filter((x, i, arr) => arr.indexOf(x) === i).join(' + '),
        ap: aprob ? dur(aprob) : '—', v: aprob ? soles(ca.valor(e)) : '—',
        pl: a.enviado ? { text: 'Sí', tone: 'success' } : a.estado === 'Aprobado' || a.estado === 'Aprobado parcial' ? { text: 'Pendiente', tone: 'warning' } : { text: 'No', tone: 'gray' }, x: '',
      };
    });
  }
  /** Value for the filters: approved value, or the suggested one while pending. */
  private valorEstimado(e: Exceso): number {
    const a = this.ca.aprobacion(e);
    return (a.estado === 'Rechazado' ? [] : a.lineas).reduce((s, l) => s + this.ca.valorLinea(e.colaboradorId, l), 0);
  }
  private exceso(key: string | number): Exceso | undefined { return this.ca.excesos().find((e) => e.key === key); }

  onAction(a: RowAction, row: Row): void {
    const e = this.exceso(row.id);
    if (!e) return;
    if (!this.ca.gestiona(e.colaboradorId)) { this.ui.toast('Tus propias horas extras las aprueba tu jefatura o RR.HH.'); return; }
    if (a === 'editar') {
      const ap = this.ca.aprobacion(e);
      this.edIntento = false;
      this.ed = { e, lineas: (ap.lineas.length ? ap.lineas : this.ca.sugeridas(e)).map((l) => ({ ...l })), observacion: ap.observacion };
    }
    if (a === 'aprobar') {
      const ap = this.ca.aprobacion(e);
      if (ap.estado === 'Aprobado') { this.ui.toast('Estas horas extras ya están aprobadas'); return; }
      const estado = this.ca.guardarAprobacion(e, ap.lineas.length ? ap.lineas : this.ca.sugeridas(e), ap.observacion);
      this.ui.toast(`Horas extras del ${e.fecha} · ${estado.toLowerCase()}`);
    }
    if (a === 'rechazar') { this.rech = [e]; this.motivo = ''; this.rechIntento = false; }
  }

  onBulk(accion: string, rows: Row[]): void {
    const todas = rows.map((r) => this.exceso(r.id)).filter((e): e is Exceso => !!e);
    const es = todas.filter((e) => this.ca.gestiona(e.colaboradorId));
    if (es.length < todas.length) this.ui.toast('Se omitieron tus propias horas extras: las aprueba tu jefatura o RR.HH.');
    if (!es.length) return;
    if (accion === 'Aprobar seleccionadas') {
      const pendientes = es.filter((e) => this.ca.aprobacion(e).estado === 'En espera');
      for (const e of pendientes) this.ca.guardarAprobacion(e, this.ca.aprobacion(e).lineas, '');
      const otras = es.length - pendientes.length;
      this.ui.toast(pendientes.length ? `${pendientes.length} horas extras aprobadas${otras ? ` · ${otras} ya estaban resueltas (edítalas una por una)` : ''}` : 'Las seleccionadas ya estaban resueltas; edítalas una por una');
    }
    if (accion === 'Rechazar seleccionadas') { this.rech = es; this.motivo = ''; this.rechIntento = false; }
    if (accion === 'Enviar a planilla') {
      const r = this.ca.enviarAPlanilla(es);
      this.ui.toast(r.enviados ? `${r.enviados} enviadas a la planilla de ${this.periodoAbierto}${r.omitidos.length ? ` · ${r.omitidos.length} omitidas (no aprobadas o de un período cerrado)` : ''}`
        : r.omitidos.length ? `No se envió nada: ${r.omitidos[0]}${r.omitidos.length > 1 ? ` y ${r.omitidos.length - 1} más` : ''}` : 'Las seleccionadas ya estaban enviadas');
    }
  }

  confirmarRechazo(): void {
    this.rechIntento = true;
    if (!this.rech || this.motivo.trim().length < 5) return;
    for (const e of this.rech) this.ca.rechazar(e, this.motivo.trim());
    this.ui.toast(this.rech.length === 1 ? 'Horas extras rechazadas' : `${this.rech.length} horas extras rechazadas`);
    this.rech = null;
  }

  num(l: LineaHhee): LineaHhee { return { minutos: Math.max(0, Math.round(Number(l.minutos) || 0)), tipo: l.tipo }; }
  valorHora(tipo: TipoHhee): number {
    const c = this.ed ? this.ca.col(this.ed.e.colaboradorId) : undefined;
    return c ? Math.round(this.asis.valorHora(c) * (1 + tipo / 100) * 100) / 100 : 0;
  }
  get restan(): number { return this.ed ? this.ed.e.minutos - this.ed.lineas.reduce((s, l) => s + (Number(l.minutos) || 0), 0) : 0; }
  get edError(): string {
    const ed = this.ed;
    if (!ed) return '';
    if (!ed.lineas.length) return 'Agrega al menos una línea o usa “Rechazar” desde la tabla.';
    if (ed.lineas.some((l) => !Number.isInteger(Number(l.minutos)) || Number(l.minutos) <= 0)) return 'Los minutos de cada línea deben ser un número entero mayor a 0.';
    if (this.restan < 0) return `Las líneas suman más que el exceso (${dur(ed.e.minutos)} h).`;
    const suma = (t: TipoHhee) => ed.lineas.filter((l) => l.tipo === t).reduce((s, l) => s + Number(l.minutos), 0);
    if (ed.e.descanso && (suma(25) || suma(35))) return 'El trabajo en día de descanso o feriado se paga con 100 %.';
    if (!ed.e.descanso && suma(100)) return 'El 100 % solo aplica al trabajo en día de descanso o feriado.';
    if (suma(25) > 120) return 'Solo las dos primeras horas (120 minutos) se pagan con 25 %.';
    if (suma(35) && suma(25) < 120) return 'El 35 % aplica desde la tercera hora: primero completa 120 minutos al 25 %.';
    return '';
  }
  guardarEd(): void {
    this.edIntento = true;
    const ed = this.ed;
    if (!ed || this.edError) return;
    const estado = this.ca.guardarAprobacion(ed.e, ed.lineas.map((l) => this.num(l)), ed.observacion.trim());
    this.ui.toast(`Horas extras del ${ed.e.fecha} · ${estado.toLowerCase()}`);
    this.ed = null;
  }
  revertir(): void {
    if (!this.ed) return;
    this.ca.revertir(this.ed.e);
    this.ui.toast('La aprobación volvió a “En espera”');
    this.ed = null;
  }
}

const COLS_REP: Column[] = [
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 'r', label: 'Recinto', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 'h25', label: 'HHEE 25 %', filter: 'none', w: '100px' },
  { key: 'h35', label: 'HHEE 35 %', filter: 'none', w: '100px' },
  { key: 'h100', label: 'HHEE 100 %', filter: 'none', w: '110px' },
  { key: 't', label: 'Total aprobado', filter: 'none', w: 'minmax(120px, 0.6fr)' },
  { key: 'v', label: 'Valor', type: 'money', filter: 'none', w: 'minmax(110px, 0.6fr)' },
  { key: 'p', label: 'Por aprobar', type: 'number', filter: 'none', w: '110px' },
  { key: 'e', label: 'Enviado a planilla', type: 'badge', filter: 'select', w: 'minmax(140px, 0.7fr)' },
];

/** Control de Asistencia › Horas Extras › Reporte de Horas Extras (P-04.10). */
@Component({
  selector: 'app-ca-hhee-reporte',
  template: `
    <app-page-header title="Reporte de Horas Extras" [crumbs]="['Control de Asistencia', 'Horas Extras']"></app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-row nx-mb-12">
      <label class="nx-cafil__f">Período
        <select class="nx-select nx-select--sm nx-w-200" [(ngModel)]="periodo" (ngModelChange)="armar()"><option *ngFor="let p of periodos" [value]="p.v">{{ p.label }}</option></select></label>
      <span class="nx-grow"></span>
      <div class="nx-small nx-muted">{{ totales }}</div>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false" [rowActions]="[]"
                    tableLabel="Reporte de horas extras" minWidth="1200px" exportName="reporte-horas-extras" emptyTitle="Sin horas extras en el período"></app-data-table>
    <p class="nx-small nx-muted">Al enviar a planilla, las horas al 25 % y 35 % se cargan como ítems HEX-25 y HEX-35 en <a routerLink="/rem/items/asignacion">Asignación de ítems</a>; las de 100 % se registran en <a routerLink="/admin/asistencia/recargo-domingo">Recargo Domingo</a>.</p>
  `
})
export class CaHhReporteComponent implements OnDestroy {
  readonly cols = COLS_REP;
  periodos: { v: string; label: string }[] = [];
  periodo: string;
  rows: Row[] = [];
  totales = '';
  private sub: Subscription;

  constructor(private ca: ControlAsistenciaService) {
    this.periodo = ca.periodoAbierto;
    const set = new Set(ca.excesos().map((e) => ca.periodoDe(e.fecha)));
    this.periodos = [...set].sort((a, b) => b.split('/').reverse().join('').localeCompare(a.split('/').reverse().join('')))
      .map((v) => ({ v, label: parseFecha(`01/${v}`)!.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).replace(/^./, (x) => x.toUpperCase()) + (v === ca.periodoAbierto ? ' (abierto)' : '') }));
    this.sub = ca.cambios$.subscribe(() => this.armar());
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  armar(): void {
    const ca = this.ca;
    let tMin = 0, tVal = 0;
    this.rows = ca.visibles().map((c) => {
      const es = ca.excesos().filter((e) => e.colaboradorId === c.id && ca.periodoDe(e.fecha) === this.periodo);
      if (!es.length) return null;
      const lin = es.filter((e) => ['Aprobado', 'Aprobado parcial'].includes(ca.aprobacion(e).estado)).flatMap((e) => ca.aprobacion(e).lineas);
      const s = (t: number) => lin.filter((l) => l.tipo === t).reduce((x, l) => x + l.minutos, 0);
      const total = s(25) + s(35) + s(100);
      const valor = es.reduce((x, e) => x + ca.valor(e), 0);
      const aprobadas = es.filter((e) => ['Aprobado', 'Aprobado parcial'].includes(ca.aprobacion(e).estado));
      const enviadas = aprobadas.filter((e) => ca.aprobacion(e).enviado).length;
      tMin += total; tVal += valor;
      return {
        id: c.id, c: { text: `${c.apellidos}, ${c.nombres}`, link: `/ca/colaboradores/perfil/${c.id}` }, r: ca.recintoNombre(c.id),
        h25: dur(s(25)), h35: dur(s(35)), h100: dur(s(100)), t: dur(total), v: soles(Math.round(valor * 100) / 100),
        p: es.filter((e) => ca.aprobacion(e).estado === 'En espera').length,
        e: !aprobadas.length ? { text: '—', tone: 'gray' } : enviadas === aprobadas.length ? { text: 'Sí', tone: 'success' } : enviadas ? { text: 'Parcial', tone: 'warning' } : { text: 'No', tone: 'gray' },
      } as Row;
    }).filter((r): r is Row => !!r);
    this.totales = `${dur(tMin)} h aprobadas · ${soles(Math.round(tVal * 100) / 100)}`;
  }
}
