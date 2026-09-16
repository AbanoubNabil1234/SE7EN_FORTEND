import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { shouldSkipLoadingOverlay } from './loading-overlay';

/**
 * Functional Loading Interceptor: Tracks pending HTTP requests to show global loading indicator.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  const skipOverlay = shouldSkipLoadingOverlay(req.url);
  if (!skipOverlay) {
    loadingService.startLoading();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipOverlay) {
        loadingService.stopLoading();
      }
    })
  );
};
