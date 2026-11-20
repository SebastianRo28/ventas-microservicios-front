import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { PanelModule } from '../features/panel/panel.module';
import { PanelComponent } from '../features/panel/panel.component';
import { ProcesosComponent } from '../features/remuneraciones/procesos.component';
import { ArchivosPagosComponent } from '../features/remuneraciones/archivos-pagos.component';
import { TiposItemComponent } from '../features/remuneraciones/tipos-item.component';
import { AsignacionItemsComponent } from '../features/remuneraciones/asignacion-items.component';
import { TablasParametrosComponent } from '../features/remuneraciones/tablas-parametros.component';
import { TiposKpiComponent } from '../features/remuneraciones/tipos-kpi.component';
import { DatosKpiComponent } from '../features/remuneraciones/datos-kpi.component';
import { RemConfigComponent } from '../features/remuneraciones/rem-config.component';

/** Screens of the "rem" section; loaded on first visit to /rem. */
const SCREENS = {
  'rem/panel': PanelComponent,
  'rem/procesos': ProcesosComponent,
  'rem/archivos-pagos': ArchivosPagosComponent,
  'rem/items/tipos': TiposItemComponent,
  'rem/items/asignacion': AsignacionItemsComponent,
  'rem/tablas': TablasParametrosComponent,
  'rem/kpi/tipos': TiposKpiComponent,
  'rem/kpi/datos': DatosKpiComponent,
  'rem/configuraciones': RemConfigComponent,
};

const routes: Routes = [
  ...sectionRoutes('rem', SCREENS),
];

@NgModule({
  declarations: [
    ProcesosComponent,
    ArchivosPagosComponent,
    TiposItemComponent,
    AsignacionItemsComponent,
    TablasParametrosComponent,
    TiposKpiComponent,
    DatosKpiComponent,
    RemConfigComponent,
  ],
  imports: [SharedModule, PanelModule, RouterModule.forChild(routes)],
})
export class RemModule {}
