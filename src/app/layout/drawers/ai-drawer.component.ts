import { Component } from '@angular/core';
import { UiStateService } from '../../core/ui-state.service';

interface Msg { me: boolean; text: string; }

const PRESETS = [
  { icon: 'lightbulb', title: '¿Qué puedo hacer por ti?', text: 'Responder dudas sobre el uso de la plataforma, temas de RR.HH. y artículos de ayuda.', q: '¿Qué puedo hacer en Nexo RH?' },
  { icon: 'message', title: '¿Cómo preguntar?', text: 'Escribe preguntas concretas. Por ejemplo: “¿Cómo agrego participantes a una encuesta de clima?”', q: '¿Cómo agrego participantes a una encuesta de clima?' },
  { icon: 'alert', title: 'Limitaciones', text: 'No consulto ni modifico datos de colaboradores; respondo con base en la documentación de Nexo RH.', q: '¿Qué limitaciones tiene Nexo AI?' },
  { icon: 'info', title: 'A tomar en cuenta', text: 'Disponible solo para perfiles administradores. Revisa siempre la respuesta antes de aplicarla.', q: '¿Quién puede usar Nexo AI?' },
];

/**
 * Nexo AI assistant panel. Answers are canned (as in the design) until an assistant API is connected.
 */
@Component({
  selector: 'app-ai-drawer',
  template: `
    <aside class="nx-drawer" aria-label="Nexo AI" role="dialog" aria-modal="true">
      <div class="nx-drawer__head">
        <h2><app-icon class="nx-primary" name="sparkle"></app-icon>Nexo AI</h2>
        <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Reiniciar conversación" (click)="msgs = []; draft = ''">
          <app-icon name="history" [size]="19"></app-icon>
        </button>
        <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Cerrar" (click)="ui.closeDrawer()">
          <app-icon name="x"></app-icon>
        </button>
      </div>
      <div class="nx-chat">
        <div class="nx-chat__log" aria-live="polite">
          <div class="nx-chat__hello">
            <span class="nx-chat__bot"><app-icon name="sparkle" [size]="18"></app-icon></span>
            <div class="nx-bubble">¡Hola! Soy <b>Nexo AI</b>, tu compañero digital para la gestión de personas.</div>
          </div>
          <div *ngIf="!msgs.length" class="nx-chat__presets">
            <button *ngFor="let p of presets" type="button" class="nx-preset" (click)="send(p.q)">
              <span class="nx-iconbox"><app-icon [name]="p.icon" [size]="17"></app-icon></span>
              <span class="nx-preset__text"><b>{{ p.title }}</b><span>{{ p.text }}</span></span>
            </button>
          </div>
          <div *ngFor="let m of msgs" class="nx-chat__row" [class.is-me]="m.me">
            <div class="nx-bubble" [class.nx-bubble--me]="m.me">{{ m.text }}</div>
          </div>
        </div>
        <form class="nx-chat__input" (ngSubmit)="send(draft)">
          <input class="nx-input" name="draft" aria-label="Escribe tu pregunta" placeholder="Escribe tu pregunta…" [(ngModel)]="draft">
          <button type="submit" class="nx-btn nx-btn--primary nx-btn--square" aria-label="Enviar"><app-icon name="send" [size]="17"></app-icon></button>
        </form>
      </div>
    </aside>
  `
})
export class AiDrawerComponent {
  readonly presets = PRESETS;
  msgs: Msg[] = [];
  draft = '';

  constructor(public ui: UiStateService) {}

  send(q: string): void {
    if (!q.trim()) return;
    const answer = q.toLowerCase().includes('clima')
      ? 'Ve a Desarrollo Organizacional › Encuestas › Clima, abre la encuesta y entra al paso Participantes. Usa “Agregar Participantes” o filtra por área y selecciona a los colaboradores.\nArtículo de ayuda: Encuestas de clima.'
      : 'Puedo orientarte en el uso de la plataforma y temas de RR.HH. Por ejemplo: crear cargos, cargar colaboradores con importadores o configurar flujos de aprobación.';
    this.msgs = [...this.msgs, { me: true, text: q }, { me: false, text: answer }];
    this.draft = '';
  }
}
