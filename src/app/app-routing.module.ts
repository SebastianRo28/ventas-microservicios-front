import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

/**
 * Each menu section is a lazy-loaded module (src/app/sections), so the first load only downloads the layout and the
 * section being opened. Screens and their routes are registered in each section module.
 */
const routes: Routes = [
  { path: '', redirectTo: 'admin/colaboradores/vigentes', pathMatch: 'full' },
  { path: 'admin', loadChildren: () => import('./sections/admin.module').then((m) => m.AdminModule) },
  { path: 'rem', loadChildren: () => import('./sections/rem.module').then((m) => m.RemModule) },
  { path: 'portal', loadChildren: () => import('./sections/portal.module').then((m) => m.PortalModule) },
  { path: 'do', loadChildren: () => import('./sections/do.module').then((m) => m.DoModule) },
  { path: 'sst', loadChildren: () => import('./sections/sst.module').then((m) => m.SstModule) },
  { path: 'rep', loadChildren: () => import('./sections/rep.module').then((m) => m.RepModule) },
  { path: 'configuracion', loadChildren: () => import('./sections/configuracion.module').then((m) => m.ConfiguracionModule) },
  { path: 'ca', loadChildren: () => import('./sections/ca.module').then((m) => m.CaModule) },
  { path: 'asistencia', redirectTo: 'ca/panel' },
  { path: '**', redirectTo: 'admin/colaboradores/vigentes' },
];

@NgModule({
  // Other sections download in the background once the app is idle, so moving between sections stays instant.
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
