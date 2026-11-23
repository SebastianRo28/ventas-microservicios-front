import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { MarcaService } from './core/marca.service';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';

import { TopbarComponent } from './layout/topbar/topbar.component';
import { NavComponent } from './layout/nav/nav.component';
import { DrawersComponent } from './layout/drawers/drawers.component';
import { AdminDrawerComponent } from './layout/drawers/admin-drawer.component';
import { PendientesDrawerComponent } from './layout/drawers/pendientes-drawer.component';
import { AiDrawerComponent } from './layout/drawers/ai-drawer.component';
import { LoginComponent } from './features/login/login.component';
import { BuscarEnlaceComponent, EntradaGlobalComponent } from './features/login/entrada-global.component';
import { NuevaPasswordComponent, OlvideComponent } from './features/login/recuperacion.component';
import { DobleFactorComponent } from './features/login/doble-factor.component';
import { BandejaDevComponent } from './features/login/bandeja-dev.component';
import { SelloEmpresaComponent } from './features/login/sello-empresa.component';
import { ModuloBloqueadoComponent } from './layout/modulo-bloqueado.component';
import { BannersComponent } from './layout/banners.component';
import { BannerSoporteComponent, SoporteEntradaComponent } from './features/login/soporte.component';
import { CuentaSuspendidaComponent } from './features/login/cuenta-suspendida.component';
import { CambiarPasswordComponent } from './features/login/cambiar-password.component';
import { AuthInterceptor } from './core/auth.service';

/** App shell: layout (topbar, menu, drawers). Screens live in the lazy section modules under src/app/sections. */
@NgModule({
  declarations: [
    AppComponent,
    TopbarComponent, NavComponent, DrawersComponent, AdminDrawerComponent, PendientesDrawerComponent, AiDrawerComponent, LoginComponent, CambiarPasswordComponent,
    EntradaGlobalComponent, BuscarEnlaceComponent, OlvideComponent, NuevaPasswordComponent, DobleFactorComponent, BandejaDevComponent, SelloEmpresaComponent, ModuloBloqueadoComponent, BannersComponent, BannerSoporteComponent, SoporteEntradaComponent, CuentaSuspendidaComponent,
  ],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, SharedModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    // The company's brand is applied before the first screen is shown (no flash of the default theme).
    { provide: APP_INITIALIZER, useFactory: (m: MarcaService) => () => m.iniciar(), deps: [MarcaService], multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
