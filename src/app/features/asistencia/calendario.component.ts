import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, fmtFecha } from '../../core/asistencia.service';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { AUSENCIA_CON_GOCE, Ausencia, FERIADOS_2026, SolicitudAsistencia, Vacacion } from '../../core/sample/asistencia';

type Tipo = 'vac' | 'goce' | 'sin' | 'pend';
interface Evento { colaboradorId: number; nombre: string; detalle: string; tipo: Tipo; desde: Date; hasta: Date; }
interface Dia { fecha: Date; key: string; delMes: boolean; finde: boolean; hoy: boolean; feriado?: string; eventos: Evento[]; }

const LEYENDA: { tipo: Tipo; label: string }[] = [
  { tipo: 'vac', label: 'Vacaciones' }, { tipo: 'goce', label: 'Ausencia con goce' },
  { tipo: 'sin', label: 'Ausencia sin goce' }, { tipo: 'pend', label: 'Solicitud pendiente' },
];
const MAX_CHIPS = 3;

/** Administrativo › Asistencia › Calendario: who is out each day (vacations, absences, pending requests) and holidays. */
@Component({
  selector: 'app-calendario-asistencia',
  template: `
    <app-page-header title="Calendario" [crumbs]="['Administrativo', 'Asistencia']"></app-page-header>
    <div class="nx-card nx-cal">
      <div class="nx-cal__toolbar">
        <div class="nx-row nx-row--center">
          <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Mes anterior" (click)="mover(-1)"><app-icon name="chevron-left" [size]="18"></app-icon></button>
          <h2 class="nx-cal__title" aria-live="polite">{{ titulo }}</h2>
          <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Mes siguiente" (click)="mover(1)"><app-icon name="chevron-right" [size]="18"></app-icon></button>
          <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="irHoy()">Hoy</button>
        </div>
        <div class="nx-row nx-row--center nx-cal__filters">
          <label class="nx-field nx-field--inline">Área
            <select class="nx-select nx-select--sm" name="area" [(ngModel)]="area" (ngModelChange)="armar()">
              <option value="">Todas</option><option *ngFor="let a of areas">{{ a }}</option>
            </select>
          </label>
          <ul class="nx-legend nx-cal__legend">
            <li *ngFor="let l of leyenda"><span class="nx-cal__dot" [ngClass]="'is-' + l.tipo"></span>{{ l.label }}</li>
            <li><span class="nx-cal__dot is-feriado"></span>Feriado</li>
          </ul>
        </div>
      </div>
      <div class="nx-cal__body">
        <div class="nx-cal__grid" role="grid" [attr.aria-label]="'Calendario de ' + titulo">
          <div *ngFor="let d of diasSemana" class="nx-cal__dow" role="columnheader">{{ d }}</div>
          <button *ngFor="let d of dias" type="button" role="gridcell" class="nx-cal__day"
                  [class.is-out]="!d.delMes" [class.is-weekend]="d.finde" [class.is-today]="d.hoy" [class.is-selected]="sel?.key === d.key"
                  [class.is-holiday]="!!d.feriado" [attr.aria-label]="ariaDia(d)" (click)="sel = d">
            <span class="nx-cal__num">{{ d.fecha.getDate() }}</span>
            <span *ngIf="d.feriado" class="nx-cal__holiday">{{ d.feriado }}</span>
            <span *ngFor="let e of d.eventos.slice(0, maxChips)" class="nx-cal__chip" [ngClass]="'is-' + e.tipo">{{ e.nombre }}</span>
            <span *ngIf="d.eventos.length > maxChips" class="nx-cal__more">+{{ d.eventos.length - maxChips }} más</span>
          </button>
        </div>
        <aside class="nx-cal__side" aria-live="polite">
          <ng-container *ngIf="sel; else ayuda">
            <h3 class="nx-cal__side-title">{{ fechaLarga(sel.fecha) }}</h3>
            <p *ngIf="sel.feriado" class="nx-badge nx-tone-orange">Feriado · {{ sel.feriado }}</p>
            <p *ngIf="!sel.eventos.length" class="nx-muted nx-small">Nadie ausente este día{{ area ? ' en ' + area : '' }}.</p>
            <ul class="nx-cal__list">
              <li *ngFor="let e of sel.eventos">
                <span class="nx-cal__dot" [ngClass]="'is-' + e.tipo"></span>
                <span class="nx-grow"><a [routerLink]="'/admin/colaboradores/ficha/' + e.colaboradorId"><b>{{ e.nombre }}</b></a>
                  <span class="nx-hint">{{ e.detalle }} · {{ fmt(e.desde) }} al {{ fmt(e.hasta) }}</span></span>
              </li>
            </ul>
          </ng-container>
          <ng-template #ayuda><p class="nx-muted nx-small nx-mt-0">Selecciona un día para ver quién está ausente.</p></ng-template>
          <div class="nx-cal__summary">
            <span class="nx-field-label">Resumen de {{ mesNombre }}</span>
            <div *ngFor="let l of leyenda" class="nx-row nx-row--center"><span class="nx-cal__dot" [ngClass]="'is-' + l.tipo"></span>
              <span class="nx-grow">{{ l.label }}</span><b>{{ resumen[l.tipo] }}</b></div>
            <div class="nx-row nx-row--center"><span class="nx-cal__dot is-feriado"></span><span class="nx-grow">Feriados</span><b>{{ feriadosMes }}</b></div>
          </div>
        </aside>
      </div>
    </div>
  `
})
export class CalendarioAsistenciaComponent implements OnDestroy {
  readonly leyenda = LEYENDA;
  readonly maxChips = MAX_CHIPS;
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  mes: Date;
  area = '';
  areas: string[] = [];
  dias: Dia[] = [];
  sel: Dia | null = null;
  resumen: Record<Tipo, number> = { vac: 0, goce: 0, sin: 0, pend: 0 };
  feriadosMes = 0;
  private colaboradores: Colaborador[] = [];
  private eventos: Evento[] = [];
  private readonly corte: Date;
  private readonly feriados = new Map(FERIADOS_2026.map((f) => [f.fecha, f.nombre]));
  private sub: Subscription;

  constructor(data: HrDataService, asis: AsistenciaService) {
    this.corte = parseFecha(asis.corte)!;
    this.mes = new Date(this.corte.getFullYear(), this.corte.getMonth(), 1);
    this.sub = combineLatest([data.colaboradores(), asis.vacaciones$, asis.ausencias$, asis.solicitudes$]).subscribe(([cs, vs, as, ss]) => {
      this.colaboradores = cs;
      this.areas = [...new Set(cs.map((c) => c.area))].sort();
      this.eventos = this.construir(vs, as, ss);
      this.armar();
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get titulo(): string { const s = this.mes.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); }
  get mesNombre(): string { return this.mes.toLocaleDateString('es-PE', { month: 'long' }).toLowerCase(); }
  fmt(d: Date): string { return fmtFecha(d); }
  fechaLarga(d: Date): string { const s = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }); return s[0].toUpperCase() + s.slice(1); }
  ariaDia(d: Dia): string {
    return `${this.fechaLarga(d.fecha)}${d.feriado ? ', feriado ' + d.feriado : ''}, ${d.eventos.length} ${d.eventos.length === 1 ? 'ausencia' : 'ausencias'}`;
  }

  private construir(vs: Vacacion[], as: Ausencia[], ss: SolicitudAsistencia[]): Evento[] {
    const nom = (id: number) => { const c = this.colaboradores.find((x) => x.id === id); return c ? `${c.apellidos.split(' ')[0]}, ${c.nombres}` : '—'; };
    return [
      ...vs.map((v): Evento => ({ colaboradorId: v.colaboradorId, nombre: nom(v.colaboradorId), detalle: `Vacaciones (${v.dias} días)`, tipo: 'vac', desde: parseFecha(v.desde)!, hasta: parseFecha(v.hasta)! })),
      ...as.map((a): Evento => ({ colaboradorId: a.colaboradorId, nombre: nom(a.colaboradorId), detalle: a.tipo, tipo: AUSENCIA_CON_GOCE[a.tipo] ? 'goce' : 'sin', desde: parseFecha(a.desde)!, hasta: parseFecha(a.hasta)! })),
      ...ss.filter((s) => s.estado === 'Pendiente').map((s): Evento => ({ colaboradorId: s.colaboradorId, nombre: nom(s.colaboradorId), detalle: `${s.tipo} · pendiente de aprobación`, tipo: 'pend', desde: parseFecha(s.desde)!, hasta: parseFecha(s.hasta)! })),
    ];
  }

  armar(): void {
    const y = this.mes.getFullYear(), m = this.mes.getMonth();
    const primero = new Date(y, m, 1);
    const offset = (primero.getDay() + 6) % 7; // Monday first
    const ultimo = new Date(y, m + 1, 0);
    const total = Math.ceil((offset + ultimo.getDate()) / 7) * 7;
    const visibles = new Set(this.colaboradores.filter((c) => !this.area || c.area === this.area).map((c) => c.id));
    const evs = this.eventos.filter((e) => visibles.has(e.colaboradorId));
    const selKey = this.sel?.key;
    this.dias = Array.from({ length: total }, (_, i) => {
      const fecha = new Date(y, m, 1 - offset + i);
      const key = fmtFecha(fecha);
      return {
        fecha, key, delMes: fecha.getMonth() === m, finde: fecha.getDay() === 0 || fecha.getDay() === 6,
        hoy: fecha.getTime() === this.corte.getTime(), feriado: this.feriados.get(key),
        eventos: evs.filter((e) => e.desde <= fecha && e.hasta >= fecha),
      };
    });
    this.sel = this.dias.find((d) => d.key === selKey) ?? null;
    const ini = primero, fin = ultimo;
    this.resumen = { vac: 0, goce: 0, sin: 0, pend: 0 };
    for (const e of evs) if (e.desde <= fin && e.hasta >= ini) this.resumen[e.tipo]++;
    this.feriadosMes = FERIADOS_2026.filter((f) => { const d = parseFecha(f.fecha)!; return d.getFullYear() === y && d.getMonth() === m; }).length;
  }

  mover(n: number): void { this.mes = new Date(this.mes.getFullYear(), this.mes.getMonth() + n, 1); this.sel = null; this.armar(); }
  irHoy(): void {
    this.mes = new Date(this.corte.getFullYear(), this.corte.getMonth(), 1);
    this.armar();
    this.sel = this.dias.find((d) => d.hoy) ?? null;
  }
}
