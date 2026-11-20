import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { parseFecha } from '../../core/format';
import { AsistenciaService } from '../../core/asistencia.service';
import { PortalService } from '../../core/portal.service';
import { Curso } from '../../core/sample/portal';
import { UiStateService } from '../../core/ui-state.service';

/** Mi Portal › Mis Capacitaciones: assigned and optional courses, progress by module and completion certificates. */
@Component({
  selector: 'app-mis-capacitaciones',
  template: `
    <app-page-header title="Mis Capacitaciones" [crumbs]="['Mi Portal']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Obligatorias pendientes</span><b>{{ obligPendientes }}</b></div>
      <div class="nx-card nx-stat"><span>Vencidas</span><b>{{ vencidas }}</b></div>
      <div class="nx-card nx-stat"><span>Completadas</span><b>{{ completadas }}</b></div>
      <div class="nx-card nx-stat"><span>Horas de capacitación</span><b>{{ horas }}</b></div>
    </div>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of tabs; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>
    <div class="nx-stack nx-stack--16">
      <article *ngFor="let c of visibles" class="nx-card nx-course">
        <div class="nx-course__head">
          <div class="nx-grow">
            <b>{{ c.nombre }}</b>
            <div class="nx-row nx-row--center nx-course__meta">
              <span class="nx-badge nx-badge--sm nx-tone-gray">{{ c.categoria }}</span>
              <span *ngIf="c.obligatorio" class="nx-badge nx-badge--sm nx-tone-orange">Obligatoria</span>
              <span class="nx-small">{{ c.horas }} h · {{ c.modulos.length }} módulos</span>
              <span *ngIf="c.vence && !c.completado" class="nx-small" [class.nx-text-danger]="vencido(c)">{{ vencido(c) ? 'Venció el ' : 'Vence el ' }}{{ c.vence }}</span>
              <span *ngIf="c.completado" class="nx-small">Completada el {{ c.completado }}</span>
            </div>
          </div>
          <span class="nx-badge" [ngClass]="c.completado ? 'nx-tone-success' : c.hechos.length ? 'nx-tone-info' : 'nx-tone-warning'">{{ estado(c) }}</span>
        </div>
        <span class="nx-progress"><span class="nx-progress__track"><span [style.width.%]="pct(c)"></span></span><span class="nx-progress__text">{{ pct(c) }}%</span></span>
        <div class="nx-row nx-row--end">
          <button *ngIf="!c.inscrito" type="button" class="nx-btn nx-btn--primary nx-btn--sm" (click)="inscribir(c)">Inscribirme</button>
          <button *ngIf="c.inscrito && !c.completado" type="button" class="nx-btn nx-btn--primary nx-btn--sm" (click)="abierto = c">{{ c.hechos.length ? 'Continuar' : 'Comenzar' }}</button>
          <button *ngIf="c.completado" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="certificado(c)"><app-icon name="download" [size]="15"></app-icon>Certificado</button>
          <button *ngIf="c.completado" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="abierto = c">Ver módulos</button>
        </div>
      </article>
      <div *ngIf="!visibles.length" class="nx-card nx-empty nx-empty--compact"><b>No hay cursos en esta lista</b></div>
    </div>

    <app-modal *ngIf="abierto as c" [title]="c.nombre" width="560px" (closed)="abierto = null">
      <p class="nx-mt-0 nx-muted">Marca cada módulo cuando lo termines. Al completar todos, podrás descargar tu certificado.</p>
      <div class="nx-checks nx-checks--col">
        <label *ngFor="let m of c.modulos; let i = index" class="nx-check nx-check--plain">
          <input type="checkbox" [checked]="c.hechos.includes(i)" (change)="marcar(c, i, $any($event.target).checked)">{{ i + 1 }}. {{ m }}
        </label>
      </div>
      <ng-container modal-footer>
        <span class="nx-muted nx-small">{{ c.hechos.length }} de {{ c.modulos.length }} módulos</span>
        <button type="button" class="nx-btn nx-btn--primary" (click)="abierto = null">Listo</button>
      </ng-container>
    </app-modal>
  `
})
export class MisCapacitacionesComponent implements OnDestroy {
  readonly tabs = ['Asignadas', 'Catálogo opcional', 'Completadas'];
  tab = 0;
  cursos: Curso[] = [];
  abierto: Curso | null = null;
  private sub: Subscription;

  constructor(private portal: PortalService, private asis: AsistenciaService, private ui: UiStateService) {
    this.sub = portal.cursos$.subscribe((cs) => (this.cursos = cs));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get visibles(): Curso[] {
    return this.cursos.filter((c) => this.tab === 2 ? !!c.completado : this.tab === 1 ? !c.obligatorio && !c.completado : c.inscrito && !c.completado && (c.obligatorio || c.inscrito));
  }
  get obligPendientes(): number { return this.cursos.filter((c) => c.obligatorio && !c.completado).length; }
  get vencidas(): number { return this.cursos.filter((c) => this.vencido(c)).length; }
  get completadas(): number { return this.cursos.filter((c) => c.completado).length; }
  get horas(): string { return String(this.cursos.filter((c) => c.completado).reduce((s, c) => s + c.horas, 0)); }

  pct(c: Curso): number { return Math.round((c.hechos.length / c.modulos.length) * 100); }
  estado(c: Curso): string { return c.completado ? 'Completado' : c.hechos.length ? 'En curso' : 'Pendiente'; }
  /** Overdue at the sample cut-off date. */
  vencido(c: Curso): boolean { return !!c.vence && !c.completado && parseFecha(c.vence)! < parseFecha(this.asis.corte)!; }

  inscribir(c: Curso): void { this.portal.inscribir(c); this.tab = 0; this.ui.toast(`Te inscribiste en “${c.nombre}”`); }

  marcar(c: Curso, i: number, hecho: boolean): void {
    const antes = !!c.completado;
    this.portal.marcarModulo(c, i, hecho);
    if (!antes && c.completado) this.ui.toast(`¡Completaste “${c.nombre}”! Ya puedes descargar tu certificado`);
  }

  /** Simple HTML certificate the collaborator can print or save as PDF. */
  certificado(c: Curso): void {
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Certificado · ${esc(c.nombre)}</title>
<body style="font-family:'Nunito Sans',system-ui,sans-serif;text-align:center;padding:60px;color:#1C2433">
<p style="letter-spacing:.2em;color:#2D4DA4;font-weight:800">COMERCIAL ANDINA S.A.C.</p>
<h1 style="font-size:34px;margin:24px 0">Certificado de capacitación</h1>
<p>Se certifica que <b>Florencia Alamos Ruiz</b> completó el curso</p>
<h2 style="color:#263D8B">${esc(c.nombre)}</h2>
<p>${c.horas} horas académicas · completado el ${esc(c.completado ?? '')}</p>
<p style="margin-top:60px;color:#5B6475;font-size:13px">Emitido desde Nexo RH</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `certificado-${c.nombre.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-')}.html` });
    a.click();
    URL.revokeObjectURL(url);
  }
}
