import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
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
import { AuthInterceptor } from './core/auth.service';

/** App shell: layout (topbar, menu, drawers). Screens live in the lazy section modules under src/app/sections. */
@NgModule({
  declarations: [
    AppComponent,
    TopbarComponent, NavComponent, DrawersComponent, AdminDrawerComponent, PendientesDrawerComponent, AiDrawerComponent, LoginComponent,
  ],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, SharedModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
