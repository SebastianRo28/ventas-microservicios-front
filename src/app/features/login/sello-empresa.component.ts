import { Component } from '@angular/core';
import { inicialesEmpresa } from '../../core/entrada.service';
import { MarcaService } from '../../core/marca.service';

/** Square mark of the company on the sign-in pages: its isotype, or its initials on the brand color. */
@Component({
  selector: 'app-sello-empresa',
  template: `
    <img *ngIf="marcas.marca?.logos?.cuadrado as logo; else iniciales" class="nx-acceso__logo nx-acceso__logo--img" [src]="logo" [alt]="marcas.marca?.empresa">
    <ng-template #iniciales><span class="nx-acceso__logo" aria-hidden="true">{{ ini }}</span></ng-template>
  `
})
export class SelloEmpresaComponent {
  constructor(public marcas: MarcaService) {}
  get ini(): string { return inicialesEmpresa(this.marcas.marca?.empresa ?? 'Nexo RH'); }
}
