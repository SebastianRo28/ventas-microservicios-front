import { AfterViewChecked, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { AsistenteService } from '../../core/asistente.service';
import { UiStateService } from '../../core/ui-state.service';

const PRESETS = [
  { icon: 'lightbulb', title: '¿Qué puedo hacer por ti?', text: 'Explicarte cómo usar Nexo RH: dónde está cada opción y cómo hacer cada proceso.', q: '¿Qué puedo hacer en Nexo RH?' },
  { icon: 'message', title: '¿Cómo preguntar?', text: 'Escribe preguntas concretas. Por ejemplo: “¿Cómo agrego participantes a una encuesta de clima?”', q: '¿Cómo agrego participantes a una encuesta de clima?' },
  { icon: 'alert', title: 'Limitaciones', text: 'Solo respondo sobre el uso de Nexo RH. No veo ni modifico datos de tu empresa ni de sus colaboradores.', q: '¿Qué limitaciones tiene Nexo AI?' },
  { icon: 'info', title: 'A tomar en cuenta', text: 'Las respuestas las genera una IA: revísalas antes de aplicarlas.', q: '¿Cómo cambio mi contraseña?' },
];

/**
 * Nexo AI: floating button at the bottom right that opens a chat window about how to use Nexo RH
 * (answers come from the API, see AsistenteService). Other screens open it with `ui.openDrawer('ai')`.
 */
@Component({
  selector: 'app-nexo-ai',
  template: `
    <section *ngIf="ui.chat$ | async" id="nx-ai-chat" class="nx-ai-chat" role="dialog" aria-label="Nexo AI">
      <div class="nx-ai-chat__head">
        <span class="nx-chat__bot"><app-icon name="sparkle" [size]="18"></app-icon></span>
        <h2>Nexo AI<small>Asistente de Nexo RH</small></h2>
        <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Reiniciar conversación" title="Reiniciar conversación"
                [disabled]="ai.pensando" (click)="ai.reiniciar(); draft = ''">
          <app-icon name="history" [size]="19"></app-icon>
        </button>
        <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Minimizar" title="Minimizar" (click)="cerrar()">
          <app-icon name="chevron-down"></app-icon>
        </button>
      </div>
      <div class="nx-chat">
        <div #log class="nx-chat__log" aria-live="polite">
          <div class="nx-chat__hello">
            <span class="nx-chat__bot"><app-icon name="sparkle" [size]="18"></app-icon></span>
            <div class="nx-bubble">¡Hola! Soy <b>Nexo AI</b>. Te ayudo a usar Nexo RH: pregúntame dónde está una opción o cómo hacer un proceso.</div>
          </div>
          <div *ngIf="!ai.msgs.length" class="nx-chat__presets">
            <button *ngFor="let p of presets" type="button" class="nx-preset" (click)="send(p.q)">
              <span class="nx-iconbox"><app-icon [name]="p.icon" [size]="17"></app-icon></span>
              <span class="nx-preset__text"><b>{{ p.title }}</b><span>{{ p.text }}</span></span>
            </button>
          </div>
          <div *ngFor="let m of ai.msgs" class="nx-chat__row" [class.is-me]="m.me">
            <div class="nx-bubble" [class.nx-bubble--me]="m.me" [class.nx-bubble--error]="m.error && !m.me">{{ m.text }}</div>
          </div>
          <div *ngIf="ai.pensando" class="nx-chat__row">
            <div class="nx-bubble nx-chat__typing" aria-label="Nexo AI está escribiendo"><span></span><span></span><span></span></div>
          </div>
          <p *ngIf="ai.lleno" class="nx-hint">La conversación llegó a su límite. Reiníciala con el botón de arriba para seguir preguntando.</p>
        </div>
        <form class="nx-chat__input" (ngSubmit)="send(draft)">
          <input #entrada class="nx-input" name="draft" aria-label="Escribe tu pregunta" placeholder="Escribe tu pregunta…" autocomplete="off"
                 [maxlength]="max" [disabled]="ai.lleno" [(ngModel)]="draft">
          <button type="submit" class="nx-btn nx-btn--primary nx-btn--square" aria-label="Enviar" [disabled]="ai.pensando || ai.lleno || !draft.trim()">
            <app-icon name="send" [size]="17"></app-icon>
          </button>
        </form>
      </div>
    </section>
    <button type="button" class="nx-ai-fab" [class.is-open]="ui.chat$ | async" (click)="ui.toggleChat()"
            [attr.aria-label]="(ui.chat$ | async) ? 'Cerrar Nexo AI' : 'Abrir Nexo AI'" [attr.aria-expanded]="ui.chat$ | async" aria-controls="nx-ai-chat"
            [title]="(ui.chat$ | async) ? 'Cerrar Nexo AI' : 'Pregúntale a Nexo AI'">
      <app-icon [name]="(ui.chat$ | async) ? 'x' : 'sparkle'" [size]="24"></app-icon>
    </button>
  `
})
export class AiDrawerComponent implements AfterViewChecked {
  @ViewChild('log') log?: ElementRef<HTMLElement>;
  @ViewChild('entrada') set entrada(e: ElementRef<HTMLInputElement> | undefined) {
    // Focus the question box when the window opens.
    if (e && !this.enfocado) { this.enfocado = true; setTimeout(() => e.nativeElement.focus()); }
    if (!e) { this.enfocado = false; this.vistos = -1; }
  }
  private enfocado = false;

  @HostListener('document:keydown.escape')
  cerrar(): void { if (this.ui.chat$.value) this.ui.chat$.next(false); }
  readonly presets = PRESETS;
  readonly max = AsistenteService.MAX_CARACTERES;
  draft = '';
  private vistos = -1;

  constructor(public ui: UiStateService, public ai: AsistenteService) {}

  /** Keeps the last message in view. */
  ngAfterViewChecked(): void {
    const n = this.ai.msgs.length + (this.ai.pensando ? 1 : 0);
    if (n !== this.vistos && this.log) { this.vistos = n; this.log.nativeElement.scrollTop = this.log.nativeElement.scrollHeight; }
  }

  send(q: string): void {
    if (!q.trim() || this.ai.pensando || this.ai.lleno) return;
    this.draft = '';
    this.ai.preguntar(q).subscribe();
  }
}
