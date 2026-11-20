import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { PortalService } from '../../core/portal.service';
import { Reconocimiento, VALORES_RECONOCIMIENTO } from '../../core/sample/reportes';
import { UiStateService } from '../../core/ui-state.service';

const MAX = 280;

/** Mi Portal › Reconocimientos: recognitions received and sent, and recognizing a colleague with a company value. */
@Component({
  selector: 'app-reconocimientos-portal',
  template: `
    <app-page-header title="Reconocimientos" [crumbs]="['Mi Portal']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="abrir()"><app-icon name="award" [size]="16"></app-icon>Reconocer</button>
    </app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Recibidos</span><b>{{ recibidos }}</b></div>
      <div class="nx-card nx-stat"><span>Enviados</span><b>{{ enviados }}</b></div>
      <div class="nx-card nx-stat nx-span-2"><span>Valor más reconocido en la empresa</span><b class="nx-stat__text">{{ top }}</b></div>
    </div>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <div class="nx-stack nx-stack--16">
      <article *ngFor="let r of visibles" class="nx-card nx-recog-card">
        <span class="nx-recog-card__medal" [style.background]="color(r.valor)"><app-icon [name]="icono(r.valor)" [size]="22"></app-icon></span>
        <div class="nx-grow">
          <p class="nx-mt-0 nx-mb-0"><b>{{ r.autor }}</b> reconoció a <b>{{ r.para }}</b></p>
          <span class="nx-badge nx-badge--sm nx-recog-card__valor" [style.color]="color(r.valor)" [style.border-color]="color(r.valor)">{{ r.valor }}</span>
          <p class="nx-recog-card__msg">“{{ r.mensaje }}”</p>
          <span class="nx-muted nx-small">{{ r.fecha }}</span>
        </div>
      </article>
      <div *ngIf="!visibles.length" class="nx-card nx-empty"><b>{{ tab === 1 ? 'Aún no has recibido reconocimientos' : tab === 2 ? 'Aún no has reconocido a nadie' : 'No hay reconocimientos' }}</b>
        <span *ngIf="tab === 2">Usa “Reconocer” para destacar el trabajo de un colega.</span></div>
    </div>

    <app-modal *ngIf="modal as m" title="Reconocer a un colega" width="640px" (closed)="modal = null">
      <form id="rec-form" class="nx-form" (ngSubmit)="enviar()">
        <label class="nx-field">¿A quién quieres reconocer?*
          <select class="nx-select" name="para" [(ngModel)]="m.para">
            <option value="" disabled>Selecciona un colega</option>
            <option *ngFor="let c of colegas" [value]="c.apellidos + ', ' + c.nombres">{{ c.apellidos }}, {{ c.nombres }}</option>
          </select>
        </label>
        <span class="nx-field-label nx-mb-0">Valor*</span>
        <div class="nx-recog-values" role="radiogroup" aria-label="Valor">
          <button *ngFor="let v of valores" type="button" role="radio" class="nx-recog-value" [attr.aria-checked]="m.valor === v.nombre"
                  [class.is-on]="m.valor === v.nombre" [style.--valor]="v.color" (click)="m.valor = v.nombre">
            <app-icon [name]="v.icono" [size]="18"></app-icon>{{ v.nombre }}</button>
        </div>
        <label class="nx-field">Mensaje*
          <textarea class="nx-textarea" name="mensaje" rows="3" [maxlength]="max" placeholder="Cuéntale qué valoras de su trabajo" [(ngModel)]="m.mensaje"></textarea>
          <span class="nx-hint">{{ m.mensaje.length }} / {{ max }}</span>
        </label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = null">Cancelar</button>
        <button type="submit" form="rec-form" class="nx-btn nx-btn--primary">Publicar</button>
      </ng-container>
    </app-modal>
  `
})
export class ReconocimientosPortalComponent implements OnDestroy {
  readonly tabs = ['Todos', 'Recibidos', 'Enviados'];
  readonly valores = VALORES_RECONOCIMIENTO;
  readonly max = MAX;
  tab = 0;
  lista: Reconocimiento[] = [];
  colegas: Colaborador[] = [];
  yo = '';
  modal: { para: string; valor: string; mensaje: string } | null = null;
  intento = false;
  private sub: Subscription;

  constructor(data: HrDataService, private portal: PortalService, private ui: UiStateService) {
    this.sub = combineLatest([data.colaboradores(), portal.reconocimientos$]).subscribe(([cs, rs]) => {
      const yo = cs.find((c) => c.id === portal.yoId);
      this.yo = yo ? `${yo.apellidos}, ${yo.nombres}` : '';
      this.colegas = cs.filter((c) => c.id !== portal.yoId);
      this.lista = rs;
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get recibidos(): number { return this.lista.filter((r) => r.para === this.yo).length; }
  get enviados(): number { return this.lista.filter((r) => r.autor === this.yo).length; }
  get visibles(): Reconocimiento[] {
    return this.lista.filter((r) => this.tab === 0 || (this.tab === 1 ? r.para === this.yo : r.autor === this.yo));
  }
  get top(): string {
    const cuenta = new Map<string, number>();
    for (const r of this.lista) cuenta.set(r.valor, (cuenta.get(r.valor) ?? 0) + 1);
    const [v, n] = [...cuenta].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
    return n ? `${v} (${n})` : '—';
  }
  color(valor: string): string { return this.valores.find((v) => v.nombre === valor)?.color ?? '#2D4DA4'; }
  icono(valor: string): string { return this.valores.find((v) => v.nombre === valor)?.icono ?? 'award'; }

  abrir(): void { this.intento = false; this.modal = { para: '', valor: '', mensaje: '' }; }
  get error(): string {
    const m = this.modal;
    if (!m) return '';
    if (!m.para) return 'Selecciona a quién reconoces.';
    if (!m.valor) return 'Elige el valor que representa su trabajo.';
    if (m.mensaje.trim().length < 10) return 'Escribe un mensaje de al menos 10 caracteres.';
    return '';
  }
  enviar(): void {
    this.intento = true;
    const m = this.modal;
    if (!m || this.error) return;
    this.portal.reconocer({ para: m.para, autor: this.yo, valor: m.valor, mensaje: m.mensaje.trim() });
    this.modal = null;
    this.tab = 2;
    this.ui.toast(`Reconocimiento publicado para ${m.para.split(', ').reverse().join(' ')}`);
  }
}
