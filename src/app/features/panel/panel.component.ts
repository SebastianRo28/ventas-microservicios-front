import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ControlAsistenciaService, dur } from '../../core/control-asistencia.service';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador, PeriodoPlanilla, PeriodoRem, Serie } from '../../core/models';
import { AsistenciaService } from '../../core/asistencia.service';
import { LicenciaMedica } from '../../core/sample/asistencia';
import { PeriodoService, nombreMes } from '../../core/periodo.service';
import { Subscription, combineLatest } from 'rxjs';

const W = 480, H = 180, PAD = 20;
const AVATAR_BG = ['var(--nx-yellow)', 'var(--nx-success-200)', 'var(--nx-info-bg)', 'var(--nx-danger-200)', 'var(--nx-orange-200)', 'var(--nx-primary-tint)'];

/** Employer cost of a payroll period (income + contributions), or "—" when there is none. */
const costo = (x?: PeriodoPlanilla) => x?.boletas ? 'S/ ' + (x.ingresos + x.aportes).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

interface Kpi { title: string; icon: string; sub: string; values: [string, string][]; }
interface Point { x: number; y: number; left: string; mes: string; aria: string; }

/** P-01.1 Panel de Control. */
@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html'
})
export class PanelComponent implements OnDestroy {
  kpis: Kpi[] = [];
  periodos: PeriodoRem[] = [];
  open = new Set<number>([0]);

  meses: string[] = [];
  series: Serie[] = [];
  tab = 0;
  hover: number | null = null;
  chart = { line: '', area: '', pts: [] as Point[], max: '' };

  nuevos: { id: number; nombre: string; ini: string; ingreso: string; bg: string }[] = [];

  /** Same screen serves Administrativo (P-01.1) and Remuneraciones (P-03.1); the route sets the crumbs. */
  crumbs: string[];

  private sub: Subscription;

  constructor(public data: HrDataService, route: ActivatedRoute, private ca: ControlAsistenciaService, public per: PeriodoService,
              private asis: AsistenciaService) {
    this.crumbs = route.snapshot.data['crumbs'] ?? ['Administrativo'];
    // The "today" figures use the attendance cut-off day; the monthly ones the topbar period and the payroll periods.
    this.sub = combineLatest([per.seleccionado$, data.colaboradores(), per.periodos$, asis.licencias$]).subscribe(([p, cs, ps, lic]) => {
      this.armarKpis(p, cs, ps);
      this.armarProcesos(ps);
      this.armarSeries(p, cs, ps, lic);
    });
    data.colaboradores().subscribe((list) => {
      const key = (d: string) => d.split('/').reverse().join('');
      this.nuevos = [...list].sort((a, b) => key(b.ingreso).localeCompare(key(a.ingreso))).slice(0, 6)
        .map((c, i) => ({
          id: c.id, nombre: `${c.apellidos}, ${c.nombres}`, ingreso: c.ingreso, bg: AVATAR_BG[i % AVATAR_BG.length],
          ini: (c.nombres[0] + c.apellidos[0]).toUpperCase()
        }));
    });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private armarKpis(p: string, cs: Colaborador[], ps: PeriodoPlanilla[]): void {
    const ca = this.ca;
    const hoy = ca.colaboradores.map((c) => ca.jornada(c.id, ca.corte));
    const asisHoy = `${hoy.filter((j) => j.entrada).length} / ${hoy.filter((j) => ca.esperado(j) || j.entrada).length}`;
    const hheeMes = ca.excesos().filter((e) => ca.periodoDe(e.fecha) === p).reduce((sum, e) => sum + e.minutos, 0);
    // Hires of the month from the current collaborators' start date ("dd/MM/yyyy" ends with "MM/yyyy").
    const entradas = cs.filter((c) => c.ingreso?.slice(3) === p).length;
    this.kpis = [
      // Active jobs (current collaborators) and the employer cost of the period's payroll (income + contributions).
      { title: 'Empresa', icon: 'building', sub: this.data.empresa, values: [['Trabajos', String(cs.length)], ['Gasto', costo(ps.find((x) => x.periodo === p))]] },
      // Summary of Control de Asistencia › Panel de Control (P-04.1) for the cut-off day and the period.
      { title: 'Asistencia', icon: 'calendar', sub: `Hoy, ${ca.corte}`, values: [['Asistencia', asisHoy], [`Horas extra de ${nombreMes(p).toLowerCase()}`, `${dur(hheeMes)} h`]] },
      { title: 'Rotación', icon: 'trend', sub: nombreMes(p), values: [['Entradas', String(entradas)], ['Salidas', '0']] },
      { title: 'Asistencia', icon: 'calendar', sub: `Hoy, ${ca.corte}`, values: [['Licencias', String(hoy.filter((j) => j.estado === 'Licencia').length)], ['Permisos', String(hoy.filter((j) => j.estado === 'Permiso').length)]] },
    ];
  }

  /** Last four payroll periods with their process (payslips, state and payment date). */
  private armarProcesos(ps: PeriodoPlanilla[]): void {
    this.periodos = ps.slice(0, 4).map((x) => {
      const [mm, yyyy] = x.periodo.split('/');
      const estado = x.cerrado ? 'Cerrado' : x.procesadoEn ? 'Procesado' : 'Iniciado';
      return {
        label: `${nombreMes(x.periodo).split(' ')[0]} ’${yyyy.slice(2)}`, abierto: !x.cerrado,
        procesos: [{ nombre: `Pago Proceso ${nombreMes(x.periodo)}`, estado, tone: x.cerrado ? 'gray' : x.procesadoEn ? 'success' : 'info',
          colaboradores: x.boletas, fechaPago: `${new Date(+yyyy, +mm, 0).getDate()}/${mm}/${yyyy}` }],
      };
    });
  }

  /** Six months up to the period: headcount (payslips, or current staff by start date), cost, overtime and medical leaves. */
  private armarSeries(p: string, cs: Colaborador[], ps: PeriodoPlanilla[], lic: LicenciaMedica[]): void {
    const [mm, yyyy] = p.split('/').map(Number);
    const meses = Array.from({ length: 6 }, (_, i) => new Date(yyyy, mm - 6 + i, 1));
    const clave = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const num = (f: string) => { const [d, m, y] = f.split('/').map(Number); return y * 10000 + m * 100 + d; };
    const valores = meses.map((d) => {
      const k = clave(d), per = ps.find((x) => x.periodo === k);
      const ini = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + 1, fin = ini + 30;
      return {
        colaboradores: per?.boletas || cs.filter((c) => c.ingreso && num(c.ingreso) <= fin).length,
        gasto: per ? Math.round((per.ingresos + per.aportes) * 100) / 100 : 0,
        horas: Math.round(this.ca.excesos().filter((e) => this.ca.periodoDe(e.fecha) === k).reduce((s, e) => s + e.minutos, 0) / 6) / 10,
        licencias: lic.filter((l) => num(l.desde) <= fin && num(l.hasta) >= ini).length,
      };
    });
    this.meses = meses.map((d) => `${nombreMes(clave(d)).slice(0, 3)} ${d.getFullYear()}`);
    this.series = [
      { titulo: 'Colaboradores', valores: valores.map((v) => v.colaboradores), formato: 'int' },
      { titulo: 'Gastos', valores: valores.map((v) => v.gasto), formato: 'money' },
      { titulo: 'Horas Extras', valores: valores.map((v) => v.horas), formato: 'hours' },
      { titulo: 'Licencias', valores: valores.map((v) => v.licencias), formato: 'int' },
    ];
    this.draw();
  }

  toggle(i: number): void { this.open.has(i) ? this.open.delete(i) : this.open.add(i); }

  pickTab(i: number): void { this.tab = i; this.hover = null; this.draw(); }

  format(v: number, s: Serie = this.series[this.tab]): string {
    if (s.formato === 'money') return 'S/ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (s.formato === 'hours') return v.toFixed(1) + ' h';
    return String(v);
  }

  private draw(): void {
    const s = this.series[this.tab];
    if (!s) return;
    const max = Math.max(...s.valores) || 1;
    const n = s.valores.length - 1;
    const xs = s.valores.map((_, i) => PAD + i * (W - 2 * PAD) / n);
    const ys = s.valores.map((v) => H - 4 - (v / max) * (H - 24));
    const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    this.chart = {
      line,
      area: `${line} L${xs[n]} ${H} L${xs[0]} ${H} Z`,
      max: 'Máx. ' + this.format(max, s),
      pts: s.valores.map((v, i) => ({
        x: xs[i], y: ys[i], left: (xs[i] / W * 100) + '%', mes: this.meses[i].split(' ')[0],
        aria: `${this.meses[i]}: ${this.format(v, s)}`
      })),
    };
  }
}
