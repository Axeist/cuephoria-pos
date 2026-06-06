
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { AccentColorPicker } from '@/components/ui/AccentColorPicker';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getDefaultCategoryHex, hexWithAlpha } from '@/utils/colorTheme.utils';

const CategoryManagement: React.FC = () => {
  const {
    categories,
    categoryMeta,
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryAppearance,
    getCategoryAccentColor,
  } = usePOS();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editAccentColor, setEditAccentColor] = useState<string | null>(null);
  const [editQuickShopEnabled, setEditQuickShopEnabled] = useState(true);

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast({
        title: 'Error',
        description: 'Category name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    addCategory(newCategory.trim());
    setNewCategory('');
    setIsAddDialogOpen(false);
  };

  const handleEditCategory = () => {
    if (!editedCategory.trim()) {
      toast({
        title: 'Error',
        description: 'Category name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    updateCategory(selectedCategory, editedCategory.trim());
    setEditedCategory('');
    setSelectedCategory('');
    setIsEditDialogOpen(false);
  };

  const handleSaveAppearance = async () => {
    await updateCategoryAppearance(selectedCategory, {
      accentColor: editAccentColor,
      quickShopEnabled: editQuickShopEnabled,
    });
    setIsAppearanceDialogOpen(false);
    toast({ title: 'Saved', description: 'Category appearance updated.' });
  };

  const handleDeleteCategory = () => {
    deleteCategory(selectedCategory);
    setSelectedCategory('');
    setIsDeleteDialogOpen(false);
  };

  const openEditDialog = (category: string) => {
    setSelectedCategory(category);
    setEditedCategory(category);
    setIsEditDialogOpen(true);
  };

  const openAppearanceDialog = (category: string) => {
    const meta = categoryMeta[category.toLowerCase()];
    setSelectedCategory(category);
    setEditAccentColor(meta?.accentColor ?? null);
    setEditQuickShopEnabled(meta?.quickShopEnabled ?? true);
    setIsAppearanceDialogOpen(true);
  };

  const openDeleteDialog = (category: string) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const isUncategorized = (category: string) => category.toLowerCase() === 'uncategorized';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Product Categories</CardTitle>
        <Button 
          onClick={() => setIsAddDialogOpen(true)} 
          variant="outline" 
          size="sm" 
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const hex = getCategoryAccentColor(category);
            return (
            <div key={category} className="flex items-center">
              <Badge 
                variant="default"
                className="px-3 py-1 text-sm border"
                style={{
                  backgroundColor: hexWithAlpha(hex, 0.15),
                  borderColor: hexWithAlpha(hex, 0.35),
                  color: hex,
                }}
              >
                {category}
              </Badge>
              <div className="flex ml-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={() => openAppearanceDialog(category)}
                  title="Customize color"
                >
                  <Palette className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={() => openEditDialog(category)}
                  disabled={isUncategorized(category)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600" 
                  onClick={() => openDeleteDialog(category)}
                  disabled={isUncategorized(category)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )})}
        </div>
      </CardContent>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddCategory)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={editedCategory}
            onChange={(e) => setEditedCategory(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleEditCategory)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAppearanceDialogOpen} onOpenChange={setIsAppearanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize — {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-2 block">Accent color</Label>
              <AccentColorPicker
                value={editAccentColor}
                defaultHex={getDefaultCategoryHex(selectedCategory)}
                onChange={setEditAccentColor}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Show in Quick Shop</Label>
                <p className="text-xs text-muted-foreground">Include products from this category on station quick shop</p>
              </div>
              <Switch checked={editQuickShopEnabled} onCheckedChange={setEditQuickShopEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAppearanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAppearance}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{selectedCategory}"? 
              Products in this category will be moved to "uncategorized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CategoryManagement;
