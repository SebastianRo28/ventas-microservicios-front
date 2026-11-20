import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { Division } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';

/** P-01.2 Áreas: División › Área › Sub-área tree. */
@Component({
  selector: 'app-areas',
  template: `
    <app-page-header title="Áreas" [crumbs]="['Administrativo', 'Organización']" [askAi]="false">
      <button type="button" class="nx-btn nx-btn--primary" (click)="openModal('new')">
        <app-icon name="plus" [size]="16"></app-icon>Crear División
      </button>
    </app-page-header>

    <div class="nx-stack">
      <section *ngFor="let d of divisiones; let i = index" class="nx-card nx-tree">
        <div class="nx-tree__div">
          <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--36" [attr.aria-expanded]="open.has(i)"
                  [attr.aria-label]="'Expandir ' + d.nombre" (click)="toggle(i)">
            <span class="nx-rot90" [class.is-rotated]="open.has(i)"><app-icon name="chevron-right"></app-icon></span>
          </button>
          <span class="nx-iconbox nx-iconbox--36"><app-icon name="building"></app-icon></span>
          <div class="nx-tree__name"><b>{{ d.nombre }}</b><span>División</span></div>
          <span class="nx-tree__stat">Colaboradores: <b>{{ d.colaboradores }}</b></span>
          <span class="nx-tree__stat nx-tree__stat--w">Áreas: <b>{{ d.areas.length }}</b></span>
          <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Editar división ' + d.nombre"
                  [title]="'Editar división ' + d.nombre" (click)="openModal('edit')"><app-icon name="edit" [size]="16"></app-icon></button>
        </div>
        <div *ngIf="open.has(i)" class="nx-tree__body">
          <div *ngFor="let a of d.areas" class="nx-tree__area">
            <div class="nx-tree__line">
              <a class="nx-tree__area-name" routerLink="/admin/colaboradores/vigentes">{{ a.nombre }}</a>
              <span class="nx-tree__stat">Colaboradores: <b>{{ a.colaboradores }}</b></span>
              <span class="nx-tree__stat nx-tree__stat--w">Sub-áreas: <b>{{ a.subAreas.length }}</b></span>
              <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Editar área ' + a.nombre"
                      [title]="'Editar área ' + a.nombre" (click)="openModal('edit')"><app-icon name="edit" [size]="16"></app-icon></button>
            </div>
            <div class="nx-tree__subs">
              <div *ngFor="let s of a.subAreas" class="nx-tree__line nx-tree__sub">
                <a class="nx-tree__sub-name" routerLink="/admin/colaboradores/vigentes">{{ s.nombre }}</a>
                <span class="nx-tree__stat">Colaboradores: <b>{{ s.colaboradores }}</b></span>
                <span class="nx-tree__stat nx-tree__stat--w">Sub-áreas: <b>0</b></span>
                <span class="nx-tree__spacer"></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <app-modal *ngIf="modal" [title]="modal === 'edit' ? 'Editar división, área o sub-área' : 'Crear División'" width="560px" (closed)="modal = null">
      <form id="area-form" class="nx-form" (ngSubmit)="save()">
        <label class="nx-field">Nombre*<input class="nx-input" name="nombre" required placeholder="Ej. Recursos Humanos" [(ngModel)]="nombre"></label>
        <label class="nx-field">Código*<input class="nx-input" name="codigo" placeholder="Ej. RRHH"></label>
        <label class="nx-field">Centro de costo
          <select class="nx-select"><option>CC-100 Gerencia General</option><option>CC-120 Administración</option><option>CC-200 Operaciones</option><option>CC-300 Comercial</option><option>CC-400 Tecnología</option></select>
        </label>
        <label class="nx-field">Nodo padre
          <select class="nx-select"><option>Sin nodo padre (División)</option><option *ngFor="let d of divisiones">{{ d.nombre }}</option></select>
        </label>
        <label class="nx-check nx-check--plain"><input type="checkbox" checked>Activo</label>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="modal = null">Cancelar</button>
        <button type="submit" form="area-form" class="nx-btn nx-btn--primary">{{ modal === 'edit' ? 'Guardar' : 'Crear' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class AreasComponent {
  divisiones: Division[] = [];
  open = new Set<number>([0, 1]);
  modal: 'new' | 'edit' | null = null;
  nombre = '';

  constructor(data: HrDataService, private ui: UiStateService) {
    data.divisiones().subscribe((d) => (this.divisiones = d));
  }

  toggle(i: number): void { this.open.has(i) ? this.open.delete(i) : this.open.add(i); }

  openModal(kind: 'new' | 'edit'): void { this.nombre = ''; this.modal = kind; }

  save(): void {
    if (this.modal === 'new') {
      if (!this.nombre.trim()) return;
      this.divisiones = [...this.divisiones, { nombre: this.nombre.trim(), colaboradores: 0, areas: [] }];
      this.ui.toast('División creada con éxito');
    } else {
      this.ui.toast('Cambios guardados');
    }
    this.modal = null;
  }
}
