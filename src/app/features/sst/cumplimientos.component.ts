import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Cumplimiento, CumplimientoBiblioteca } from '../../core/sample/sst';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'n', label: 'Nombre del cumplimiento', w: 'minmax(200px, 1.4fr)' },
  { key: 'no', label: 'Normativa', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'c', label: 'Categoría(s)', filter: 'select', w: 'minmax(170px, 1.1fr)' },
  { key: 'ec', label: 'Evidencias vigentes asociadas a colaboradores', filter: 'none', w: '200px' },
  { key: 'ee', label: 'Evidencias vigentes asociadas a empresas', filter: 'none', w: '190px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'd', label: 'Descripción', w: 'minmax(200px, 1.4fr)' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '80px' },
];
const BCOLS: Column[] = [
  { key: 'p', label: 'País', filter: 'select', w: '100px' },
  { key: 'n', label: 'Nombre del cumplimiento', w: 'minmax(220px, 1.5fr)' },
  { key: 'no', label: 'Normativa', filter: 'select', w: 'minmax(180px, 1.1fr)' },
  { key: 'c', label: 'Categoría', type: 'badge', filter: 'select', w: '170px' },
  { key: 'd', label: 'Descripción', w: 'minmax(260px, 2fr)' },
];

/**
 * P-11.3 Cumplimientos. A compliance framework "cumple" when every evidence it requires is current;
 * the library tab adds frequent frameworks to "Mis cumplimientos".
 */
@Component({
  selector: 'app-sst-cumplimientos',
  template: `
    <app-page-header title="Cumplimientos" [crumbs]="['Seguridad y Salud en el Trabajo', 'Registro de evidencias']"></app-page-header>
    <div class="nx-banner nx-banner--green" role="note">
      <app-icon name="shield" [size]="19"></app-icon>
      <span class="nx-grow">Capacitaciones, exámenes ocupacionales, EPP y más con descuentos exclusivos para clientes Nexo RH.</span>
      <a href="#" (click)="$event.preventDefault()">Ver la Red de Proveedores SST</a>
    </div>
    <p class="nx-page-lead nx-page-lead--flat">Administra los marcos normativos de tu Empresa y agrega nuevos desde la Biblioteca de cumplimientos frecuentes.</p>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Mis cumplimientos', 'Biblioteca']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <app-data-table *ngIf="tab === 0" [columns]="cols" [rows]="rows" createLabel="Crear cumplimiento" [rowActions]="actions"
                    [bulkActions]="['Descargar evidencias', 'Eliminar']" [showAdvancedFilter]="false" tableLabel="Mis cumplimientos"
                    minWidth="1600px" exportName="mis-cumplimientos"
                    (create)="ui.toast('La creación de cumplimientos llegará en la próxima versión')"
                    (action)="ui.toast('Usa Requisitos para cargar evidencias de este cumplimiento')"
                    (bulk)="onBulk($event.action, $event.rows)"></app-data-table>
    <ng-container *ngIf="tab === 1">
      <div class="nx-banner" role="note">
        <app-icon name="info" [size]="19"></app-icon>
        <span class="nx-grow">La biblioteca reúne los cumplimientos de SST más frecuentes en auditorías. Antes de agregarlos, revisa las fuentes oficiales.</span>
      </div>
      <app-data-table [columns]="bcols" [rows]="brows" [pageSize]="50" [bulkActions]="['Agregar a mis cumplimientos']" [showAdvancedFilter]="false"
                      tableLabel="Biblioteca de cumplimientos" minWidth="1100px" exportName="biblioteca-sst"
                      emptyTitle="Ya agregaste todos los cumplimientos de la biblioteca" emptyText="Los encontrarás en Mis cumplimientos"
                      (bulk)="agregar($event.rows)"></app-data-table>
    </ng-container>
  `
})
export class SstCumplimientosComponent {
  readonly cols = COLS;
  readonly bcols = BCOLS;
  readonly actions: RowAction[] = ['cargar'];
  tab = 0;
  rows: Row[] = [];
  brows: Row[] = [];
  private mios: Cumplimiento[] = [];
  private biblioteca: CumplimientoBiblioteca[] = [];

  constructor(data: HrDataService, public ui: UiStateService) {
    data.cumplimientos().subscribe((c) => { this.mios = c; this.refresh(); });
    data.bibliotecaSst().subscribe((b) => { this.biblioteca = b; this.refresh(); });
  }

  private cumple(c: Cumplimiento): boolean {
    const [cv, ct] = c.colaboradores, [ev, et] = c.empresas;
    return ct + et > 0 && cv === ct && ev === et;
  }

  private refresh(): void {
    this.rows = this.mios.map((c) => ({
      id: c.id, n: c.nombre, no: c.normativa, c: c.categoria, ec: c.colaboradores.join('/'), ee: c.empresas.join('/'),
      e: this.cumple(c) ? { text: 'Cumple', tone: 'success' as const } : { text: 'No cumple', tone: 'danger' as const },
      d: c.descripcion, u: c.actualizado, x: '',
    }));
    const added = new Set(this.mios.map((c) => c.nombre));
    this.brows = this.biblioteca.filter((b) => !added.has(b.nombre)).map((b) => ({
      id: b.id, p: b.pais, n: b.nombre, no: b.normativa, c: { text: b.categoria, tone: 'neutral' as const },
      d: 'Requisito frecuente en auditorías de SST. Revisa la fuente oficial antes de aplicarlo.',
    }));
  }

  /** Adds library frameworks to "Mis cumplimientos" without evidences yet. */
  agregar(rows: Row[]): void {
    if (!rows.length) return;
    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nuevos = this.biblioteca.filter((b) => rows.some((r) => r.id === b.id));
    nuevos.forEach((b) => this.mios.unshift({
      id: Math.max(0, ...this.mios.map((c) => c.id)) + 1, nombre: b.nombre, normativa: b.normativa, categoria: b.categoria,
      colaboradores: [0, 0], empresas: [0, 0], descripcion: `Obligaciones de ${b.nombre.toLowerCase()} según la normativa vigente.`, actualizado: hoy,
    }));
    this.refresh();
    this.ui.toast(nuevos.length === 1
      ? `Cumplimiento agregado con éxito: ${nuevos[0].nombre} se agregó a Mis cumplimientos`
      : `Cumplimientos agregados con éxito: ${nuevos.length} cumplimientos se agregaron a Mis cumplimientos`);
  }

  onBulk(action: string, rows: Row[]): void {
    if (action === 'Eliminar') {
      const ids = new Set(rows.map((r) => r.id));
      for (let i = this.mios.length - 1; i >= 0; i--) if (ids.has(this.mios[i].id)) this.mios.splice(i, 1);
      this.refresh();
    }
    this.ui.toast(`${action}: ${rows.length} cumplimiento(s)`);
  }
}
