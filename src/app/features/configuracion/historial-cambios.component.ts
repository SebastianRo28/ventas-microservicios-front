import { Component } from '@angular/core';
import { AuditService } from '../../core/audit.service';
import { downloadCsv } from '../../core/csv';
import { parseFecha } from '../../core/format';
import { Cambio } from '../../core/sample/plataforma';
import { Column, Row } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'm', label: 'Modificado por', w: 'minmax(200px, 1.3fr)' },
  { key: 'o', label: 'Origen', type: 'badge', w: 'minmax(110px, 0.7fr)' },
  { key: 'c', label: 'Colaborador', w: 'minmax(180px, 1.2fr)' },
  { key: 'd', label: 'Número de Documento', w: 'minmax(160px, 0.9fr)' },
  { key: 'e', label: 'Entidad', w: 'minmax(160px, 1fr)' },
  { key: 'a', label: 'Acción', type: 'badge', w: 'minmax(110px, 0.7fr)' },
  { key: 'f', label: 'Fecha y Hora', type: 'date', w: 'minmax(150px, 0.9fr)' },
  { key: 'p', label: 'Propiedad', w: 'minmax(140px, 0.9fr)' },
  { key: 'ea', label: 'Estado Anterior', w: 'minmax(150px, 1fr)' },
  { key: 'ec', label: 'Estado Actual', w: 'minmax(150px, 1fr)' },
];

const ORIGEN_TONE = { Web: 'neutral', Importador: 'orange', API: 'info' } as const;
const ACCION_TONE = { Crear: 'success', Modificar: 'neutral', Eliminar: 'danger' } as const;

/** P-02.8 Administración › Historial de cambios (PRO). */
@Component({
  selector: 'app-historial-cambios',
  template: `
    <app-page-header title="Historial de cambios" [crumbs]="['Administración']" [askAi]="false">
      <span header-badge class="nx-pro nx-pro--head">PRO</span>
    </app-page-header>
    <form class="nx-card nx-audit-filters" (ngSubmit)="aplicar()">
      <label class="nx-field">Desde
        <span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="desde" placeholder="DD/MM/YYYY" [(ngModel)]="f.desde"><app-icon name="calendar" [size]="16"></app-icon></span>
      </label>
      <label class="nx-field">Hasta
        <span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="hasta" placeholder="DD/MM/YYYY" [(ngModel)]="f.hasta"><app-icon name="calendar" [size]="16"></app-icon></span>
      </label>
      <label class="nx-field">Modificado por
        <select class="nx-select" name="usuario" [(ngModel)]="f.usuario"><option value="">Todos</option><option *ngFor="let u of usuarios">{{ u }}</option></select>
      </label>
      <label class="nx-field">Entidad
        <select class="nx-select" name="entidad" [(ngModel)]="f.entidad"><option value="">Todas</option><option *ngFor="let e of entidades">{{ e }}</option></select>
      </label>
      <label class="nx-field">Colaborador<input class="nx-input" name="colaborador" placeholder="Nombre o documento" [(ngModel)]="f.colaborador"></label>
      <button type="submit" class="nx-btn nx-btn--primary"><app-icon name="filter" [size]="15"></app-icon>Filtrar</button>
      <button type="button" class="nx-btn nx-btn--outline" (click)="reporte()"><app-icon name="download" [size]="15"></app-icon>Generar Reporte</button>
    </form>
    <p *ngIf="error" class="nx-error nx-mb-12">{{ error }}</p>
    <app-data-table [columns]="cols" [rows]="rows" [showFilters]="false" [showBulk]="false" [selectable]="false" [showAdvancedFilter]="false"
                    tableLabel="Historial de cambios" minWidth="1600px" exportName="historial-de-cambios"
                    emptyTitle="Sin cambios para estos filtros" emptyText="Amplía el rango de fechas o quita algún filtro"></app-data-table>
  `
})
export class HistorialCambiosComponent {
  readonly cols = COLS;
  /** From January 1st of last year until today. */
  f = { desde: `01/01/${new Date().getFullYear() - 1}`, hasta: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }), usuario: '', entidad: '', colaborador: '' };
  error = '';
  rows: Row[] = [];
  private filtrados: Cambio[] = [];

  constructor(private audit: AuditService) { this.aplicar(); audit.cargar().subscribe(() => this.aplicar()); }

  get usuarios(): string[] { return [...new Set(this.audit.cambios.map((c) => c.usuario))]; }
  get entidades(): string[] { return [...new Set(this.audit.cambios.map((c) => c.entidad.split(' #')[0]))]; }

  aplicar(): void {
    const desde = parseFecha(this.f.desde), hasta = parseFecha(this.f.hasta);
    if (!desde || !hasta) { this.error = 'Usa el formato DD/MM/YYYY en las fechas.'; return; }
    if (desde > hasta) { this.error = 'La fecha “Desde” debe ser anterior a “Hasta”.'; return; }
    this.error = '';
    hasta.setHours(23, 59, 59);
    const q = this.f.colaborador.trim().toLowerCase();
    this.filtrados = this.audit.cambios.filter((c) => {
      const fecha = parseFecha(c.fecha.slice(0, 10));
      return !!fecha && fecha >= desde && fecha <= hasta
        && (!this.f.usuario || c.usuario === this.f.usuario)
        && (!this.f.entidad || c.entidad.startsWith(this.f.entidad))
        && (!q || (c.colaborador + c.documento).toLowerCase().includes(q));
    });
    this.rows = this.filtrados.map((c) => ({
      id: c.id, m: c.usuario, o: { text: c.origen, tone: ORIGEN_TONE[c.origen] }, c: c.colaborador, d: c.documento, e: c.entidad,
      a: { text: c.accion, tone: ACCION_TONE[c.accion] }, f: c.fecha, p: c.propiedad, ea: c.anterior, ec: c.actual,
    }));
  }

  reporte(): void {
    downloadCsv(`historial-de-cambios-${this.f.desde.replace(/\//g, '-')}-a-${this.f.hasta.replace(/\//g, '-')}`,
      ['Modificado por', 'Origen', 'Colaborador', 'Número de Documento', 'Entidad', 'Acción', 'Fecha y Hora', 'Propiedad', 'Estado Anterior', 'Estado Actual'],
      this.filtrados.map((c) => [c.usuario, c.origen, c.colaborador, c.documento, c.entidad, c.accion, c.fecha, c.propiedad, c.anterior, c.actual]));
  }
}
