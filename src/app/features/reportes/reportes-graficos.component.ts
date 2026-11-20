import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, diasEnMes } from '../../core/asistencia.service';
import { parseFecha, soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';

interface Barra { label: string; valor: number; texto: string; }
interface Grafico { titulo: string; nota: string; barras: Barra[]; }

/** Reportería › Reportes › Reportes gráficos: charts computed from the live data (headcount, pay, seniority, absences). */
@Component({
  selector: 'app-reportes-graficos',
  template: `
    <app-page-header title="Reportes gráficos" [crumbs]="['Reportería', 'Reportes']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Dotación vigente</span><b>{{ kpi.dotacion }}</b></div>
      <div class="nx-card nx-stat"><span>Sueldo base promedio</span><b>{{ kpi.sueldo }}</b></div>
      <div class="nx-card nx-stat"><span>Antigüedad promedio</span><b>{{ kpi.antiguedad }}</b></div>
      <div class="nx-card nx-stat"><span>Días de ausencia en {{ mes }}</span><b>{{ kpi.ausencia }}</b></div>
    </div>
    <div class="nx-grid nx-grid--2">
      <section *ngFor="let g of graficos" class="nx-card nx-pad" [attr.aria-label]="g.titulo">
        <h2 class="nx-section__title">{{ g.titulo }}</h2>
        <p class="nx-muted nx-small nx-mt-0">{{ g.nota }}</p>
        <div role="list">
          <div *ngFor="let b of g.barras" class="nx-hbar" role="listitem">
            <span class="nx-hbar__label" [title]="b.label">{{ b.label }}</span>
            <span class="nx-hbar__track"><span class="nx-hbar__fill" [style.width.%]="pct(g, b)"></span></span>
            <span class="nx-hbar__value">{{ b.texto }}</span>
          </div>
        </div>
        <p *ngIf="!g.barras.length" class="nx-muted nx-small">Sin datos.</p>
      </section>
    </div>
  `
})
export class ReportesGraficosComponent implements OnDestroy {
  graficos: Grafico[] = [];
  kpi = { dotacion: 0, sueldo: '', antiguedad: '', ausencia: 0 };
  readonly mes: string;
  private sub: Subscription;

  constructor(data: HrDataService, private asis: AsistenciaService) {
    this.mes = parseFecha(asis.corte)!.toLocaleDateString('es-PE', { month: 'long' }).toLowerCase();
    this.sub = combineLatest([data.colaboradores(), asis.ausencias$, asis.vacaciones$]).subscribe(([cs]) => this.armar(cs));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  pct(g: Grafico, b: Barra): number { const max = Math.max(...g.barras.map((x) => x.valor), 1); return Math.round((b.valor / max) * 100); }

  private armar(cs: Colaborador[]): void {
    const corte = parseFecha(this.asis.corte)!;
    const anios = (c: Colaborador) => (corte.getTime() - parseFecha(c.ingreso)!.getTime()) / (365.25 * 86_400_000);
    const contar = <T>(lista: T[], clave: (x: T) => string, orden?: string[]): Barra[] => {
      const m = new Map<string, number>();
      for (const x of lista) m.set(clave(x), (m.get(clave(x)) ?? 0) + 1);
      const keys = orden ? orden.filter((k) => m.has(k)) : [...m.keys()].sort((a, b) => m.get(b)! - m.get(a)!);
      return keys.map((k) => ({ label: k, valor: m.get(k)!, texto: `${m.get(k)} (${Math.round((m.get(k)! / lista.length) * 100)}%)` }));
    };
    const RANGOS = ['Menos de S/ 2,500', 'S/ 2,500 – 4,999', 'S/ 5,000 – 7,999', 'S/ 8,000 – 11,999', 'S/ 12,000 o más'];
    const rango = (n: number) => RANGOS[n < 2500 ? 0 : n < 5000 ? 1 : n < 8000 ? 2 : n < 12000 ? 3 : 4];
    const TRAMOS = ['Menos de 1 año', '1 a 2 años', '2 a 5 años', 'Más de 5 años'];
    const tramo = (a: number) => TRAMOS[a < 1 ? 0 : a < 2 ? 1 : a < 5 ? 2 : 3];

    const y = corte.getFullYear(), m = corte.getMonth();
    const porTipo = new Map<string, number>();
    for (const a of this.asis.ausencias$.value) {
      const d = diasEnMes(a.desde, a.hasta, y, m);
      if (d) porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + d);
    }
    const divisiones = [...new Set(cs.map((c) => c.division))];
    const saldoDiv = divisiones.map((d) => {
      const g = cs.filter((c) => c.division === d);
      const prom = g.reduce((s, c) => s + this.asis.saldo(c), 0) / g.length;
      return { label: d, valor: Math.round(prom * 10) / 10, texto: `${(Math.round(prom * 10) / 10).toFixed(1)} días` };
    }).sort((a, b) => b.valor - a.valor);

    this.graficos = [
      { titulo: 'Dotación por área', nota: 'Colaboradores vigentes en cada área.', barras: contar(cs, (c) => c.area) },
      { titulo: 'Distribución por sueldo base', nota: 'Sueldo base mensual (o el monto en planilla cuando no hay sueldo base registrado).',
        barras: contar(cs, (c) => rango(this.asis.base(c)), RANGOS) },
      { titulo: 'Antigüedad', nota: `Tiempo en la empresa al ${this.asis.corte}.`, barras: contar(cs, (c) => tramo(anios(c)), TRAMOS) },
      { titulo: `Días de ausencia en ${this.mes} por tipo`, nota: 'Días calendario dentro del mes, según Gestión de Ausencia.',
        barras: [...porTipo].sort((a, b) => b[1] - a[1]).map(([label, valor]) => ({ label, valor, texto: `${valor} ${valor === 1 ? 'día' : 'días'}` })) },
      { titulo: 'Saldo de vacaciones promedio por división', nota: `Saldo al ${this.asis.corte}, descontando los días ya programados.`, barras: saldoDiv },
    ];
    const total = cs.reduce((s, c) => s + this.asis.base(c), 0);
    const ant = cs.reduce((s, c) => s + anios(c), 0) / (cs.length || 1);
    this.kpi = {
      dotacion: cs.length, sueldo: soles(Math.round((total / (cs.length || 1)) * 100) / 100),
      antiguedad: `${ant.toFixed(1)} años`, ausencia: [...porTipo.values()].reduce((s, v) => s + v, 0),
    };
  }
}
