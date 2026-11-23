import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, sesionGuard } from './core/auth.service';
import { CambiarPasswordComponent } from './features/login/cambiar-password.component';
import { LoginComponent } from './features/login/login.component';
import { SoporteEntradaComponent } from './features/login/soporte.component';
import { CuentaSuspendidaComponent } from './features/login/cuenta-suspendida.component';
import { NuevaPasswordComponent, OlvideComponent } from './features/login/recuperacion.component';
import { DobleFactorComponent } from './features/login/doble-factor.component';
import { BandejaDevComponent } from './features/login/bandeja-dev.component';
import { environment } from '../environments/environment';

/**
 * Each menu section is a lazy-loaded module (src/app/sections), so the first load only downloads the layout and the
 * section being opened. Screens and their routes are registered in each section module.
 */
const routes: Routes = [
  { path: 'login', component: LoginComponent, title: 'Iniciar sesión · Nexo RH' },
  // Link of the account selector of app.{domain}: one-time code that opens the session in this company.
  { path: 'acceso', component: LoginComponent, title: 'Ingresando · Nexo RH' },
  { path: 'olvide', component: OlvideComponent, title: 'Recuperar contraseña · Nexo RH' },
  { path: 'restablecer', component: NuevaPasswordComponent, data: { tipo: 'Restablecer' }, title: 'Nueva contraseña · Nexo RH' },
  { path: 'activar', component: NuevaPasswordComponent, data: { tipo: 'Activacion' }, title: 'Activa tu cuenta · Nexo RH' },
  { path: 'seguridad/doble-factor', component: DobleFactorComponent, canActivate: [sesionGuard], title: 'Doble factor · Nexo RH' },
  // E-mails the platform would have sent (development builds only).
  ...(environment.production ? [] : [{ path: 'dev/correos', component: BandejaDevComponent, title: 'Bandeja de correos · Nexo RH' }]),
  { path: 'cambiar-password', component: CambiarPasswordComponent, canActivate: [sesionGuard], title: 'Cambiar contraseña · Nexo RH' },
  // Provider console (admin.{domain}): own layout and session.
  { path: 'consola', loadChildren: () => import('./consola/consola.module').then((m) => m.ConsolaModule) },
  { path: 'soporte', component: SoporteEntradaComponent, title: 'Sesión de soporte · Nexo RH' },
  { path: 'cuenta-suspendida', component: CuentaSuspendidaComponent, canActivate: [sesionGuard], title: 'Cuenta suspendida · Nexo RH' },
  { path: '', redirectTo: 'admin/colaboradores/vigentes', pathMatch: 'full' },
  { path: 'admin', canActivate: [authGuard], loadChildren: () => import('./sections/admin.module').then((m) => m.AdminModule) },
  { path: 'rem', canActivate: [authGuard], loadChildren: () => import('./sections/rem.module').then((m) => m.RemModule) },
  { path: 'portal', canActivate: [authGuard], loadChildren: () => import('./sections/portal.module').then((m) => m.PortalModule) },
  { path: 'do', canActivate: [authGuard], loadChildren: () => import('./sections/do.module').then((m) => m.DoModule) },
  { path: 'sst', canActivate: [authGuard], loadChildren: () => import('./sections/sst.module').then((m) => m.SstModule) },
  { path: 'rep', canActivate: [authGuard], loadChildren: () => import('./sections/rep.module').then((m) => m.RepModule) },
  { path: 'configuracion', canActivate: [authGuard], loadChildren: () => import('./sections/configuracion.module').then((m) => m.ConfiguracionModule) },
  { path: 'ca', canActivate: [authGuard], loadChildren: () => import('./sections/ca.module').then((m) => m.CaModule) },
  { path: 'asistencia', redirectTo: 'ca/panel' },
  { path: '**', redirectTo: 'admin/colaboradores/vigentes' },
];

@NgModule({
  // Other sections download in the background once the app is idle, so moving between sections stays instant.
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
