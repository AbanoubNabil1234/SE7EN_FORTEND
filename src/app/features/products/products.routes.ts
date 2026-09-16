import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    component: ProductListComponent
  }
];
