import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mensajeError } from '../../core/auth.service';
import { ComunicacionService, EncuestaAdmin, ResultadosEncuesta } from '../../core/comunicacion.service';
import { ESTADO_ENCUESTA_TONE } from '../../core/sample/operaciones';
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
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '140px' },
];

/**
 * P-13.1 Encuestas Libres and P-13.6 Encuestas de Clima (same screen, the route says which). Surveys come from the API;
 * collaborators answer them in Mi Portal › Mis Encuestas. Results of anonymous surveys stay hidden until they reach
 * the minimum number of answers (Encuestas › Configuraciones).
 */
@Component({
  selector: 'app-encuestas-admin',
  template: `
    <app-page-header [title]="tipo === 'Clima' ? 'Encuestas de Clima' : 'Encuestas Libres'" [crumbs]="['Desarrollo Organizacional', 'Encuestas']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Activas', 'Historial']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="pick(i)">{{ t }}</button>
    </div>
    <app-data-table [columns]="columns" [rows]="rows" [createLabel]="tipo === 'Clima' ? 'Crear Encuesta de Clima' : 'Crear Encuesta Libre'" [rowActions]="actions"
                    [showBulk]="false" [selectable]="false" [showAdvancedFilter]="false" [tableLabel]="tipo === 'Clima' ? 'Encuestas de clima' : 'Encuestas libres'"
                    minWidth="1300px" [exportName]="tipo === 'Clima' ? 'encuestas-clima' : 'encuestas-libres'"
                    (create)="openModal()" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="modal" [title]="form ? form.plantilla : (tipo === 'Clima' ? 'Crear Encuesta de Clima' : 'Nueva encuesta')" width="720px" (closed)="modal = false">
      <div *ngIf="!form" class="nx-form">
        <label class="nx-input-icon"><app-icon name="search" [size]="16"></app-icon>
          <input aria-label="Buscar plantilla" placeholder="Buscar plantilla" [(ngModel)]="query"></label>
        <div class="nx-templates">
          <button *ngFor="let t of plantillasFiltradas" type="button" class="nx-template nx-template--col" (click)="elegir(t)">
            <span class="nx-iconbox nx-iconbox--34"><app-icon name="clipcheck" [size]="18"></app-icon></span><b>{{ t }}</b>
          </button>
        </div>
      </div>
      <form *ngIf="form as f" id="enc-form" class="nx-form" (ngSubmit)="crear()">
        <label class="nx-field">Nombre<input class="nx-input" name="nombre" maxlength="120" [(ngModel)]="f.nombre" [placeholder]="f.plantilla"></label>
        <label class="nx-field">Descripción para los colaboradores<textarea class="nx-textarea" name="descripcion" rows="2" maxlength="500" [(ngModel)]="f.descripcion"></textarea></label>
        <div class="nx-grid nx-grid--2">
          <label class="nx-field">Inicio (DD/MM/AAAA)*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="inicio" [(ngModel)]="f.inicio"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Término (DD/MM/AAAA)*<span class="nx-input-icon nx-input-icon--end"><input nxFecha class="nx-input" name="termino" [(ngModel)]="f.termino"><app-icon name="calendar" [size]="16"></app-icon></span></label>
        </div>
        <label class="nx-check nx-check--plain"><input type="checkbox" name="anonima" [(ngModel)]="f.anonima">Anónima: las respuestas no se asocian al nombre de quien responde</label>
        <span class="nx-hint">Va dirigida a todos los colaboradores. Las preguntas son las de la plantilla.</span>
        <span *ngIf="errorApi" class="nx-error" role="alert">{{ errorApi }}</span>
      </form>
      <ng-container modal-footer>
        <button *ngIf="form" type="button" class="nx-btn nx-btn--outline" (click)="form = null">Volver</button>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = false">Cancelar</button>
        <button *ngIf="form" type="submit" form="enc-form" class="nx-btn nx-btn--primary" [disabled]="ocupado">Crear encuesta</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="resultados as r" [title]="'Resultados · ' + r.encuesta.nombre" width="760px" (closed)="resultados = null">
      <p class="nx-mt-0 nx-muted">{{ r.encuesta.respondidas }} de {{ r.encuesta.participantes }} respondieron ({{ r.encuesta.avance }} %) · {{ r.encuesta.estado }}{{ r.encuesta.anonima ? ' · anónima' : '' }}</p>
      <div *ngIf="r.ocultos" class="nx-banner nx-banner--compact" role="note"><app-icon name="lock" [size]="16"></app-icon>
        <span>Para proteger el anonimato, los resultados se muestran desde {{ r.minimo }} respuestas.</span></div>
      <section *ngFor="let p of r.preguntas; let i = index" class="nx-mb-16">
        <h3 class="nx-section__title">{{ i + 1 }}. {{ p.texto }}<span *ngIf="p.promedio !== null" class="nx-muted"> · promedio {{ p.promedio }}</span></h3>
        <div *ngFor="let o of opciones(p.conteo)" class="nx-perm">
          <span class="nx-grow">{{ o[0] }}</span>
          <span class="nx-progress"><span class="nx-progress__track"><span [style.width.%]="pct(o[1], p.conteo)"></span></span><span class="nx-progress__text">{{ o[1] }}</span></span>
        </div>
        <ul *ngIf="p.tipo === 'texto'" class="nx-small">
          <li *ngFor="let c of p.comentarios">{{ c }}</li>
          <li *ngIf="!p.comentarios.length" class="nx-muted">Sin comentarios</li>
        </ul>
      </section>
      <ng-container modal-footer><button type="button" class="nx-btn nx-btn--primary" (click)="resultados = null">Cerrar</button></ng-container>
    </app-modal>
  `
})
export class EncuestasAdminComponent {
  readonly columns = COLUMNS;
  readonly actions: RowAction[] = ['ver', 'pausa', 'eliminar'];
  readonly tipo: 'Clima' | 'Libre';
  tab = 0;
  rows: Row[] = [];
  modal = false;
  query = '';
  plantillas: string[] = [];
  form: { plantilla: string; nombre: string; descripcion: string; inicio: string; termino: string; anonima: boolean } | null = null;
  errorApi = '';
  ocupado = false;
  resultados: ResultadosEncuesta | null = null;
  private all: EncuestaAdmin[] = [];

  constructor(route: ActivatedRoute, private api: ComunicacionService, private ui: UiStateService) {
    this.tipo = route.snapshot.data['tipoEncuesta'] === 'Clima' ? 'Clima' : 'Libre';
    this.cargar();
  }

  private cargar(): void {
    this.api.encuestas(this.tipo).subscribe({ next: (e) => { this.all = e; this.pick(this.tab); }, error: (e) => this.ui.toast(mensajeError(e)) });
  }

  pick(i: number): void {
    this.tab = i;
    this.rows = this.all.filter((e) => (e.estado === 'Finalizada') === (i === 1)).map((e) => ({
      id: e.id, n: e.nombre + (e.anonima ? ' (anónima)' : ''), fc: e.creada, fi: e.inicio, ft: e.termino, p: e.participantes,
      e: { text: e.estado, tone: ESTADO_ENCUESTA_TONE[e.estado] }, a: { text: `${e.avance} %`, pct: e.avance }, x: '',
    }));
  }

  get plantillasFiltradas(): string[] { const q = this.query.trim().toLowerCase(); return this.plantillas.filter((t) => !q || t.toLowerCase().includes(q)); }

  openModal(): void {
    this.query = ''; this.form = null; this.errorApi = ''; this.modal = true;
    this.api.plantillasEncuesta().subscribe((p) => (this.plantillas = this.tipo === 'Clima' ? p.clima : p.libre));
  }
  elegir(plantilla: string): void {
    const hoy = new Date();
    const f = (d: Date) => d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.form = { plantilla, nombre: '', descripcion: '', inicio: f(hoy), termino: f(new Date(hoy.getTime() + 14 * 864e5)), anonima: this.tipo === 'Clima' };
  }

  crear(): void {
    const f = this.form;
    if (!f || this.ocupado) return;
    this.ocupado = true;
    this.errorApi = '';
    this.api.crearEncuesta({ ...f, tipo: this.tipo, nombre: f.nombre.trim(), inicio: f.inicio.trim(), termino: f.termino.trim() }).subscribe({
      next: (e) => { this.ocupado = false; this.modal = false; this.ui.toast(`Encuesta “${e.nombre}” creada (${e.estado.toLowerCase()})`); this.cargar(); },
      error: (e) => { this.ocupado = false; this.errorApi = mensajeError(e); },
    });
  }

  onAction(action: RowAction, row: Row): void {
    const e = this.all.find((x) => x.id === row.id);
    if (!e) return;
    if (action === 'ver') this.api.resultados(e.id).subscribe({ next: (r) => (this.resultados = r), error: (x) => this.ui.toast(mensajeError(x)) });
    if (action === 'pausa') {
      if (e.estado !== 'En curso') { this.ui.toast('Solo se pueden cerrar encuestas en curso'); return; }
      this.api.cerrarEncuesta(e.id).subscribe({ next: () => { this.ui.toast(`Encuesta “${e.nombre}” cerrada`); this.cargar(); }, error: (x) => this.ui.toast(mensajeError(x)) });
    }
    if (action === 'eliminar') {
      this.api.eliminarEncuesta(e.id).subscribe({ next: () => { this.ui.toast(`Encuesta “${e.nombre}” eliminada`); this.cargar(); }, error: (x) => this.ui.toast(mensajeError(x)) });
    }
  }

  opciones(conteo: Record<string, number>): [string, number][] { return Object.entries(conteo); }
  pct(n: number, conteo: Record<string, number>): number { const t = Object.values(conteo).reduce((s, x) => s + x, 0); return t ? Math.round((n / t) * 100) : 0; }
}
