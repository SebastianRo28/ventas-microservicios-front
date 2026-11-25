import { Component } from '@angular/core';
import { CategoriaTicket, EstadoTicket, Ticket } from '../../core/sample/servicio';
import { AsistenciaService } from '../../core/asistencia.service';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';
import { parseFecha } from '../../core/format';
import { UiStateService } from '../../core/ui-state.service';

/** SLA for a first answer, in hours. */
const SLA_HORAS = 48;
const ahora = () => new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
const ESTADO_TONE: Record<EstadoTicket, string> = { Abierto: 'warning', 'En proceso': 'info', Resuelto: 'success' };

/** Desarrollo Organizacional › Comunicaciones › Servicio al colaborador: inbox of collaborator questions with replies. */
@Component({
  selector: 'app-servicio',
  template: `
    <app-page-header title="Servicio al colaborador" [crumbs]="['Desarrollo Organizacional', 'Comunicaciones']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Abiertos</span><b>{{ cuenta('Abierto') }}</b></div>
      <div class="nx-card nx-stat"><span>En proceso</span><b>{{ cuenta('En proceso') }}</b></div>
      <div class="nx-card nx-stat"><span>Resueltos</span><b>{{ cuenta('Resuelto') }}</b></div>
      <div class="nx-card nx-stat"><span>Sin respuesta</span><b>{{ sinRespuesta }}</b></div>
    </div>
    <div class="nx-inbox nx-card">
      <aside class="nx-inbox__list">
        <div class="nx-inbox__filters">
          <select class="nx-select nx-select--sm" aria-label="Filtrar por estado" [(ngModel)]="filtro">
            <option value="">Todos los estados</option><option>Abierto</option><option>En proceso</option><option>Resuelto</option>
          </select>
          <select class="nx-select nx-select--sm" aria-label="Filtrar por categoría" [(ngModel)]="categoria">
            <option value="">Todas las categorías</option><option *ngFor="let c of categorias">{{ c }}</option>
          </select>
        </div>
        <button *ngFor="let t of visibles" type="button" class="nx-inbox__item" [class.is-active]="sel?.id === t.id" (click)="abrir(t)">
          <span class="nx-row nx-row--center"><b class="nx-grow nx-ellipsis">{{ t.asunto }}</b><span class="nx-badge nx-badge--sm" [ngClass]="'nx-tone-' + tone(t.estado)">{{ t.estado }}</span></span>
          <span class="nx-small">{{ t.colaborador }} · #{{ t.id }}</span>
          <span class="nx-small nx-muted">{{ t.categoria }} · {{ t.abierto }}</span>
        </button>
        <p *ngIf="!visibles.length" class="nx-muted nx-small nx-pad">No hay consultas con estos filtros.</p>
      </aside>
      <section class="nx-inbox__thread" aria-live="polite">
        <ng-container *ngIf="sel as t; else vacio">
          <header class="nx-inbox__head">
            <div class="nx-grow"><h2 class="nx-section__title nx-mb-0">{{ t.asunto }}</h2>
              <span class="nx-small nx-muted">#{{ t.id }} · {{ t.colaborador }} · {{ t.categoria }}</span>
              <span *ngIf="vencido(t)" class="nx-badge nx-badge--sm nx-tone-danger">Sin respuesta hace más de {{ sla }} h</span></div>
            <select class="nx-select nx-select--sm nx-w-140" aria-label="Estado de la consulta" [ngModel]="t.estado" (ngModelChange)="cambiarEstado(t, $event)">
              <option>Abierto</option><option>En proceso</option><option>Resuelto</option>
            </select>
          </header>
          <div class="nx-chat__log nx-inbox__log">
            <div *ngFor="let m of t.mensajes" class="nx-chat__row" [class.is-me]="m.rrhh">
              <div class="nx-bubble" [class.nx-bubble--me]="m.rrhh"><b class="nx-small">{{ m.autor }}</b><div>{{ m.texto }}</div><span class="nx-small nx-muted">{{ m.fecha }}</span></div>
            </div>
          </div>
          <form class="nx-inbox__reply" (ngSubmit)="responder(t)">
            <textarea class="nx-textarea" name="respuesta" rows="2" maxlength="1000" placeholder="Escribe una respuesta" aria-label="Respuesta" [(ngModel)]="respuesta"></textarea>
            <div class="nx-row nx-row--center">
              <label class="nx-check nx-check--plain nx-grow"><input type="checkbox" name="resolver" [(ngModel)]="resolver">Marcar como resuelto al enviar</label>
              <button type="submit" class="nx-btn nx-btn--primary" [disabled]="!respuesta.trim()"><app-icon name="send" [size]="15"></app-icon>Responder</button>
            </div>
          </form>
        </ng-container>
        <ng-template #vacio><div class="nx-empty"><b>Selecciona una consulta</b><span>Aquí verás la conversación y podrás responder.</span></div></ng-template>
      </section>
    </div>
  `
})
export class ServicioComponent {
  readonly categorias: CategoriaTicket[] = ['Remuneraciones', 'Vacaciones y asistencia', 'Beneficios', 'Documentos', 'Otros'];
  readonly sla = SLA_HORAS;
  /** Questions from the collaborators (/api/datos/tickets: each one sees their own, Recursos Humanos all of them). */
  get tickets(): Ticket[] { return this.datos.lista$<Ticket>('tickets').value; }
  filtro = '';
  categoria = '';
  private selId: number | null = null;
  get sel(): Ticket | null {
    return this.tickets.find((t) => t.id === this.selId) ?? (this.selId === null ? this.tickets.find((t) => t.estado !== 'Resuelto') ?? null : null);
  }
  respuesta = '';
  resolver = false;

  constructor(private ui: UiStateService, private datos: DatosService, private auth: AuthService, private asis: AsistenciaService) {}

  get visibles(): Ticket[] { return this.tickets.filter((t) => (!this.filtro || t.estado === this.filtro) && (!this.categoria || t.categoria === this.categoria)); }
  get sinRespuesta(): number { return this.tickets.filter((t) => t.estado !== 'Resuelto' && !t.mensajes.some((m) => m.rrhh)).length; }
  cuenta(e: EstadoTicket): number { return this.tickets.filter((t) => t.estado === e).length; }
  tone(e: EstadoTicket): string { return ESTADO_TONE[e]; }

  /** No HR answer yet and opened more than SLA hours ago (today = the attendance cut-off date, at the current time). */
  vencido(t: Ticket): boolean {
    if (t.estado === 'Resuelto' || t.mensajes.some((m) => m.rrhh)) return false;
    const [d, h] = t.abierto.split(' ');
    const [dd, mm, yy] = d.split('/').map(Number), [hh, mi] = h.split(':').map(Number);
    const hoy = parseFecha(this.asis.corte) ?? new Date(), ahoraMismo = new Date();
    hoy.setHours(ahoraMismo.getHours(), ahoraMismo.getMinutes());
    return (hoy.getTime() - new Date(yy, mm - 1, dd, hh, mi).getTime()) / 3_600_000 > SLA_HORAS;
  }

  abrir(t: Ticket): void { this.selId = t.id; this.respuesta = ''; this.resolver = false; }

  cambiarEstado(t: Ticket, e: EstadoTicket): void {
    this.selId = t.id;
    this.datos.actualizar('tickets', { ...t, estado: e }).subscribe(() => this.ui.toast(`Consulta #${t.id}: ${e.toLowerCase()}`));
  }

  responder(t: Ticket): void {
    const texto = this.respuesta.trim();
    if (!texto) return;
    const yo = this.auth.usuario?.nombre ?? 'Recursos Humanos';
    this.selId = t.id;
    this.datos.actualizar('tickets', {
      ...t, mensajes: [...t.mensajes, { autor: yo, rrhh: true, fecha: ahora(), texto }], asignado: t.asignado || yo,
      estado: this.resolver ? 'Resuelto' : 'En proceso',
    }).subscribe(() => this.ui.toast(`Respuesta enviada en la consulta #${t.id}`));
    this.respuesta = '';
    this.resolver = false;
  }
}
