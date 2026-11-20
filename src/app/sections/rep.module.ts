import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { HistorialCargasComponent } from '../features/reportes/historial-cargas.component';
import { MisReportesComponent } from '../features/reportes/mis-reportes.component';
import { ReportesGraficosComponent } from '../features/reportes/reportes-graficos.component';
import { AnaliticaComponent } from '../features/reportes/analitica.component';
import { ImportadoresComponent } from '../features/reportes/importadores.component';
import { ExportadoresComponent } from '../features/reportes/exportadores.component';

/** Screens of the "rep" section; loaded on first visit to /rep. */
const SCREENS = {
  'rep/analitica': AnaliticaComponent,
  'rep/importadores': ImportadoresComponent,
  'rep/exportadores': ExportadoresComponent,
  'rep/importadores/historial': HistorialCargasComponent,
  'rep/reportes': MisReportesComponent,
  'rep/reportes/graficos': ReportesGraficosComponent,
};

const routes: Routes = [
  ...sectionRoutes('rep', SCREENS),
];

@NgModule({
  declarations: [
    HistorialCargasComponent,
    MisReportesComponent,
    ReportesGraficosComponent,
    AnaliticaComponent,
    ImportadoresComponent,
    ExportadoresComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class RepModule {}
