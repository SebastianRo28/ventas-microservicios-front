import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { UiStateService } from './core/ui-state.service';
import { cuentaCancelada$, cuentaSuspendida$, mantenimiento$, supportReadOnly$ } from './core/eventos';

/** Sign-in pages and required account steps: shown without the topbar and menu. */
const SIN_LAYOUT = /^\/(login|acceso|olvide|restablecer|activar|cambiar-password|seguridad\/doble-factor|dev\/correos|consola|soporte|cuenta-suspendida)(\/|\?|$)/;

/** Admin layout (design L-01): topbar 56px, rail 56px + sidebar 248px, fluid content, right drawers. */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  /** Login and change-password pages are shown without the app layout. */
  esLogin = SIN_LAYOUT.test(location.pathname);
  readonly consola = /^admin\./.test(location.hostname);

  constructor(public ui: UiStateService, router: Router) {
    supportReadOnly$.subscribe(() => ui.toast('Sesión de soporte en modo solo lectura: no se guardó el cambio.'));
    cuentaSuspendida$.subscribe(() => router.navigate(['/cuenta-suspendida']));
    cuentaCancelada$.subscribe(() => ui.toast('La cuenta está cancelada: solo se puede consultar y descargar la información.'));
    // Many requests fail at once during maintenance: one notice every 30 s is enough.
    let ultimoAviso = 0;
    mantenimiento$.subscribe(() => {
      if (Date.now() - ultimoAviso < 30_000) return;
      ultimoAviso = Date.now();
      ui.toast('Estamos mejorando la plataforma de tu empresa. Vuelve a intentarlo en unos minutos.');
    });
    // admin.{domain} is the provider console: everything outside /consola goes there.
    if (this.consola && !location.pathname.startsWith('/consola')) router.navigateByUrl('/consola');
    router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => (this.esLogin = SIN_LAYOUT.test(e.urlAfterRedirects)));
  }
}
