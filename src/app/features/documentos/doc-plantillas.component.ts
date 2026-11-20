import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { PlantillaDocumento } from '../../core/sample/catalogos';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(240px, 1.8fr)' },
  { key: 't', label: 'Tipo', type: 'badge', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '110px' },
  { key: 'c', label: 'Carpeta', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'em', label: 'Empresas', filter: 'select', w: '110px' },
  { key: 'j', label: 'Juego de datos', filter: 'select', w: '140px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '120px' },
];

/** P-05.1 Documentos y Firma › Plantillas. */
@Component({
  selector: 'app-doc-plantillas',
  template: `
    <app-page-header title="Plantillas" [crumbs]="['Administrativo', 'Documentos y Firma']"></app-page-header>
    <p class="nx-page-lead">Nexo RH trae plantillas por defecto que puedes editar o duplicar.</p>
    <app-data-table [columns]="columns" [rows]="rows" createLabel="Crear plantilla" [rowActions]="actions"
                    [showBulk]="false" [showAdvancedFilter]="false" tableLabel="Plantillas de documentos" minWidth="1100px"
                    exportName="plantillas-documentos"
                    (create)="ui.toast('El editor de plantillas de documentos llegará en la próxima versión')"
                    (action)="onAction($event.action, $event.row)"></app-data-table>
  `
})
export class DocPlantillasComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['ver', 'pausa', 'mas'];
  rows: Row[] = [];
  private all: PlantillaDocumento[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.plantillasDocumento().subscribe((p) => { this.all = p; this.refresh(); });
  }

  private refresh(): void {
    this.rows = this.all.map((p) => ({
      id: p.id, n: p.nombre, t: { text: p.tipo, tone: 'neutral' as const },
      e: p.activa ? { text: 'Activa', tone: 'success' as const } : { text: 'Inactiva', tone: 'gray' as const },
      c: p.carpeta, em: 'Todas', j: 'Todos', x: '',
    }));
  }

  onAction(action: RowAction, row: Row): void {
    const p = this.all.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'pausa') {
      p.activa = !p.activa;
      this.ui.toast(`Plantilla “${p.nombre}” ${p.activa ? 'activada' : 'desactivada'}`);
      this.refresh();
    }
    if (action === 'ver') this.ui.toast('La vista previa de plantillas llegará en la próxima versión');
  }
}
