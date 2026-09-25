import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryNode } from '../../../core/domain/models/category.model';
import {
  categoryDisplayName,
  categoryIconName
} from '../../../core/domain/category-display';
import { LocaleService } from '../../../core/services/locale.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CategoryIconComponent } from '../category-icon/category-icon.component';

@Component({
  selector: 'app-category-mega-menu',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CategoryIconComponent],
  templateUrl: './category-mega-menu.component.html'
})
export class CategoryMegaMenuComponent {
  readonly locale = inject(LocaleService);

  readonly roots = input<CategoryNode[]>([]);
  readonly selectedPrimarySlug = input('');
  readonly selectedSubSlug = input('');
  readonly showCounts = input(false);

  readonly primarySelected = output<CategoryNode>();
  readonly childSelected = output<CategoryNode>();
  readonly allSelected = output<CategoryNode>();

  readonly previewSlug = signal('');
  readonly mobileSubmenuOpen = signal(false);

  readonly activePrimary = computed(() => {
    const list = this.roots();
    const slug = this.previewSlug() || this.selectedPrimarySlug();
    return list.find((n) => n.slug === slug) ?? list[0] ?? null;
  });

  isActive(node: CategoryNode): boolean {
    return this.activePrimary()?.slug === node.slug;
  }

  label(node: CategoryNode): string {
    return categoryDisplayName(node, this.locale.locale());
  }

  icon(node: CategoryNode) {
    return categoryIconName(node);
  }

  onPrimaryClick(node: CategoryNode): void {
    this.previewSlug.set(node.slug);
    this.mobileSubmenuOpen.set(true);
    this.primarySelected.emit(node);
  }
}
