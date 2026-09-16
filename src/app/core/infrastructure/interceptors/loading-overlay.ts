export function shouldSkipLoadingOverlay(url: string): boolean {
  return (
    url.includes('/search/live') ||
    url.includes('/admin/dashboard') ||
    url.includes('/catalog/families/brands') ||
    url.includes('/categories/structure') ||
    url.includes('/categories/tree') ||
    (url.includes('/catalog/families') && !url.includes('/catalog/families/item'))
  );
}
