import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ControlAsistenciaService, dur } from '../../core/control-asistencia.service';
import { HrDataService } from '../../core/hr-data.service';
import { PeriodoRem, Serie } from '../../core/models';

const W = 480, H = 180, PAD = 20;
const AVATAR_BG = ['#F5B400', '#C7F1AF', '#E3EEFF', '#FFD3CC', '#FFE0C2', '#E6EEFF'];

interface Kpi { title: string; icon: string; sub: string; values: [string, string][]; }
interface Point { x: number; y: number; left: string; mes: string; aria: string; }

/** P-01.1 Panel de Control. */
@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html'
})
export class PanelComponent {
  kpis: Kpi[];
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

  constructor(public data: HrDataService, route: ActivatedRoute, ca: ControlAsistenciaService) {
    this.crumbs = route.snapshot.data['crumbs'] ?? ['Administrativo'];
    const p = data.periodo;
    const hoy = ca.colaboradores.map((c) => ca.jornada(c.id, ca.corte));
    const asisHoy = `${hoy.filter((j) => j.entrada).length} / ${hoy.filter((j) => ca.esperado(j) || j.entrada).length}`;
    const hheeMes = ca.excesos().filter((e) => ca.periodoDe(e.fecha) === ca.periodoAbierto).reduce((sum, e) => sum + e.minutos, 0);
    this.kpis = [
      { title: 'Empresa', icon: 'building', sub: data.empresa, values: [['Trabajos', '13'], ['Gasto', 'S/ 213,645.00']] },
      // Summary of Control de Asistencia › Panel de Control (P-04.1) for the cut-off day and month.
      { title: 'Asistencia', icon: 'calendar', sub: `Hoy, ${ca.corte}`, values: [['Asistencia', asisHoy], ['Horas extra del mes', `${dur(hheeMes)} h`]] },
      { title: 'Rotación', icon: 'trend', sub: p, values: [['Entradas', '0'], ['Salidas', '0']] },
      { title: 'Asistencia', icon: 'calendar', sub: `Hoy, ${ca.corte}`, values: [['Licencias', String(hoy.filter((j) => j.estado === 'Licencia').length)], ['Permisos', String(hoy.filter((j) => j.estado === 'Permiso').length)]] },
    ];
    data.periodos().subscribe((ps) => (this.periodos = ps));
    data.series().subscribe(({ meses, series }) => { this.meses = meses; this.series = series; this.draw(); });
    data.colaboradores().subscribe((list) => {
      const key = (d: string) => d.split('/').reverse().join('');
      this.nuevos = [...list].sort((a, b) => key(b.ingreso).localeCompare(key(a.ingreso))).slice(0, 6)
        .map((c, i) => ({
          id: c.id, nombre: `${c.apellidos}, ${c.nombres}`, ingreso: c.ingreso, bg: AVATAR_BG[i % AVATAR_BG.length],
          ini: (c.nombres[0] + c.apellidos[0]).toUpperCase()
        }));
    });
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
