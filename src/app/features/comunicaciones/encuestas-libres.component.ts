import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Encuesta, ESTADO_ENCUESTA_TONE, PLANTILLAS_ENCUESTA } from '../../core/sample/operaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'n', label: 'Nombre de la encuesta', w: 'minmax(240px, 1.8fr)' },
  { key: 'fc', label: 'Fecha de creación', type: 'date', filter: 'date', w: '150px' },
  { key: 'fi', label: 'Fecha de inicio', type: 'date', filter: 'date', w: '140px' },
  { key: 'ft', label: 'Fecha de término', type: 'date', filter: 'date', w: '140px' },
  { key: 'p', label: 'N° de participantes', type: 'number', filter: 'none', w: '160px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'a', label: 'Avance global', type: 'progress', filter: 'none', w: '170px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/** P-13.1 Encuestas › Libre, with P-13.2 "Nueva encuesta" template picker. */
@Component({
  selector: 'app-encuestas-libres',
  templateUrl: './encuestas-libres.component.html'
})
export class EncuestasLibresComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['ver', 'mas', 'eliminar'];
  tab = 0;
  rows: Row[] = [];
  modal = false;
  fuente = 0;
  query = '';
  private all: Encuesta[] = [];

  constructor(data: HrDataService, private ui: UiStateService) {
    data.encuestas().subscribe((e) => { this.all = e; this.pick(0); });
  }

  /** "Plantillas Nexo" or the names of finished surveys ("anteriores"). */
  get plantillas(): string[] {
    const base = this.fuente === 0 ? PLANTILLAS_ENCUESTA : this.all.filter((e) => e.estado === 'Finalizada').map((e) => e.nombre);
    const q = this.query.trim().toLowerCase();
    return base.filter((t) => !q || t.toLowerCase().includes(q));
  }

  get anterioresCount(): number { return this.all.filter((e) => e.estado === 'Finalizada').length; }

  pick(i: number): void {
    this.tab = i;
    this.rows = this.all.filter((e) => (e.estado === 'Finalizada') === (i === 1)).map((e) => ({
      id: e.id, n: e.nombre, fc: e.creada, fi: e.inicio, ft: e.termino, p: e.participantes,
      e: { text: e.estado, tone: ESTADO_ENCUESTA_TONE[e.estado] }, a: { text: `${e.avance} %`, pct: e.avance }, x: '',
    }));
  }

  openModal(): void { this.fuente = 0; this.query = ''; this.modal = true; }

  /** Creates a pending survey (no participants yet) from the chosen template. */
  crear(plantilla: string): void {
    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nombre = plantilla === 'En blanco' ? 'Nueva encuesta' : plantilla;
    this.all.unshift({ id: Math.max(...this.all.map((e) => e.id)) + 1, nombre, creada: hoy, inicio: '—', termino: '—', participantes: 0, estado: 'Pendiente', avance: 0 });
    this.modal = false;
    this.pick(0);
    this.ui.toast(`Encuesta “${nombre}” creada como pendiente`);
  }

  onAction(action: RowAction, row: Row): void {
    const i = this.all.findIndex((e) => e.id === row.id);
    if (i < 0) return;
    if (action === 'eliminar') {
      const [e] = this.all.splice(i, 1);
      this.pick(this.tab);
      this.ui.toast(`Encuesta “${e.nombre}” eliminada`);
    } else {
      this.ui.toast('El detalle de la encuesta llegará en la próxima versión');
    }
  }
}
