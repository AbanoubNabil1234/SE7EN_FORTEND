export interface CategoryNode {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  externalKey: string;
  parentId: string | null;
  sortOrder: number;
  productCount?: number;
  imageUrl?: string | null;
  children: CategoryNode[];
}
