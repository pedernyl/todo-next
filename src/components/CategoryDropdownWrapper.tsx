"use client";
import React, { useState } from "react";
import type { Category } from "../../types";
import { useCategoriesActions, useCategoriesData } from "../context/CategoriesContext";
import CategoryDropdown from "./CategoryDropdown";
import { useSession } from "next-auth/react";
import { createCategory, deleteCategory, updateCategoryCompletion } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";
import { DROPDOWN_OPTIONS } from "../constants/dropdowns/categoryDropDown";

interface CategoryDropdownWrapperProps {
  onCategoryChange: (category: Category | null) => void;
  showCompleted: boolean;
}

const CategoryDropdownWrapper: React.FC<CategoryDropdownWrapperProps> = ({ onCategoryChange, showCompleted }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const categories = useCategoriesData();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { runBlocking } = useGlobalBlockingLoader();
  const { refreshCategories } = useCategoriesActions();

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === DROPDOWN_OPTIONS.CREATE_CATEGORY.value) {
      setSelectedCategory(DROPDOWN_OPTIONS.CREATE_CATEGORY.value);
    } else {
      setSelectedCategory(categoryId);
      const cat = categories.find(c => String(c.id) === String(categoryId)) || null;
      onCategoryChange(cat);
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
    setSelectedCategory(newCat.id);
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
    
    if (Number(id) != Number(selectedCategory)) {
      return;
    }
    // check if the selected category shall be removed or not
    const cat = categories.find(c => String(c.id) === String(selectedCategory)) || null;
    // We need to have a check to see if the selected category should be removed based on the showCompleted flag and its completion status.
    // Here cat.completed has earlier value because it hasn't been updated yet after the toggle.
    if (cat) {
      if (!showCompleted && !cat.completed) {
        setSelectedCategory("");
        onCategoryChange(null);
      } else {
        setSelectedCategory(String(cat.id));
        onCategoryChange(cat);
      }
    }
  };

  return (
    <CategoryDropdown
      categories={categories.map(c => ({ 
        id: c.id, 
        title: c.title,
        hasActiveTodos: c.has_active_todos,
        completed: c.completed
      }))}
      selectedCategory={selectedCategory}
      onCategorySelect={handleCategorySelect}
      onCreateCategory={handleCreateCategory}
      onDeleteCategory={handleDeleteCategory}
      onToggleCompleted={handleToggleCompleted}
    />
  );
};

export default CategoryDropdownWrapper;
