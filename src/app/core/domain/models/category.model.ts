export interface CategoryNode {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  externalKey: string;
  parentId: string | null;
  sortOrder: number;
  productCount?: number;
  children: CategoryNode[];
}
