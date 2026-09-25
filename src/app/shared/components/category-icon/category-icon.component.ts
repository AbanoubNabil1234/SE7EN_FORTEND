import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryIconName } from '../../../core/domain/category-display';

/** Lucide-style 24×24 stroke glyphs for category chips. */
@Component({
  selector: 'app-category-icon',
  standalone: true,
  templateUrl: './category-icon.component.html'
})
export class CategoryIconComponent {
  readonly name = input<CategoryIconName>('tag');
}
