import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { iniciales } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { PortalService } from '../../core/portal.service';

interface Nodo { c: Colaborador; ini: string; hijos: Nodo[]; total: number; }

/** Mi Portal › Organigrama: reporting lines from the general manager down; expandable, with search. */
@Component({
  selector: 'app-organigrama',
  template: `
    <app-page-header title="Organigrama" [crumbs]="['Mi Portal']"></app-page-header>
    <div class="nx-card nx-filterbar nx-dir__filters">
      <label class="nx-input-icon nx-grow">
        <app-icon name="search" [size]="16"></app-icon>
        <input aria-label="Buscar persona en el organigrama" placeholder="Buscar persona" list="org-personas" [(ngModel)]="q" (ngModelChange)="buscar()">
        <datalist id="org-personas"><option *ngFor="let c of colaboradores" [value]="c.nombres + ' ' + c.apellidos"></option></datalist>
      </label>
      <button type="button" class="nx-btn nx-btn--outline" (click)="enfocar(portal.yoId)"><app-icon name="user" [size]="15"></app-icon>Ir a mi posición</button>
      <button type="button" class="nx-btn nx-btn--outline" (click)="todo(true)">Expandir todo</button>
      <button type="button" class="nx-btn nx-btn--outline" (click)="todo(false)">Contraer</button>
    </div>
    <p *ngIf="q && !foco" class="nx-muted nx-small">No hay nadie con ese nombre.</p>
    <div class="nx-card nx-org" role="tree" aria-label="Organigrama de la empresa">
      <ul class="nx-org__level">
        <ng-container *ngFor="let n of raices"><ng-container *ngTemplateOutlet="nodo; context: { $implicit: n }"></ng-container></ng-container>
      </ul>
    </div>

    <ng-template #nodo let-n>
      <li class="nx-org__item" role="treeitem" [attr.aria-expanded]="n.hijos.length ? abiertos.has(n.c.id) : null">
        <div class="nx-org__card" [class.is-me]="n.c.id === portal.yoId" [class.is-focus]="n.c.id === foco" [id]="'org-' + n.c.id">
          <span class="nx-avatar nx-avatar--40">{{ n.ini }}</span>
          <span class="nx-org__text"><b>{{ n.c.nombres }} {{ n.c.apellidos.split(' ')[0] }}</b><span>{{ n.c.cargo }}</span><span class="nx-muted">{{ n.c.area }}</span></span>
          <button *ngIf="n.hijos.length" type="button" class="nx-org__toggle" (click)="toggle(n.c.id)"
                  [attr.aria-label]="(abiertos.has(n.c.id) ? 'Contraer ' : 'Expandir ') + n.c.nombres + ' (' + n.total + ' personas a cargo)'">
            {{ n.total }}<app-icon [name]="abiertos.has(n.c.id) ? 'chevron-down' : 'chevron-right'" [size]="14"></app-icon>
          </button>
        </div>
        <ul *ngIf="n.hijos.length && abiertos.has(n.c.id)" class="nx-org__level" role="group">
          <ng-container *ngFor="let h of n.hijos"><ng-container *ngTemplateOutlet="nodo; context: { $implicit: h }"></ng-container></ng-container>
        </ul>
      </li>
    </ng-template>
  `
})
export class OrganigramaComponent {
  q = '';
  raices: Nodo[] = [];
  colaboradores: Colaborador[] = [];
  abiertos = new Set<number>();
  foco: number | null = null;

  constructor(data: HrDataService, public portal: PortalService, route: ActivatedRoute) {
    data.colaboradores().subscribe((cs) => {
      this.colaboradores = cs;
      const armar = (c: Colaborador): Nodo => {
        const hijos = portal.reportes(c.id).map((id) => cs.find((x) => x.id === id)).filter((x): x is Colaborador => !!x)
          .sort((a, b) => a.apellidos.localeCompare(b.apellidos)).map(armar);
        return { c, ini: iniciales(c.nombres, c.apellidos), hijos, total: hijos.reduce((s, h) => s + 1 + h.total, 0) };
      };
      // Collaborators without a known manager (e.g. newly created) hang from the top as their own roots.
      this.raices = cs.filter((c) => portal.jefes[c.id] === undefined || portal.jefes[c.id] === null).map(armar);
      for (const r of this.raices) this.abiertos.add(r.c.id);
    });
    const id = Number(route.snapshot.queryParamMap.get('id'));
    this.enfocar(Number.isInteger(id) && route.snapshot.queryParamMap.has('id') ? id : portal.yoId, false);
  }

  toggle(id: number): void { this.abiertos.has(id) ? this.abiertos.delete(id) : this.abiertos.add(id); }
  todo(abrir: boolean): void {
    this.abiertos.clear();
    if (abrir) for (const c of this.colaboradores) this.abiertos.add(c.id);
    else for (const r of this.raices) this.abiertos.add(r.c.id);
  }

  /** Opens the path from the top down to the person and scrolls to them. */
  enfocar(id: number, scroll = true): void {
    this.foco = id;
    for (let j = this.portal.jefes[id]; j !== null && j !== undefined; j = this.portal.jefes[j]) this.abiertos.add(j);
    if (scroll) setTimeout(() => document.getElementById('org-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }));
  }

  buscar(): void {
    const q = this.q.trim().toLowerCase();
    const c = q ? this.colaboradores.find((x) => `${x.nombres} ${x.apellidos}`.toLowerCase().includes(q)) : undefined;
    if (c) this.enfocar(c.id); else this.foco = q ? null : this.foco;
  }
}
