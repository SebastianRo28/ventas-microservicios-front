import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { ServicioComponent } from '../features/comunicaciones/servicio.component';
import { GenericosModule } from '../features/genericos/genericos.module';
import { ConfigFormComponent } from '../features/genericos/config-form.component';
import { DenunciasComponent } from '../features/comunicaciones/denuncias.component';
import { EncuestasAdminComponent } from '../features/comunicaciones/encuestas-admin.component';
import { CorreosComponent } from '../features/comunicaciones/correos.component';
import { PortalAdminComponent } from '../features/comunicaciones/portal-admin.component';
import { ReconocimientosAdminComponent } from '../features/comunicaciones/reconocimientos-admin.component';

/** Screens of the "do" section; loaded on first visit to /do. */
const SCREENS = {
  'do/denuncias': DenunciasComponent,
  'do/encuestas/libre': EncuestasAdminComponent,
  'do/encuestas/clima': EncuestasAdminComponent,
  'do/comunicaciones/correos': CorreosComponent,
  'do/comunicaciones/portal': PortalAdminComponent,
  'do/comunicaciones/reconocimientos': ReconocimientosAdminComponent,
  'do/encuestas/configuraciones': ConfigFormComponent,
  'do/denuncias/configuraciones': ConfigFormComponent,
  'do/comunicaciones/servicio': ServicioComponent,
};

/** Which catalog or settings form each generic route shows. */
const GENERICOS: Record<string, object> = {
  'do/encuestas/libre': { tipoEncuesta: 'Libre' },
  'do/encuestas/clima': { tipoEncuesta: 'Clima' },
  'do/encuestas/configuraciones': { config: 'encuestas' },
  'do/denuncias/configuraciones': { config: 'denuncias' },
};

const routes: Routes = [
  ...sectionRoutes('do', SCREENS, GENERICOS),
];

@NgModule({
  declarations: [
    ServicioComponent,
    DenunciasComponent,
    EncuestasAdminComponent,
    CorreosComponent,
    PortalAdminComponent,
    ReconocimientosAdminComponent,
  ],
  imports: [SharedModule, GenericosModule, RouterModule.forChild(routes)],
})
export class DoModule {}
