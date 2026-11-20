import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Tone } from '../../core/models';
import { EstadoPlantilla, PlantillaWorkflow } from '../../core/sample/catalogos';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const TONE: Record<EstadoPlantilla, Tone> = { Activa: 'success', Inactiva: 'gray', Error: 'danger', Incompleta: 'warning' };
const SEGMENTS: [string, EstadoPlantilla | null][] = [['Todas', null], ['Activas', 'Activa'], ['Inactivas', 'Inactiva'], ['Error', 'Error'], ['Incompletas', 'Incompleta']];

const COLUMNS: Column[] = [
  { key: 'id', label: 'ID', w: '80px' },
  { key: 'n', label: 'Nombre', w: 'minmax(240px, 2fr)' },
  { key: 'tp', label: 'Tipo', type: 'badge', filter: 'select', w: 'minmax(110px, 0.8fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(110px, 0.8fr)' },
  { key: 'o', label: 'N° de Operaciones', type: 'number', filter: 'none', w: 'minmax(150px, 0.8fr)' },
  { key: 'f', label: 'Fecha actualización', type: 'date', filter: 'date', w: 'minmax(150px, 0.9fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '150px' },
];

/** P-02.3 Workflow › Plantillas. */
@Component({
  selector: 'app-wf-plantillas',
  template: `
    <app-page-header title="Plantillas" [crumbs]="['Administrativo', 'Workflow']"></app-page-header>
    <div class="nx-segmented nx-mb-16" role="group" aria-label="Filtrar por estado">
      <button *ngFor="let s of segments; let i = index" type="button" [class.is-on]="seg === i" [attr.aria-pressed]="seg === i" (click)="pick(i)">{{ s[0] }}</button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" createLabel="Crear Plantilla" [showAdvancedFilter]="false" [rowActions]="actions"
                    [bulkActions]="['Activar', 'Desactivar', 'Eliminar']" tableLabel="Plantillas de workflow" minWidth="1100px"
                    exportName="plantillas-workflow" emptyTitle="No hay plantillas en este estado" emptyText="Cambia el filtro para ver otras plantillas"
                    (create)="ui.toast('El editor de plantillas de workflow llegará en la próxima versión')"
                    (action)="onAction($event.action, $event.row)" (bulk)="onBulk($event.action, $event.rows)"></app-data-table>
  `
})
export class WfPlantillasComponent {
  readonly columns = COLUMNS;
  readonly segments = SEGMENTS;
  readonly actions: RowAction[] = ['info', 'pausa', 'duplicar', 'mas'];
  seg = 0;
  rows: Row[] = [];
  private all: PlantillaWorkflow[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.plantillasWorkflow().subscribe((p) => { this.all = p; this.pick(0); });
  }

  pick(i: number): void {
    this.seg = i;
    const estado = SEGMENTS[i][1];
    this.rows = this.all.filter((p) => !estado || p.estado === estado).map((p) => ({
      id: p.id, n: p.nombre, tp: { text: p.tipo, tone: 'gray' as const }, e: { text: p.estado, tone: TONE[p.estado] },
      o: p.operaciones, f: p.actualizada, x: '',
    }));
  }

  private today(): string {
    return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  onAction(action: RowAction, row: Row): void {
    const p = this.all.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'pausa') {
      if (p.estado === 'Activa' || p.estado === 'Inactiva') {
        p.estado = p.estado === 'Activa' ? 'Inactiva' : 'Activa';
        p.actualizada = this.today();
        this.ui.toast(`Plantilla “${p.nombre}” ${p.estado === 'Activa' ? 'activada' : 'desactivada'}`);
      } else {
        this.ui.toast(`Corrige la plantilla “${p.nombre}” antes de activarla (${p.estado.toLowerCase()})`);
      }
    }
    if (action === 'duplicar') {
      const copia: PlantillaWorkflow = { ...p, id: Math.max(...this.all.map((x) => x.id)) + 1, nombre: `${p.nombre} (copia)`, estado: 'Inactiva', actualizada: this.today() };
      this.all.unshift(copia);
      this.ui.toast(`Se creó “${copia.nombre}” como inactiva`);
    }
    if (action === 'info') this.ui.toast(`${p.nombre}: ${p.operaciones} operaciones · tipo ${p.tipo}`);
    this.pick(this.seg);
  }

  onBulk(action: string, rows: Row[]): void {
    const ids = new Set(rows.map((r) => r.id));
    if (action === 'Eliminar') {
      for (let i = this.all.length - 1; i >= 0; i--) if (ids.has(this.all[i].id)) this.all.splice(i, 1);
    } else {
      this.all.filter((p) => ids.has(p.id) && (p.estado === 'Activa' || p.estado === 'Inactiva'))
        .forEach((p) => { p.estado = action === 'Activar' ? 'Activa' : 'Inactiva'; p.actualizada = this.today(); });
    }
    this.ui.toast(`${action}: ${rows.length} plantilla(s)`);
    this.pick(this.seg);
  }
}
