'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/molecules/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/select';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const mainCategories = categories.filter((cat) => !cat.parentId);
  const getSubcategories = (parentId: string) =>
    categories.filter((cat) => cat.parentId === parentId);

  const handleAddCategory = async (formData: FormData) => {
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to add category');

      const newCategory = await response.json();
      setCategories([...categories, newCategory]);
      setIsAddDialogOpen(false);
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleEditCategory = async (id: string, formData: FormData) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to update category');

      const updatedCategory = await response.json();
      setCategories(categories.map((cat) => (cat.id === id ? updatedCategory : cat)));
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete category');

      setCategories(categories.filter((cat) => cat.id !== id));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <form action={handleAddCategory} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input id="image" name="image" type="url" />
              </div>
              <div>
                <Label htmlFor="parentId">Parent Category</Label>
                <Select name="parentId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Main Category)</SelectItem>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Add Category</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {mainCategories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          subcategories={getSubcategories(category.id)}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  category,
  subcategories,
  onEdit,
  onDelete,
}: {
  category: Category;
  subcategories: Category[];
  onEdit: (id: string, formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <div>
            <CardTitle>{category.name}</CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </div>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
              </DialogHeader>
              <form action={(formData) => onEdit(category.id, formData)} className="space-y-4">
                <div>
                  <Label htmlFor={`name-${category.id}`}>Name</Label>
                  <Input
                    id={`name-${category.id}`}
                    name="name"
                    defaultValue={category.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`description-${category.id}`}>Description</Label>
                  <Textarea
                    id={`description-${category.id}`}
                    name="description"
                    defaultValue={category.description || ''}
                  />
                </div>
                <div>
                  <Label htmlFor={`image-${category.id}`}>Image URL</Label>
                  <Input
                    id={`image-${category.id}`}
                    name="image"
                    type="url"
                    defaultValue={category.image || ''}
                  />
                </div>
                <Button type="submit">Update Category</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={() => onDelete(category.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn('pt-2', !isExpanded && 'hidden')}>
        {subcategories.length > 0 ? (
          <div className="ml-8 space-y-4">
            {subcategories.map((subcategory) => (
              <CategoryCard
                key={subcategory.id}
                category={subcategory}
                subcategories={[]}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subcategories</p>
        )}
      </CardContent>
    </Card>
  );
}
