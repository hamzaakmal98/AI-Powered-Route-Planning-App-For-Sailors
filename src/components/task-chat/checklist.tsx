'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Save, X, MoreVertical } from 'lucide-react';
import { honoClient } from '@/lib/hono-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ChecklistItem {
  id?: string;
  label: string;
  checked: boolean;
  sequence?: number;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

interface ChecklistProps {
  taskId: string;
  initialChecklist: ChecklistCategory[];
  onUpdate?: (checklist: ChecklistCategory[]) => void;
}

export function Checklist({ taskId, initialChecklist, onUpdate }: ChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(initialChecklist);
  const [editingItem, setEditingItem] = useState<{ categoryIndex: number; itemIndex: number } | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCategoryIndex, setDeleteCategoryIndex] = useState<number | null>(null);

  useEffect(() => {
    setChecklist(initialChecklist);
  }, [initialChecklist]);

  const handleToggle = async (categoryIndex: number, itemIndex: number) => {
    const updatedChecklist = [...checklist];
    const item = updatedChecklist[categoryIndex].items[itemIndex];
    item.checked = !item.checked;
    setChecklist(updatedChecklist);

    // If item has an ID, update via API
    if (item.id) {
      try {
        const response = await honoClient.api.checklists.$patch({
          json: {
            itemId: item.id,
            checked: item.checked,
          },
        });

        if (!response.ok) {
          // Revert on error
          item.checked = !item.checked;
          setChecklist([...updatedChecklist]);
          toast.error('Failed to update checklist item');
          return;
        }

        const result = await response.json();
        if (result.success && result.item) {
          // Update with server response
          updatedChecklist[categoryIndex].items[itemIndex] = {
            ...item,
            id: result.item.id,
            checked: result.item.checked,
          };
          setChecklist(updatedChecklist);
          if (onUpdate) {
            onUpdate(updatedChecklist);
          }
        }
      } catch (error) {
        console.error('Error updating checklist item:', error);
        // Revert on error
        item.checked = !item.checked;
        setChecklist([...updatedChecklist]);
        toast.error('Error updating checklist item');
      }
    } else {
      // No ID yet, save entire checklist
      await saveChecklist(updatedChecklist);
    }
  };

  const handleEditStart = (categoryIndex: number, itemIndex: number) => {
    const item = checklist[categoryIndex].items[itemIndex];
    setEditingItem({ categoryIndex, itemIndex });
    setEditValue(item.label);
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const handleEditSave = async (categoryIndex: number, itemIndex: number) => {
    if (!editValue.trim()) {
      toast.error('Item label cannot be empty');
      return;
    }

    const updatedChecklist = [...checklist];
    const item = updatedChecklist[categoryIndex].items[itemIndex];
    const oldLabel = item.label;
    item.label = editValue.trim();
    setChecklist(updatedChecklist);
    setEditingItem(null);
    setEditValue('');

    // If item has an ID, update via API
    if (item.id) {
      try {
        const response = await honoClient.api.checklists.$patch({
          json: {
            itemId: item.id,
            label: item.label,
          },
        });

        if (!response.ok) {
          // Revert on error
          item.label = oldLabel;
          setChecklist([...updatedChecklist]);
          toast.error('Failed to update checklist item');
          return;
        }

        const result = await response.json();
        if (result.success && result.item) {
          updatedChecklist[categoryIndex].items[itemIndex] = {
            ...item,
            id: result.item.id,
            label: result.item.label,
          };
          setChecklist(updatedChecklist);
          if (onUpdate) {
            onUpdate(updatedChecklist);
          }
        }
      } catch (error) {
        console.error('Error updating checklist item:', error);
        // Revert on error
        item.label = oldLabel;
        setChecklist([...updatedChecklist]);
        toast.error('Error updating checklist item');
      }
    } else {
      // No ID yet, save entire checklist
      await saveChecklist(updatedChecklist);
    }
  };

  const handleAddItem = async (categoryIndex: number) => {
    const updatedChecklist = [...checklist];
    const newItem: ChecklistItem = {
      label: 'New checklist item',
      checked: false,
      sequence: updatedChecklist[categoryIndex].items.length,
    };
    updatedChecklist[categoryIndex].items.push(newItem);
    setChecklist(updatedChecklist);

    // Save entire checklist
    await saveChecklist(updatedChecklist);
  };

  const handleDeleteItem = async (categoryIndex: number, itemIndex: number) => {
    const updatedChecklist = [...checklist];
    updatedChecklist[categoryIndex].items.splice(itemIndex, 1);
    setChecklist(updatedChecklist);

    // Save entire checklist to reflect deletion
    await saveChecklist(updatedChecklist);
  };

  const handleEditCategoryStart = (categoryIndex: number) => {
    const category = checklist[categoryIndex];
    setEditingCategory(categoryIndex);
    setEditCategoryValue(category.category);
  };

  const handleEditCategoryCancel = () => {
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleEditCategorySave = async (categoryIndex: number) => {
    if (!editCategoryValue.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    const updatedChecklist = [...checklist];
    const oldCategoryName = updatedChecklist[categoryIndex].category;
    updatedChecklist[categoryIndex].category = editCategoryValue.trim();
    setChecklist(updatedChecklist);
    setEditingCategory(null);
    setEditCategoryValue('');

    // Save entire checklist to update category name
    await saveChecklist(updatedChecklist);
  };

  const handleDeleteCategory = () => {
    if (deleteCategoryIndex === null) return;
    const categoryIndex = deleteCategoryIndex;
    setDeleteCategoryIndex(null);

    const updatedChecklist = [...checklist];
    updatedChecklist.splice(categoryIndex, 1);
    setChecklist(updatedChecklist);

    // Save entire checklist to reflect deletion
    saveChecklist(updatedChecklist);
  };

  const handleAddCategory = async () => {
    const updatedChecklist = [...checklist];
    updatedChecklist.push({
      category: 'New Category',
      items: [],
    });
    setChecklist(updatedChecklist);

    // Save entire checklist
    await saveChecklist(updatedChecklist);
    
    // Start editing the new category immediately
    setEditingCategory(updatedChecklist.length - 1);
    setEditCategoryValue('New Category');
  };

  const saveChecklist = async (updatedChecklist: ChecklistCategory[]) => {
    setIsSaving(true);
    try {
      const response = await honoClient.api.checklists.$put({
        json: {
          taskId,
          checklist: updatedChecklist.map((cat) => ({
            category: cat.category,
            items: cat.items.map((item, index) => ({
              id: item.id,
              label: item.label,
              checked: item.checked,
              sequence: item.sequence ?? index,
            })),
          })),
        },
      });

      if (!response.ok) {
        toast.error('Failed to save checklist');
        return;
      }

      const result = await response.json();
      if (result.success && result.checklist) {
        // Update with server response (which includes IDs)
        setChecklist(result.checklist);
        if (onUpdate) {
          onUpdate(result.checklist);
        }
        toast.success('Checklist saved successfully');
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Error saving checklist');
    } finally {
      setIsSaving(false);
    }
  };

  const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = checklist.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.checked).length,
    0
  );
  const progressPercentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="w-full rounded-lg border border-border overflow-hidden bg-background">
      {/* Header with progress */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Passage Planning Checklist</h3>
          <span className="text-xs text-muted-foreground">
            {checkedItems} / {totalItems} completed
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="text-right mt-1 text-xs font-medium text-foreground">
          {progressPercentage}%
        </div>
      </div>

      {/* Checklist content */}
      <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
        {checklist.map((category, categoryIndex) => (
          <div key={category.category} className="space-y-3">
            <div className="flex items-center justify-between group">
              {editingCategory === categoryIndex ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editCategoryValue}
                    onChange={(e) => setEditCategoryValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditCategorySave(categoryIndex);
                      } else if (e.key === 'Escape') {
                        handleEditCategoryCancel();
                      }
                    }}
                    className="h-8 text-xs font-bold uppercase tracking-wider"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleEditCategorySave(categoryIndex)}
                    disabled={isSaving}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handleEditCategoryCancel}
                    disabled={isSaving}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {category.category}
                  </h4>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSaving}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditCategoryStart(categoryIndex)}>
                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                        Rename Category
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteCategoryIndex(categoryIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
            <div className="space-y-2">
              {category.items.map((item, itemIndex) => (
                <div
                  key={item.id || itemIndex}
                  className="flex items-center gap-3 group hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors"
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => handleToggle(categoryIndex, itemIndex)}
                    disabled={isSaving}
                    className="flex-shrink-0"
                  />
                  {editingItem?.categoryIndex === categoryIndex &&
                  editingItem?.itemIndex === itemIndex ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditSave(categoryIndex, itemIndex);
                          } else if (e.key === 'Escape') {
                            handleEditCancel();
                          }
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleEditSave(categoryIndex, itemIndex)}
                        disabled={isSaving}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleEditCancel}
                        disabled={isSaving}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={cn(
                          'flex-1 text-sm',
                          item.checked
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        )}
                      >
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEditStart(categoryIndex, itemIndex)}
                          disabled={isSaving}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(categoryIndex, itemIndex)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => handleAddItem(categoryIndex)}
                disabled={isSaving}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add item
              </Button>
            </div>
          </div>
        ))}
        
        {/* Add Category Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleAddCategory}
          disabled={isSaving}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={deleteCategoryIndex !== null} onOpenChange={(open) => !open && setDeleteCategoryIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              {deleteCategoryIndex !== null && checklist[deleteCategoryIndex]?.items.length > 0
                ? `Are you sure you want to delete the category "${checklist[deleteCategoryIndex].category}"? This will also delete all ${checklist[deleteCategoryIndex].items.length} item(s) in this category. This action cannot be undone.`
                : deleteCategoryIndex !== null
                ? `Are you sure you want to delete the category "${checklist[deleteCategoryIndex].category}"? This action cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCategoryIndex(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={isSaving}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

