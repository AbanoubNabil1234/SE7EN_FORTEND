import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';
import { User } from '../../domain/models/user.model';

/**
 * Functional Auth Interceptor: Attaches JWT Bearer token to outgoing HTTP requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(LocalStorageService);
  const user = storage.getItem<User>('se7en_auth_user');

  if (user?.token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${user.token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
