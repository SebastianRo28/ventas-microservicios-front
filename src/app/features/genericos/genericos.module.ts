import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CatalogoComponent } from './catalogo.component';
import { ConfigFormComponent } from './config-form.component';

/** Generic catalog and settings screens, shared by the sections that use them. */
@NgModule({
  declarations: [CatalogoComponent, ConfigFormComponent],
  imports: [SharedModule],
  exports: [CatalogoComponent, ConfigFormComponent],
})
export class GenericosModule {}
