import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';

@Component({
  selector: 'app-admin-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-placeholder.component.html'
})
export class AdminPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly locale = inject(LocaleService);

  private readonly titleKey = toSignal(
    this.route.data.pipe(map((d) => (d['titleKey'] as string) || 'placeholder.coming')),
    { initialValue: 'placeholder.coming' }
  );

  private readonly subtitleKey = toSignal(
    this.route.data.pipe(map((d) => (d['subtitleKey'] as string) || 'placeholder.coming')),
    { initialValue: 'placeholder.coming' }
  );

  readonly title = computed(() => {
    this.locale.locale();
    return this.i18n.t(this.titleKey());
  });

  readonly subtitle = computed(() => {
    this.locale.locale();
    return this.i18n.t(this.subtitleKey());
  });
}
