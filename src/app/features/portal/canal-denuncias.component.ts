import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { ComunicacionService, OpcionesDenuncia, SeguimientoDenuncia } from '../../core/comunicacion.service';
import { ESTADO_DENUNCIA_TONE } from '../../core/sample/operaciones';
import { UiStateService } from '../../core/ui-state.service';

/**
 * Mi Portal › Canal de Denuncias: report a case (anonymously when the company allows it) and follow it with the access
 * code, which is shown only once. With an anonymous report nobody, not even the committee, can know who made it; the
 * code is the only way to read the answers.
 */
@Component({
  selector: 'app-canal-denuncias',
  template: `
    <app-page-header title="Canal de Denuncias" [crumbs]="['Mi Portal']"></app-page-header>
    <div class="nx-tabs" role="tablist">
      <button *ngFor="let t of ['Nueva denuncia', 'Seguimiento']; let i = index" type="button" role="tab" class="nx-tab"
              [class.is-active]="tab === i" [attr.aria-selected]="tab === i" (click)="tab = i">{{ t }}</button>
    </div>

    <ng-container *ngIf="tab === 0">
      <div *ngIf="codigo; else formulario" class="nx-card nx-settings nx-maxw-720">
        <h2 class="nx-settings__title nx-mt-0">Denuncia recibida</h2>
        <p>Guarda este código: es la única forma de ver el avance y las respuestas del comité.</p>
        <div class="nx-temporal">
          <code class="nx-temporal__pwd" aria-label="Código de seguimiento">{{ codigo }}</code>
          <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="copiar()"><app-icon name="copy" [size]="15"></app-icon>Copiar</button>
        </div>
        <div class="nx-banner nx-banner--warning nx-banner--compact nx-mt-12" role="note">
          <app-icon name="alert" [size]="17"></app-icon><span>No se volverá a mostrar{{ anonimaEnviada ? ' y, por ser anónima, no se puede recuperar' : '' }}.</span>
        </div>
        <div class="nx-row nx-mt-12">
          <button type="button" class="nx-btn nx-btn--primary" (click)="verSeguimiento(codigo)">Ver seguimiento</button>
          <button type="button" class="nx-btn nx-btn--outline" (click)="codigo = ''">Hacer otra denuncia</button>
        </div>
      </div>
      <ng-template #formulario>
        <form class="nx-card nx-settings nx-maxw-720" (ngSubmit)="enviar()" novalidate>
          <p class="nx-mt-0 nx-muted">Las denuncias las revisa el comité de ética. Describe los hechos con fechas, lugares y personas involucradas si las conoces.</p>
          <label class="nx-field">Tipo de denuncia*
            <select class="nx-select" name="tipo" [(ngModel)]="f.tipo"><option value="" disabled>Selecciona</option><option *ngFor="let t of op?.tipos">{{ t }}</option></select></label>
          <label class="nx-field">Tu relación con la empresa*
            <select class="nx-select" name="relacion" [(ngModel)]="f.relacion"><option value="" disabled>Selecciona</option><option *ngFor="let r of op?.relaciones">{{ r }}</option></select></label>
          <label class="nx-field">Hechos*
            <textarea class="nx-textarea" name="descripcion" rows="6" maxlength="4000" [(ngModel)]="f.descripcion"></textarea>
            <span class="nx-hint">{{ f.descripcion.trim().length }} / 4000 · mínimo 20 caracteres</span></label>
          <label *ngIf="op?.anonimo" class="nx-check nx-check--plain"><input type="checkbox" name="anonima" [(ngModel)]="f.anonima">Enviar de forma anónima (no se guarda tu nombre)</label>
          <p *ngIf="op && !op.anonimo" class="nx-small nx-muted">La empresa no recibe denuncias anónimas: tu nombre será visible solo para el comité.</p>
          <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
          <div class="nx-row nx-row--right"><button type="submit" class="nx-btn nx-btn--primary" [disabled]="ocupado">{{ ocupado ? 'Enviando…' : 'Enviar denuncia' }}</button></div>
        </form>
      </ng-template>
    </ng-container>

    <ng-container *ngIf="tab === 1">
      <form class="nx-card nx-settings nx-maxw-720 nx-mb-16" (ngSubmit)="verSeguimiento(buscar)">
        <label class="nx-field">Código de seguimiento
          <input class="nx-input" name="codigo" maxlength="12" autocomplete="off" [(ngModel)]="buscar" placeholder="12 caracteres"></label>
        <span *ngIf="errorSeg" class="nx-error" role="alert">{{ errorSeg }}</span>
        <div class="nx-row nx-row--right"><button type="submit" class="nx-btn nx-btn--primary" [disabled]="buscar.trim().length !== 12">Consultar</button></div>
      </form>
      <div *ngIf="seg as s" class="nx-card nx-settings nx-maxw-720">
        <div class="nx-fields nx-fields--3 nx-mb-12">
          <div class="nx-fieldrow"><span>Tipo</span><span>{{ s.tipo }}</span></div>
          <div class="nx-fieldrow"><span>Estado</span><span class="nx-badge" [ngClass]="'nx-tone-' + tone(s.estado)">{{ s.estado }}</span></div>
          <div class="nx-fieldrow"><span>Última actualización</span><span>{{ s.actualizada }}</span></div>
        </div>
        <p *ngIf="s.resolucion" class="nx-small"><b>Conclusión del comité:</b> {{ s.resolucion }}</p>
        <div class="nx-stack nx-mb-12">
          <div *ngFor="let m of s.mensajes" class="nx-card nx-msg" [class.nx-msg--mio]="m.autor === 'Denunciante'">
            <span class="nx-small nx-muted">{{ m.autor === 'Denunciante' ? 'Tú' : 'Comité de ética' }} · {{ m.fecha }}</span><p class="nx-mt-0 nx-mb-0">{{ m.texto }}</p>
          </div>
          <p *ngIf="!s.mensajes.length" class="nx-muted nx-small">El comité aún no ha respondido.</p>
        </div>
        <ng-container *ngIf="s.estado === 'Nueva' || s.estado === 'En curso'">
          <label class="nx-field">Agregar información<textarea class="nx-textarea" rows="2" maxlength="2000" name="mensaje" [(ngModel)]="mensaje"></textarea></label>
          <div class="nx-row nx-row--right"><button type="button" class="nx-btn nx-btn--outline" [disabled]="!mensaje.trim()" (click)="agregar(s)">Enviar</button></div>
        </ng-container>
      </div>
    </ng-container>
  `
})
export class CanalDenunciasComponent {
  tab = 0;
  op: OpcionesDenuncia | null = null;
  f = { tipo: '', relacion: '', descripcion: '', anonima: true };
  error = '';
  ocupado = false;
  codigo = '';
  anonimaEnviada = false;
  buscar = '';
  errorSeg = '';
  seg: SeguimientoDenuncia | null = null;
  mensaje = '';

  constructor(private api: ComunicacionService, private ui: UiStateService) {
    api.opcionesDenuncia().subscribe((o) => { this.op = o; if (!o.anonimo) this.f.anonima = false; });
  }

  tone(e: string): string { return ESTADO_DENUNCIA_TONE[e as keyof typeof ESTADO_DENUNCIA_TONE]; }

  enviar(): void {
    const f = this.f;
    this.error = !f.tipo ? 'Elige el tipo de denuncia.' : !f.relacion ? 'Indica tu relación con la empresa.' : f.descripcion.trim().length < 20 ? 'Describe los hechos (al menos 20 caracteres).' : '';
    if (this.error || this.ocupado) return;
    this.ocupado = true;
    this.api.crearDenuncia({ ...f, descripcion: f.descripcion.trim() }).subscribe({
      next: (r) => { this.ocupado = false; this.codigo = r.codigo; this.anonimaEnviada = f.anonima; this.f = { tipo: '', relacion: '', descripcion: '', anonima: !!this.op?.anonimo }; },
      error: (e) => { this.ocupado = false; this.error = mensajeError(e); },
    });
  }

  copiar(): void {
    navigator.clipboard?.writeText(this.codigo).then(() => this.ui.toast('Código copiado'), () => this.ui.toast('No se pudo copiar: anótalo manualmente'));
  }

  verSeguimiento(codigo: string): void {
    this.tab = 1;
    this.buscar = codigo;
    this.errorSeg = '';
    this.api.seguimiento(codigo).subscribe({
      next: (s) => (this.seg = s),
      error: (e) => { this.seg = null; this.errorSeg = e?.status === 404 ? 'No hay ninguna denuncia con ese código.' : mensajeError(e); },
    });
  }

  agregar(s: SeguimientoDenuncia): void {
    this.api.mensajeSeguimiento(s.codigo, this.mensaje.trim()).subscribe({
      next: (x) => { this.seg = x; this.mensaje = ''; this.ui.toast('Información enviada al comité'); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
}
