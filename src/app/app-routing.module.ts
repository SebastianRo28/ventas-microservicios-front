import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseCreateComponent } from './features/purchases/purchase-create/purchase-create.component';
import { SaleCreateComponent } from './features/sales/sale-create/sale-create.component';
import { KardexListComponent } from './features/kardex/kardex-list/kardex-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'compras', pathMatch: 'full' },
  { path: 'compras', component: PurchaseCreateComponent },
  { path: 'ventas', component: SaleCreateComponent },
  { path: 'kardex', component: KardexListComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
