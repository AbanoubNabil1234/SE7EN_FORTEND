import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-filter.component.html'
})
export class ProductFilterComponent {
  searchQuery = input<string>('');
  selectedCategory = input<string>('All');
  searchChange = output<string>();
  categoryChange = output<string>();

  readonly categories = [
    'All',
    'Pain Relief & Fever',
    'Antibiotics',
    'Vitamins & Immunity',
    'Cardiovascular & Blood Pressure',
    'Digestive & Stomach'
  ];
}
