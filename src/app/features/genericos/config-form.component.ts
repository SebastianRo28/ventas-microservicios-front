import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CampoConfig, ConfigFormDef } from '../../core/genericos';
import { GenericosService } from '../../core/genericos.service';
import { CONFIG_FORMS } from '../../core/sample/config-forms';
import { UiStateService } from '../../core/ui-state.service';

type Valor = string | number | boolean;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Generic settings screen: tabs of sections with switches, numbers, selects and text, validated on save. */
@Component({
  selector: 'app-config-form',
  template: `
    <app-page-header [title]="titulo" [crumbs]="crumbs" [askAi]="false"></app-page-header>
    <div *ngIf="def.tabs.length > 1" class="nx-tabs" role="tablist">
      <button *ngFor="let t of def.tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t.nombre }}</button>
    </div>
    <div *ngIf="def.nota" class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon><span class="nx-grow">{{ def.nota }}</span></div>
    <form class="nx-card nx-settings nx-maxw-720" (ngSubmit)="guardar()" novalidate>
      <section *ngFor="let s of def.tabs[tab].secciones; let last = last" class="nx-config__section" [class.nx-config__section--last]="last">
        <h3 class="nx-settings__title nx-mt-0">{{ s.titulo }}</h3>
        <p *ngIf="s.descripcion" class="nx-muted nx-small nx-mt-0">{{ s.descripcion }}</p>
        <ng-container *ngFor="let c of s.campos">
          <ng-container *ngIf="visible(c)">
            <label *ngIf="c.tipo === 'switch'; else campo" class="nx-switch-row nx-mt-12">
              <button type="button" role="switch" class="nx-switch" [class.is-on]="v[c.key]" [attr.aria-checked]="!!v[c.key]"
                      [attr.aria-label]="c.label" (click)="v[c.key] = !v[c.key]"><span></span></button>
              <span>{{ c.label }}<span *ngIf="c.ayuda" class="nx-hint nx-block">{{ c.ayuda }}</span></span>
            </label>
            <ng-template #campo>
              <label class="nx-field nx-mt-12" [class.nx-w-300]="c.tipo !== 'texto' && c.tipo !== 'email'">{{ c.label }}{{ c.obligatorio ? '*' : '' }}
                <select *ngIf="c.tipo === 'select'" class="nx-select" [name]="c.key" [attr.name]="c.key" [(ngModel)]="v[c.key]">
                  <option *ngFor="let o of c.opciones">{{ o }}</option>
                </select>
                <input *ngIf="c.tipo !== 'select'" class="nx-input" [name]="c.key" [attr.name]="c.key" [type]="c.tipo === 'numero' ? 'number' : c.tipo === 'email' ? 'email' : 'text'"
                       [attr.min]="c.min ?? null" [attr.max]="c.max ?? null" [(ngModel)]="v[c.key]" [class.is-invalid]="errores[c.key]">
                <span *ngIf="c.ayuda" class="nx-hint">{{ c.ayuda }}</span>
                <span *ngIf="errores[c.key]" class="nx-error">{{ errores[c.key] }}</span>
              </label>
            </ng-template>
          </ng-container>
        </ng-container>
      </section>
      <div class="nx-settings__foot"><button type="submit" class="nx-btn nx-btn--primary">Guardar</button></div>
    </form>
  `
})
export class ConfigFormComponent {
  readonly def: ConfigFormDef;
  readonly titulo: string;
  readonly crumbs: string[];
  tab = 0;
  v: Record<string, Valor>;
  errores: Record<string, string> = {};

  constructor(route: ActivatedRoute, private gen: GenericosService, private ui: UiStateService) {
    this.def = CONFIG_FORMS[route.snapshot.data['config']];
    this.titulo = route.snapshot.data['title'] ?? '';
    this.crumbs = route.snapshot.data['crumbs'] ?? [];
    this.v = { ...gen.valores(this.def) };
  }

  visible(c: CampoConfig): boolean { return !c.dependeDe || !!this.v[c.dependeDe]; }

  guardar(): void {
    this.errores = {};
    let primerTab = -1;
    this.def.tabs.forEach((t, i) => t.secciones.forEach((s) => s.campos.forEach((c) => {
      if (!this.visible(c) || c.tipo === 'switch' || c.tipo === 'select') return;
      const s2 = String(this.v[c.key] ?? '').trim();
      let e = '';
      if (!s2) e = c.obligatorio ? 'Campo obligatorio.' : '';
      else if (c.tipo === 'numero') {
        const n = Number(s2);
        e = !Number.isFinite(n) ? 'Ingresa un número.' : c.min !== undefined && n < c.min ? `Mínimo ${c.min}.` : c.max !== undefined && n > c.max ? `Máximo ${c.max}.` : '';
      } else if (c.tipo === 'email' && !EMAIL.test(s2)) e = 'Ingresa un correo válido.';
      if (e) { this.errores[c.key] = e; if (primerTab < 0) primerTab = i; }
    })));
    if (primerTab >= 0) { this.tab = primerTab; this.ui.toast('Revisa los campos marcados'); return; }
    const limpio: Record<string, Valor> = {};
    for (const [k, val] of Object.entries(this.v)) limpio[k] = typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)) && typeof this.def.valores[k] === 'number' ? Number(val) : val;
    const cambios = this.gen.guardarConfig(this.def, this.titulo + (this.crumbs.length ? ` · ${this.crumbs[this.crumbs.length - 1]}` : ''), limpio);
    this.ui.toast(cambios.length ? 'Configuración guardada' : 'No hay cambios que guardar');
  }
}
