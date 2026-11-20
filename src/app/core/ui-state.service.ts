import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DrawerId = 'admin' | 'pendientes' | 'ai';

/** App-wide UI state: right-hand drawers, sidebar collapse and toasts. */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly drawer$ = new BehaviorSubject<DrawerId | null>(null);
  readonly navCollapsed$ = new BehaviorSubject<boolean>(false);
  readonly toast$ = new BehaviorSubject<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  openDrawer(id: DrawerId): void { this.drawer$.next(id); }
  closeDrawer(): void { this.drawer$.next(null); }
  toggleNav(): void { this.navCollapsed$.next(!this.navCollapsed$.value); }

  toast(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast$.next(message);
    this.toastTimer = setTimeout(() => this.toast$.next(null), 3500);
  }
}
