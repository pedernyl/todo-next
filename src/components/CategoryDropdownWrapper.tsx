"use client";
import React from "react";
import type { Category } from "../../types";
import { useCategoriesActions, useCategoriesData } from "../context/CategoriesContext";
import CategoryDropdown from "./CategoryDropdown";
import { useSession } from "next-auth/react";
import { createCategory, deleteCategory, updateCategoryCompletion } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";
import { DROPDOWN_OPTIONS } from "../constants/dropdowns/categoryDropDown";

interface CategoryDropdownWrapperProps {
  onCategoryChange: (category: Category | string | null) => void;
  selectedCategory: Category | string | null;
  selectedCategoryId: string | null;
  showCompleted: boolean;
  setUpdateTodos: (updateTodos: boolean) => void;
}

const CategoryDropdownWrapper: React.FC<CategoryDropdownWrapperProps> = (
  { 
    onCategoryChange,
    selectedCategory,
    selectedCategoryId,
    showCompleted,
    setUpdateTodos

  }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const categories = useCategoriesData();
  const { runBlocking } = useGlobalBlockingLoader();
  const { refreshCategories } = useCategoriesActions();

   let isCreatePanelOpen = selectedCategoryId === DROPDOWN_OPTIONS.CREATE_CATEGORY.value;

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === DROPDOWN_OPTIONS.CREATE_CATEGORY.value) {
      isCreatePanelOpen = true;
    } else {
      isCreatePanelOpen = false;
      const category = categories.find(c => String(c.id) === String(categoryId)) || null;
      onCategoryChange(category);
    }
  };

  const handleCreateCategory = async (name: string, description?: string) => {
    if (!userId) return;
    const newCat = await runBlocking(
      async () => createCategory(name, description),
      { label: GLOBAL.LOADER_LABELS.CREATING_CATEGORY, cancellable: false }
    );

    if (!newCat) return;
    await refreshCategories();
    onCategoryChange(newCat);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!userId) return;
    await runBlocking(
      async () => deleteCategory(Number(id)),
      { label: GLOBAL.LOADER_LABELS.DELETING_CATEGORY, cancellable: false }
    );
  
    await refreshCategories();
  };

  const handleToggleCompleted = async (id: string, completed: boolean) => {
    if (!userId) return;
    await runBlocking(
      async () => updateCategoryCompletion({ 
        categoryId: Number(id), 
        completed: !completed
      }),
      { label: GLOBAL.LOADER_LABELS.UPDATING_CATEGORY, cancellable: false }
    );
    await refreshCategories();

    // Check if the selected category should be deselected based on its completion status and the showCompleted flag.
    if (selectedCategory && typeof selectedCategory === "object") {
      if (selectedCategory.id !== id) {
         return; 
      }
      // Because it is a toggle action, selectedCategory.completed still holds the previous value. That is not completed yet.
       if (!showCompleted && !selectedCategory.completed) {
        onCategoryChange(null);
        return;
        // If the category is now completed and showCompleted is true, we should update the todos.
      } else if(showCompleted && selectedCategory.completed) {
        setUpdateTodos(true);
        return;
      }

    }

    onCategoryChange(selectedCategory);
  
  };


  return (
    <CategoryDropdown
      categories={categories.map(c => ({ 
        id: c.id, 
        title: c.title,
        hasActiveTodos: c.has_active_todos,
        completed: c.completed
      }))}
      onCreateCategory={handleCreateCategory}
      onCategorySelect ={handleCategorySelect}
      selectedCategory={selectedCategoryId ?? ""}
      isCreatePanelOpenProp={isCreatePanelOpen}
      onDeleteCategory={handleDeleteCategory}
      onToggleCompleted={handleToggleCompleted}
    />
  );
};

export default CategoryDropdownWrapper;
             