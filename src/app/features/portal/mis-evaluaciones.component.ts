import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { HrDataService } from '../../core/hr-data.service';
import { PortalService } from '../../core/portal.service';
import { Evaluacion } from '../../core/sample/portal';
import { UiStateService } from '../../core/ui-state.service';

const ESCALA: { v: number; label: string }[] = [
  { v: 1, label: 'No cumple' }, { v: 2, label: 'En desarrollo' }, { v: 3, label: 'Cumple' }, { v: 4, label: 'Supera' }, { v: 5, label: 'Destacado' },
];

/** Mi Portal › Mis Evaluaciones: performance reviews; self-assessment of the open one and results of closed ones. */
@Component({
  selector: 'app-mis-evaluaciones',
  template: `
    <app-page-header title="Mis Evaluaciones" [crumbs]="['Mi Portal']"></app-page-header>
    <ng-container *ngIf="!abierta">
      <div class="nx-stack nx-stack--16">
        <article *ngFor="let e of evaluaciones" class="nx-card nx-pad">
          <div class="nx-course__head">
            <div class="nx-grow"><b>{{ e.nombre }}</b>
              <div class="nx-small nx-muted">{{ e.periodo }} · evaluador(a): {{ e.evaluador }} · cierre {{ e.cierre }}</div></div>
            <span class="nx-badge" [ngClass]="e.estado === 'Cerrada' ? 'nx-tone-success' : e.estado === 'Autoevaluación pendiente' ? 'nx-tone-warning' : 'nx-tone-info'">{{ e.estado }}</span>
          </div>
          <ng-container *ngIf="e.estado === 'Cerrada'">
            <div class="nx-eval__result">
              <div class="nx-eval__score"><b>{{ promedio(e.jefe) }}</b><span>{{ nivel(promedio(e.jefe)) }}</span></div>
              <div class="nx-grow nx-stack">
                <div *ngFor="let k of claves(e)" class="nx-hbar nx-hbar--wide">
                  <span class="nx-hbar__label">{{ k }}</span>
                  <span class="nx-hbar__track"><span class="nx-hbar__fill" [style.width.%]="e.jefe[k] * 20"></span></span>
                  <span class="nx-hbar__value">{{ e.jefe[k] }} <span class="nx-muted nx-small">(tú: {{ e.auto[k] }})</span></span>
                </div>
              </div>
            </div>
            <blockquote class="nx-eval__quote"><b>Comentario de tu jefatura:</b> {{ e.comentarioJefe }}</blockquote>
          </ng-container>
          <p *ngIf="e.estado === 'Esperando a la jefatura'" class="nx-muted nx-small nx-mb-0">Enviaste tu autoevaluación. {{ e.evaluador.split(', ').reverse().join(' ') }} completará la evaluación antes del {{ e.cierre }}.</p>
          <div *ngIf="e.estado === 'Autoevaluación pendiente'" class="nx-row nx-row--end nx-mt-12">
            <button type="button" class="nx-btn nx-btn--primary" (click)="abrir(e)">Hacer autoevaluación</button>
          </div>
        </article>
      </div>
    </ng-container>

    <form *ngIf="abierta as e" class="nx-card nx-settings nx-maxw-720" (ngSubmit)="enviar()" novalidate>
      <button type="button" class="nx-link-btn nx-mb-12" (click)="abierta = null"><app-icon name="chevron-left" [size]="15"></app-icon>Volver a mis evaluaciones</button>
      <h2 class="nx-settings__title nx-mt-0">Autoevaluación · {{ e.nombre }}</h2>
      <p class="nx-muted nx-mt-0">Califica cómo has demostrado cada competencia en {{ e.periodo }}. Tu jefatura verá tus respuestas.</p>
      <fieldset *ngFor="let c of competencias" class="nx-question" [class.is-invalid]="intento && !notas[c.nombre]">
        <legend><b>{{ c.nombre }}</b></legend>
        <span class="nx-muted nx-small">{{ c.descripcion }}</span>
        <div class="nx-scale" role="radiogroup" [attr.aria-label]="c.nombre">
          <label *ngFor="let o of escala" class="nx-scale__opt" [title]="o.label">
            <input type="radio" [name]="'comp-' + c.id" [attr.name]="'comp-' + c.id" [value]="o.v" [(ngModel)]="notas[c.nombre]"><span>{{ o.v }}</span></label>
          <span class="nx-small">{{ notas[c.nombre] ? nivel(notas[c.nombre]) : '' }}</span>
        </div>
        <span *ngIf="intento && !notas[c.nombre]" class="nx-error">Califica esta competencia.</span>
      </fieldset>
      <div class="nx-settings__foot">
        <button type="button" class="nx-btn nx-btn--outline" (click)="abierta = null">Cancelar</button>
        <button type="submit" class="nx-btn nx-btn--primary">Enviar autoevaluación</button>
      </div>
    </form>
  `
})
export class MisEvaluacionesComponent implements OnDestroy {
  readonly escala = ESCALA;
  evaluaciones: Evaluacion[] = [];
  competencias: { id: number; nombre: string; descripcion: string }[] = [];
  abierta: Evaluacion | null = null;
  notas: Record<string, number> = {};
  intento = false;
  private sub: Subscription;

  constructor(data: HrDataService, private portal: PortalService, private ui: UiStateService) {
    this.sub = combineLatest([data.competencias(), portal.evaluaciones$]).subscribe(([cs, es]) => {
      // "Liderazgo" only applies to people with direct reports.
      const lidera = portal.reportes(portal.yoId).length > 0;
      this.competencias = cs.filter((c) => c.activo && (lidera || c.nombre !== 'Liderazgo'));
      this.evaluaciones = es;
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  claves(e: Evaluacion): string[] { return Object.keys(e.jefe); }
  promedio(n: Record<string, number>): string {
    const v = Object.values(n);
    return v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(1) : '—';
  }
  nivel(n: number | string): string {
    const x = Math.round(Number(n));
    return ESCALA.find((o) => o.v === x)?.label ?? '';
  }

  abrir(e: Evaluacion): void { this.abierta = e; this.notas = {}; this.intento = false; }

  enviar(): void {
    this.intento = true;
    const e = this.abierta;
    if (!e || this.competencias.some((c) => !this.notas[c.nombre])) return;
    this.portal.enviarAutoevaluacion(e, Object.fromEntries(this.competencias.map((c) => [c.nombre, Number(this.notas[c.nombre])])));
    this.abierta = null;
    this.ui.toast('Autoevaluación enviada a tu jefatura');
  }
}
