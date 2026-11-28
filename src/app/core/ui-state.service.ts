import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DrawerId = 'admin' | 'pendientes' | 'ai';

/** App-wide UI state: right-hand drawers, sidebar collapse and toasts. */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly drawer$ = new BehaviorSubject<DrawerId | null>(null);
  readonly navCollapsed$ = new BehaviorSubject<boolean>(false);
  /** Nexo AI chat window (floating button at the bottom right). */
  readonly chat$ = new BehaviorSubject<boolean>(false);
  readonly toast$ = new BehaviorSubject<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  /** 'ai' opens the Nexo AI chat window instead of a drawer. */
  openDrawer(id: DrawerId): void { if (id === 'ai') { this.drawer$.next(null); this.chat$.next(true); } else { this.chat$.next(false); this.drawer$.next(id); } }
  toggleChat(): void { this.chat$.next(!this.chat$.value); }
  closeDrawer(): void { this.drawer$.next(null); }
  toggleNav(): void { this.navCollapsed$.next(!this.navCollapsed$.value); }

  toast(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast$.next(message);
    this.toastTimer = setTimeout(() => this.toast$.next(null), 3500);
  }
}
