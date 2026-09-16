import { HttpInterceptorFn } from '@angular/common/http';
import { API_ORIGIN } from '../http/api-origin';

/** Send relative API calls to the online server. */
export const apiOriginInterceptor: HttpInterceptorFn = (req, next) => {
  if (/^https?:\/\//i.test(req.url)) {
    return next(req);
  }

  const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
  if (path.startsWith('/assets/')) {
    return next(req);
  }

  return next(req.clone({ url: `${API_ORIGIN}${path}` }));
};
