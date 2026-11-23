import { Component, Input } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ContextoService, ImplementacionInfo, RUTAS_IMPLEMENTACION } from '../../core/contexto.service';

/**
 * P-MT.6 Implementation checklist (spec. 10): shown to admins while "Modo implementación" is on. Each step shows its
 * progress (calculated by the API from the data) and a link to the screen where it is done.
 */
@Component({
  selector: 'app-checklist-implementacion',
  template: `
    <section *ngIf="impl$ | async as impl" class="nx-card nx-pad nx-checklist" [class.nx-checklist--compacto]="compacto" aria-labelledby="chk-title">
      <div class="nx-acceso__fila">
        <h2 id="chk-title" class="nx-section__title nx-mt-0">Implementación de Nexo RH</h2>
        <span class="nx-checklist__total">{{ impl.avance }} % completado</span>
      </div>
      <div class="nx-limite__barra nx-mb-16"><span [style.width.%]="impl.avance"></span></div>
      <ol class="nx-checklist__pasos">
        <li *ngFor="let p of impl.pasos; let i = index" [class.is-ok]="p.avance === 100">
          <span class="nx-checklist__num">
            <app-icon *ngIf="p.avance === 100; else numero" name="check" [size]="15"></app-icon>
            <ng-template #numero>{{ i + 1 }}</ng-template>
          </span>
          <a class="nx-grow" [routerLink]="ruta(p.clave)">{{ p.titulo | termino }}</a>
          <span class="nx-checklist__pct">{{ p.avance }} %</span>
        </li>
      </ol>
      <a *ngIf="compacto" class="nx-link-btn" routerLink="/configuracion/implementacion">Ver el checklist completo</a>
    </section>
  `
})
export class ChecklistImplementacionComponent {
  /** Panel widget: same steps, smaller. */
  @Input() compacto = false;
  readonly impl$: Observable<ImplementacionInfo | null>;

  constructor(ctx: ContextoService) { this.impl$ = ctx.contexto$.pipe(map((c) => c?.implementacion ?? null)); }

  ruta(clave: string): string { return RUTAS_IMPLEMENTACION[clave] ?? '/'; }
}
