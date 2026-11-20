import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { EstadoCuentaComponent } from '../features/configuracion/estado-cuenta.component';
import { GenericosModule } from '../features/genericos/genericos.module';
import { CatalogoComponent } from '../features/genericos/catalogo.component';
import { ConfigFormComponent } from '../features/genericos/config-form.component';
import { UsuariosComponent } from '../features/configuracion/usuarios.component';
import { ParametrosComponent } from '../features/configuracion/parametros.component';
import { HistorialCambiosComponent } from '../features/configuracion/historial-cambios.component';
import { ApiAccesosComponent } from '../features/configuracion/api-accesos.component';

/** Screens of the "configuracion" section; loaded on first visit to /configuracion. */
const SCREENS = {
  'configuracion/usuarios': UsuariosComponent,
  'configuracion/parametros': ParametrosComponent,
  'configuracion/historial': HistorialCambiosComponent,
  'configuracion/api': ApiAccesosComponent,
  'configuracion/atributos': CatalogoComponent,
  'configuracion/recordatorios': CatalogoComponent,
  'configuracion/empresas': CatalogoComponent,
  'configuracion/sindicatos': CatalogoComponent,
  'configuracion/cuentas-contables': CatalogoComponent,
  'configuracion/centros-de-costo': CatalogoComponent,
  'configuracion/estructuras-contables': CatalogoComponent,
  'configuracion/localidades': CatalogoComponent,
  'configuracion/feriados': CatalogoComponent,
  'configuracion/notificaciones': ConfigFormComponent,
  'configuracion/estado-de-cuenta': EstadoCuentaComponent,
};

/** Which catalog or settings form each generic route shows. */
const GENERICOS: Record<string, object> = {
  'configuracion/atributos': { catalogo: 'atributos' },
  'configuracion/recordatorios': { catalogo: 'recordatorios' },
  'configuracion/empresas': { catalogo: 'empresas' },
  'configuracion/sindicatos': { catalogo: 'sindicatos' },
  'configuracion/cuentas-contables': { catalogo: 'cuentas-contables' },
  'configuracion/centros-de-costo': { catalogo: 'centros-de-costo' },
  'configuracion/estructuras-contables': { catalogo: 'estructuras-contables' },
  'configuracion/localidades': { catalogo: 'localidades' },
  'configuracion/feriados': { catalogo: 'feriados' },
  'configuracion/notificaciones': { config: 'notificaciones' },
};

const routes: Routes = [
  ...sectionRoutes('configuracion', SCREENS, GENERICOS),
];

@NgModule({
  declarations: [
    EstadoCuentaComponent,
    UsuariosComponent,
    ParametrosComponent,
    HistorialCambiosComponent,
    ApiAccesosComponent,
  ],
  imports: [SharedModule, GenericosModule, RouterModule.forChild(routes)],
})
export class ConfiguracionModule {}
