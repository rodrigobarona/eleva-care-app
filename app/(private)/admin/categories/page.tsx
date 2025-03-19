import { CategoryList } from '@/components/organisms/category-list';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categories Management',
  description: 'Manage categories and subcategories for expert profiles',
};

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories Management</h1>
        <p className="text-muted-foreground text-sm">
          Create, edit, and organize categories and subcategories for expert profiles.
        </p>
      </div>
      <CategoryList />
    </div>
  );
}
