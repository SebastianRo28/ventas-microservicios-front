import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { ConsolaLayoutComponent } from './consola-layout.component';
import { ConsolaLoginComponent } from './consola-login.component';
import { ConsolaDashboardComponent } from './consola-dashboard.component';
import { ConsolaTenantsComponent } from './consola-tenants.component';
import { ConsolaTenantNuevoComponent } from './consola-tenant-nuevo.component';
import { ConsolaTenantDetalleComponent } from './consola-tenant-detalle.component';
import { CxSoporteComponent, CxSuspenderComponent } from './consola-modales.component';
import { ConsolaCatalogosComponent, ConsolaFlagsComponent, ConsolaNovedadesComponent, ConsolaPlanesComponent, ConsolaSaludComponent } from './consola-config.component';
import { consolaGuard } from './consola.service';

/** Provider console (admin.{domain}, spec. 9): lazy loaded, own session and fixed Nexo RH theme. */
const routes: Routes = [
  { path: 'login', component: ConsolaLoginComponent, title: 'Consola · Nexo RH' },
  {
    path: '', component: ConsolaLayoutComponent, canActivate: [consolaGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: ConsolaDashboardComponent, title: 'Dashboard · Consola Nexo RH' },
      { path: 'tenants', component: ConsolaTenantsComponent, title: 'Tenants · Consola Nexo RH' },
      { path: 'tenants/nuevo', component: ConsolaTenantNuevoComponent, title: 'Crear tenant · Consola Nexo RH' },
      { path: 'tenants/:id', component: ConsolaTenantDetalleComponent, title: 'Tenant · Consola Nexo RH' },
      { path: 'planes', component: ConsolaPlanesComponent, title: 'Planes y precios · Consola Nexo RH' },
      { path: 'catalogos', component: ConsolaCatalogosComponent, title: 'Catálogos globales · Consola Nexo RH' },
      { path: 'novedades', component: ConsolaNovedadesComponent, title: 'Novedades · Consola Nexo RH' },
      { path: 'flags', component: ConsolaFlagsComponent, title: 'Feature flags · Consola Nexo RH' },
      { path: 'salud', component: ConsolaSaludComponent, title: 'Salud · Consola Nexo RH' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];

@NgModule({
  declarations: [
    ConsolaLayoutComponent, ConsolaLoginComponent, ConsolaDashboardComponent, ConsolaTenantsComponent, ConsolaTenantNuevoComponent, ConsolaTenantDetalleComponent,
    CxSoporteComponent, CxSuspenderComponent, ConsolaPlanesComponent, ConsolaCatalogosComponent, ConsolaNovedadesComponent, ConsolaFlagsComponent, ConsolaSaludComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ConsolaModule {}
