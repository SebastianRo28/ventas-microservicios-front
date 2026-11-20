import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { UiStateService } from './core/ui-state.service';
import { ThemeService } from './core/theme.service';

/** Admin layout (design L-01): topbar 56px, rail 56px + sidebar 248px, fluid content, right drawers. */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  /** ThemeService is injected here so saved brand colors apply on startup. */
  /** The login page is shown without the app layout. */
  esLogin = location.pathname.startsWith('/login');

  constructor(public ui: UiStateService, _theme: ThemeService, router: Router) {
    router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => (this.esLogin = e.urlAfterRedirects.startsWith('/login')));
  }
}
