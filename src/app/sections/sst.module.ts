import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { GenericosModule } from '../features/genericos/genericos.module';
import { ConfigFormComponent } from '../features/genericos/config-form.component';
import { SstRequisitosComponent } from '../features/sst/requisitos.component';
import { SstCumplimientosComponent } from '../features/sst/cumplimientos.component';

/** Screens of the "sst" section; loaded on first visit to /sst. */
const SCREENS = {
  'sst/requisitos': SstRequisitosComponent,
  'sst/cumplimientos': SstCumplimientosComponent,
  'sst/configuraciones': ConfigFormComponent,
};

/** Which catalog or settings form each generic route shows. */
const GENERICOS: Record<string, object> = {
  'sst/configuraciones': { config: 'sst' },
};

const routes: Routes = [
  ...sectionRoutes('sst', SCREENS, GENERICOS),
];

@NgModule({
  declarations: [
    SstRequisitosComponent,
    SstCumplimientosComponent,
  ],
  imports: [SharedModule, GenericosModule, RouterModule.forChild(routes)],
})
export class SstModule {}
