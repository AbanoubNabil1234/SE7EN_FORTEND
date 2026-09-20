import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet
} from '@angular/router';
import { LoadingService } from './core/services/loading.service';

interface LoadingPharmacy {
  code: string;
  logo: string;
  angle: number;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('se7en-frontend');
  readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);
  readonly initialLoading = signal(true);
  readonly routeLoading = signal(false);
  readonly showLoading = computed(
    () => this.initialLoading() || this.routeLoading() || this.loadingService.isLoading()
  );
  private routeStartedAt = 0;
  private routeLoadingTimer: ReturnType<typeof setTimeout> | null = null;
  readonly loadingPharmacies: LoadingPharmacy[] = [
    { code: 'nahdi', logo: 'assets/pharmacies/nahdi.svg', angle: 0 },
    { code: 'aldawaa', logo: 'assets/pharmacies/aldawaa.png', angle: 360 / 8 },
    { code: 'whites', logo: 'assets/pharmacies/whites.png', angle: (360 / 8) * 2 },
    { code: 'united', logo: 'assets/pharmacies/united.png', angle: (360 / 8) * 3 },
    { code: 'lemon', logo: 'assets/pharmacies/lemon.png', angle: (360 / 8) * 4 },
    { code: 'ibrand', logo: 'assets/pharmacies/ibrand.png', angle: (360 / 8) * 5 },
    { code: 'pharmabrand', logo: 'assets/pharmacies/pharmabrand.png', angle: (360 / 8) * 6 },
    { code: 'almujtama', logo: 'assets/pharmacies/almujtama.png', angle: (360 / 8) * 7 }
  ];

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.routeLoadingTimer !== null) {
          clearTimeout(this.routeLoadingTimer);
          this.routeLoadingTimer = null;
        }
        this.routeStartedAt = Date.now();
        this.routeLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        const remaining = Math.max(0, 3000 - (Date.now() - this.routeStartedAt));
        this.routeLoadingTimer = setTimeout(() => {
          this.routeLoading.set(false);
          this.routeLoadingTimer = null;
        }, remaining);
      }
    });

    afterNextRender(() => {
      window.setTimeout(() => this.initialLoading.set(false), 2000);
    });
  }
}
