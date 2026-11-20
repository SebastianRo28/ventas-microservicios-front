import { Component } from '@angular/core';
import { UiStateService } from './core/ui-state.service';
import { ThemeService } from './core/theme.service';

/** Admin layout (design L-01): topbar 56px, rail 56px + sidebar 248px, fluid content, right drawers. */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  /** ThemeService is injected here so saved brand colors apply on startup. */
  constructor(public ui: UiStateService, _theme: ThemeService) {}
}
