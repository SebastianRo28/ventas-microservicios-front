import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ConsolaService, errorConsola } from './consola.service';

export interface TenantModal { id: string; nombre: string; slug: string; soporteAutorizado: boolean; soporteHasta?: string | null; }

/** P-SA.2 Suspend tenant: reason, internal note and typing the slug to confirm. */
@Component({
  selector: 'app-cx-suspender',
  template: `
    <app-modal [title]="'Suspender ' + t.nombre" width="520px" (closed)="cerrado.emit()">
      <div class="cx-alerta cx-alerta--peligro"><app-icon name="alert" [size]="16"></app-icon>
        <span>Efecto inmediato: los usuarios del tenant verán “Cuenta suspendida”, se pausan correos y la API responde 423. No se borra ningún dato.</span></div>
      <label class="nx-field">Motivo *
        <select class="nx-select" [(ngModel)]="motivo" name="motivo">
          <option value="">Elige un motivo</option>
          <option *ngFor="let m of motivos" [value]="m">{{ m }}</option>
        </select>
      </label>
      <label class="nx-field">Nota interna<textarea class="nx-input" rows="2" maxlength="500" [(ngModel)]="nota" name="nota"></textarea></label>
      <label class="nx-field"><span>Escribe <b>{{ t.slug }}</b> para confirmar</span><input class="nx-input" [(ngModel)]="confirmacion" name="conf" autocomplete="off"></label>
      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cerrado.emit()">Cancelar</button>
        <button type="button" class="nx-btn cx-btn-peligro" [disabled]="!motivo || confirmacion !== t.slug || enviando" (click)="suspender()">{{ enviando ? 'Suspendiendo…' : 'Suspender tenant' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class CxSuspenderComponent {
  @Input({ required: true }) t!: TenantModal;
  @Output() cerrado = new EventEmitter<void>();
  @Output() hecho = new EventEmitter<void>();
  readonly motivos = ['Morosidad (factura vencida > 30 días)', 'Solicitud del cliente', 'Incumplimiento de términos', 'Seguridad / fraude'];
  motivo = '';
  nota = '';
  confirmacion = '';
  enviando = false;
  error = '';

  constructor(private c: ConsolaService) {}

  suspender(): void {
    this.enviando = true;
    this.c.post(`tenants/${this.t.id}/suspend`, { motivo: this.motivo, nota: this.nota, confirmacion: this.confirmacion }).subscribe({
      next: () => this.hecho.emit(),
      error: (e) => { this.enviando = false; this.error = errorConsola(e); },
    });
  }
}

/** P-SA.5 Enter as support: reason, ticket (mandatory without the customer's authorization) and read/write mode. */
@Component({
  selector: 'app-cx-soporte',
  template: `
    <app-modal title="Entrar como soporte" width="560px" (closed)="cerrado.emit()">
      <div *ngIf="!t.soporteAutorizado" class="cx-alerta cx-alerta--aviso"><app-icon name="alert" [size]="16"></app-icon>
        <span>El cliente no autorizó accesos de soporte. Puedes continuar solo con un ticket abierto; los administradores del tenant recibirán una notificación inmediata y la sesión quedará en su auditoría.</span></div>
      <div *ngIf="t.soporteAutorizado" class="cx-alerta cx-alerta--info"><app-icon name="info" [size]="16"></app-icon>
        <span>El cliente autorizó accesos de soporte{{ t.soporteHasta ? ' hasta el ' + (t.soporteHasta | date: 'dd/MM/yyyy') : '' }}. Igual se notificará a sus administradores.</span></div>
      <label class="nx-field">Motivo *
        <textarea class="nx-input" rows="2" maxlength="500" [(ngModel)]="motivo" name="motivo" [class.is-invalid]="intento && motivo.trim().length < 15"></textarea>
        <span *ngIf="intento && motivo.trim().length < 15" class="nx-error">El motivo es obligatorio (mínimo 15 caracteres).</span>
      </label>
      <label class="nx-field">N° de ticket{{ t.soporteAutorizado ? '' : ' *' }}<input class="nx-input" maxlength="40" [(ngModel)]="ticket" name="ticket" placeholder="SOP-00000"></label>
      <div class="nx-field"><span>Modo *</span>
        <div class="cx-radios">
          <label class="cx-radio" [class.is-on]="modo === 'lectura'"><input type="radio" name="modo" value="lectura" [(ngModel)]="modo"><span><b>Solo lectura</b><small>Ves la app del cliente; cualquier guardado queda bloqueado (403).</small></span></label>
          <label class="cx-radio" [class.is-on]="modo === 'escritura'"><input type="radio" name="modo" value="escritura" [(ngModel)]="modo"><span><b>Escritura con justificación</b><small>Permite cambios; cada escritura se audita con tu usuario de plataforma.</small></span></label>
        </div>
      </div>
      <label *ngIf="modo === 'escritura'" class="nx-field">Justificación de escritura *<textarea class="nx-input" rows="2" maxlength="500" [(ngModel)]="justificacion" name="just"></textarea></label>
      <p class="nx-hint">La sesión expira a los 60 minutos y se abre en una pestaña nueva con el banner rojo de soporte.</p>
      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cerrado.emit()">Cancelar</button>
        <button type="button" class="nx-btn cx-btn-peligro" [disabled]="!valido || enviando" (click)="iniciar()">{{ enviando ? 'Abriendo…' : 'Iniciar sesión de soporte' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class CxSoporteComponent {
  @Input({ required: true }) t!: TenantModal;
  @Output() cerrado = new EventEmitter<void>();
  motivo = '';
  ticket = '';
  modo: 'lectura' | 'escritura' = 'lectura';
  justificacion = '';
  intento = false;
  enviando = false;
  error = '';

  constructor(private c: ConsolaService) {}

  get valido(): boolean {
    return this.motivo.trim().length >= 15 && (this.t.soporteAutorizado || !!this.ticket.trim()) && (this.modo === 'lectura' || this.justificacion.trim().length >= 10);
  }

  iniciar(): void {
    this.intento = true;
    if (!this.valido) return;
    this.enviando = true;
    // The tab is opened now (in the click) so the browser does not block it; the URL arrives with the response.
    const pestana = window.open('', '_blank');
    this.c.post<{ id: string; url: string }>('support-sessions', { tenantId: this.t.id, motivo: this.motivo, ticket: this.ticket || null, modo: this.modo, justificacion: this.justificacion || null }).subscribe({
      next: (r) => { if (pestana) pestana.location.href = r.url; else window.location.assign(r.url); this.cerrado.emit(); },
      error: (e: HttpErrorResponse) => { pestana?.close(); this.enviando = false; this.error = errorConsola(e); },
    });
  }
}
