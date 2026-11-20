import { Component } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { mensajeError } from '../../core/auth.service';
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

  constructor(private data: HrDataService, public ui: UiStateService) { this.cargar(); }

  private cargar(): void { this.data.plantillasWorkflow().subscribe((p) => { this.all = p; this.pick(this.seg); }); }

  pick(i: number): void {
    this.seg = i;
    const estado = SEGMENTS[i][1];
    this.rows = this.all.filter((p) => !estado || p.estado === estado).map((p) => ({
      id: p.id, n: p.nombre, tp: { text: p.tipo, tone: 'gray' as const }, e: { text: p.estado, tone: TONE[p.estado] },
      o: p.operaciones, f: p.actualizada, x: '',
    }));
  }

  /** Changes go to the API (only administrators); the list is reloaded with the server state. */
  private hecho(msg: string): (r?: unknown) => void { return () => { this.ui.toast(msg); this.cargar(); }; }
  private fallo = (e: unknown): void => { this.ui.toast(mensajeError(e)); this.cargar(); };

  onAction(action: RowAction, row: Row): void {
    const p = this.all.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'pausa') {
      if (p.estado !== 'Activa' && p.estado !== 'Inactiva') { this.ui.toast(`Corrige la plantilla “${p.nombre}” antes de activarla (${p.estado.toLowerCase()})`); return; }
      const activa = p.estado !== 'Activa';
      this.data.estadoPlantillaWf(p.id, activa).subscribe({ next: this.hecho(`Plantilla “${p.nombre}” ${activa ? 'activada' : 'desactivada'}`), error: this.fallo });
    }
    if (action === 'duplicar') {
      this.data.duplicarPlantillaWf(p.id).subscribe({ next: (c) => this.hecho(`Se creó “${c.nombre}” como inactiva`)(), error: this.fallo });
    }
    if (action === 'info') this.ui.toast(`${p.nombre}: ${p.operaciones} operaciones · tipo ${p.tipo} · ${p.solicitudes ?? 0} solicitud(es)`);
  }

  onBulk(action: string, rows: Row[]): void {
    const sel = this.all.filter((p) => rows.some((r) => r.id === p.id));
    const ops = sel.map((p) => action === 'Eliminar' ? this.data.eliminarPlantillaWf(p.id)
      : (p.estado === 'Activa' || p.estado === 'Inactiva') ? this.data.estadoPlantillaWf(p.id, action === 'Activar') : null).filter((o) => o !== null);
    if (!ops.length) { this.ui.toast('Ninguna de las plantillas seleccionadas se puede cambiar'); return; }
    forkJoin(ops.map((o) => o!.pipe(map(() => true), catchError((e) => { this.ui.toast(mensajeError(e)); return of(false); })))).subscribe((r) => {
      this.ui.toast(`${action}: ${r.filter(Boolean).length} de ${sel.length} plantilla(s)`);
      this.cargar();
    });
  }
}
