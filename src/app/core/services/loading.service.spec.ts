import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  it('waits before showing a short request as global loading', () => {
    const service = new LoadingService();

    service.startLoading();

    expect(service.isLoading()).toBe(false);

    service.stopLoading();
  });
});
