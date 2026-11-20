import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { mensajeError } from '../../core/auth.service';
import { PortalService } from '../../core/portal.service';
import { EncuestaPortal, Pregunta } from '../../core/sample/portal';
import { UiStateService } from '../../core/ui-state.service';

/** Mi Portal › Mis Encuestas: pending and answered surveys; answering one updates the counter in the menu. */
@Component({
  selector: 'app-mis-encuestas',
  template: `
    <app-page-header title="Mis Encuestas" [crumbs]="['Mi Portal']"></app-page-header>
    <ng-container *ngIf="!abierta">
      <h2 class="nx-section__title">Pendientes ({{ pendientes.length }})</h2>
      <div class="nx-stack nx-stack--16 nx-mb-20">
        <article *ngFor="let e of pendientes" class="nx-card nx-survey">
          <span class="nx-iconbox nx-iconbox--38"><app-icon name="clipcheck" [size]="18"></app-icon></span>
          <div class="nx-grow">
            <b>{{ e.nombre }}</b>
            <p class="nx-muted nx-small nx-mt-0 nx-mb-0">{{ e.descripcion }}</p>
            <span class="nx-small">{{ e.preguntas.length }} preguntas · cierra el {{ e.termino }}<ng-container *ngIf="e.anonima"> · anónima</ng-container></span>
          </div>
          <button type="button" class="nx-btn nx-btn--primary" (click)="abrir(e)">Responder</button>
        </article>
        <div *ngIf="!pendientes.length" class="nx-card nx-empty nx-empty--compact"><b>¡Estás al día! No tienes encuestas pendientes.</b></div>
      </div>
      <h2 class="nx-section__title">Respondidas ({{ respondidas.length }})</h2>
      <div class="nx-stack nx-stack--16">
        <article *ngFor="let e of respondidas" class="nx-card nx-survey">
          <span class="nx-iconbox nx-iconbox--38 nx-iconbox--success"><app-icon name="checkcircle" [size]="18"></app-icon></span>
          <div class="nx-grow"><b>{{ e.nombre }}</b><p class="nx-muted nx-small nx-mt-0 nx-mb-0">Respondida el {{ e.respondida }}</p></div>
        </article>
      </div>
    </ng-container>

    <form *ngIf="abierta as e" class="nx-card nx-settings nx-maxw-720" (ngSubmit)="enviar()" novalidate>
      <button type="button" class="nx-link-btn nx-mb-12" (click)="abierta = null"><app-icon name="chevron-left" [size]="15"></app-icon>Volver a mis encuestas</button>
      <h2 class="nx-settings__title nx-mt-0">{{ e.nombre }}</h2>
      <p class="nx-muted nx-mt-0">{{ e.descripcion }}</p>
      <div *ngIf="e.anonima" class="nx-banner nx-banner--compact" role="note"><app-icon name="lock" [size]="16"></app-icon>
        <span class="nx-grow">Encuesta anónima: tus respuestas no se asocian a tu nombre.</span></div>
      <fieldset *ngFor="let p of e.preguntas; let i = index" class="nx-question" [class.is-invalid]="intento && falta(p)">
        <legend><b>{{ i + 1 }}. {{ p.texto }}</b><span *ngIf="p.obligatoria" aria-hidden="true"> *</span>
          <span *ngIf="!p.obligatoria" class="nx-muted nx-small"> (opcional)</span></legend>
        <div *ngIf="p.tipo === 'escala'" class="nx-scale" role="radiogroup" [attr.aria-label]="p.texto">
          <span class="nx-muted nx-small">Muy en desacuerdo</span>
          <label *ngFor="let o of p.opciones" class="nx-scale__opt">
            <input type="radio" [name]="p.id" [attr.name]="p.id" [value]="o" [(ngModel)]="respuestas[p.id]"><span>{{ o }}</span></label>
          <span class="nx-muted nx-small">Muy de acuerdo</span>
        </div>
        <div *ngIf="p.tipo === 'opcion'" class="nx-checks">
          <label *ngFor="let o of p.opciones" class="nx-check nx-check--plain"><input type="radio" [name]="p.id" [attr.name]="p.id" [value]="o" [(ngModel)]="respuestas[p.id]">{{ o }}</label>
        </div>
        <textarea *ngIf="p.tipo === 'texto'" class="nx-textarea" rows="3" [name]="p.id" [attr.name]="p.id" [attr.aria-label]="p.texto" maxlength="500" [(ngModel)]="respuestas[p.id]"></textarea>
        <span *ngIf="intento && falta(p)" class="nx-error">Esta pregunta es obligatoria.</span>
      </fieldset>
      <p class="nx-muted nx-small">{{ respondidasCount }} de {{ e.preguntas.length }} respondidas</p>
      <div class="nx-settings__foot">
        <button type="button" class="nx-btn nx-btn--outline" (click)="abierta = null">Cancelar</button>
        <button type="submit" class="nx-btn nx-btn--primary">Enviar respuestas</button>
      </div>
    </form>
  `
})
export class MisEncuestasComponent implements OnDestroy {
  pendientes: EncuestaPortal[] = [];
  respondidas: EncuestaPortal[] = [];
  abierta: EncuestaPortal | null = null;
  respuestas: Record<string, string> = {};
  intento = false;
  private sub: Subscription;

  constructor(private portal: PortalService, private ui: UiStateService) {
    this.sub = portal.encuestas$.subscribe((es) => {
      this.pendientes = es.filter((e) => !e.respondida);
      this.respondidas = es.filter((e) => !!e.respondida);
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  abrir(e: EncuestaPortal): void { this.abierta = e; this.respuestas = {}; this.intento = false; }
  falta(p: Pregunta): boolean { return p.obligatoria && !(this.respuestas[p.id] ?? '').toString().trim(); }
  get respondidasCount(): number { return this.abierta?.preguntas.filter((p) => (this.respuestas[p.id] ?? '').toString().trim()).length ?? 0; }

  enviar(): void {
    this.intento = true;
    const e = this.abierta;
    if (!e) return;
    const faltan = e.preguntas.filter((p) => this.falta(p));
    if (faltan.length) {
      setTimeout(() => (document.querySelector('.nx-question.is-invalid') as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    const valores = Object.fromEntries(Object.entries(this.respuestas).map(([k, v]) => [k, String(v ?? '').trim()]).filter(([, v]) => v));
    this.portal.responder(e, valores).subscribe({
      next: () => { this.abierta = null; this.ui.toast(`¡Gracias! Enviaste tus respuestas de “${e.nombre}”`); },
      error: (x) => this.ui.toast(mensajeError(x)),
    });
  }
}
