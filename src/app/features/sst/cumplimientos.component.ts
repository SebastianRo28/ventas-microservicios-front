import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { mensajeError } from '../../core/auth.service';
import { CumplimientoSst, DatosSst, SstService } from '../../core/sst.service';
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
    <p class="nx-page-lead nx-page-lead--flat">Administra los marcos normativos de tu Empresa y agrega nuevos desde la Biblioteca de cumplimientos frecuentes.</p>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Mis cumplimientos', 'Biblioteca']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <app-data-table *ngIf="tab === 0" [columns]="cols" [rows]="rows" createLabel="Crear cumplimiento" [rowActions]="actions"
                    [bulkActions]="['Descargar evidencias', 'Eliminar']" [showAdvancedFilter]="false" tableLabel="Mis cumplimientos"
                    minWidth="1600px" exportName="mis-cumplimientos"
                    (create)="abrir()" (action)="onAction($event.action, $event.row)"
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
    <app-modal *ngIf="nuevo as n" title="Crear cumplimiento" width="540px" (closed)="nuevo = null">
      <form id="cu-form" class="nx-form" (ngSubmit)="crear()">
        <label class="nx-field">Nombre*<input class="nx-input" name="nombre" maxlength="120" [(ngModel)]="n.nombre"></label>
        <label class="nx-field">Normativa*<input class="nx-input" name="normativa" maxlength="80" [(ngModel)]="n.normativa" placeholder="Ej. Ley N° 29783"></label>
        <label class="nx-field">Categoría<input class="nx-input" name="categoria" maxlength="80" [(ngModel)]="n.categoria" placeholder="Ej. Gestión de Riesgos"></label>
        <label class="nx-field">Descripción<textarea class="nx-textarea" name="descripcion" rows="2" maxlength="500" [(ngModel)]="n.descripcion"></textarea></label>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="nuevo = null">Cancelar</button>
        <button type="submit" form="cu-form" class="nx-btn nx-btn--primary">Crear</button>
      </ng-container>
    </app-modal>
  `
})
export class SstCumplimientosComponent {
  readonly cols = COLS;
  readonly bcols = BCOLS;
  readonly actions: RowAction[] = ['cargar', 'eliminar'];
  tab = 0;
  rows: Row[] = [];
  brows: Row[] = [];
  nuevo: { nombre: string; normativa: string; categoria: string; descripcion: string } | null = null;
  error = '';
  private mios: CumplimientoSst[] = [];

  constructor(private api: SstService, public ui: UiStateService, private router: Router) { this.cargar(); }

  private cargar(): void {
    this.api.datos().subscribe({ next: (d) => this.refresh(d), error: (e) => this.ui.toast(mensajeError(e)) });
  }

  private refresh(d: DatosSst): void {
    this.mios = d.cumplimientos;
    this.rows = d.cumplimientos.map((c) => ({
      id: c.id, n: c.nombre, no: c.normativa, c: c.categoria, ec: c.colaboradores.join('/'), ee: c.empresas.join('/'),
      e: c.cumple ? { text: 'Cumple', tone: 'success' as const } : { text: 'No cumple', tone: 'danger' as const },
      d: c.descripcion, u: c.actualizado, x: '',
    }));
    this.brows = d.biblioteca.filter((b) => !b.agregado).map((b, i) => ({
      id: i, p: 'Perú', n: b.nombre, no: b.normativa, c: { text: b.categoria, tone: 'neutral' as const },
      d: 'Requisito frecuente en auditorías de SST. Revisa la fuente oficial antes de aplicarlo.',
    }));
  }

  abrir(): void { this.error = ''; this.nuevo = { nombre: '', normativa: '', categoria: '', descripcion: '' }; }
  crear(): void {
    const n = this.nuevo;
    if (!n) return;
    this.api.crearCumplimiento({ nombre: n.nombre.trim(), normativa: n.normativa.trim(), categoria: n.categoria.trim(), descripcion: n.descripcion.trim() }).subscribe({
      next: () => { this.nuevo = null; this.ui.toast('Cumplimiento creado: agrégale requisitos desde Requisitos'); this.cargar(); },
      error: (e) => (this.error = mensajeError(e)),
    });
  }

  onAction(action: RowAction, row: Row): void {
    if (action === 'cargar') this.router.navigateByUrl('/sst/requisitos');
    if (action === 'eliminar') this.eliminar([row]);
  }

  /** Adds library frameworks to "Mis cumplimientos" without evidences yet. */
  agregar(rows: Row[]): void {
    if (!rows.length) return;
    this.api.agregarBiblioteca(rows.map((r) => String(r['n']))).subscribe({
      next: (n) => { this.ui.toast(n === 1 ? `Cumplimiento agregado con éxito: ${rows[0]['n']} se agregó a Mis cumplimientos` : `Cumplimientos agregados con éxito: ${n} cumplimientos se agregaron a Mis cumplimientos`); this.tab = 0; this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  private eliminar(rows: Row[]): void {
    forkJoin(rows.map((r) => this.api.eliminarCumplimiento(+r.id).pipe(map(() => ''), catchError((e) => of(mensajeError(e)))))).subscribe((r) => {
      const errores = r.filter(Boolean);
      this.ui.toast(errores.length ? errores[0] : `${rows.length} cumplimiento(s) eliminado(s)`);
      this.cargar();
    });
  }

  onBulk(action: string, rows: Row[]): void {
    if (action === 'Eliminar') this.eliminar(rows);
    else this.ui.toast('Descarga las evidencias de cada asignación desde Requisitos › Asignaciones');
  }
}
