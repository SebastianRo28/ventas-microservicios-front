import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService } from '../../core/asistencia.service';
import { mensajeError } from '../../core/auth.service';
import { soles, parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { PortalService } from '../../core/portal.service';
import { PROCESOS_PORTAL, ProcesoPortal } from '../../core/sample/portal';
import { ESTADO_SOLICITUD_TONE, SolicitudWf } from '../../core/sample/workflow';
import { UiStateService } from '../../core/ui-state.service';

/** Mi Portal › Procesos Internos: requests the collaborator can start; they reach HR in Workflow › Solicitudes. */
@Component({
  selector: 'app-procesos-internos',
  template: `
    <app-page-header title="Procesos Internos" [crumbs]="['Mi Portal']"></app-page-header>
    <h2 class="nx-section__title">¿Qué necesitas?</h2>
    <div class="nx-benefits nx-mb-20">
      <button *ngFor="let p of procesos" type="button" class="nx-card nx-benefit nx-proc" (click)="abrir(p)">
        <span class="nx-iconbox nx-iconbox--38"><app-icon [name]="p.icono" [size]="18"></app-icon></span>
        <b>{{ p.nombre }}</b>
        <span class="nx-muted nx-small">{{ p.descripcion }}</span>
      </button>
    </div>
    <h2 class="nx-section__title">Mis solicitudes</h2>
    <div class="nx-card nx-dt__scroll">
      <table class="nx-table" aria-label="Mis solicitudes">
        <thead><tr><th>N°</th><th>Solicitud</th><th>Tipo</th><th>Creada</th><th>Actualizada</th><th>Progreso</th><th>Estado</th></tr></thead>
        <tbody>
          <tr *ngFor="let s of mias">
            <td>{{ s.id }}</td><td><b>{{ s.titulo }}</b></td><td>{{ s.tipo }}</td><td>{{ s.creada }}</td><td>{{ s.actualizada }}</td>
            <td><span class="nx-progress"><span class="nx-progress__track"><span [style.width.%]="s.progreso"></span></span><span class="nx-progress__text">{{ s.progreso }}%</span></span></td>
            <td><span class="nx-badge" [ngClass]="'nx-tone-' + tone(s)" [title]="s.comentario">{{ s.estado }}</span><div *ngIf="s.comentario" class="nx-small nx-muted">{{ s.comentario }}</div></td>
          </tr>
          <tr *ngIf="!mias.length"><td colspan="7"><div class="nx-empty nx-empty--compact"><b>Aún no has iniciado solicitudes</b></div></td></tr>
        </tbody>
      </table>
    </div>

    <app-modal *ngIf="form as f" [title]="f.p.nombre" width="520px" (closed)="form = null">
      <form id="proc-form" class="nx-form" (ngSubmit)="enviar()">
        <p class="nx-mt-0 nx-muted">{{ f.p.descripcion }}</p>
        <label class="nx-field">{{ f.p.campo.label }}{{ f.p.campo.obligatorio ? '*' : '' }}
          <select *ngIf="f.p.campo.tipo === 'opcion'" class="nx-select" name="valor" [(ngModel)]="f.valor">
            <option value="" disabled>Selecciona una opción</option><option *ngFor="let o of f.p.campo.opciones">{{ o }}</option>
          </select>
          <input *ngIf="f.p.campo.tipo === 'monto'" class="nx-input" name="valor" inputmode="decimal" placeholder="0.00" [(ngModel)]="f.valor">
          <textarea *ngIf="f.p.campo.tipo === 'texto'" class="nx-textarea" name="valor" rows="3" maxlength="300" [(ngModel)]="f.valor"></textarea>
          <span *ngIf="f.p.id === 'adelanto'" class="nx-hint">Máximo {{ fmt(maxAdelanto) }} (50 % de tu sueldo base).</span>
        </label>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
        <span *ngIf="errorApi" class="nx-error" role="alert">{{ errorApi }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="form = null">Cancelar</button>
        <button type="submit" form="proc-form" class="nx-btn nx-btn--primary" [disabled]="enviando">{{ enviando ? 'Enviando…' : 'Enviar solicitud' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class ProcesosInternosComponent implements OnDestroy {
  /** Request types of the portal; the 5th-category certificate offers the last two closed years. */
  readonly procesos: ProcesoPortal[] = PROCESOS_PORTAL.map((p) => {
    if (p.id !== 'quinta') return p;
    const anio = (parseFecha(this.asis.corte) ?? new Date()).getFullYear();
    return { ...p, campo: { ...p.campo, opciones: [String(anio - 1), String(anio - 2)] } };
  });
  mias: SolicitudWf[] = [];
  form: { p: ProcesoPortal; valor: string } | null = null;
  intento = false;
  private yo?: Colaborador;
  private sub: Subscription;

  constructor(private data: HrDataService, private asis: AsistenciaService, private portal: PortalService, private ui: UiStateService) {
    this.sub = combineLatest([data.colaboradores(), data.solicitudesWf()]).subscribe(([cs, ss]) => {
      this.yo = cs.find((c) => c.id === portal.yoId);
      this.mias = ss.filter((s) => s.esMia);
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  fmt(n: number): string { return soles(n); }
  tone(s: SolicitudWf): string { return ESTADO_SOLICITUD_TONE[s.estado]; }
  get maxAdelanto(): number { return this.yo ? Math.round(this.asis.base(this.yo) * 50) / 100 : 0; }

  abrir(p: ProcesoPortal): void { this.intento = false; this.form = { p, valor: '' }; }

  get error(): string {
    const f = this.form;
    if (!f) return '';
    const v = String(f.valor).trim();
    if (f.p.campo.obligatorio && !v) return 'Completa este dato para enviar la solicitud.';
    if (f.p.campo.tipo === 'monto') {
      const n = Number(v.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) return 'Ingresa un monto mayor a 0.';
      if (n > this.maxAdelanto) return `El adelanto no puede superar ${this.fmt(this.maxAdelanto)}.`;
    }
    if (f.p.id === 'adelanto' && this.mias.some((s) => s.proceso === 'adelanto' && s.estado === 'Pendiente')) {
      return 'Ya tienes un adelanto pendiente de aprobación.';
    }
    return '';
  }

  enviando = false;
  errorApi = '';
  /** The API validates again (amount limit, one pending advance) and records the request. */
  enviar(): void {
    this.intento = true;
    this.errorApi = '';
    const f = this.form;
    if (!f || !this.yo || this.error || this.enviando) return;
    this.enviando = true;
    this.data.solicitarDesdePortal(f.p.id, String(f.valor).trim()).subscribe({
      next: (s) => { this.enviando = false; this.form = null; this.ui.toast(`Solicitud #${s.id} enviada a Recursos Humanos`); },
      error: (e) => { this.enviando = false; this.errorApi = mensajeError(e); },
    });
  }
}
