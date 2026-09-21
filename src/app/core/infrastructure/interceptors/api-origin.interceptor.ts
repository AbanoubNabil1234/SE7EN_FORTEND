import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_ORIGIN } from '../http/api-origin';
import { LocaleService } from '../../services/locale.service';

/** Send relative API calls to the online server with active language headers. */
export const apiOriginInterceptor: HttpInterceptorFn = (req, next) => {
  const localeService = inject(LocaleService);
  const lang = localeService.locale() || 'ar';

  let headers = req.headers;
  if (!headers.has('Accept-Language')) {
    headers = headers.set('Accept-Language', lang);
  }
  if (!headers.has('X-Language')) {
    headers = headers.set('X-Language', lang);
  }

  if (/^https?:\/\//i.test(req.url)) {
    return next(req.clone({ headers }));
  }

  const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
  if (path.startsWith('/assets/')) {
    return next(req);
  }

  return next(req.clone({ url: `${API_ORIGIN}${path}`, headers }));
};
