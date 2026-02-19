import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './core/jwt.interceptor';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PurchaseCreateComponent } from './features/purchases/purchase-create/purchase-create.component';
import { SaleCreateComponent } from './features/sales/sale-create/sale-create.component';
import { KardexListComponent } from './features/kardex/kardex-list/kardex-list.component';
import { ProductModalComponent } from './features/products/product-modal/product-modal.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    PurchaseCreateComponent,
    SaleCreateComponent,
    KardexListComponent,
    ProductModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
