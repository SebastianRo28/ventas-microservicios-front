import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TerminoPipe } from '../core/marca.service';
import { ChecklistImplementacionComponent } from './checklist/checklist-implementacion.component';
import { RouterModule } from '@angular/router';
import { PlaceholderComponent } from '../features/placeholder/placeholder.component';
import { DataTableComponent } from './data-table/data-table.component';
import { IconComponent } from './icon/icon.component';
import { ModalComponent } from './modal/modal.component';
import { PageHeaderComponent } from './page-header/page-header.component';
import { BoletaModalComponent } from './boleta/boleta-modal.component';
import { FechaDirective, FechaIsoDirective } from './fecha/fecha.directive';
import { PeriodoAvisoComponent } from './periodo/periodo-aviso.component';

const COMPONENTS = [IconComponent, DataTableComponent, PageHeaderComponent, ModalComponent, PlaceholderComponent, BoletaModalComponent, TerminoPipe, ChecklistImplementacionComponent, FechaDirective, FechaIsoDirective, PeriodoAvisoComponent];

/** Building blocks every screen uses (icons, table, modal, page header) plus Common/Forms/Router. */
@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [...COMPONENTS, CommonModule, FormsModule, RouterModule],
})
export class SharedModule {}
