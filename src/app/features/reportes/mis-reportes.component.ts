import { Component } from '@angular/core';
import { combineLatest } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { downloadCsv } from '../../core/csv';
import { soles } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { ItemsService, vigenteEn } from '../../core/items.service';
import { Colaborador } from '../../core/models';
import { PortalService } from '../../core/portal.service';

interface Plantilla { id: string; titulo: string; descripcion: string; categoria: string; porArea: boolean; }
interface Tabla { cabeceras: string[]; filas: string[][]; }

const PLANTILLAS: Plantilla[] = [
  { id: 'maestro', titulo: 'Maestro de empleados', descripcion: 'Datos organizacionales y de ingreso de cada colaborador vigente.', categoria: 'Administrativo', porArea: true },
  { id: 'saldos', titulo: 'Saldos de vacaciones', descripcion: 'Saldo inicial, devengado, tomado y saldo a la fecha de corte.', categoria: 'Asistencia', porArea: true },
  { id: 'vacaciones', titulo: 'Registro de vacaciones', descripcion: 'Vacaciones tomadas y programadas con fechas y días.', categoria: 'Asistencia', porArea: true },
  { id: 'ausencias', titulo: 'Ausencias', descripcion: 'Descansos médicos, licencias, permisos y faltas con su efecto en planilla.', categoria: 'Asistencia', porArea: true },
  { id: 'items', titulo: 'Ítems del período', descripcion: 'Ítems asignados a mano o enviados desde Datos de KPI, vigentes en el período de corte.', categoria: 'Remuneraciones', porArea: true },
  { id: 'reconocimientos', titulo: 'Reconocimientos', descripcion: 'Reconocimientos publicados con su valor y autor.', categoria: 'Desarrollo Organizacional', porArea: false },
];

/** Reportería › Reportes › Mis Reportes: reports generated from the live data, with preview and CSV download. */
@Component({
  selector: 'app-mis-reportes',
  template: `
    <app-page-header title="Mis Reportes" [crumbs]="['Reportería', 'Reportes']"></app-page-header>
    <div class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Estos reportes se generan con los datos actuales de Nexo RH. Para programar envíos o usar más plantillas, ve a <a routerLink="/rep/exportadores">Exportadores</a>.</span></div>
    <div class="nx-benefits nx-mb-20">
      <button *ngFor="let p of plantillas" type="button" class="nx-card nx-benefit nx-proc" [class.is-on]="sel?.id === p.id" [attr.aria-pressed]="sel?.id === p.id" (click)="elegir(p)">
        <span class="nx-iconbox nx-iconbox--38"><app-icon name="filebar" [size]="18"></app-icon></span>
        <b>{{ p.titulo }}</b><span class="nx-badge nx-badge--sm nx-tone-gray nx-self-start">{{ p.categoria }}</span>
        <span class="nx-muted nx-small">{{ p.descripcion }}</span>
      </button>
    </div>
    <section *ngIf="sel && tabla" class="nx-card nx-pad">
      <div class="nx-section__head">
        <h2>{{ sel.titulo }}</h2>
        <select *ngIf="sel.porArea" class="nx-select nx-select--sm nx-w-200" aria-label="Filtrar por área" [(ngModel)]="area" (ngModelChange)="generar()">
          <option value="">Todas las áreas</option><option *ngFor="let a of areas">{{ a }}</option>
        </select>
        <button type="button" class="nx-btn nx-btn--primary nx-btn--sm" [disabled]="!tabla.filas.length" (click)="descargar()"><app-icon name="download" [size]="15"></app-icon>Descargar CSV</button>
      </div>
      <p class="nx-muted nx-small">{{ tabla.filas.length }} filas{{ tabla.filas.length > 10 ? ' · vista previa de las primeras 10' : '' }}</p>
      <div class="nx-dt__scroll">
        <table class="nx-table" [attr.aria-label]="'Vista previa: ' + sel.titulo">
          <thead><tr><th *ngFor="let h of tabla.cabeceras">{{ h }}</th></tr></thead>
          <tbody>
            <tr *ngFor="let f of tabla.filas.slice(0, 10)"><td *ngFor="let c of f">{{ c }}</td></tr>
            <tr *ngIf="!tabla.filas.length"><td [attr.colspan]="tabla.cabeceras.length"><div class="nx-empty nx-empty--compact"><b>Sin datos para este filtro</b></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class MisReportesComponent {
  readonly plantillas = PLANTILLAS;
  sel: Plantilla | null = null;
  tabla: Tabla | null = null;
  area = '';
  areas: string[] = [];
  private cs: Colaborador[] = [];

  constructor(data: HrDataService, private asis: AsistenciaService, private items: ItemsService, private portal: PortalService) {
    combineLatest([data.colaboradores()]).subscribe(([cs]) => { this.cs = cs; this.areas = [...new Set(cs.map((c) => c.area))].sort(); });
  }

  elegir(p: Plantilla): void { this.sel = p; this.area = ''; this.generar(); }

  private nombre(id: number): string { const c = this.cs.find((x) => x.id === id); return c ? `${c.apellidos}, ${c.nombres}` : '—'; }
  private enArea(id: number): boolean { return !this.area || this.cs.find((c) => c.id === id)?.area === this.area; }

  generar(): void {
    const p = this.sel;
    if (!p) return;
    const corte = this.asis.corte;
    const periodo = corte.slice(3);
    const t: Record<string, () => Tabla> = {
      maestro: () => ({ cabeceras: ['Apellidos', 'Nombres', 'Documento', 'Cargo', 'División', 'Área', 'Sub-área', 'Ingreso'],
        filas: this.cs.filter((c) => this.enArea(c.id)).map((c) => [c.apellidos, c.nombres, c.documento, c.cargo, c.division, c.area, c.subArea, c.ingreso]) }),
      saldos: () => ({ cabeceras: ['Colaborador', 'Área', 'Saldo inicial', 'Devengado', 'Tomado', 'Programado', `Saldo al ${corte}`],
        filas: this.cs.filter((c) => this.enArea(c.id)).map((c) => [`${c.apellidos}, ${c.nombres}`, c.area, String(this.asis.saldoInicial(c)),
          (Math.round((this.asis.devengado(c) - this.asis.saldoInicial(c)) * 100) / 100).toFixed(2), String(this.asis.tomados(c.id)), String(this.asis.programados(c.id)), this.asis.saldo(c).toFixed(2)]) }),
      vacaciones: () => ({ cabeceras: ['ID', 'Colaborador', 'Desde', 'Hasta', 'Días', 'Origen', 'Observación'],
        filas: this.asis.vacaciones$.value.filter((v) => this.enArea(v.colaboradorId)).map((v) => [String(v.id), this.nombre(v.colaboradorId), v.desde, v.hasta, String(v.dias), v.origen, v.observacion]) }),
      ausencias: () => ({ cabeceras: ['ID', 'Colaborador', 'Tipo', 'Desde', 'Hasta', 'Días', 'Observación'],
        filas: this.asis.ausencias$.value.filter((a) => this.enArea(a.colaboradorId)).map((a) => [String(a.id), this.nombre(a.colaboradorId), a.tipo, a.desde, a.hasta, String(a.dias), a.observacion]) }),
      items: () => ({ cabeceras: ['Colaborador', 'Código', 'Ítem', 'Clase', 'PLAME', 'Monto', 'Vigencia'],
        filas: this.items.asignaciones$.value.filter((a) => vigenteEn(a, periodo) && this.enArea(a.colaboradorId)).map((a) => {
          const ti = this.items.tipo(a.tipoId);
          return [this.nombre(a.colaboradorId), ti?.codigo ?? '—', ti?.nombre ?? '—', ti?.clase ?? '—', ti?.plame ?? '—', soles(a.monto), `${a.desde} – ${a.hasta || 'indefinido'}`];
        }) }),
      reconocimientos: () => ({ cabeceras: ['Fecha', 'Para', 'Autor', 'Valor', 'Mensaje'],
        filas: this.portal.reconocimientos$.value.map((r) => [r.fecha, r.para, r.autor, r.valor, r.mensaje]) }),
    };
    this.tabla = t[p.id]();
  }

  descargar(): void {
    if (!this.sel || !this.tabla) return;
    const slug = this.sel.titulo.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-');
    downloadCsv(`${slug}${this.area ? '-' + this.area.toLowerCase().replace(/\s+/g, '-') : ''}`, this.tabla.cabeceras, this.tabla.filas);
  }
}
