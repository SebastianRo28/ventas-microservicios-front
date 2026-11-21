import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { AsignacionDetalle, AsignacionSstApi, CumplimientoSst, SstService } from '../../core/sst.service';
import { ESTADO_EVIDENCIA_TONE } from '../../core/sample/sst';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const VER: Column = { key: 'x', label: 'Ver', type: 'actions', filter: 'none', sortable: false, w: '70px' };
const COLS: Column[] = [
  { key: 'n', label: 'Nombre del requisito', w: 'minmax(220px, 1.6fr)' },
  { key: 'c', label: 'Cumplimiento asociado', filter: 'select', w: 'minmax(190px, 1.3fr)' },
  { key: 'a', label: 'Aplica a', filter: 'select', w: '130px' },
  { key: 'vg', label: 'Vigencia', filter: 'none', w: '110px' },
  { key: 'na', label: 'N° de asignaciones', type: 'number', filter: 'none', w: '150px' },
  { key: 'ns', label: 'N° de asignaciones sin evidencias', type: 'number', filter: 'none', w: '200px' },
  { key: 'ev', label: 'Evidencias vigentes', type: 'number', filter: 'none', w: '150px' },
  { key: 'pv', label: 'Por vencer', type: 'number', filter: 'none', w: '110px' },
  { key: 'evv', label: 'Evidencias vencidas', type: 'number', filter: 'none', w: '150px' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];
const ACOLS: Column[] = [
  { key: 'n', label: 'Requisito', w: 'minmax(220px, 1.5fr)' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(190px, 1.3fr)' },
  { key: 'e', label: 'Estado de la evidencia', type: 'badge', filter: 'select', w: '170px' },
  { key: 'v', label: 'Vence', type: 'date', filter: 'date', w: '120px' },
  { key: 'cu', label: 'Cumplimiento asociado', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'd', label: 'N° de documento', w: '140px' },
  { key: 'cg', label: 'Cargo', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'ar', label: 'Área', filter: 'select', w: 'minmax(130px, 0.9fr)' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' }, VER,
];
const ECOLS: Column[] = [
  { key: 'n', label: 'Requisito', w: 'minmax(240px, 1.6fr)' },
  { key: 'c', label: 'Empresa', w: 'minmax(200px, 1.3fr)' },
  { key: 'e', label: 'Estado de la evidencia', type: 'badge', filter: 'select', w: '170px' },
  { key: 'v', label: 'Vence', type: 'date', filter: 'date', w: '120px' },
  { key: 'cu', label: 'Cumplimiento asociado', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' }, VER,
];

/**
 * P-11.1 Requisitos and P-11.2 Asignaciones (API). Each assignment shows its evidence history; registering a new
 * evidence (with an optional PDF/JPG/PNG) sets its expiry from the requirement's validity. Status comes from the latest
 * evidence: Sin evidencia, Vigente, Por vencer (30 days or less) or Vencida.
 */
@Component({
  selector: 'app-sst-requisitos',
  templateUrl: './requisitos.component.html'
})
export class SstRequisitosComponent {
  readonly cols = COLS; readonly acols = ACOLS; readonly ecols = ECOLS;
  readonly actions: RowAction[] = ['cargar', 'eliminar'];
  readonly verActions: RowAction[] = ['ver'];
  readonly tone = ESTADO_EVIDENCIA_TONE;
  tab = 0;
  sub = 0;
  seg = 0;
  filtroRequisito: { id: number; nombre: string } | null = null;
  rows: Row[] = [];
  colRows: Row[] = [];
  empRows: Row[] = [];
  cumplimientos: CumplimientoSst[] = [];
  empresas: string[] = [];
  private asignaciones: AsignacionSstApi[] = [];

  nuevo: { nombre: string; cumplimientoId: number | null; aplicaA: 'Colaboradores' | 'Empresas'; vigencia: string; todos: boolean; empresas: Record<string, boolean> } | null = null;
  det: AsignacionDetalle | null = null;
  ev = { fecha: '', descripcion: '' };
  archivo: File | null = null;
  error = '';
  ocupado = false;

  constructor(private api: SstService, public ui: UiStateService) { this.cargar(); }

  cargar(): void {
    this.api.datos().subscribe({
      next: (d) => {
        this.cumplimientos = d.cumplimientos;
        this.empresas = d.empresas;
        this.asignaciones = d.asignaciones;
        this.rows = d.requisitos.map((x) => ({
          id: x.id, n: x.nombre, c: x.cumplimiento, a: x.aplicaA, vg: x.vigenciaMeses ? `${x.vigenciaMeses} meses` : 'No vence', na: x.asignaciones,
          ns: x.sinEvidencia, ev: x.vigentes, pv: x.porVencer, evv: x.vencidas, u: x.actualizado, x: '',
        }));
        this.armarAsignaciones();
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  armarAsignaciones(): void {
    const lista = this.asignaciones.filter((a) => a.finalizada === (this.seg === 1) && (!this.filtroRequisito || a.requisitoId === this.filtroRequisito.id));
    const fila = (a: AsignacionSstApi): Row => ({
      id: a.id, n: a.requisito,
      c: a.colaboradorId !== null ? { text: a.titular, link: `/admin/colaboradores/ficha/${a.colaboradorId}` } : a.titular,
      e: { text: a.estado, tone: ESTADO_EVIDENCIA_TONE[a.estado] }, v: a.vence ?? '—', cu: a.cumplimiento, d: a.documento ?? '',
      cg: a.cargo ?? '', ar: a.area ?? '', u: a.actualizado, x: '',
    });
    this.colRows = lista.filter((a) => a.aplicaA === 'Colaboradores').map(fila);
    this.empRows = lista.filter((a) => a.aplicaA === 'Empresas').map(fila);
  }

  onRequisito(action: RowAction, row: Row): void {
    if (action === 'cargar') {
      this.filtroRequisito = { id: +row.id, nombre: String(row['n']) };
      this.sub = row['a'] === 'Empresas' ? 1 : 0;
      this.seg = 0;
      this.tab = 1;
      this.armarAsignaciones();
    }
    if (action === 'eliminar') {
      this.api.eliminarRequisito(+row.id).subscribe({ next: () => { this.ui.toast(`Requisito “${row['n']}” eliminado`); this.cargar(); }, error: (e) => this.ui.toast(mensajeError(e)) });
    }
  }
  quitarFiltro(): void { this.filtroRequisito = null; this.armarAsignaciones(); }

  // --- Crear requisito ---------------------------------------------------------------------------------------------
  abrirNuevo(): void {
    this.error = '';
    this.nuevo = { nombre: '', cumplimientoId: this.cumplimientos[0]?.id ?? null, aplicaA: 'Colaboradores', vigencia: '12', todos: true, empresas: {} };
  }
  crear(): void {
    const n = this.nuevo;
    if (!n || this.ocupado) return;
    const vigencia = n.vigencia.trim() ? Number(n.vigencia) : null;
    if (!n.nombre.trim() || n.cumplimientoId === null) { this.error = 'Completa el nombre y el cumplimiento.'; return; }
    if (vigencia !== null && (!Number.isInteger(vigencia) || vigencia < 1 || vigencia > 120)) { this.error = 'La vigencia debe ser un número de meses entre 1 y 120, o vacía si no vence.'; return; }
    this.ocupado = true;
    this.error = '';
    const empresas = Object.entries(n.empresas).filter(([, v]) => v).map(([k]) => k);
    this.api.crearRequisito({ nombre: n.nombre.trim(), cumplimientoId: n.cumplimientoId, aplicaA: n.aplicaA, vigenciaMeses: vigencia,
      todos: n.aplicaA === 'Colaboradores' && n.todos, colaboradorIds: [], empresas: n.aplicaA === 'Empresas' ? empresas : [] }).subscribe({
      next: () => { this.ocupado = false; this.nuevo = null; this.ui.toast('Requisito creado'); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  // --- Detalle y evidencias ----------------------------------------------------------------------------------------
  ver(row: Row): void {
    this.api.asignacion(+row.id).subscribe({ next: (d) => this.mostrar(d), error: (e) => this.ui.toast(mensajeError(e)) });
  }
  private mostrar(d: AsignacionDetalle): void {
    this.det = d;
    this.ev = { fecha: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }), descripcion: '' };
    this.archivo = null;
    this.error = '';
  }
  elegirArchivo(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.error = f && f.size > 5 * 1024 * 1024 ? 'El archivo debe pesar como máximo 5 MB.' : '';
    this.archivo = this.error ? null : f;
  }
  registrar(): void {
    const d = this.det;
    if (!d || this.ocupado) return;
    if (!this.ev.descripcion.trim()) { this.error = 'Describe la evidencia (p. ej. N° de acta o certificado).'; return; }
    this.ocupado = true;
    this.api.registrarEvidencia(d.asignacion.id, this.ev.fecha.trim(), this.ev.descripcion.trim(), this.archivo).subscribe({
      next: (x) => { this.ocupado = false; this.mostrar(x); this.ui.toast(`Evidencia registrada · ${x.asignacion.estado}`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }
  finalizar(): void {
    const d = this.det;
    if (!d) return;
    this.api.finalizar(d.asignacion.id).subscribe({
      next: () => { this.det = null; this.ui.toast('Asignación finalizada: se conserva su historial'); this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
  descargar(e: AsignacionDetalle['evidencias'][number]): void { this.api.descargar(e); }
  kb(n: number | null): string { return n === null ? '' : n < 1024 ? `${n} B` : `${Math.round(n / 1024)} KB`; }
}
