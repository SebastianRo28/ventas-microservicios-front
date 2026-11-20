import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { SolicitudesColaboradoresComponent } from '../features/colaboradores/solicitudes-colaboradores.component';
import { GenericosModule } from '../features/genericos/genericos.module';
import { CatalogoComponent } from '../features/genericos/catalogo.component';
import { ConfigFormComponent } from '../features/genericos/config-form.component';
import { PanelModule } from '../features/panel/panel.module';
import { FichaModule } from '../features/colaboradores/ficha.module';
import { PanelComponent } from '../features/panel/panel.component';
import { FichaComponent } from '../features/colaboradores/ficha.component';
import { VigentesComponent } from '../features/colaboradores/vigentes.component';
import { CargosComponent } from '../features/organizacion/cargos.component';
import { AreasComponent } from '../features/organizacion/areas.component';
import { CrearColaboradorComponent } from '../features/colaboradores/crear-colaborador.component';
import { WfSolicitudesComponent } from '../features/workflow/solicitudes.component';
import { DocumentosComponent } from '../features/documentos/documentos.component';
import { WfPlantillasComponent } from '../features/workflow/plantillas.component';
import { DocPlantillasComponent } from '../features/documentos/doc-plantillas.component';
import { InventarioComponent } from '../features/activos/inventario.component';
import { OrdenesComponent } from '../features/activos/ordenes.component';
import { ActivosConfigComponent } from '../features/activos/activos-config.component';
import { BandasComponent } from '../features/compensaciones/bandas.component';
import { EstudioSalarialComponent } from '../features/compensaciones/estudio-salarial.component';
import { HeadcountComponent } from '../features/headcount/headcount.component';
import { HcConfigComponent } from '../features/headcount/hc-config.component';
import { VacacionesComponent } from '../features/asistencia/vacaciones.component';
import { SolicitudesAsistenciaComponent } from '../features/asistencia/solicitudes-asistencia.component';
import { AusenciaComponent } from '../features/asistencia/ausencia.component';
import { LicenciasComponent } from '../features/asistencia/licencias.component';
import { CalendarioAsistenciaComponent } from '../features/asistencia/calendario.component';
import { SueldosDiariosComponent } from '../features/asistencia/sueldos-diarios.component';
import { RecargoDomingoComponent } from '../features/asistencia/recargo-domingo.component';
import { AsistenciaConfigComponent } from '../features/asistencia/asistencia-config.component';

/** Screens of the "admin" section; loaded on first visit to /admin. */
const SCREENS = {
  'admin/panel': PanelComponent,
  'admin/colaboradores/vigentes': VigentesComponent,
  'admin/organizacion/cargos': CargosComponent,
  'admin/organizacion/areas': AreasComponent,
  'admin/colaboradores/crear': CrearColaboradorComponent,
  'admin/workflow/solicitudes': WfSolicitudesComponent,
  'admin/documentos': DocumentosComponent,
  'admin/workflow/plantillas': WfPlantillasComponent,
  'admin/documentos/plantillas': DocPlantillasComponent,
  'admin/activos/inventario': InventarioComponent,
  'admin/activos/ordenes': OrdenesComponent,
  'admin/activos/configuraciones': ActivosConfigComponent,
  'admin/compensaciones/bandas': BandasComponent,
  'admin/compensaciones/estudio': EstudioSalarialComponent,
  'admin/headcount/planificacion': HeadcountComponent,
  'admin/headcount/configuraciones': HcConfigComponent,
  'admin/asistencia/vacaciones': VacacionesComponent,
  'admin/asistencia/solicitudes': SolicitudesAsistenciaComponent,
  'admin/asistencia/ausencia': AusenciaComponent,
  'admin/asistencia/licencias': LicenciasComponent,
  'admin/asistencia/calendario': CalendarioAsistenciaComponent,
  'admin/asistencia/sueldos-diarios': SueldosDiariosComponent,
  'admin/asistencia/recargo-domingo': RecargoDomingoComponent,
  'admin/asistencia/configuraciones': AsistenciaConfigComponent,
  'admin/colaboradores/grupos': CatalogoComponent,
  'admin/organizacion/puestos': CatalogoComponent,
  'admin/otros/anotaciones': CatalogoComponent,
  'admin/documentos/configuraciones': ConfigFormComponent,
  'admin/compensaciones/configuraciones': ConfigFormComponent,
  'admin/colaboradores/solicitudes': SolicitudesColaboradoresComponent,
};

/** Which catalog or settings form each generic route shows. */
const GENERICOS: Record<string, object> = {
  'admin/colaboradores/grupos': { catalogo: 'grupos' },
  'admin/organizacion/puestos': { catalogo: 'puestos' },
  'admin/otros/anotaciones': { catalogo: 'anotaciones' },
  'admin/documentos/configuraciones': { config: 'documentos' },
  'admin/compensaciones/configuraciones': { config: 'compensaciones' },
};

const routes: Routes = [
  { path: 'colaboradores/ficha/:id', component: FichaComponent, title: 'Ficha del Colaborador · Nexo RH' },
  { path: 'colaboradores/ficha', redirectTo: '/admin/colaboradores/vigentes', pathMatch: 'full' },
  ...sectionRoutes('admin', SCREENS, GENERICOS),
];

@NgModule({
  declarations: [
    SolicitudesColaboradoresComponent,
    VigentesComponent,
    CargosComponent,
    AreasComponent,
    CrearColaboradorComponent,
    WfSolicitudesComponent,
    DocumentosComponent,
    WfPlantillasComponent,
    DocPlantillasComponent,
    InventarioComponent,
    OrdenesComponent,
    ActivosConfigComponent,
    BandasComponent,
    EstudioSalarialComponent,
    HeadcountComponent,
    HcConfigComponent,
    VacacionesComponent,
    SolicitudesAsistenciaComponent,
    AusenciaComponent,
    LicenciasComponent,
    CalendarioAsistenciaComponent,
    SueldosDiariosComponent,
    RecargoDomingoComponent,
    AsistenciaConfigComponent,
  ],
  imports: [SharedModule, GenericosModule, PanelModule, FichaModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
