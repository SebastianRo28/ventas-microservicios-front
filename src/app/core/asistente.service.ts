import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';

export interface MensajeChat { me: boolean; text: string; error?: boolean; }

/**
 * Conversation with Nexo AI (POST /api/asistente/mensajes). It is kept while the session lasts, so closing the panel does not lose it,
 * and cleared when the user changes. Only questions about using Nexo RH are answered; the API never sees the company's data.
 */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  /** Same limits as the API. */
  static readonly MAX_MENSAJES = 20;
  static readonly MAX_CARACTERES = 2000;

  msgs: MensajeChat[] = [];
  pensando = false;

  constructor(private http: HttpClient, auth: AuthService) {
    auth.usuario$.subscribe(() => this.reiniciar());
  }

  get lleno(): boolean { return this.msgs.filter((m) => !m.error).length >= AsistenteService.MAX_MENSAJES - 1; }

  reiniciar(): void { this.msgs = []; this.pensando = false; }

  /** Sends the question with the previous turns (failed answers are not sent) and appends the answer or the error. */
  preguntar(texto: string): Observable<void> {
    const q = texto.trim().slice(0, AsistenteService.MAX_CARACTERES);
    this.msgs = [...this.msgs, { me: true, text: q }];
    this.pensando = true;
    const mensajes = this.msgs.filter((m) => !m.error).map((m) => ({ rol: m.me ? 'usuario' : 'asistente', texto: m.text }));
    return this.http.post<{ texto: string }>(`${API_URL}/asistente/mensajes`, { mensajes }).pipe(
      map((r) => ({ me: false, text: r.texto } as MensajeChat)),
      catchError((e: HttpErrorResponse) => of({
        me: false, error: true,
        text: e.status === 429 ? 'Hiciste muchas preguntas seguidas. Espera un momento y vuelve a intentarlo.'
          : e.status === 0 ? 'No hay conexión con Nexo RH. Revisa tu conexión e intenta de nuevo.'
          : (e.error?.detail as string | undefined) ?? 'Nexo AI no pudo responder ahora. Intenta de nuevo en unos minutos.',
      } as MensajeChat)),
      map((m) => {
        // A failed question is removed from the history sent next time, together with its error.
        if (m.error) this.msgs = this.msgs.map((x, i) => i === this.msgs.length - 1 ? { ...x, error: true } : x);
        this.msgs = [...this.msgs, m];
        this.pensando = false;
      }));
  }
}
