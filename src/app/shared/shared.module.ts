import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlaceholderComponent } from '../features/placeholder/placeholder.component';
import { DataTableComponent } from './data-table/data-table.component';
import { IconComponent } from './icon/icon.component';
import { ModalComponent } from './modal/modal.component';
import { PageHeaderComponent } from './page-header/page-header.component';

const COMPONENTS = [IconComponent, DataTableComponent, PageHeaderComponent, ModalComponent, PlaceholderComponent];

/** Building blocks every screen uses (icons, table, modal, page header) plus Common/Forms/Router. */
@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [...COMPONENTS, CommonModule, FormsModule, RouterModule],
})
export class SharedModule {}
