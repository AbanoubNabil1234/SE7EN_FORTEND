import { Pipe, PipeTransform } from '@angular/core';
import { proxyImageUrl } from '../../core/domain/image-proxy';

/**
 * Rewrites pharmacy image URLs through the backend proxy to avoid CORS blocks.
 *
 * Usage:  <img [src]="offer.imageUrl | proxyImg" />
 */
@Pipe({ name: 'proxyImg', standalone: true, pure: true })
export class ProxyImgPipe implements PipeTransform {
  transform(url: string | null | undefined): string | null {
    return proxyImageUrl(url);
  }
}
