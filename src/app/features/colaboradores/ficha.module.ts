import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { FichaComponent } from './ficha.component';

/** The collaborator record is shown in Administrativo (Ficha) and in Mi Portal (Mi ficha). */
@NgModule({
  declarations: [FichaComponent],
  imports: [SharedModule],
  exports: [FichaComponent],
})
export class FichaModule {}
