export class CatalogReloadScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private refreshDistribution = false;
  private readonly reload: (refreshDistribution: boolean) => void;
  private readonly delayMs: number;

  constructor(
    reload: (refreshDistribution: boolean) => void,
    delayMs: number = 350
  ) {
    this.reload = reload;
    this.delayMs = delayMs;
  }

  schedule(refreshDistribution: boolean): void {
    this.refreshDistribution ||= refreshDistribution;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const shouldRefreshDistribution = this.refreshDistribution;
      this.timer = null;
      this.refreshDistribution = false;
      this.reload(shouldRefreshDistribution);
    }, this.delayMs);
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.refreshDistribution = false;
  }
}
