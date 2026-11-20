import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Documento, DocumentoEliminado } from '../../core/sample/documentos';
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
  { key: 'h', label: 'Disponible hasta', type: 'date', w: '150px' },
];
const BULK = ['Firmar documentos', 'Notificar a revisores', 'Notificar a colaboradores', 'Notificar a firmantes',
  'Descargar', 'Ocultar al colaborador', 'Mostrar al colaborador', 'Eliminar'];

const METODOS = [
  { label: 'Correo electrónico', dest: 'r.p******@comercialandina.pe' },
  { label: 'Mensaje de texto SMS', dest: '+51 9** *** 214' },
];

/**
 * P-05.5 Documentos, with P-05.7 "Firma electrónica" (4 steps).
 * The verification code is not checked against a server yet: any 6 digits complete the demo flow.
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
  readonly metodos = METODOS;
  readonly pendActions: RowAction[] = ['firmar', 'descargar'];
  readonly allActions: RowAction[] = ['ocultar', 'descargar', 'mas'];
  tab = 0;
  rows: Row[] = [];
  trash: Row[] = [];
  private docs: Documento[] = [];

  /** Signing flow: 0 closed · 1 summary · 2 method · 3 code · 4 done */
  paso = 0;
  firmarIds: number[] = [];
  metodo = 0;
  codigo = '';

  constructor(data: HrDataService, private ui: UiStateService) {
    data.documentos().subscribe((d) => { this.docs = d; this.refresh(); });
    data.papelera().subscribe((p) => (this.trash = p.map((x: DocumentoEliminado) => ({
      id: x.id, c: x.colaborador, e: x.empresa, d: x.archivo, f: x.fecha, fd: x.eliminado, u: x.eliminadoPor, h: x.disponibleHasta,
    }))));
  }

  pickTab(i: number): void { this.tab = i; this.refresh(); }

  private refresh(): void {
    const t = this.tab;
    const pend = (doc: Documento) => t === 0 ? doc.firmaEmpresa === 'no'
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
    if (action === 'ocultar') { doc.oculto = !doc.oculto; this.refresh(); }
  }

  onBulk(action: string, rows: Row[]): void {
    if (action === 'Firmar documentos') {
      const ids = rows.map((r) => r.id as number).filter((id) => this.docs.find((d) => d.id === id)?.firmaEmpresa === 'no');
      if (ids.length) this.startSign(ids); else this.ui.toast('Ninguno de los documentos seleccionados espera tu firma');
    } else if (action === 'Ocultar al colaborador' || action === 'Mostrar al colaborador') {
      rows.forEach((r) => { const d = this.docs.find((x) => x.id === r.id); if (d) d.oculto = action.startsWith('Ocultar'); });
      this.refresh();
    } else {
      this.ui.toast(`${action}: ${rows.length} documento(s)`);
    }
  }

  private startSign(ids: number[]): void {
    this.firmarIds = ids;
    this.metodo = 0;
    this.codigo = '';
    this.paso = 1;
  }

  setCodigo(v: string): void { this.codigo = v.replace(/\D/g, '').slice(0, 6); }

  get siguienteLabel(): string { return ['', 'Siguiente', 'Enviar código', 'Firmar documentos'][this.paso] ?? ''; }

  siguiente(): void {
    if (this.paso === 3) {
      if (this.codigo.length !== 6) return;
      this.docs.filter((d) => this.firmarIds.includes(d.id)).forEach((d) => (d.firmaEmpresa = 'si'));
      this.refresh();
    }
    this.paso++;
  }
}
