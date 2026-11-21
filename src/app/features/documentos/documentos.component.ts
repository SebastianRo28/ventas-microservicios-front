import { Component } from '@angular/core';
import { DocumentoApi, DocumentosService, ResultadoLote } from '../../core/administracion.service';
import { mensajeError } from '../../core/auth.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const ACC: Column = { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' };
const BASE: Column[] = [
  { key: 'c', label: 'Colaborador', w: 'minmax(190px, 1.3fr)' },
  { key: 'e', label: 'Empresa', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'd', label: 'Documento', w: 'minmax(300px, 2.4fr)' },
  { key: 'f', label: 'Fecha de creación', type: 'date', filter: 'date', w: '140px' },
];
const PEND_COLS: Column[] = [...BASE,
  { key: 'r', label: 'Revisión', type: 'check', filter: 'none', w: '100px' },
  { key: 'fc', label: 'Firma del colaborador', type: 'check', filter: 'none', w: '170px' },
  { key: 'fe', label: 'Firma de la empresa', type: 'check', filter: 'none', w: '160px' }, ACC];
const ALL_COLS: Column[] = [...BASE, { key: 's', label: 'Estado', type: 'badge', filter: 'select', w: '110px' }, ACC];
const TRASH_COLS: Column[] = [
  { key: 'c', label: 'Colaborador', w: 'minmax(190px, 1.3fr)' },
  { key: 'e', label: 'Empresa', w: 'minmax(160px, 1fr)' },
  { key: 'd', label: 'Documento', w: 'minmax(280px, 2.2fr)' },
  { key: 'f', label: 'Fecha de creación', type: 'date', w: '140px' },
  { key: 'fd', label: 'Fecha de eliminación', type: 'date', w: '160px' },
  { key: 'u', label: 'Eliminado por', w: '140px' },
  { key: 'h', label: 'Disponible hasta', type: 'date', w: '150px' }, ACC,
];
const BULK = ['Firmar documentos', 'Marcar como revisados', 'Ocultar al colaborador', 'Mostrar al colaborador', 'Eliminar'];

/**
 * P-05.5 Documentos (API): pending signatures and reviews, visibility for the collaborator and a 60-day recycle bin.
 * The company signature is recorded by the administrator; verification by e-mail/SMS code needs a messaging provider
 * and is not part of this version.
 */
@Component({
  selector: 'app-documentos',
  templateUrl: './documentos.component.html'
})
export class DocumentosComponent {
  readonly tabs = ['Mis firmas pendientes', 'Mis revisiones pendientes', 'Todos los pendientes', 'Todos los documentos', 'Papelera'];
  readonly pendCols = PEND_COLS;
  readonly allCols = ALL_COLS;
  readonly trashCols = TRASH_COLS;
  readonly bulk = BULK;
  readonly trashActions: RowAction[] = ['restaurar', 'eliminar'];
  tab = 0;
  rows: Row[] = [];
  trash: Row[] = [];
  private docs: DocumentoApi[] = [];

  /** Signing dialog: 0 closed · 1 confirm · 2 done */
  paso = 0;
  firmarIds: number[] = [];
  firmados = 0;
  ocupado = false;

  constructor(private api: DocumentosService, private ui: UiStateService) { this.cargar(); }

  cargar(): void {
    this.api.datos().subscribe({
      next: (d) => {
        this.docs = d.documentos;
        this.trash = d.papelera.map((x) => ({ id: x.id, c: x.colaborador, e: x.empresa, d: x.archivo, f: x.fecha, fd: x.eliminado, u: x.eliminadoPor, h: x.disponibleHasta, x: '' }));
        this.refresh();
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  pickTab(i: number): void { this.tab = i; this.refresh(); }

  get pendActions(): RowAction[] { return this.tab === 1 ? ['aprobar', 'ocultar'] : ['firmar', 'ocultar']; }
  get allActions(): RowAction[] { return ['ocultar', 'eliminar']; }

  private refresh(): void {
    const t = this.tab;
    const pend = (doc: DocumentoApi) => t === 0 ? doc.firmaEmpresa === 'no' && doc.revision !== 'no'
      : t === 1 ? doc.revision === 'no'
      : doc.firmaColaborador === 'no' || doc.firmaEmpresa === 'no' || doc.revision === 'no';
    this.rows = this.docs.filter((doc) => t === 3 || pend(doc)).map((doc) => ({
      id: doc.id, c: doc.colaborador, e: doc.empresa, d: doc.archivo, f: doc.fecha,
      r: doc.revision, fc: doc.firmaColaborador, fe: doc.firmaEmpresa,
      s: doc.oculto ? { text: 'Oculto', tone: 'danger' as const } : { text: 'Visible', tone: 'success' as const }, x: '',
    }));
  }

  onAction(action: RowAction, row: Row): void {
    const doc = this.docs.find((d) => d.id === row.id);
    if (!doc) return;
    if (action === 'firmar') this.startSign([doc.id]);
    if (action === 'aprobar') this.lote(this.api.revisar([doc.id]), 'revisado(s)');
    if (action === 'ocultar') this.lote(this.api.ocultar([doc.id], !doc.oculto), doc.oculto ? 'visible(s) para el colaborador' : 'oculto(s) al colaborador');
    if (action === 'eliminar') this.lote(this.api.eliminar([doc.id]), 'enviado(s) a la papelera');
  }

  onTrash(action: RowAction, row: Row): void {
    const id = +row.id;
    if (action === 'restaurar') {
      this.api.restaurar(id).subscribe({ next: () => { this.ui.toast('Documento restaurado'); this.cargar(); }, error: (e) => this.ui.toast(mensajeError(e)) });
    }
    if (action === 'eliminar') {
      if (!confirm(`¿Eliminar definitivamente “${row['d']}”? Esta acción no se puede deshacer.`)) return;
      this.api.eliminarDefinitivo(id).subscribe({ next: () => { this.ui.toast('Documento eliminado definitivamente'); this.cargar(); }, error: (e) => this.ui.toast(mensajeError(e)) });
    }
  }

  onBulk(action: string, rows: Row[]): void {
    const ids = rows.map((r) => +r.id);
    if (action === 'Firmar documentos') {
      const listos = ids.filter((id) => { const d = this.docs.find((x) => x.id === id); return d?.firmaEmpresa === 'no' && d.revision !== 'no'; });
      if (listos.length) this.startSign(listos); else this.ui.toast('Ninguno de los documentos seleccionados espera la firma de la empresa');
    }
    if (action === 'Marcar como revisados') this.lote(this.api.revisar(ids), 'revisado(s)');
    if (action === 'Ocultar al colaborador') this.lote(this.api.ocultar(ids, true), 'oculto(s) al colaborador');
    if (action === 'Mostrar al colaborador') this.lote(this.api.ocultar(ids, false), 'visible(s) para el colaborador');
    if (action === 'Eliminar') this.lote(this.api.eliminar(ids), 'enviado(s) a la papelera');
  }

  private lote(peticion: ReturnType<DocumentosService['firmar']>, texto: string): void {
    peticion.subscribe({
      next: (r: ResultadoLote) => { this.ui.toast(`${r.procesados} documento(s) ${texto}${r.omitidos ? ` · ${r.omitidos} sin cambios` : ''}`); this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  private startSign(ids: number[]): void {
    this.firmarIds = ids;
    this.paso = 1;
  }

  firmar(): void {
    if (this.ocupado) return;
    this.ocupado = true;
    this.api.firmar(this.firmarIds).subscribe({
      next: (r) => { this.ocupado = false; this.firmados = r.procesados; this.paso = 2; this.cargar(); },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }
}
