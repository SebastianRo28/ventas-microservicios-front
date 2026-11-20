import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PanelComponent } from './panel.component';

/** Panel de Control is used by both Administrativo and Remuneraciones, so it lives in its own module. */
@NgModule({
  declarations: [PanelComponent],
  imports: [SharedModule],
  exports: [PanelComponent],
})
export class PanelModule {}
