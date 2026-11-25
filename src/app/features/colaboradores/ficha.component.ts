import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { ControlAsistenciaService, dur, Jornada, rangoFechas, sumarDias } from '../../core/control-asistencia.service';
import { HrDataService } from '../../core/hr-data.service';
import { antiguedad, iniciales, parseFecha, soles } from '../../core/format';
import { Boleta, Colaborador } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';

const TABS = ['Resumen', 'Boletas de Pago', 'Documentos', 'Historia', 'Bitácora', 'Asistencia', 'Ítems', 'Vacaciones', 'Talento', 'Capacitaciones', 'Activos'];
const DROP = new Set(['Asistencia', 'Talento', 'Ítems']);

interface Field { label: string; value: string; link?: string; action?: string; }
interface Bars { title: string; unit: string; values: number[]; fmt: (n: number) => string; }

/** P-01.7 Ficha del Colaborador (admin) and Mi ficha (collaborator view). */
import { PortalService } from '../../core/portal.service';
@Component({
  selector: 'app-ficha',
  templateUrl: './ficha.component.html'
})
export class FichaComponent implements OnDestroy {
  readonly tabs = TABS;
  readonly drop = DROP;
  readonly soles = soles;
  /** Mi ficha hides admin actions and shows "Actualizar Datos". */
  readonly colabView: boolean;
  tab = 0;
  terminarOpen = false;
  open = new Set(['info']);

  c?: Colaborador;
  notFound = false;
  ini = '';
  info: Field[] = [];
  educacion: Field[] = [];
  prevision: Field[] = [];
  trabajo: Field[] = [];
  boletas: Boleta[] = [];
  /** Payslip open in the detail modal. */
  boletaVer: number | null = null;
  meses: string[] = [];
  charts: Bars[] = [];
  private sub: Subscription;

  /**
   * "Usuario" row: in Mi ficha it is the signed-in account; administrators see the linked account (from the API) and
   * a link to Usuarios to manage or create it. Other roles see nothing (they cannot list accounts).
   */
  private campoUsuario(c: Colaborador): Field {
    if (this.colabView) return { label: 'Usuario', value: this.portal.yoCorreo || '—' };
    const campo: Field = { label: 'Usuario', value: '…' };
    if (!this.portal.puedeVer('/configuracion/usuarios')) { campo.value = '—'; return campo; }
    this.data.usuarios().subscribe({
      next: (us) => {
        const u = us.find((x) => x.colaboradorId === c.id);
        campo.value = u ? `${u.correo}${u.activo ? '' : ' (inactivo)'}` : 'Sin usuario';
        campo.action = u ? 'administrar' : 'crear';
        campo.link = '/configuracion/usuarios';
      },
      error: () => (campo.value = '—'),
    });
    return campo;
  }

  constructor(route: ActivatedRoute, private data: HrDataService, private asistencia: AsistenciaService, public ui: UiStateService, public ca: ControlAsistenciaService, private portal: PortalService) {
    this.colabView = !!route.snapshot.data['colabView'];
    this.sub = route.paramMap.pipe(
      switchMap((p) => data.colaborador(this.colabView ? portal.yoId : Number(p.get('id'))))
    ).subscribe((c) => this.load(c));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  // --- Asistencia tab (P-01.11): summary and card from Control de Asistencia --------------------------------------
  asisSub: 'Resumen' | 'Tarjeta' = 'Resumen';
  readonly dur = dur;
  get asisResumen() { return this.c ? this.ca.resumen(this.c.id, `01/${this.ca.corte.slice(3)}`, this.ca.corte) : null; }
  get asisSemana(): Jornada[] { return this.c ? rangoFechas(sumarDias(this.ca.corte, -13), this.ca.corte).reverse().map((f) => this.ca.jornada(this.c!.id, f)) : []; }
  get asisTurno(): string {
    const a = this.c ? this.ca.asignacionVigente(this.c.id, this.ca.corte) : undefined;
    const t = a ? this.ca.turno(a.turnoId) : undefined;
    return t ? `${t.nombre} (${t.sigla}) · ${this.ca.horarioTurno(t)} · colación ${t.colacion} min` : 'Sin turno asignado';
  }

  get nombreCompleto(): string { return this.c ? `${this.c.nombres} ${this.c.apellidos}` : ''; }

  toggle(k: string): void { this.open.has(k) ? this.open.delete(k) : this.open.add(k); }

  private load(c?: Colaborador): void {
    this.c = c;
    this.notFound = !c;
    if (!c) return;
    const d = c.detalle ?? {};
    const dash = (v?: string | number | null) => (v === undefined || v === null || v === '' ? '—' : String(v));
    const nac = parseFecha(d.nacimiento);
    const ingreso = parseFecha(c.ingreso);
    // "Today" for age and seniority: the attendance cut-off date (the real date outside development).
    const HOY = parseFecha(this.asistencia.corte) ?? new Date();
    const edad = nac ? Math.floor((HOY.getTime() - nac.getTime()) / (365.25 * 864e5)) : null;

    this.ini = iniciales(c.nombres, c.apellidos);
    this.info = [
      { label: 'Identificación', value: `${d.tipoDocumento ?? 'DNI'} ${c.documento}` },
      { label: 'Correo Corporativo', value: dash(d.emailCorporativo) },
      { label: 'Teléfono Particular', value: dash(d.telefono) },
      { label: 'Cumpleaños', value: d.nacimiento ? `${d.nacimiento} (${edad} años)` : '—' },
      { label: 'Dirección', value: dash(d.direccion) },
      { label: 'Fecha de Ingreso', value: c.ingreso },
      this.campoUsuario(c),
      { label: 'Beneficios', value: 'Puntos disponibles: 1,200', action: 'Añadir Puntos' },
    ];
    this.educacion = [
      { label: 'Carrera', value: dash(d.carrera) },
      { label: 'Institución', value: dash(d.institucion) },
    ];
    this.prevision = [
      { label: 'Plan de salud', value: dash(d.planSalud) },
      { label: 'Régimen pensionario', value: dash(d.pension) },
      { label: 'CUSPP', value: dash(d.cuspp) },
      { label: 'Banco', value: dash(d.banco) },
      { label: 'Forma de pago', value: dash(d.formaPago) },
    ];
    this.trabajo = [
      { label: 'Cargo', value: c.cargo },
      { label: 'Área', value: `${c.area} (${c.division})` },
      { label: 'División', value: c.division },
      { label: 'Empresa', value: this.data.empresa },
      { label: 'Supervisor', value: dash(d.supervisor), link: d.supervisor ? '/admin/colaboradores/vigentes' : undefined },
      { label: 'Equipo', value: '0 colaboradores' },
      { label: 'Suplente', value: 'Sin suplencia', action: 'agregar' },
      // Net pay is only known once payroll has been processed; until then it equals the base.
      { label: 'Sueldo Base', value: !d.sueldoBase ? `Líquido: ${soles(c.sueldoNeto)}`
        : d.sueldoBase === c.sueldoNeto ? soles(d.sueldoBase) : `${soles(d.sueldoBase)} (Líquido: ${soles(c.sueldoNeto)})` },
      { label: 'Tipo Contrato', value: dash(d.contrato) },
      { label: 'Jornada Laboral', value: dash(d.jornada) },
      { label: 'Fecha Ingreso Compañía', value: ingreso ? `${c.ingreso} · ${antiguedad(ingreso, HOY)}` : c.ingreso },
      { label: 'Sindicalizado', value: dash(d.sindicalizado) },
      { label: 'Saldo Vacaciones', value: `${this.asistencia.saldo(c)} días`, link: '/admin/asistencia/vacaciones' },
    ];
    this.data.boletas(c.id).subscribe((bs) => (this.boletas = bs));
    this.armarAsistencia(c.id);
  }

  /**
   * Last six months up to the attendance cut-off: days not worked (absences, medical leaves and vacations in each month)
   * and overtime hours, from Asistencia and Control de Asistencia.
   */
  private armarAsistencia(id: number): void {
    const corte = parseFecha(this.asistencia.corte) ?? new Date();
    const meses = Array.from({ length: 6 }, (_, i) => new Date(corte.getFullYear(), corte.getMonth() - 5 + i, 1));
    const rangos = [...this.asistencia.ausencias$.value, ...this.asistencia.licencias$.value, ...this.asistencia.vacaciones$.value]
      .filter((x) => x.colaboradorId === id).map((x) => [parseFecha(x.desde), parseFecha(x.hasta)] as const)
      .filter((r): r is readonly [Date, Date] => !!r[0] && !!r[1]);
    const dias = meses.map((m) => {
      const fin = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return rangos.reduce((s, [d, h]) => {
        const a = d > m ? d : m, b = h < fin ? h : fin;
        return s + (b >= a ? Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1 : 0);
      }, 0);
    });
    const clave = (m: Date) => `${String(m.getMonth() + 1).padStart(2, '0')}/${m.getFullYear()}`;
    const horas = meses.map((m) => Math.round(this.ca.excesos().filter((e) => e.colaboradorId === id && this.ca.periodoDe(e.fecha) === clave(m))
      .reduce((s, e) => s + e.minutos, 0) / 6) / 10);
    this.meses = meses.map((m) => m.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').replace(/^./, (x) => x.toUpperCase()));
    this.charts = [
      { title: 'Días no Trabajados', unit: 'días', values: dias, fmt: (n) => String(n) },
      { title: 'Horas Extras', unit: 'horas', values: horas, fmt: (n) => n.toFixed(1) },
    ];
  }

  barHeight(values: number[], v: number): number {
    const max = Math.max(...values);
    return max ? Math.max(2, Math.round((v / max) * 110)) : 2;
  }

  ariaChart(ch: Bars): string {
    return `${ch.title}: ` + ch.values.map((v, i) => `${this.meses[i]} ${ch.fmt(v)}`).join(', ');
  }
}
