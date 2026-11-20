import { Component } from '@angular/core';
import { downloadCsv } from '../../core/csv';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

type EstadoCarga = 'Exitosa' | 'Con errores' | 'Fallida';
interface ErrorCarga { fila: number; campo: string; mensaje: string; }
interface Carga { id: number; importador: string; archivo: string; usuario: string; fecha: string; registros: number; errores: ErrorCarga[]; estado: EstadoCarga; }

const CARGAS: Carga[] = [
  { id: 58, importador: 'Horas Extras', archivo: 'horas-extras-marzo.csv', usuario: 'Lucía Cáceres', fecha: '15/03/2026 17:20', registros: 14, estado: 'Exitosa', errores: [] },
  { id: 57, importador: 'Saldo Vacaciones', archivo: 'saldos-iniciales-2025.csv', usuario: 'Rodrigo Paredes', fecha: '02/01/2025 09:05', registros: 16, estado: 'Exitosa', errores: [] },
  { id: 56, importador: 'Colaboradores', archivo: 'altas-marzo.csv', usuario: 'Lucía Cáceres', fecha: '01/03/2026 08:40', registros: 3, estado: 'Con errores', errores: [
    { fila: 3, campo: 'numero_documento', mensaje: 'El DNI 7523698 tiene 7 dígitos; debe tener 8.' },
    { fila: 4, campo: 'fecha_ingreso', mensaje: 'Fecha 31/02/2026 no válida.' },
  ] },
  { id: 55, importador: 'Asignación Políticas de Vacaciones', archivo: 'politicas.xlsx', usuario: 'Rodrigo Paredes', fecha: '20/02/2026 11:12', registros: 0, estado: 'Fallida', errores: [
    { fila: 1, campo: '—', mensaje: 'El archivo no tiene las columnas esperadas: rut_o_documento, politica.' },
  ] },
  { id: 54, importador: 'Centros de Costo', archivo: 'centros-costo.csv', usuario: 'Lucía Cáceres', fecha: '28/02/2026 10:05', registros: 6, estado: 'Exitosa', errores: [] },
];
const TONE: Record<EstadoCarga, 'success' | 'warning' | 'danger'> = { Exitosa: 'success', 'Con errores': 'warning', Fallida: 'danger' };

const COLS: Column[] = [
  { key: 'id', label: 'N°', w: '70px' },
  { key: 'i', label: 'Importador', filter: 'select', w: 'minmax(200px, 1.3fr)' },
  { key: 'a', label: 'Archivo', w: 'minmax(180px, 1.2fr)' },
  { key: 'u', label: 'Usuario', filter: 'select', w: 'minmax(140px, 0.9fr)' },
  { key: 'f', label: 'Fecha', type: 'date', filter: 'date', w: 'minmax(140px, 0.9fr)' },
  { key: 'r', label: 'Registros cargados', type: 'number', filter: 'none', w: 'minmax(140px, 0.8fr)' },
  { key: 'n', label: 'Errores', type: 'number', filter: 'none', w: '90px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(120px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

/** Reportería › Importadores › Historial de Cargas: past imports with their result and an error log to download. */
@Component({
  selector: 'app-historial-cargas',
  template: `
    <app-page-header title="Historial de Cargas" [crumbs]="['Reportería', 'Importadores']">
      <a class="nx-btn nx-btn--primary" routerLink="/rep/importadores"><app-icon name="upload" [size]="16"></app-icon>Nueva carga</a>
    </app-page-header>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="acciones" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Historial de cargas" minWidth="1300px" exportName="historial-cargas" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="sel as c" [title]="'Carga N° ' + c.id + ' · ' + c.importador" width="620px" (closed)="sel = null">
      <div class="nx-fieldrow"><span>Archivo</span><span>{{ c.archivo }}</span></div>
      <div class="nx-fieldrow"><span>Cargado por</span><span>{{ c.usuario }} · {{ c.fecha }}</span></div>
      <div class="nx-fieldrow"><span>Resultado</span><span>{{ c.registros }} registros cargados · {{ c.errores.length }} con error</span></div>
      <table *ngIf="c.errores.length" class="nx-table nx-mt-16" aria-label="Errores de la carga">
        <thead><tr><th>Fila</th><th>Campo</th><th>Error</th></tr></thead>
        <tbody><tr *ngFor="let e of c.errores"><td>{{ e.fila }}</td><td><code>{{ e.campo }}</code></td><td>{{ e.mensaje }}</td></tr></tbody>
      </table>
      <ng-container modal-footer>
        <button *ngIf="c.errores.length" type="button" class="nx-btn nx-btn--outline" (click)="descargar(c)"><app-icon name="download" [size]="15"></app-icon>Descargar errores</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="sel = null">Cerrar</button>
      </ng-container>
    </app-modal>
  `
})
export class HistorialCargasComponent {
  readonly cols = COLS;
  readonly acciones: RowAction[] = ['ver', 'descargar'];
  readonly rows: Row[] = CARGAS.map((c) => ({
    id: c.id, i: c.importador, a: c.archivo, u: c.usuario, f: c.fecha, r: c.registros, n: c.errores.length, e: { text: c.estado, tone: TONE[c.estado] }, x: '',
  }));
  sel: Carga | null = null;

  onAction(action: RowAction, row: Row): void {
    const c = CARGAS.find((x) => x.id === row.id);
    if (!c) return;
    if (action === 'ver') this.sel = c;
    if (action === 'descargar') this.descargar(c);
  }

  /** Error log as CSV; a load without errors downloads its summary. */
  descargar(c: Carga): void {
    downloadCsv(`carga-${c.id}-errores`, ['Fila', 'Campo', 'Error'],
      c.errores.length ? c.errores.map((e) => [String(e.fila), e.campo, e.mensaje]) : [['—', '—', `Sin errores: ${c.registros} registros cargados`]]);
  }
}
