import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { ComunicacionService, DenunciaDetalle, DenunciaResumen, EstadoDenunciaApi } from '../../core/comunicacion.service';
import { ESTADO_DENUNCIA_TONE } from '../../core/sample/operaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLUMNS: Column[] = [
  { key: 'c', label: 'Id de acceso', w: 'minmax(160px, 1fr)' },
  { key: 'm', label: 'Nuevos Mensajes', type: 'number', filter: 'none', w: '150px' },
  { key: 't', label: 'Tipo de denuncia', filter: 'select', w: 'minmax(200px, 1.4fr)' },
  { key: 'r', label: 'Relación con la Empresa', filter: 'select', w: 'minmax(180px, 1fr)' },
  { key: 'f', label: 'Fecha de creación', type: 'date', filter: 'date', w: '150px' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: '120px' },
  { key: 'u', label: 'Última actualización', type: 'date', filter: 'date', w: '160px' },
  { key: 'x', label: 'Ver', type: 'actions', filter: 'none', sortable: false, w: '70px' },
];

/**
 * P-07.5 Canal de denuncias › Denuncias (comité). Active = Nueva / En curso; Historial = closed cases. The detail shows
 * the report, the conversation with the reporter (who follows it with the access code) and lets the committee reply
 * and close it with a conclusion. The reporter's identity is shown only when the report was not anonymous.
 */
@Component({
  selector: 'app-denuncias',
  template: `
    <app-page-header title="Denuncias" [crumbs]="['Desarrollo Organizacional', 'Canal de denuncias']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Activas', 'Historial']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pick(i)">{{ t }}</button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" [rowActions]="actions" [showBulk]="false" [selectable]="false"
                    [showAdvancedFilter]="false" tableLabel="Denuncias" minWidth="1200px" exportName="denuncias"
                    [emptyTitle]="tab === 0 ? 'No hay denuncias activas' : 'Aún no hay denuncias cerradas'"
                    (action)="abrir($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="det as d" [title]="'Denuncia · ID ' + d.resumen.codigo" width="760px" (closed)="det = null">
      <div class="nx-fields nx-fields--3 nx-mb-12">
        <div class="nx-fieldrow"><span>Tipo</span><span>{{ d.resumen.tipo }}</span></div>
        <div class="nx-fieldrow"><span>Relación</span><span>{{ d.resumen.relacion }}</span></div>
        <div class="nx-fieldrow"><span>Estado</span><span class="nx-badge" [ngClass]="'nx-tone-' + tone(d.resumen.estado)">{{ d.resumen.estado }}</span></div>
        <div class="nx-fieldrow"><span>Recibida</span><span>{{ d.resumen.creada }}</span></div>
        <div class="nx-fieldrow"><span>Denunciante</span><span>{{ d.anonima ? 'Anónimo' : d.denunciante }}</span></div>
      </div>
      <h3 class="nx-section__title">Hechos denunciados</h3>
      <p class="nx-mt-0" style="white-space: pre-line">{{ d.descripcion }}</p>
      <h3 class="nx-section__title">Conversación</h3>
      <div class="nx-stack nx-mb-12">
        <div *ngFor="let m of d.mensajes" class="nx-card nx-msg" [class.nx-msg--mio]="m.autor === 'Comité'">
          <span class="nx-small nx-muted">{{ m.autor }} · {{ m.fecha }}</span><p class="nx-mt-0 nx-mb-0">{{ m.texto }}</p>
        </div>
        <p *ngIf="!d.mensajes.length" class="nx-muted nx-small">Aún no hay mensajes.</p>
      </div>
      <ng-container *ngIf="abierta(d)">
        <label class="nx-field">Responder al denunciante
          <textarea class="nx-textarea" rows="2" maxlength="2000" [(ngModel)]="respuesta" name="respuesta"></textarea></label>
        <div class="nx-row nx-row--right nx-mb-12"><button type="button" class="nx-btn nx-btn--outline" [disabled]="!respuesta.trim() || ocupado" (click)="responder(d)">Enviar respuesta</button></div>
        <div class="nx-grid nx-grid--2">
          <label class="nx-field">Cambiar estado
            <select class="nx-select" [(ngModel)]="nuevoEstado" name="estado"><option *ngFor="let e of estados" [value]="e">{{ e }}</option></select></label>
          <label class="nx-field">Conclusión {{ nuevoEstado === 'Finalizada' || nuevoEstado === 'Descartada' ? '*' : '' }}
            <textarea class="nx-textarea" rows="2" maxlength="1000" [(ngModel)]="resolucion" name="resolucion"></textarea></label>
        </div>
      </ng-container>
      <p *ngIf="!abierta(d)" class="nx-small"><b>Conclusión:</b> {{ d.resolucion || '—' }}</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="det = null">Cerrar</button>
        <button *ngIf="abierta(d)" type="button" class="nx-btn nx-btn--primary" [disabled]="ocupado || nuevoEstado === d.resumen.estado" (click)="cambiarEstado(d)">Guardar estado</button>
      </ng-container>
    </app-modal>
  `
})
export class DenunciasComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['ver'];
  readonly estados: EstadoDenunciaApi[] = ['Nueva', 'En curso', 'Finalizada', 'Descartada'];
  tab = 0;
  rows: Row[] = [];
  det: DenunciaDetalle | null = null;
  respuesta = '';
  nuevoEstado: EstadoDenunciaApi = 'Nueva';
  resolucion = '';
  ocupado = false;
  private all: DenunciaResumen[] = [];

  constructor(private api: ComunicacionService, public ui: UiStateService) { this.cargar(); }

  private cargar(): void {
    this.api.denuncias().subscribe({ next: (d) => { this.all = d; this.pick(this.tab); }, error: (e) => this.ui.toast(mensajeError(e)) });
  }
  tone(e: EstadoDenunciaApi): string { return ESTADO_DENUNCIA_TONE[e]; }
  abierta(d: DenunciaDetalle): boolean { return d.resumen.estado === 'Nueva' || d.resumen.estado === 'En curso'; }

  pick(i: number): void {
    this.tab = i;
    const activa = (d: DenunciaResumen) => d.estado === 'Nueva' || d.estado === 'En curso';
    this.rows = this.all.filter((d) => activa(d) === (i === 0)).map((d) => ({
      id: d.id, c: `ID - ${d.codigo}`, m: d.nuevosMensajes, t: d.tipo, r: d.relacion, f: d.creada,
      e: { text: d.estado, tone: ESTADO_DENUNCIA_TONE[d.estado] }, u: d.actualizada, x: '',
    }));
  }

  abrir(_a: RowAction, row: Row): void {
    this.api.denuncia(+row.id).subscribe({
      next: (d) => { this.mostrar(d); this.cargar(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
  private mostrar(d: DenunciaDetalle): void { this.det = d; this.respuesta = ''; this.nuevoEstado = d.resumen.estado; this.resolucion = d.resolucion; }

  responder(d: DenunciaDetalle): void {
    this.ocupado = true;
    this.api.responderDenuncia(d.resumen.id, this.respuesta.trim()).subscribe({
      next: (x) => { this.ocupado = false; this.mostrar(x); this.ui.toast('Respuesta enviada: el denunciante la verá con su código'); this.cargar(); },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }
  cambiarEstado(d: DenunciaDetalle): void {
    this.ocupado = true;
    this.api.estadoDenuncia(d.resumen.id, this.nuevoEstado, this.resolucion.trim()).subscribe({
      next: (x) => { this.ocupado = false; this.mostrar(x); this.ui.toast(`Denuncia ${x.resumen.estado.toLowerCase()}`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }
}
