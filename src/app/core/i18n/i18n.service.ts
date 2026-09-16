import { Injectable, inject } from '@angular/core';
import { LocaleService } from '../services/locale.service';
import { MessageTree, messagesAr, messagesEn } from './messages';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly locale = inject(LocaleService);

  /** Resolve a dotted key, e.g. `nav.billboards`. Falls back to the key if missing. */
  t(key: string): string {
    const dict = this.locale.locale() === 'ar' ? messagesAr : messagesEn;
    const value = this.lookup(dict, key);
    return value ?? key;
  }

  private lookup(tree: MessageTree, key: string): string | undefined {
    const parts = key.split('.');
    let node: string | MessageTree | undefined = tree;
    for (const part of parts) {
      if (!node || typeof node === 'string') {
        return undefined;
      }
      node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
  }
}
