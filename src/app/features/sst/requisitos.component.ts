import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { AsignacionSst, ESTADO_EVIDENCIA_TONE, Requisito } from '../../core/sample/sst';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const VER: Column = { key: 'x', label: 'Ver', type: 'actions', filter: 'none', sortable: false, w: '70px' };
const COLS: Column[] = [
  { key: 'n', label: 'Nombre del requisito', w: 'minmax(220px, 1.6fr)' },
  { key: 'c', label: 'Cumplimiento asociado', filter: 'select', w: 'minmax(190px, 1.3fr)' },
  { key: 'a', label: 'Aplica a', filter: 'select', w: '130px' },
  { key: 'na', label: 'N° de asignaciones', type: 'number', filter: 'none', w: '150px' },
  { key: 'ns', label: 'N° de asignaciones sin evidencias', type: 'number', filter: 'none', w: '200px' },
  { key: 'ev', label: 'Evidencias vigentes', type: 'number', filter: 'none', w: '150px' },
  { key: 'evv', label: 'Evidencias vencidas', type: 'number', filter: 'none', w: '150px' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];
const ACOLS: Column[] = [
  { key: 'n', label: 'Nombre de la asignación', w: 'minmax(260px, 1.8fr)' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(190px, 1.3fr)' },
  { key: 'e', label: 'Estado de la evidencia', type: 'badge', filter: 'select', w: '170px' },
  { key: 'cu', label: 'Cumplimiento asociado', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'd', label: 'N° de documento', w: '140px' },
  { key: 'cg', label: 'Cargo', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'ar', label: 'Área', filter: 'select', w: 'minmax(130px, 0.9fr)' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' }, VER,
];
const ECOLS: Column[] = [
  { key: 'n', label: 'Nombre de la asignación', w: 'minmax(260px, 1.8fr)' },
  { key: 'c', label: 'Empresa', w: 'minmax(200px, 1.3fr)' },
  { key: 'e', label: 'Estado de la evidencia', type: 'badge', filter: 'select', w: '170px' },
  { key: 'cu', label: 'Cumplimiento asociado', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' }, VER,
];

const firstName = (titular: string) => {
  const [ap, nom] = titular.split(', ');
  return nom ? `${nom.split(' ')[0]} ${ap.split(' ')[0]}` : titular.replace(' S.A.C.', '');
};

/** P-11.1 Requisitos and P-11.2 Asignaciones, with P-11.2 evidence preview. */
@Component({
  selector: 'app-sst-requisitos',
  templateUrl: './requisitos.component.html'
})
export class SstRequisitosComponent {
  readonly cols = COLS; readonly acols = ACOLS; readonly ecols = ECOLS;
  readonly actions: RowAction[] = ['cargar', 'mas'];
  readonly verActions: RowAction[] = ['ver'];
  readonly tone = ESTADO_EVIDENCIA_TONE;
  tab = 0;
  sub = 0;
  seg = 0;
  cargarAviso = '';
  rows: Row[] = [];
  colRows: Row[] = [];
  empRows: Row[] = [];
  preview: AsignacionSst | null = null;
  private colab: AsignacionSst[] = [];
  private emp: AsignacionSst[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.requisitos().subscribe((r) => (this.rows = r.map((x: Requisito) => ({
      id: x.id, n: x.nombre, c: x.cumplimiento, a: x.aplicaA, na: x.asignaciones, ns: x.sinEvidencia,
      ev: x.vigentes, evv: x.vencidas, u: x.actualizado, x: '',
    }))));
    data.asignacionesSst().subscribe(({ colaboradores, empresas }) => {
      this.colab = colaboradores;
      this.emp = empresas;
      const asRow = (a: AsignacionSst, isCol: boolean): Row => ({
        id: a.id, n: `${a.requisito} - ${firstName(a.titular)}`,
        c: isCol ? { text: a.titular, link: `/admin/colaboradores/ficha/${a.colaboradorId}` } : a.titular,
        e: { text: a.estado, tone: ESTADO_EVIDENCIA_TONE[a.estado] }, cu: a.cumplimiento, d: a.documento ?? '',
        cg: a.cargo ?? '', ar: a.area ?? '', u: a.actualizado, x: '',
      });
      this.colRows = colaboradores.map((a) => asRow(a, true));
      this.empRows = empresas.map((a) => asRow(a, false));
    });
  }

  onRequisito(action: RowAction, row: Row): void {
    if (action === 'cargar') this.cargarAviso = String(row['n']);
    else this.ui.toast('Más acciones de requisitos llegarán en la próxima versión');
  }

  ver(row: Row, empresa: boolean): void {
    const a = (empresa ? this.emp : this.colab).find((x) => x.id === row.id);
    if (!a) return;
    if (a.estado === 'Sin evidencia') { this.ui.toast(`${a.requisito}: aún no se ha cargado evidencia`); return; }
    this.preview = a;
  }
}
