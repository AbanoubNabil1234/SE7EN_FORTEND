import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  private readonly locale = inject(LocaleService);

  transform(key: string): string {
    // Depend on locale so impure pipe refreshes on language switch.
    this.locale.locale();
    return this.i18n.t(key);
  }
}
