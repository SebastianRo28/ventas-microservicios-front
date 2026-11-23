import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Alerta, ControlAsistenciaService, diaSemana, DIAS_CORTOS, dur, rangoFechas } from '../../core/control-asistencia.service';
import { parseFecha } from '../../core/format';
import { Colaborador } from '../../core/models';
import { Recinto } from '../../core/sample/control-asistencia';
import { PuntoMapa } from './ca-shared.components';

interface Barra { label: string; valor: number; texto: string; }

/** Control de Asistencia › Panel de Control (P-04.1). */
@Component({
  selector: 'app-ca-panel',
  template: `
    <app-page-header title="Panel de Control" [crumbs]="['Control de Asistencia']"></app-page-header>
    <app-ca-filtros></app-ca-filtros>

    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Trabajando ahora</span><b>{{ esHoy ? kpi.trabajando : '—' }}</b>
        <span class="nx-small nx-muted">{{ esHoy ? 'Con entrada y sin salida a las ' + ca.horaCorte : 'Solo se calcula para hoy' }}</span></div>
      <div class="nx-card nx-stat"><span>Asistencia {{ esHoy ? 'hoy' : 'del ' + fecha }}</span><b>{{ kpi.asistencia }}<small class="nx-stat__of"> / {{ kpi.esperados }}</small></b>
        <span class="nx-small nx-muted">{{ kpi.pct }} % de los que tenían turno</span></div>
      <div class="nx-card nx-stat"><span>Atrasos {{ esHoy ? 'hoy' : 'del día' }}</span><b>{{ kpi.atrasos }}</b>
        <span class="nx-small nx-muted">Fuera de la tolerancia del turno</span></div>
      <div class="nx-card nx-stat"><span>Horas extras del mes</span><b>{{ kpi.hhee }}</b>
        <span class="nx-small" [class.nx-up]="kpi.delta > 0" [class.nx-down]="kpi.delta < 0">{{ kpi.deltaTexto }}</span></div>
    </div>

    <div class="nx-grid nx-grid--2 nx-mb-16">
      <section class="nx-card nx-pad" aria-label="Comparativo de asistencia">
        <div class="nx-section__head"><h2>Comparativo de asistencia</h2><span class="nx-small nx-muted">{{ mesLabel }} · % de asistencia por día</span></div>
        <div class="nx-cacols" role="list">
          <div *ngFor="let d of comparativo" class="nx-cacols__col" role="listitem" [title]="d.titulo" [class.is-sel]="d.fecha === fecha">
            <span class="nx-cacols__val">{{ d.pct == null ? '' : d.pct }}</span>
            <span class="nx-cacols__bar" [style.height.%]="d.pct ?? 0" [class.is-low]="d.pct != null && d.pct < 85"></span>
            <span class="nx-cacols__lbl">{{ d.dia }}<br>{{ d.dow }}</span>
          </div>
        </div>
        <p class="nx-small nx-muted nx-mb-0">Personal propio. Los días sin barra no tenían turnos programados.</p>
      </section>

      <section class="nx-card nx-pad" aria-label="Alertas">
        <div class="nx-section__head"><h2>Alertas</h2><a class="nx-small" routerLink="/ca/configuraciones/tolerancias">Configurar alertas</a></div>
        <ul class="nx-caalerts">
          <li *ngFor="let a of alertas">
            <button type="button" class="nx-caalert" (click)="verAlerta = a">
              <span class="nx-caalert__icon" [ngClass]="'is-' + a.severidad"><app-icon [name]="a.severidad === 'info' ? 'info' : 'alert'" [size]="17"></app-icon></span>
              <span class="nx-grow">{{ a.titulo }}</span><app-icon name="chevron-right" [size]="16"></app-icon>
            </button>
          </li>
        </ul>
        <div *ngIf="!alertas.length" class="nx-empty nx-empty--compact"><b>Sin alertas</b><span>Todo en orden para los filtros elegidos.</span></div>
        <p class="nx-small nx-muted nx-mb-0">Las alertas también aparecen a los usuarios con acceso a cada recinto.</p>
      </section>
    </div>

    <section class="nx-card nx-pad nx-mb-16" aria-label="Línea de tiempo">
      <div class="nx-section__head"><h2>Línea de tiempo {{ esHoy ? 'de hoy' : 'del ' + fecha }}</h2><span class="nx-small nx-muted">{{ linea.length }} con registros</span></div>
      <div class="nx-dt__scroll">
        <table class="nx-table" aria-label="Últimos registros del día">
          <thead><tr><th>Foto</th><th>Documento</th><th>Apellidos</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Contrato</th><th>Último registro</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of linea">
              <td><span class="nx-avatar nx-avatar--28">{{ r.c.nombres[0] }}{{ r.c.apellidos[0] }}</span></td>
              <td>{{ r.c.documento }}</td><td><a [routerLink]="['/ca/colaboradores/perfil', r.c.id]">{{ r.c.apellidos }}</a></td><td>{{ r.c.nombres }}</td>
              <td>{{ r.c.cargo }}</td><td>{{ r.c.area }}</td><td>{{ ca.contrato(r.c.id) }}</td>
              <td><span class="nx-caflag" [class.is-out]="r.tipo === 'Salida'"><app-icon [name]="r.tipo === 'Entrada' ? 'arrow-up' : 'arrow-down'" [size]="14"></app-icon>{{ r.hora }} · {{ r.tipo }}</span></td>
            </tr>
            <tr *ngIf="!linea.length"><td colspan="8"><div class="nx-empty nx-empty--compact"><b>Sin registros</b><span>Nadie ha marcado en este día con los filtros elegidos.</span></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="nx-grid nx-grid--2 nx-mb-16">
      <section class="nx-card nx-pad" aria-label="Asistencia por tipo de contrato">
        <h2 class="nx-section__title">Asistencia por tipo de contrato</h2>
        <p class="nx-muted nx-small nx-mt-0">Días asistidos sobre días con turno, {{ mesLabel }} hasta el {{ fecha }}.</p>
        <div class="nx-rings">
          <div *ngFor="let r of anillos" class="nx-ring">
            <span class="nx-ring__chart" [style.background]="'conic-gradient(var(--nx-primary-700) ' + r.pct * 3.6 + 'deg, var(--nx-gray-150) 0)'"><b>{{ r.pct }} %</b></span>
            <span class="nx-small"><b>{{ r.label }}</b><br>{{ r.n }} {{ r.n === 1 ? 'persona' : 'personas' }}</span>
          </div>
        </div>
      </section>
      <section class="nx-card nx-pad" aria-label="Top 10 de asistencia">
        <h2 class="nx-section__title">Top 10 de asistencia</h2>
        <div class="nx-dt__scroll"><table class="nx-table nx-mini-table">
          <colgroup><col style="width: 36px"><col><col style="width: 150px"><col style="width: 92px"><col style="width: 76px"></colgroup>
          <thead><tr><th>#</th><th>Colaborador</th><th>Contrato</th><th class="nx-num">Asistencia</th><th class="nx-num">Atrasos</th></tr></thead>
          <tbody><tr *ngFor="let t of top; let i = index"><td>{{ i + 1 }}</td><td>{{ t.nombre }}</td><td>{{ t.contrato }}</td><td class="nx-num">{{ t.pct }} %</td><td class="nx-num">{{ t.atrasos }}</td></tr></tbody>
        </table></div>
      </section>
      <section class="nx-card nx-pad" aria-label="Asistencia vs. inasistencia por cargo">
        <h2 class="nx-section__title">Asistencia vs. inasistencia por cargo</h2>
        <div class="nx-legend-row nx-mb-12"><span><i class="nx-legend__dot"></i>Días asistidos</span><span><i class="nx-legend__dot nx-legend__dot--orange"></i>Inasistencias</span></div>
        <div *ngFor="let b of porCargo" class="nx-hbar nx-hbar--wide">
          <span class="nx-hbar__label" [title]="b.label">{{ b.label }}</span>
          <span class="nx-hbar__track nx-castack"><span class="nx-hbar__fill" [style.width.%]="b.a"></span><span class="nx-castack__ina" [style.width.%]="b.i"></span></span>
          <span class="nx-hbar__value">{{ b.texto }}</span>
        </div>
      </section>
      <section class="nx-card nx-pad" aria-label="Asistencia por área">
        <h2 class="nx-section__title">Asistencia por área</h2>
        <div *ngFor="let b of porArea" class="nx-hbar nx-hbar--wide">
          <span class="nx-hbar__label" [title]="b.label">{{ b.label }}</span>
          <span class="nx-hbar__track"><span class="nx-hbar__fill" [style.width.%]="b.valor"></span></span>
          <span class="nx-hbar__value">{{ b.texto }}</span>
        </div>
      </section>
    </div>

    <section class="nx-card nx-pad" aria-label="Mapa de registros del día">
      <div class="nx-section__head"><h2>Mapa de registros del día</h2>
        <div class="nx-legend-row"><span><i class="nx-legend__dot nx-legend__dot--green"></i>Entrada</span><span><i class="nx-legend__dot nx-legend__dot--orange"></i>Salida</span></div></div>
      <app-ca-mapa [recintos]="mapaRecintos" [puntos]="puntos" etiqueta="Recintos y marcas del día"></app-ca-mapa>
      <p class="nx-small nx-muted nx-mb-0">Esquema de ubicación según las coordenadas de cada recinto y de cada marca con GPS. El círculo es el radio de asistencia.</p>
    </section>

    <app-modal *ngIf="verAlerta as a" [title]="a.titulo" width="560px" (closed)="verAlerta = null">
      <div class="nx-dt__scroll"><table class="nx-table">
        <thead><tr><th>Colaborador</th><th>Recinto</th><th>Detalle</th></tr></thead>
        <tbody><tr *ngFor="let x of a.colaboradores"><td><a [routerLink]="['/ca/colaboradores/perfil', x.id]" (click)="verAlerta = null">{{ ca.nombre(x.id) }}</a></td>
          <td>{{ ca.recintoNombre(x.id) }}</td><td>{{ x.detalle }}</td></tr></tbody>
      </table></div>
      <ng-container modal-footer><button type="button" class="nx-btn nx-btn--primary" (click)="verAlerta = null">Cerrar</button></ng-container>
    </app-modal>
  `
})
export class CaPanelComponent implements OnDestroy {
  fecha = '';
  esHoy = true;
  mesLabel = '';
  kpi = { trabajando: 0, asistencia: 0, esperados: 0, pct: 0, atrasos: 0, hhee: '', delta: 0, deltaTexto: '' };
  comparativo: { fecha: string; dia: string; dow: string; pct: number | null; titulo: string }[] = [];
  alertas: Alerta[] = [];
  verAlerta: Alerta | null = null;
  linea: { c: Colaborador; hora: string; tipo: string }[] = [];
  anillos: { label: string; pct: number; n: number }[] = [];
  top: { nombre: string; contrato: string; pct: number; atrasos: number }[] = [];
  porCargo: { label: string; a: number; i: number; texto: string }[] = [];
  porArea: Barra[] = [];
  mapaRecintos: Recinto[] = [];
  puntos: PuntoMapa[] = [];
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService, route: ActivatedRoute) {
    const q = Number(route.snapshot.queryParamMap.get('recinto'));
    if (q) ca.setFiltro({ recintoId: q });
    this.sub = ca.cambios$.subscribe(() => this.armar());
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private armar(): void {
    const ca = this.ca, f = ca.filtro.fecha;
    this.fecha = f;
    this.esHoy = f === ca.corte;
    this.mesLabel = parseFecha(f)!.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    const cs = ca.visibles();
    const js = cs.map((c) => ca.jornada(c.id, f));
    const esperados = js.filter((j) => ca.esperado(j) || j.entrada);
    const asistencia = js.filter((j) => j.entrada).length;
    // Overtime of the month vs the same days of the previous month.
    const ids = new Set(cs.map((c) => c.id));
    const dia = +f.slice(0, 2), mes = f.slice(3);
    const dPrev = parseFecha(f)!; dPrev.setDate(1); dPrev.setMonth(dPrev.getMonth() - 1);
    const mesPrev = `${String(dPrev.getMonth() + 1).padStart(2, '0')}/${dPrev.getFullYear()}`;
    const sumar = (m: string) => ca.excesos().filter((e) => ids.has(e.colaboradorId) && e.fecha.slice(3) === m && +e.fecha.slice(0, 2) <= dia).reduce((s, e) => s + e.minutos, 0);
    const act = sumar(mes), prev = sumar(mesPrev);
    const delta = prev ? Math.round(((act - prev) / prev) * 100) : 0;
    this.kpi = {
      trabajando: js.filter((j) => j.trabajando).length, asistencia, esperados: esperados.length,
      pct: esperados.length ? Math.round((asistencia / esperados.length) * 100) : 0, atrasos: js.filter((j) => j.atraso).length,
      hhee: `${dur(act)} h`, delta, deltaTexto: prev ? `${delta > 0 ? '↑' : delta < 0 ? '↓' : ''}${Math.abs(delta)} % frente al mismo corte del mes anterior` : 'Sin datos del mes anterior',
    };
    const diasMes = rangoFechas(`01/${mes}`, f);
    this.comparativo = diasMes.map((d) => {
      const pct = ca.porcentajeAsistencia(cs, d);
      return { fecha: d, dia: d.slice(0, 2), dow: DIAS_CORTOS[diaSemana(d)], pct, titulo: `${d}: ${pct == null ? 'sin turnos' : pct + ' % de asistencia'}` };
    });
    this.alertas = ca.alertas(cs, f);
    this.linea = cs.map((c) => ({ c, m: ca.marcasDe(c.id, f) })).filter((x) => x.m.length)
      .map((x) => ({ c: x.c, hora: x.m[x.m.length - 1].hora, tipo: x.m[x.m.length - 1].tipo }))
      .sort((a, b) => b.hora.localeCompare(a.hora));
    // Month figures per collaborator.
    const stats = cs.map((c) => {
      let esp = 0, asis = 0, ina = 0, atr = 0;
      for (const d of diasMes) {
        const j = ca.jornada(c.id, d);
        if (ca.esperado(j) || j.entrada) esp++;
        if (j.entrada) asis++;
        if (j.estado === 'Inasistencia') ina++;
        if (j.atraso) atr++;
      }
      return { c, esp, asis, ina, atr, pct: esp ? Math.round((asis / esp) * 100) : 0 };
    });
    const grupo = (clave: (c: Colaborador) => string) => {
      const m = new Map<string, typeof stats>();
      for (const s of stats) { const k = clave(s.c); m.set(k, [...(m.get(k) ?? []), s]); }
      return [...m.entries()];
    };
    this.anillos = grupo((c) => ca.contrato(c.id)).map(([label, l]) => {
      const esp = l.reduce((s, x) => s + x.esp, 0), asis = l.reduce((s, x) => s + x.asis, 0);
      return { label, n: l.length, pct: esp ? Math.round((asis / esp) * 100) : 0 };
    });
    this.top = [...stats].filter((s) => s.esp).sort((a, b) => b.pct - a.pct || a.atr - b.atr).slice(0, 10)
      .map((s) => ({ nombre: `${s.c.apellidos}, ${s.c.nombres}`, contrato: ca.contrato(s.c.id), pct: s.pct, atrasos: s.atr }));
    const maxCargo = Math.max(1, ...grupo((c) => c.cargo).map(([, l]) => l.reduce((s, x) => s + x.asis + x.ina, 0)));
    this.porCargo = grupo((c) => c.cargo).map(([label, l]) => {
      const a = l.reduce((s, x) => s + x.asis, 0), i = l.reduce((s, x) => s + x.ina, 0);
      return { label, a: (a / maxCargo) * 100, i: (i / maxCargo) * 100, texto: `${a} / ${i}` };
    }).sort((x, y) => y.a + y.i - (x.a + x.i)).slice(0, 8);
    this.porArea = grupo((c) => c.area).map(([label, l]) => {
      const esp = l.reduce((s, x) => s + x.esp, 0), asis = l.reduce((s, x) => s + x.asis, 0);
      const pct = esp ? Math.round((asis / esp) * 100) : 0;
      return { label, valor: pct, texto: `${pct} %` };
    }).sort((a, b) => b.valor - a.valor);
    const rid = ca.filtro.recintoId;
    this.mapaRecintos = ca.recintos$.value.filter((r) => (rid ? r.id === rid : r.activo));
    this.puntos = cs.flatMap((c) => ca.marcasDe(c.id, f).filter((m) => m.metodo === 'App' || m.metodo === 'QR')
      .map((m) => ({ lat: m.lat, lng: m.lng, color: m.tipo === 'Entrada' ? 'var(--nx-success-500)' : 'var(--nx-orange)', label: `${c.apellidos}, ${c.nombres} · ${m.tipo} ${m.hora}` })));
  }
}
