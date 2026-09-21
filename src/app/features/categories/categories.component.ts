import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../core/domain/repositories/catalog-browse.repository';
import { CategoryNode } from '../../core/domain/models/category.model';
import { filterCategoryTree } from '../../core/domain/category-display';
import { LocaleService } from '../../core/services/locale.service';
import { CategoryMegaMenuComponent } from '../../shared/components/category-mega-menu/category-mega-menu.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CategoryMegaMenuComponent],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'categories.sourceNahdi' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'categories.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-2xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'categories.subtitle' | t }}
            </p>
          </div>
          <label class="relative w-full sm:max-w-xs">
            <span class="sr-only">{{ 'categories.search' | t }}</span>
            <i class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#A68B6D]"></i>
            <input
              type="search"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-10 text-sm font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white"
              [placeholder]="'categories.search' | t"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
            />
          </label>
        </div>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div class="rounded-2xl border border-[#E8D5BE] bg-white p-5 space-y-3">
              <div class="flex items-center justify-between">
                <div class="size-10 rounded-xl bg-[#F8EEE2]"></div>
                <div class="h-4 w-12 rounded-full bg-[#F3E7D8]"></div>
              </div>
              <div class="space-y-1.5">
                <div class="h-5 w-32 rounded bg-[#E8D5BE]"></div>
                <div class="h-3.5 w-20 rounded bg-[#F8EEE2]"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {{ 'categories.error' | t }}
        </div>
      } @else if (visibleRoots().length === 0) {
        <div class="rounded-2xl border border-dashed border-[#E8D5BE] bg-white px-6 py-16 text-center text-sm font-medium text-[#8A735C]">
          {{ 'categories.empty' | t }}
        </div>
      } @else {
        <app-category-mega-menu
          [roots]="visibleRoots()"
          [selectedPrimarySlug]="selectedPrimarySlug()"
          [selectedSubSlug]="selectedSubSlug()"
          [showCounts]="true"
          (primarySelected)="onPrimary($event)"
          (childSelected)="openProducts($event.slug)"
          (allSelected)="openProducts($event.slug)"
        />
      }
    </section>
  `
})
export class CategoriesComponent implements OnInit {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);

  readonly roots = signal<CategoryNode[]>([]);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly selectedPrimarySlug = signal('');
  readonly selectedSubSlug = signal('');

  readonly visibleRoots = computed(() => filterCategoryTree(this.roots(), this.query()));

  ngOnInit(): void {
    this.load();
  }

  onPrimary(node: CategoryNode): void {
    this.selectedPrimarySlug.set(node.slug);
    this.selectedSubSlug.set('');
    if (!node.children?.length) {
      this.openProducts(node.slug);
    }
  }

  openProducts(slug: string): void {
    this.selectedSubSlug.set(slug === this.selectedPrimarySlug() ? '' : slug);
    void this.router.navigate(['/products'], { queryParams: { categorySlug: slug } });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.catalog
      .getCategoryTree()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (nodes) => this.roots.set(nodes),
        error: () => {
          this.catalog.getCategoryStructure().subscribe({
            next: (nodes) => this.roots.set(nodes),
            error: () => this.error.set(true)
          });
        }
      });
  }
}
