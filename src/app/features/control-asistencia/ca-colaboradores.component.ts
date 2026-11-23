import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { aIso, ControlAsistenciaService, deIso, DIAS_SEMANA, dur, Jornada, rangoFechas, sumarDias } from '../../core/control-asistencia.service';
import { downloadCsv } from '../../core/csv';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { ESTADO_JORNADA_TONE, Marca, NotaSupervisor, Recinto } from '../../core/sample/control-asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';
import { esTotal, FilaTarjeta, filasTarjeta, imprimirTarjetas, TotalSemana } from './ca-tarjeta';
import { PuntoMapa } from './ca-shared.components';

const COLS: Column[] = [
  { key: 'doc', label: 'Documento', w: '110px' },
  { key: 'ap', label: 'Apellidos', type: 'link', w: 'minmax(160px, 1fr)' },
  { key: 'no', label: 'Nombre', w: 'minmax(120px, 0.8fr)' },
  { key: 'ca', label: 'Cargo', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 'ar', label: 'Área', filter: 'select', w: 'minmax(140px, 0.9fr)' },
  { key: 'su', label: 'Supervisor', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 'co', label: 'Tipo de contrato', filter: 'select', w: 'minmax(150px, 0.8fr)' },
  { key: 'tu', label: 'Turno vigente', w: 'minmax(150px, 0.9fr)' },
  { key: 're', label: 'Recinto', filter: 'select', w: 'minmax(180px, 1fr)' },
  { key: 'app', label: 'Usa marcación por app', type: 'badge', filter: 'select', w: 'minmax(150px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '140px' },
];

/** Control de Asistencia › Colaboradores › Listado de Colaboradores (P-04.2). Read straight from the collaborator records. */
@Component({
  selector: 'app-ca-colaboradores',
  template: `
    <app-page-header title="Listado de Colaboradores" [crumbs]="['Control de Asistencia', 'Colaboradores']"></app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Son los mismos colaboradores de Administrativo. Para crear uno, ve a <a routerLink="/admin/colaboradores/crear">Administrativo › Crear Colaborador</a>.</span></div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="acciones" [bulkActions]="bulk" tableLabel="Colaboradores del recinto" minWidth="1700px"
                    exportName="colaboradores-asistencia" (action)="onAction($event.action, $event.row)" (bulk)="onBulk($event.action, $event.rows)"></app-data-table>
  `
})
export class CaColaboradoresComponent implements OnDestroy {
  readonly cols = COLS;
  readonly acciones: RowAction[] = ['ver', 'historial', 'editar'];
  readonly bulk = ['Asignar turno', 'Imprimir tarjetas', 'Exportar seleccionados'];
  rows: Row[] = [];
  private sub: Subscription;

  constructor(private ca: ControlAsistenciaService, private router: Router, private data: HrDataService, private ui: UiStateService) {
    this.sub = ca.cambios$.subscribe(() => {
      this.rows = ca.visibles().map((c) => {
        const t = ca.asignacionVigente(c.id, ca.corte);
        const tu = t ? ca.turno(t.turnoId) : undefined;
        return {
          id: c.id, doc: c.documento, ap: { text: c.apellidos, link: `/ca/colaboradores/perfil/${c.id}` }, no: c.nombres, ca: c.cargo, ar: c.area,
          su: ca.supervisor(c.id), co: ca.contrato(c.id), tu: tu ? `${tu.sigla} · ${ca.horarioTurno(tu)}` : 'Sin turno', re: ca.recintoNombre(c.id),
          app: ca.usaApp(c.id) ? { text: 'Sí', tone: 'success' } : { text: 'No', tone: 'gray' }, x: '',
        };
      });
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  onAction(a: RowAction, row: Row): void {
    if (a === 'ver') this.router.navigate(['/ca/colaboradores/perfil', row.id]);
    if (a === 'historial') this.router.navigate(['/ca/colaboradores/tarjeta'], { queryParams: { id: row.id } });
    if (a === 'editar') this.router.navigate(['/admin/colaboradores/ficha', row.id]);
  }

  onBulk(a: string, rows: Row[]): void {
    const cs = rows.map((r) => this.ca.col(+r.id)).filter((c): c is Colaborador => !!c);
    if (a === 'Asignar turno') this.router.navigate(['/ca/turnos/asignacion'], { queryParams: { ids: cs.map((c) => c.id).join(',') } });
    if (a === 'Imprimir tarjetas') imprimirTarjetas(this.ca, cs, `01/${this.ca.filtro.fecha.slice(3)}`, this.ca.filtro.fecha, true, this.data.empresa);
    if (a === 'Exportar seleccionados') {
      downloadCsv('colaboradores-asistencia', COLS.filter((c) => c.type !== 'actions').map((c) => c.label),
        rows.map((r) => COLS.filter((c) => c.type !== 'actions').map((c) => { const v = r[c.key]; return typeof v === 'object' ? v.text : String(v ?? ''); })));
      this.ui.toast(`${rows.length} colaboradores exportados`);
    }
  }
}

/** Control de Asistencia › Colaboradores › Tarjeta de Asistencia (P-04.3): one collaborator or all the filtered ones. */
@Component({
  selector: 'app-ca-tarjeta',
  template: `
    <app-page-header title="Tarjeta de Asistencia" [crumbs]="['Control de Asistencia', 'Colaboradores']">
      <div class="nx-dt__menu-anchor">
        <button type="button" class="nx-btn nx-btn--outline" [attr.aria-expanded]="menu" (click)="menu = !menu">Acciones<app-icon name="chevron-down" [size]="15"></app-icon></button>
        <div *ngIf="menu" class="nx-popover nx-camenu">
          <button type="button" class="nx-menu-item" (click)="imprimir(false)">Imprimir</button>
          <button type="button" class="nx-menu-item" (click)="imprimir(true)">Imprimir con resumen semanal</button>
          <button type="button" class="nx-menu-item" (click)="imprimirTodos()">Imprimir todas (masiva)</button>
          <button type="button" class="nx-menu-item" (click)="pdf()">Exportar a PDF</button>
          <button type="button" class="nx-menu-item" (click)="excel()">Exportar a Excel</button>
        </div>
      </div>
    </app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-card nx-cafil">
      <label class="nx-cafil__f">Desde<input type="date" class="nx-input nx-input--sm" [min]="minIso" [max]="maxIso" [ngModel]="desdeIso" (ngModelChange)="setRango($event, hastaIso)"></label>
      <label class="nx-cafil__f">Hasta<input type="date" class="nx-input nx-input--sm" [min]="minIso" [max]="maxIso" [ngModel]="hastaIso" (ngModelChange)="setRango(desdeIso, $event)"></label>
      <span *ngIf="errorRango" class="nx-error">{{ errorRango }}</span>
    </div>
    <div class="nx-catarjeta">
      <aside class="nx-card nx-catarjeta__list" aria-label="Colaboradores">
        <input class="nx-input nx-input--sm" placeholder="Buscar por nombre o documento" [(ngModel)]="q" aria-label="Buscar colaborador">
        <button *ngFor="let c of lista" type="button" class="nx-catarjeta__item" [class.is-on]="c.id === sel?.id" [attr.aria-pressed]="c.id === sel?.id" (click)="elegir(c)">
          <b>{{ c.apellidos }}, {{ c.nombres }}</b><span class="nx-small nx-muted">{{ c.documento }} · {{ c.cargo }}</span></button>
        <p *ngIf="!lista.length" class="nx-muted nx-small">Sin resultados.</p>
      </aside>
      <div *ngIf="sel" class="nx-grow nx-stack nx-stack--16">
        <div class="nx-grid nx-grid--4">
          <div class="nx-card nx-stat"><span>Horas ordinarias</span><b>{{ dur(total.ho) }}</b></div>
          <div class="nx-card nx-stat"><span>Horas no trabajadas</span><b>{{ dur(total.hnt) }}</b></div>
          <div class="nx-card nx-stat"><span>Permisos</span><b>{{ res.permisos }}</b></div>
          <div class="nx-card nx-stat"><span>Ausencias</span><b>{{ res.ausencias }}</b></div>
        </div>
        <section class="nx-card nx-dt__scroll">
          <table class="nx-table nx-catable" [attr.aria-label]="'Tarjeta de ' + sel.nombres">
            <thead><tr><th>Fecha</th><th>Turno</th><th>Horario</th><th>Entrada</th><th>Salida</th><th class="nx-num">HO</th><th class="nx-num">HNT</th><th class="nx-num">HHEE</th><th class="nx-num">HE aprobadas</th><th>Permiso</th></tr></thead>
            <tbody>
              <ng-container *ngFor="let x of filas">
                <tr *ngIf="!esTotal(x); else tot" [ngClass]="fila(x).clase">
                  <td>{{ fila(x).dia }} {{ fila(x).fecha }}</td><td><span class="nx-cashift" [style.background]="fila(x).j.turno?.color || null">{{ fila(x).j.codigo }}</span></td>
                  <td>{{ fila(x).j.horario }}</td><td>{{ fila(x).entrada }}</td><td>{{ fila(x).salida }}</td>
                  <td class="nx-num">{{ dur(fila(x).ho) }}</td><td class="nx-num">{{ dur(fila(x).hnt) }}</td><td class="nx-num">{{ dur(fila(x).hhee) }}</td>
                  <td class="nx-num">{{ dur(fila(x).aprobadas) }}</td><td>{{ fila(x).permiso }}</td>
                </tr>
                <ng-template #tot><tr class="nx-catable__tot"><td colspan="5">{{ tsem(x).semana }}</td><td class="nx-num">{{ dur(tsem(x).ho) }}</td><td class="nx-num">{{ dur(tsem(x).hnt) }}</td>
                  <td class="nx-num">{{ dur(tsem(x).hhee) }}</td><td class="nx-num">{{ dur(tsem(x).aprobadas) }}</td><td></td></tr></ng-template>
              </ng-container>
            </tbody>
          </table>
        </section>
        <div class="nx-legend-row nx-small"><span><i class="nx-casw is-ina"></i>Inasistencia</span><span><i class="nx-casw is-des"></i>Descanso</span>
          <span><i class="nx-casw is-fer"></i>Feriado</span><span><i class="nx-casw is-lic"></i>Licencia, permiso o vacaciones</span><span><i class="nx-casw is-inc"></i>Incompleta</span></div>
      </div>
    </div>
  `
})
export class CaTarjetaComponent implements OnDestroy {
  readonly dur = dur;
  readonly esTotal = esTotal;
  readonly minIso: string;
  readonly maxIso: string;
  desde: string;
  hasta: string;
  q = '';
  menu = false;
  sel: Colaborador | null = null;
  filas: (FilaTarjeta | TotalSemana)[] = [];
  total: TotalSemana = { semana: '', ho: 0, hnt: 0, hhee: 0, aprobadas: 0 };
  res = { permisos: 0, ausencias: 0 };
  errorRango = '';
  private cs: Colaborador[] = [];
  private sub: Subscription;

  constructor(private ca: ControlAsistenciaService, route: ActivatedRoute, private data: HrDataService, private ui: UiStateService) {
    this.minIso = aIso(ca.inicio);
    this.maxIso = aIso(ca.corte);
    this.hasta = ca.filtro.fecha;
    this.desde = `01/${this.hasta.slice(3)}`;
    const id = Number(route.snapshot.queryParamMap.get('id'));
    this.sub = ca.cambios$.subscribe(() => {
      this.cs = ca.visibles();
      const pedido = id ? ca.col(id) : undefined;
      if (!this.sel || !this.cs.some((c) => c.id === this.sel!.id)) this.sel = pedido ?? this.cs[0] ?? null;
      this.armar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get lista(): Colaborador[] {
    const q = this.q.trim().toLowerCase();
    return this.cs.filter((c) => !q || `${c.apellidos} ${c.nombres} ${c.documento}`.toLowerCase().includes(q));
  }
  get desdeIso(): string { return aIso(this.desde); }
  get hastaIso(): string { return aIso(this.hasta); }
  fila(x: FilaTarjeta | TotalSemana): FilaTarjeta { return x as FilaTarjeta; }
  tsem(x: FilaTarjeta | TotalSemana): TotalSemana { return x as TotalSemana; }

  setRango(d: string, h: string): void {
    if (!d || !h) return;
    if (d > h) { this.errorRango = 'La fecha “Desde” debe ser anterior o igual a “Hasta”.'; return; }
    if (rangoFechas(deIso(d), deIso(h)).length > 62) { this.errorRango = 'El rango máximo es de 62 días.'; return; }
    this.errorRango = '';
    this.desde = deIso(d);
    this.hasta = deIso(h);
    this.armar();
  }
  elegir(c: Colaborador): void { this.sel = c; this.armar(); }

  private armar(): void {
    if (!this.sel) { this.filas = []; return; }
    const r = filasTarjeta(this.ca, this.sel.id, this.desde, this.hasta);
    this.filas = r.filas;
    this.total = r.total;
    const s = this.ca.resumen(this.sel.id, this.desde, this.hasta);
    this.res = { permisos: s.permisos, ausencias: s.ausencias };
  }

  imprimir(resumen: boolean): void { this.menu = false; if (this.sel) imprimirTarjetas(this.ca, [this.sel], this.desde, this.hasta, resumen, this.data.empresa); }
  imprimirTodos(): void { this.menu = false; imprimirTarjetas(this.ca, this.cs, this.desde, this.hasta, true, this.data.empresa); }
  pdf(): void { this.imprimir(true); this.ui.toast('En el cuadro de impresión elige “Guardar como PDF”'); }
  excel(): void {
    this.menu = false;
    if (!this.sel) return;
    const rows = this.filas.map((x) => esTotal(x)
      ? [x.semana, '', '', '', '', '', dur(x.ho), dur(x.hnt), dur(x.hhee), dur(x.aprobadas), '']
      : [`${x.dia} ${x.fecha}`, x.j.codigo, x.j.horario, x.entrada, x.salida, x.j.estado, dur(x.ho), dur(x.hnt), dur(x.hhee), dur(x.aprobadas), x.permiso]);
    downloadCsv(`tarjeta-${this.sel.documento}-${this.desde.replace(/\//g, '')}-${this.hasta.replace(/\//g, '')}`,
      ['Fecha', 'Turno', 'Horario', 'Entrada', 'Salida', 'Estado', 'HO', 'HNT', 'HHEE', 'HE aprobadas', 'Permiso'], rows);
  }
}

/** Control de Asistencia › Perfil de asistencia del colaborador (P-04.4). */
@Component({
  selector: 'app-ca-perfil',
  template: `
    <ng-container *ngIf="c">
      <app-page-header title="Perfil de asistencia" [crumbs]="['Control de Asistencia', 'Colaboradores']">
        <div class="nx-dt__menu-anchor">
          <button type="button" class="nx-btn nx-btn--primary" [attr.aria-expanded]="menu" (click)="menu = !menu">Acciones<app-icon name="chevron-down" [size]="15"></app-icon></button>
          <div *ngIf="menu" class="nx-popover nx-camenu">
            <a class="nx-menu-item" [routerLink]="['/ca/colaboradores/tarjeta']" [queryParams]="{ id: c.id }">Tarjeta de asistencia</a>
            <button type="button" class="nx-menu-item" (click)="abrirMarca()">Agregar marca manual</button>
            <button type="button" class="nx-menu-item" (click)="menu = false; nota = ''; notaModal = true">Agregar observación</button>
            <button type="button" class="nx-menu-item" (click)="exportar()">Exportar</button>
          </div>
        </div>
      </app-page-header>

      <section class="nx-card nx-pad nx-caperfil nx-mb-16">
        <span class="nx-avatar nx-avatar--64">{{ c.nombres[0] }}{{ c.apellidos[0] }}</span>
        <div class="nx-grow"><h2 class="nx-mt-0 nx-mb-0">{{ c.nombres }} {{ c.apellidos }}</h2>
          <span class="nx-muted">DNI {{ c.documento }} · {{ c.cargo }} · {{ empresa }}</span><br>
          <span class="nx-small">Contrato {{ ca.contrato(c.id) }} · Supervisor: {{ ca.supervisor(c.id) }} · {{ ca.recintoNombre(c.id) }}</span></div>
        <a class="nx-btn nx-btn--outline nx-btn--sm" [routerLink]="['/admin/colaboradores/ficha', c.id]">Ver ficha</a>
      </section>

      <div class="nx-grid nx-grid--4 nx-mb-16">
        <div class="nx-card nx-stat"><span>Asistencias en {{ mesLabel }}</span><b>{{ res.asistencias }}</b></div>
        <div class="nx-card nx-stat"><span>Inasistencias</span><b>{{ res.inasistencias }}</b></div>
        <div class="nx-card nx-stat"><span>Atrasos</span><b>{{ res.atrasos }}</b><span class="nx-small nx-muted">{{ res.minAtraso }} min en total</span></div>
        <div class="nx-card nx-stat"><span>Horas extras</span><b>{{ dur(res.exceso) }}</b></div>
      </div>

      <div class="nx-grid nx-grid--2 nx-mb-16">
        <section class="nx-card nx-pad" aria-label="Registro del día">
          <div class="nx-section__head"><h2>Registro del día</h2>
            <input type="date" class="nx-input nx-input--sm nx-w-200" [min]="minIso" [max]="maxIso" [ngModel]="diaIso" (ngModelChange)="setDia($event)" aria-label="Fecha del registro"></div>
          <p class="nx-small nx-mt-0"><span class="nx-cashift" [style.background]="dia.turno?.color || null">{{ dia.codigo }}</span> {{ dia.horario }} ·
            <span class="nx-badge nx-badge--sm" [ngClass]="'nx-tone-' + tone(dia.estado)">{{ dia.estado }}</span> <span class="nx-muted">{{ dia.detalle }}</span></p>
          <ol class="nx-catl">
            <li *ngFor="let m of dia.marcas" [class.is-out]="m.tipo === 'Salida'"><b>{{ m.hora }}</b> {{ m.tipo }} · {{ m.metodo }}{{ m.metodo === 'Manual' ? ' (' + m.creadoPor + ': ' + m.motivo + ')' : '' }}
              <span class="nx-small nx-muted">{{ m.dentroRadio ? 'Dentro del radio' : 'Fuera del radio' }}{{ m.foto ? ' · con foto' : '' }}</span></li>
          </ol>
          <p *ngIf="!dia.marcas.length" class="nx-muted nx-small">Sin marcas este día.</p>
          <p *ngIf="dia.atraso || dia.anticipada || dia.exceso" class="nx-small nx-mb-0">
            <span *ngIf="dia.atraso">Atraso: {{ dia.atraso }} min. </span><span *ngIf="dia.anticipada">Salida anticipada: {{ dia.anticipada }} min. </span>
            <span *ngIf="dia.exceso">Exceso: {{ dur(dia.exceso) }} h ({{ dia.tipoExceso }}).</span></p>
        </section>
        <section class="nx-card nx-pad" aria-label="Foto de la última marca">
          <h2 class="nx-section__title">Foto de la última marca vs. foto asignada</h2>
          <div class="nx-cafotos">
            <div><span class="nx-cafoto">{{ c.nombres[0] }}{{ c.apellidos[0] }}</span><span class="nx-small">Foto asignada</span></div>
            <div><span class="nx-cafoto" [class.is-empty]="!ultimaConFoto">{{ ultimaConFoto ? c.nombres[0] + c.apellidos[0] : '—' }}</span>
              <span class="nx-small">{{ ultimaConFoto ? 'Marca del ' + ultimaConFoto.fecha + ' ' + ultimaConFoto.hora : 'Sin marcas con foto' }}</span></div>
          </div>
          <div *ngIf="ultimaConFoto" class="nx-ok-note" role="status"><app-icon name="checkcircle" [size]="16"></app-icon>La foto coincide con la asignada.</div>
          <p *ngIf="!ca.usaApp(c.id)" class="nx-small nx-muted nx-mb-0">Marca desde el portal web; ese método no toma foto.</p>
        </section>
        <section class="nx-card nx-pad" aria-label="Mapa del último registro">
          <h2 class="nx-section__title">Mapa del último registro</h2>
          <app-ca-mapa [recintos]="recintoCol" [puntos]="puntoUltimo" [alto]="220" etiqueta="Ubicación de la última marca"></app-ca-mapa>
          <p class="nx-small nx-muted nx-mb-0">{{ ultima ? ultima.tipo + ' del ' + ultima.fecha + ' a las ' + ultima.hora + ' · ' + ultima.metodo : 'Sin marcas' }}</p>
        </section>
        <section class="nx-card nx-pad" aria-label="Horario asignado">
          <div class="nx-section__head"><h2>Horario asignado</h2><a class="nx-small" routerLink="/ca/turnos/asignacion" [queryParams]="{ ids: c.id }">Cambiar turno</a></div>
          <div class="nx-dt__scroll"><table class="nx-table nx-mini-table">
            <thead><tr><th>Día</th><th>Horario</th><th>Turno</th><th>Colación</th></tr></thead>
            <tbody><tr *ngFor="let h of semana"><td>{{ h.dia }} {{ h.fecha }}</td><td>{{ h.horario }}</td><td>{{ h.turno }}</td><td>{{ h.colacion }}</td></tr></tbody>
          </table></div>
        </section>
      </div>

      <section class="nx-card nx-pad" aria-label="Observaciones del supervisor">
        <div class="nx-section__head"><h2>Observaciones del supervisor</h2>
          <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="nota = ''; notaModal = true"><app-icon name="plus" [size]="15"></app-icon>Agregar</button></div>
        <div class="nx-dt__scroll"><table class="nx-table">
          <thead><tr><th>Fecha</th><th>Observación</th><th>Autor</th></tr></thead>
          <tbody><tr *ngFor="let n of notas"><td>{{ n.fecha }}</td><td class="nx-wrap">{{ n.texto }}</td><td>{{ n.autor }}</td></tr>
            <tr *ngIf="!notas.length"><td colspan="3" class="nx-muted">Sin observaciones.</td></tr></tbody>
        </table></div>
      </section>

      <app-modal *ngIf="notaModal" title="Agregar observación" width="520px" (closed)="notaModal = false">
        <label class="nx-field">Observación*<textarea class="nx-textarea" rows="4" maxlength="400" [(ngModel)]="nota" aria-label="Observación"></textarea>
          <span class="nx-hint">{{ nota.length }}/400</span></label>
        <span *ngIf="notaIntento && nota.trim().length < 5" class="nx-error">Escribe al menos 5 caracteres.</span>
        <ng-container modal-footer>
          <button type="button" class="nx-btn nx-btn--outline" (click)="notaModal = false">Cancelar</button>
          <button type="button" class="nx-btn nx-btn--primary" (click)="guardarNota()">Guardar</button>
        </ng-container>
      </app-modal>
      <app-ca-marca-manual *ngIf="marcaModal" [colaboradorId]="c.id" (cerrar)="marcaModal = false"></app-ca-marca-manual>
    </ng-container>
  `
})
export class CaPerfilComponent implements OnDestroy {
  readonly dur = dur;
  readonly minIso: string;
  readonly maxIso: string;
  c: Colaborador | undefined;
  empresa = '';
  mesLabel = '';
  menu = false;
  res = { asistencias: 0, inasistencias: 0, atrasos: 0, minAtraso: 0, exceso: 0 };
  diaSel = '';
  dia!: Jornada;
  ultima: Marca | undefined;
  ultimaConFoto: Marca | undefined;
  puntoUltimo: PuntoMapa[] = [];
  recintoCol: Recinto[] = [];
  semana: { dia: string; fecha: string; horario: string; turno: string; colacion: string }[] = [];
  notas: NotaSupervisor[] = [];
  notaModal = false;
  notaIntento = false;
  nota = '';
  marcaModal = false;
  private sub = new Subscription();

  constructor(public ca: ControlAsistenciaService, route: ActivatedRoute, data: HrDataService, private ui: UiStateService) {
    this.empresa = data.empresa;
    this.minIso = aIso(ca.inicio);
    this.maxIso = aIso(ca.corte);
    this.diaSel = ca.filtro.fecha;
    let id = 0;
    this.sub.add(route.paramMap.subscribe((p) => { id = Number(p.get('id')); this.armar(id); }));
    this.sub.add(ca.cambios$.subscribe(() => this.armar(id)));
    this.sub.add(ca.notas$.subscribe((ns) => (this.notas = ns.filter((n) => n.colaboradorId === id))));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get diaIso(): string { return aIso(this.diaSel); }
  setDia(v: string): void { if (v && v >= this.minIso && v <= this.maxIso) { this.diaSel = deIso(v); if (this.c) this.dia = this.ca.jornada(this.c.id, this.diaSel); } }
  tone(e: string): string { return (ESTADO_JORNADA_TONE as Record<string, string>)[e] ?? 'gray'; }

  private armar(id: number): void {
    const ca = this.ca;
    this.c = ca.col(id);
    const c = this.c;
    if (!c) return;
    const f = ca.filtro.fecha;
    this.mesLabel = parseFecha(f)!.toLocaleDateString('es-PE', { month: 'long' }).toLowerCase();
    this.res = ca.resumen(c.id, `01/${f.slice(3)}`, f);
    this.dia = ca.jornada(c.id, this.diaSel);
    const marcas: Marca[] = [];
    for (let d = f, n = 0; n < 45; d = sumarDias(d, -1), n++) marcas.push(...ca.marcasDe(c.id, d).slice().reverse());
    this.ultima = marcas[0];
    this.ultimaConFoto = marcas.find((m) => m.foto);
    const rc = ca.recinto(ca.recintoDe[c.id]);
    this.recintoCol = rc ? [rc] : [];
    this.puntoUltimo = this.ultima ? [{ lat: this.ultima.lat, lng: this.ultima.lng, color: this.ultima.tipo === 'Entrada' ? 'var(--nx-success-500)' : 'var(--nx-orange)', label: `${this.ultima.tipo} ${this.ultima.hora}` }] : [];
    const lunes = sumarDias(f, -((parseFecha(f)!.getDay() + 6) % 7));
    this.semana = rangoFechas(lunes, sumarDias(lunes, 6)).map((d) => {
      const t = ca.turnoDe(c.id, d);
      return { dia: DIAS_SEMANA[parseFecha(d)!.getDay()], fecha: d.slice(0, 5), horario: t.turno ? ca.horarioTurno(t.turno) : '—',
        turno: t.turno ? `${t.turno.nombre} (${t.turno.sigla})` : ca.etiquetaCodigo(t.codigo), colacion: t.turno ? `${t.turno.colacion} min` : '—' };
    });
    this.notas = ca.notas$.value.filter((n) => n.colaboradorId === id);
  }

  abrirMarca(): void { this.menu = false; this.marcaModal = true; }
  guardarNota(): void {
    this.notaIntento = true;
    if (!this.c || this.nota.trim().length < 5) return;
    this.ca.agregarNota(this.c, this.nota.trim());
    this.notaModal = false;
    this.notaIntento = false;
    this.ui.toast('Observación agregada');
  }
  exportar(): void {
    this.menu = false;
    const c = this.c;
    if (!c) return;
    const f = this.ca.filtro.fecha;
    const rows = rangoFechas(`01/${f.slice(3)}`, f).map((d) => {
      const j = this.ca.jornada(c.id, d);
      return [d, j.codigo, j.horario, j.entrada?.hora ?? '', j.salida?.hora ?? '', j.estado, String(j.atraso), String(j.anticipada), dur(j.ho), dur(j.hnt), dur(j.exceso)];
    });
    downloadCsv(`perfil-asistencia-${c.documento}`, ['Fecha', 'Turno', 'Horario', 'Entrada', 'Salida', 'Estado', 'Atraso (min)', 'Salida anticipada (min)', 'HO', 'HNT', 'HHEE'], rows);
  }
}
