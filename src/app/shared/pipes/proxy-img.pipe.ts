import { Pipe, PipeTransform } from '@angular/core';
import { proxyImageUrl } from '../../core/domain/image-proxy';
import { resolveApiUrl } from '../../core/infrastructure/http/api-origin';

/**
 * Rewrites pharmacy image URLs through the backend proxy to avoid CORS blocks,
 * and resolves relative API media URLs.
 *
 * Usage:  <img [src]="offer.imageUrl | proxyImg" />
 */
@Pipe({ name: 'proxyImg', standalone: true, pure: true })
export class ProxyImgPipe implements PipeTransform {
  transform(url: string | null | undefined): string | null {
    const resolved = resolveApiUrl(url);
    return proxyImageUrl(resolved);
  }
}
