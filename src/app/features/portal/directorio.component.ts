import { Component } from '@angular/core';
import { iniciales } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { emailDe, PortalService } from '../../core/portal.service';
import { UiStateService } from '../../core/ui-state.service';

interface Persona { c: Colaborador; ini: string; email: string; anexo: string; sede: string; jefe: string; texto: string; }

/** Mi Portal › Directorio: find colleagues by name, role, area or location and get their contact details. */
@Component({
  selector: 'app-directorio',
  template: `
    <app-page-header title="Directorio" [crumbs]="['Mi Portal']"></app-page-header>
    <div class="nx-card nx-filterbar nx-dir__filters">
      <label class="nx-input-icon nx-grow">
        <app-icon name="search" [size]="16"></app-icon>
        <input aria-label="Buscar en el directorio" placeholder="Buscar por nombre, cargo o correo" [(ngModel)]="q">
      </label>
      <select class="nx-select nx-w-200" aria-label="Filtrar por área" [(ngModel)]="area"><option value="">Todas las áreas</option><option *ngFor="let a of areas">{{ a }}</option></select>
      <select class="nx-select nx-w-200" aria-label="Filtrar por sede" [(ngModel)]="sede"><option value="">Todas las sedes</option><option *ngFor="let s of sedes">{{ s }}</option></select>
    </div>
    <p class="nx-muted nx-small" aria-live="polite">{{ visibles.length }} {{ visibles.length === 1 ? 'persona' : 'personas' }}</p>
    <div class="nx-dir">
      <button *ngFor="let p of visibles" type="button" class="nx-card nx-dir__card" (click)="sel = p">
        <span class="nx-avatar nx-avatar--52">{{ p.ini }}</span>
        <span class="nx-dir__text">
          <b>{{ p.c.nombres }} {{ p.c.apellidos }}<span *ngIf="p.c.id === portal.yoId" class="nx-badge nx-badge--sm nx-tone-info">Tú</span></b>
          <span>{{ p.c.cargo }}</span>
          <span class="nx-muted nx-small">{{ p.c.area }} · {{ p.sede }}</span>
        </span>
      </button>
    </div>
    <div *ngIf="!visibles.length" class="nx-card nx-empty"><b>No encontramos a nadie con esa búsqueda</b><span>Prueba con otro nombre o quita los filtros</span></div>

    <app-modal *ngIf="sel as p" [title]="p.c.nombres + ' ' + p.c.apellidos" width="520px" (closed)="sel = null">
      <div class="nx-row nx-row--center nx-mb-12">
        <span class="nx-avatar nx-avatar--64">{{ p.ini }}</span>
        <div><b>{{ p.c.cargo }}</b><div class="nx-muted">{{ p.c.area }} · {{ p.c.division }}</div></div>
      </div>
      <div class="nx-fieldrow"><span>Correo</span><span><a [href]="'mailto:' + p.email">{{ p.email }}</a></span></div>
      <div class="nx-fieldrow"><span>Anexo</span><span>{{ p.anexo }}</span></div>
      <div class="nx-fieldrow"><span>Sede</span><span>{{ p.sede }}</span></div>
      <div class="nx-fieldrow"><span>Jefatura</span><span>{{ p.jefe }}</span></div>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="copiar(p.email)"><app-icon name="copy" [size]="15"></app-icon>Copiar correo</button>
        <a class="nx-btn nx-btn--primary" routerLink="/portal/organigrama" [queryParams]="{ id: p.c.id }" (click)="sel = null"><app-icon name="sitemap" [size]="15"></app-icon>Ver en organigrama</a>
      </ng-container>
    </app-modal>
  `
})
export class DirectorioComponent {
  q = '';
  area = '';
  sede = '';
  personas: Persona[] = [];
  areas: string[] = [];
  sedes: string[] = [];
  sel: Persona | null = null;

  constructor(data: HrDataService, public portal: PortalService, private ui: UiStateService) {
    data.colaboradores().subscribe((cs) => {
      const nombre = (id: number | null | undefined) => { const j = cs.find((x) => x.id === id); return j ? `${j.nombres} ${j.apellidos}` : '—'; };
      this.personas = cs.map((c) => {
        const email = emailDe(c);
        return { c, ini: iniciales(c.nombres, c.apellidos), email, anexo: c.contacto?.anexo || '—', sede: c.contacto?.sede || 'Sin sede asignada', jefe: nombre(portal.jefes[c.id]),
          texto: `${c.nombres} ${c.apellidos} ${c.cargo} ${email}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() };
      });
      this.areas = [...new Set(cs.map((c) => c.area))].sort();
      this.sedes = [...new Set(this.personas.map((p) => p.sede))].sort();
    });
  }

  get visibles(): Persona[] {
    const q = this.q.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    return this.personas.filter((p) => (!q || p.texto.includes(q)) && (!this.area || p.c.area === this.area) && (!this.sede || p.sede === this.sede));
  }

  async copiar(texto: string): Promise<void> {
    try { await navigator.clipboard.writeText(texto); this.ui.toast('Correo copiado'); }
    catch { this.ui.toast('No se pudo copiar automáticamente; selecciona el correo y cópialo'); }
  }
}
