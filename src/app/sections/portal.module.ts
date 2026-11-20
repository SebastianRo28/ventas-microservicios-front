import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { FichaModule } from '../features/colaboradores/ficha.module';
import { FichaComponent } from '../features/colaboradores/ficha.component';
import { MiPortalComponent } from '../features/portal/mi-portal.component';
import { DirectorioComponent } from '../features/portal/directorio.component';
import { OrganigramaComponent } from '../features/portal/organigrama.component';
import { ReconocimientosPortalComponent } from '../features/portal/reconocimientos-portal.component';
import { MisBeneficiosComponent } from '../features/portal/mis-beneficios.component';
import { MisEncuestasComponent } from '../features/portal/mis-encuestas.component';
import { MiEquipoComponent } from '../features/portal/mi-equipo.component';
import { ProcesosInternosComponent } from '../features/portal/procesos-internos.component';
import { CanalDenunciasComponent } from '../features/portal/canal-denuncias.component';
import { MisCapacitacionesComponent } from '../features/portal/mis-capacitaciones.component';
import { MisEvaluacionesComponent } from '../features/portal/mis-evaluaciones.component';

/** Screens of the "portal" section; loaded on first visit to /portal. */
const SCREENS = {
  'portal': MiPortalComponent,
  'portal/mi-ficha': FichaComponent,
  'portal/directorio': DirectorioComponent,
  'portal/organigrama': OrganigramaComponent,
  'portal/reconocimientos': ReconocimientosPortalComponent,
  'portal/mis-beneficios': MisBeneficiosComponent,
  'portal/mis-encuestas': MisEncuestasComponent,
  'portal/mi-equipo': MiEquipoComponent,
  'portal/procesos-internos': ProcesosInternosComponent,
  'portal/denuncias': CanalDenunciasComponent,
  'portal/mis-capacitaciones': MisCapacitacionesComponent,
  'portal/mis-evaluaciones': MisEvaluacionesComponent,
};

const routes: Routes = [
  ...sectionRoutes('portal', SCREENS, { 'portal/mi-ficha': { colabView: true } }),
];

@NgModule({
  declarations: [
    CanalDenunciasComponent,
    MiPortalComponent,
    DirectorioComponent,
    OrganigramaComponent,
    ReconocimientosPortalComponent,
    MisBeneficiosComponent,
    MisEncuestasComponent,
    MiEquipoComponent,
    ProcesosInternosComponent,
    MisCapacitacionesComponent,
    MisEvaluacionesComponent,
  ],
  imports: [SharedModule, FichaModule, RouterModule.forChild(routes)],
})
export class PortalModule {}
