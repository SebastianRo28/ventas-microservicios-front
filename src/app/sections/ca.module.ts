import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sectionRoutes } from '../core/section-routes';
import { SharedModule } from '../shared/shared.module';
import { GenericosModule } from '../features/genericos/genericos.module';
import { ConfigFormComponent } from '../features/genericos/config-form.component';
import { CaFiltrosComponent, CaMapaComponent } from '../features/control-asistencia/ca-shared.components';
import { CaPanelComponent } from '../features/control-asistencia/ca-panel.component';
import { CaRecintoFichaComponent, CaRecintoFormComponent, CaRecintosComponent } from '../features/control-asistencia/ca-recintos.component';
import { CaColaboradoresComponent, CaPerfilComponent, CaTarjetaComponent } from '../features/control-asistencia/ca-colaboradores.component';
import { CaMarcacionesComponent, CaMarcaManualComponent, CaMarcasFallidasComponent, CaMarcasManualesComponent } from '../features/control-asistencia/ca-marcaciones.component';
import { CaAsignacionComponent, CaTurnosComponent } from '../features/control-asistencia/ca-turnos.component';
import { CaAusenciasComponent } from '../features/control-asistencia/ca-ausencias.component';
import { CaHhReporteComponent, CaHorasExtrasComponent } from '../features/control-asistencia/ca-horas-extras.component';
import { CaConsolidadaComponent, CaReportesComponent } from '../features/control-asistencia/ca-reportes.component';

/** Screens of Control de Asistencia (module 04); loaded on first visit to /ca. */
const SCREENS = {
  'ca/panel': CaPanelComponent,
  'ca/recintos': CaRecintosComponent,
  'ca/recintos/ficha': CaRecintoFichaComponent,
  'ca/colaboradores': CaColaboradoresComponent,
  'ca/colaboradores/tarjeta': CaTarjetaComponent,
  'ca/marcaciones': CaMarcacionesComponent,
  'ca/marcaciones/manuales': CaMarcasManualesComponent,
  'ca/marcaciones/fallidas': CaMarcasFallidasComponent,
  'ca/turnos': CaTurnosComponent,
  'ca/turnos/asignacion': CaAsignacionComponent,
  'ca/ausencias': CaAusenciasComponent,
  'ca/ausencias/horas-no-trabajadas': CaAusenciasComponent,
  'ca/ausencias/feriados': CaAusenciasComponent,
  'ca/ausencias/descansos-medicos': CaAusenciasComponent,
  'ca/ausencias/vacaciones': CaAusenciasComponent,
  'ca/ausencias/permisos': CaAusenciasComponent,
  'ca/horas-extras': CaHorasExtrasComponent,
  'ca/horas-extras/reporte': CaHhReporteComponent,
  'ca/reportes': CaReportesComponent,
  'ca/consolidada': CaConsolidadaComponent,
  'ca/configuraciones/tolerancias': ConfigFormComponent,
  'ca/configuraciones/metodos': ConfigFormComponent,
};

/** Which view or settings form each shared screen shows. */
const DATOS: Record<string, object> = {
  'ca/ausencias': { vista: 'ausencias' },
  'ca/ausencias/horas-no-trabajadas': { vista: 'hnt' },
  'ca/ausencias/feriados': { vista: 'feriados' },
  'ca/ausencias/descansos-medicos': { vista: 'descansos' },
  'ca/ausencias/vacaciones': { vista: 'vacaciones' },
  'ca/ausencias/permisos': { vista: 'permisos' },
  'ca/configuraciones/tolerancias': { config: 'ca-tolerancias' },
  'ca/configuraciones/metodos': { config: 'ca-metodos' },
};

const routes: Routes = [
  { path: '', redirectTo: 'panel', pathMatch: 'full' },
  { path: 'recintos/ficha/:id', component: CaRecintoFichaComponent, title: 'Ficha de Recinto · Nexo RH',
    data: { title: 'Ficha de Recinto', crumbs: ['Control de Asistencia', 'Recintos'] } },
  { path: 'colaboradores/perfil/:id', component: CaPerfilComponent, title: 'Perfil de asistencia · Nexo RH',
    data: { title: 'Perfil de asistencia', crumbs: ['Control de Asistencia', 'Colaboradores'] } },
  { path: 'colaboradores/perfil', redirectTo: 'colaboradores', pathMatch: 'full' },
  ...sectionRoutes('ca', SCREENS, DATOS),
];

@NgModule({
  declarations: [
    CaFiltrosComponent, CaMapaComponent, CaPanelComponent, CaRecintosComponent, CaRecintoFichaComponent, CaRecintoFormComponent,
    CaColaboradoresComponent, CaTarjetaComponent, CaPerfilComponent, CaMarcacionesComponent, CaMarcaManualComponent, CaMarcasManualesComponent,
    CaMarcasFallidasComponent, CaTurnosComponent, CaAsignacionComponent, CaAusenciasComponent, CaHorasExtrasComponent, CaHhReporteComponent,
    CaReportesComponent, CaConsolidadaComponent,
  ],
  imports: [SharedModule, GenericosModule, RouterModule.forChild(routes)],
})
export class CaModule {}
