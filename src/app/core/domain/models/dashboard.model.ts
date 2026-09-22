export interface PharmacyOpsRow {
  pharmacyId: string;
  code: string;
  name: string;
  isEnabled: boolean;
  productCount: number;
  matchedCount: number;
  lastSuccessfulSyncAtUtc?: string | null;
  lastRunStatus?: string | null;
  lastRunFinishedAtUtc?: string | null;
  inCatalogCount?: number;
  crossMatchedCount?: number;
  crossMatchPercent?: number;
  barcodePercent?: number;
}

export interface MultiPharmacyDepthPoint {
  pharmacyCount: number;
  masterProductCount: number;
  percentage: number;
}

export interface MatchingModelBreakdown {
  exactBarcodeConfirmed: number;
  aiModelAutoMatched: number;
  reviewPendingHighConf: number;
  reviewPendingMidConf: number;
  reviewPendingLowConf: number;
  singleCatalogProducts: number;
}

export interface MarketPriceSpreadMetrics {
  comparedProductsCount: number;
  avgPriceDiff: number;
  avgSpreadPercent: number;
  maxPriceDiff: number;
}

export interface DashboardTrendPoint {
  dateLabel: string;
  priceUpdates: number;
  scrapeRuns: number;
  successRate: number;
}

export interface CategoryStatRow {
  categoryName: string;
  productCount: number;
  percentage: number;
}

export interface CouponStatRow {
  code: string;
  pharmacyCode: string;
  copyCount: number;
  maxCopies: number;
  isActive: boolean;
}

export interface OpsDashboardSnapshot {
  totalPharmacyProducts: number;
  masterProducts: number;
  matchedProducts: number;
  unmatchedProducts: number;
  matchingPercent: number;
  pharmacies: PharmacyOpsRow[];
  openAlerts: number;
  criticalAlerts: number;
  openIncidents: number;
  lastSuccessfulSyncUtc?: string | null;
  failedRequests24h: number;
  scrapingSuccessPercent24h: number;
  pricesUpdated24h: number;
  suspiciousPrices: number;
  generatedAtUtc: string;
  barcodeCoveragePercent: number;
  identityMatchPercent: number;
  mastersWithTwoPlusPharmacies: number;
  mastersWithThreePlusPharmacies: number;
  activityTrends: DashboardTrendPoint[];
  topCategories: CategoryStatRow[];
  totalUsers: number;
  activeUsers: number;
  totalBillboards: number;
  activeBillboards: number;
  totalMagazines: number;
  activeMagazines: number;
  totalCoupons: number;
  activeCoupons: number;
  totalCouponRedemptions: number;
  topCoupons: CouponStatRow[];
  overlapDepth?: MultiPharmacyDepthPoint[];
  matchingBreakdown?: MatchingModelBreakdown;
  priceSpread?: MarketPriceSpreadMetrics;
}
