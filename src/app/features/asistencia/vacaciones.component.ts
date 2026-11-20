import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, diasCalendario } from '../../core/asistencia.service';
import { parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { Vacacion } from '../../core/sample/asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const SALDO_COLS: Column[] = [
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.5fr)' },
  { key: 'd', label: 'N° de documento', w: 'minmax(120px, 0.8fr)' },
  { key: 'a', label: 'Área', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'i', label: 'Fecha de ingreso', type: 'date', w: 'minmax(130px, 0.8fr)' },
  { key: 'si', label: 'Saldo inicial', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'dv', label: 'Devengados', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'tm', label: 'Tomados', type: 'number', filter: 'none', w: 'minmax(100px, 0.6fr)' },
  { key: 'pg', label: 'Programados', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 's', label: 'Saldo (días)', type: 'badge', filter: 'none', w: 'minmax(110px, 0.7fr)' },
];

const REG_COLS: Column[] = [
  { key: 'id', label: 'ID', w: '80px' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.4fr)' },
  { key: 'de', label: 'Desde', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'ha', label: 'Hasta', type: 'date', filter: 'date', w: 'minmax(110px, 0.7fr)' },
  { key: 'n', label: 'Días', type: 'number', filter: 'none', w: '80px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.7fr)' },
  { key: 'o', label: 'Origen', filter: 'select', w: 'minmax(130px, 0.8fr)' },
  { key: 'ob', label: 'Observación', w: 'minmax(180px, 1.2fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];

/** Administrativo › Asistencia › Vacaciones: balances (30 calendar days per year) and vacation records. */
@Component({
  selector: 'app-vacaciones',
  templateUrl: './vacaciones.component.html'
})
export class VacacionesComponent implements OnDestroy {
  readonly saldoCols = SALDO_COLS;
  readonly regCols = REG_COLS;
  readonly regActions: RowAction[] = ['eliminar'];
  tab = 0;
  saldoRows: Row[] = [];
  regRows: Row[] = [];
  colaboradores: Colaborador[] = [];
  stats = { saldoTotal: 0, sobre30: 0, hoy: 0, proximas: 0 };

  modal: { colaboradorId: number | null; desde: string; hasta: string; observacion: string } | null = null;
  intento = false;
  borrar: Vacacion | null = null;
  private sub: Subscription;

  constructor(data: HrDataService, public asis: AsistenciaService, public ui: UiStateService) {
    this.sub = combineLatest([data.colaboradores(), asis.vacaciones$]).subscribe(([cs, vs]) => {
      this.colaboradores = cs;
      this.refrescar(vs);
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private col(id: number): Colaborador | undefined { return this.colaboradores.find((c) => c.id === id); }
  private nombre(c: Colaborador): string { return `${c.apellidos}, ${c.nombres}`; }

  private refrescar(vs: Vacacion[]): void {
    const corte = parseFecha(this.asis.corte)!;
    const en30 = new Date(corte.getTime() + 30 * 86_400_000);
    const saldos = this.colaboradores.map((c) => ({ c, s: this.asis.saldo(c) }));
    this.stats = {
      saldoTotal: Math.round(saldos.reduce((t, x) => t + Math.max(0, x.s), 0) * 100) / 100,
      sobre30: saldos.filter((x) => x.s > this.asis.config.umbralSaldo).length,
      hoy: vs.filter((v) => parseFecha(v.desde)! <= corte && parseFecha(v.hasta)! >= corte).length,
      proximas: vs.filter((v) => parseFecha(v.desde)! > corte && parseFecha(v.desde)! <= en30).length,
    };
    this.saldoRows = saldos.map(({ c, s }) => ({
      id: c.id, c: { text: this.nombre(c), link: `/admin/colaboradores/ficha/${c.id}` }, d: c.documento, a: c.area, i: c.ingreso,
      si: this.asis.saldoInicial(c), dv: Math.round((this.asis.devengado(c) - this.asis.saldoInicial(c)) * 100) / 100, tm: this.asis.tomados(c.id), pg: this.asis.programados(c.id),
      s: { text: s.toFixed(2), tone: s > this.asis.config.umbralSaldo ? 'danger' : s < 0 ? 'warning' : 'neutral' },
    }));
    this.regRows = [...vs].sort((a, b) => parseFecha(b.desde)!.getTime() - parseFecha(a.desde)!.getTime()).map((v) => {
      const c = this.col(v.colaboradorId);
      const d = parseFecha(v.desde)!, h = parseFecha(v.hasta)!;
      const estado = h < corte ? 'Tomadas' : d > corte ? 'Programadas' : 'En curso';
      return {
        id: v.id, c: c ? { text: this.nombre(c), link: `/admin/colaboradores/ficha/${c.id}` } : '—', de: v.desde, ha: v.hasta, n: v.dias,
        e: { text: estado, tone: estado === 'En curso' ? 'info' : estado === 'Programadas' ? 'warning' : 'success' },
        o: v.origen, ob: v.observacion || '—', x: '',
      };
    });
  }

  // --- Registrar ------------------------------------------------------------
  abrir(): void { this.intento = false; this.modal = { colaboradorId: null, desde: '', hasta: '', observacion: '' }; }

  get seleccionado(): Colaborador | undefined { return this.modal?.colaboradorId != null ? this.col(+this.modal.colaboradorId) : undefined; }
  get dias(): number { return this.modal ? diasCalendario(this.modal.desde.trim(), this.modal.hasta.trim()) : 0; }

  /** First problem with the form, or '' when it can be saved. */
  get error(): string {
    const m = this.modal, c = this.seleccionado;
    if (!m || !c) return 'Selecciona un colaborador.';
    const d = parseFecha(m.desde.trim()), h = parseFecha(m.hasta.trim());
    if (!d || !h) return 'Usa el formato DD/MM/YYYY en las fechas.';
    if (d > h) return 'La fecha “Desde” debe ser anterior o igual a “Hasta”.';
    if (!this.asis.cumplioRecord(c)) return `${c.nombres} aún no cumple un año de servicio (ingresó el ${c.ingreso}).`;
    if (!this.asis.config.permitirAdelanto && this.dias > this.asis.saldo(c)) return `Son ${this.dias} días y el saldo disponible es ${this.asis.saldo(c)} días.`;
    return this.asis.conflicto(c.id, m.desde.trim(), m.hasta.trim());
  }

  guardar(): void {
    this.intento = true;
    const m = this.modal, c = this.seleccionado;
    if (!m || !c || this.error) return;
    const v = this.asis.registrarVacacion(c, m.desde.trim(), m.hasta.trim(), 'Registro manual', m.observacion.trim());
    this.modal = null;
    this.tab = 1;
    this.ui.toast(`Vacaciones #${v.id} registradas: ${v.dias} días para ${c.nombres} ${c.apellidos.split(' ')[0]}`);
  }

  onAction(action: RowAction, row: Row): void {
    if (action === 'eliminar') this.borrar = this.asis.vacaciones$.value.find((v) => v.id === row.id) ?? null;
  }

  confirmarBorrar(): void {
    const v = this.borrar, c = v && this.col(v.colaboradorId);
    if (!v || !c) return;
    this.asis.eliminarVacacion(v, c);
    this.borrar = null;
    this.ui.toast(`Vacaciones #${v.id} eliminadas; se devolvieron ${v.dias} días al saldo`);
  }
}
