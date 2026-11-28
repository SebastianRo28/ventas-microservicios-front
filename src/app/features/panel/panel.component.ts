import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ControlAsistenciaService, dur } from '../../core/control-asistencia.service';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador, PeriodoPlanilla, PeriodoRem, Serie } from '../../core/models';
import { AsistenciaService } from '../../core/asistencia.service';
import { LicenciaMedica } from '../../core/sample/asistencia';
import { PeriodoService, nombreMes } from '../../core/periodo.service';
import { Subscription, combineLatest } from 'rxjs';
import { ComunicacionService, PublicacionApi } from '../../core/comunicacion.service';

const W = 480, H = 180, PAD = 20;
const AVATAR_BG = ['var(--nx-yellow)', 'var(--nx-success-200)', 'var(--nx-info-bg)', 'var(--nx-danger-200)', 'var(--nx-orange-200)', 'var(--nx-primary-tint)'];

/** Employer cost of a payroll period (income + contributions), or "—" when there is none. */
const soles = (n: number) => 'S/ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const costo = (x?: PeriodoPlanilla) => x?.boletas ? soles(x.ingresos + x.aportes) : '—';
const fechaNum = (f: string) => { const [d, m, y] = f.split('/').map(Number); return new Date(y, m - 1, d).getTime(); };

/** Summary card: big figures (`values`) with a label each; `tone` colors the first one (e.g. a cost increase). */
interface Kpi { title: string; icon: string; sub: string; values: [string, string][]; tone?: 'success' | 'danger'; }
/** Something to fix before paying the payroll, with the screen where it gets fixed. */
interface AlertaPlanilla { texto: string; n: number; ruta: string; tone: 'warning' | 'info'; }
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

  /** Remuneraciones shows the payroll of the period; Administrativo, the company overview. */
  readonly esRem: boolean;
  /** Payroll stages of the period (Remuneraciones): 0 open, 1 processed, 2 closed. */
  readonly etapas = ['Abierto', 'Procesado', 'Cerrado'];
  etapa = 0;
  etapaDetalle = '';
  alertas: AlertaPlanilla[] = [];
  /** Latest published posts of Mi Portal (Administrativo); null while loading. */
  publicaciones: PublicacionApi[] | null = null;

  /** Same screen serves Administrativo (P-01.1) and Remuneraciones (P-03.1); the route sets the crumbs. */
  crumbs: string[];

  private sub: Subscription;

  constructor(public data: HrDataService, route: ActivatedRoute, private ca: ControlAsistenciaService, public per: PeriodoService,
              private asis: AsistenciaService, com: ComunicacionService) {
    this.crumbs = route.snapshot.data['crumbs'] ?? ['Administrativo'];
    this.esRem = this.crumbs[0] === 'Remuneraciones';
    if (!this.esRem) com.muro().subscribe({
      next: (l) => (this.publicaciones = l.filter((x) => x.estado === 'Publicado').slice(0, 3)),
      error: () => (this.publicaciones = []),
    });
    // The "today" figures use the attendance cut-off day; the monthly ones the topbar period and the payroll periods.
    this.sub = combineLatest([per.seleccionado$, data.colaboradores(), per.periodos$, asis.licencias$]).subscribe(([p, cs, ps, lic]) => {
      if (this.esRem) this.armarPlanilla(p, cs, ps); else this.armarKpis(p, cs, ps);
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
      { title: 'Dotación', icon: 'building', sub: this.data.empresa, values: [['Colaboradores', String(cs.length)], ['Costo del mes', costo(ps.find((x) => x.periodo === p))]] },
      // Summary of Control de Asistencia › Panel de Control (P-04.1) for the cut-off day and the period.
      { title: 'Asistencia hoy', icon: 'calendar', sub: ca.corte, values: [['Presentes', asisHoy], ['Horas extra', `${dur(hheeMes)} h`]] },
      { title: 'Rotación', icon: 'trend', sub: nombreMes(p), values: [['Ingresos', String(entradas)], ['Salidas', '0']] },
      { title: 'Ausencias hoy', icon: 'calcheck', sub: ca.corte, values: [['Licencias', String(hoy.filter((j) => j.estado === 'Licencia').length)], ['Permisos', String(hoy.filter((j) => j.estado === 'Permiso').length)]] },
    ];
  }

  /** Remuneraciones: net pay, employer cost, change against the previous month, payment date, stage and alerts. */
  private armarPlanilla(p: string, cs: Colaborador[], ps: PeriodoPlanilla[]): void {
    const per = ps.find((x) => x.periodo === p);
    const [mm, yyyy] = p.split('/').map(Number);
    const ant = ps.find((x) => x.periodo === `${String(mm === 1 ? 12 : mm - 1).padStart(2, '0')}/${mm === 1 ? yyyy - 1 : yyyy}`);
    const procesada = !!per?.boletas;
    const variacion = procesada && ant?.neto ? (per!.neto - ant.neto) / ant.neto * 100 : null;
    const pago = `${new Date(yyyy, mm, 0).getDate()}/${String(mm).padStart(2, '0')}/${yyyy}`;
    const dias = Math.round((fechaNum(pago) - fechaNum(this.ca.corte)) / 86_400_000);
    const mes = nombreMes(p);
    this.kpis = [
      { title: 'Neto a pagar', icon: 'wallet', sub: procesada ? `${per!.boletas} boletas de ${mes.toLowerCase()}` : `${mes} · sin procesar`,
        values: [['Total neto', procesada ? soles(per!.neto) : '—']] },
      { title: 'Costo empleador', icon: 'coins', sub: 'Ingresos más aportes del empleador', values: [['Total', costo(per)]] },
      { title: 'Variación', icon: 'trend', sub: ant ? `Neto frente a ${nombreMes(ant.periodo).toLowerCase()}` : 'Sin mes anterior',
        values: [['Diferencia', variacion === null ? '—' : `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)} %`]],
        tone: variacion === null ? undefined : variacion > 0 ? 'danger' : 'success' },
      { title: 'Fecha de pago', icon: 'calendar',
        sub: per?.cerrado ? 'Planilla cerrada' : dias > 0 ? `Faltan ${dias} días` : dias === 0 ? 'Es hoy' : `Venció hace ${-dias} días`,
        values: [['Último día del mes', pago]] },
    ];
    this.etapa = per?.cerrado ? 2 : per?.procesadoEn ? 1 : 0;
    this.etapaDetalle = per?.cerrado ? `Cerrada el ${per.cerradoEn}${per.cerradoPor ? ' por ' + per.cerradoPor : ''}.`
      : per?.procesadoEn ? `Procesada el ${per.procesadoEn}${per.procesadoPor ? ' por ' + per.procesadoPor : ''}. Revisa las boletas y cierra el período.`
      : 'Aún no se procesa. Procesa la planilla para calcular las boletas.';
    // Data that would make a payslip wrong or a transfer fail.
    const sinBanco = cs.filter((c) => !c.detalle?.banco && c.detalle?.formaPago !== 'Efectivo').length;
    const sinPension = cs.filter((c) => !c.detalle?.pension).length;
    const sinSueldo = cs.filter((c) => !(c.detalle?.sueldoBase || c.sueldoNeto)).length;
    const alertas: AlertaPlanilla[] = [];
    if (!per?.procesadoEn) alertas.push({ texto: `La planilla de ${mes.toLowerCase()} aún no se procesa`, n: 0, ruta: '/rem/procesos', tone: 'info' });
    if (sinBanco) alertas.push({ texto: 'Colaboradores sin banco para el abono', n: sinBanco, ruta: '/admin/colaboradores/vigentes', tone: 'warning' });
    if (sinPension) alertas.push({ texto: 'Colaboradores sin régimen pensionario', n: sinPension, ruta: '/admin/colaboradores/vigentes', tone: 'warning' });
    if (sinSueldo) alertas.push({ texto: 'Colaboradores sin sueldo registrado', n: sinSueldo, ruta: '/admin/colaboradores/vigentes', tone: 'warning' });
    this.alertas = alertas;
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
    const gastos: Serie = { titulo: 'Gastos', valores: valores.map((v) => v.gasto), formato: 'money' };
    const dotacion: Serie = { titulo: 'Colaboradores', valores: valores.map((v) => v.colaboradores), formato: 'int' };
    this.series = [
      // Remuneraciones opens on the payroll cost; Administrativo on the headcount.
      ...(this.esRem ? [gastos, dotacion] : [dotacion, gastos]),
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
