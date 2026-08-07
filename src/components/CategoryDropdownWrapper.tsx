"use client";
import React, { useState } from "react";
import { useCategoriesData, useCategoriesActions } from "../context/CategoriesContext";
import CategoryDropdown from "./CategoryDropdown";
import { useUserId } from "../context/UserIdContext";
import { createCategory, Category, deleteCategory } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";
import { DROPDOWN_OPTIONS } from "../constants/dropdowns/categoryDropDown";

interface CategoryDropdownWrapperProps {
  onCategoryChange: (category: Category | null) => void;
}

const CategoryDropdownWrapper: React.FC<CategoryDropdownWrapperProps> = ({ 
  onCategoryChange
}) => {
  const { userId } = useUserId();
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
      async () => createCategory(name, userId, description),
      { label: GLOBAL.LOADER_LABELS.CREATING_CATEGORY, cancellable: false }
    );
    await refreshCategories();
    setSelectedCategory(newCat.id);
    onCategoryChange(newCat);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!userId) return;
    deleteCategory(Number(id), userId); // Call the deleteCategory function from categoryService
    alert(`Delete category WRAPPER with ID: ${id}`); // Placeholder for delete logic
    // Implement delete logic here, e.g., call a deleteCategory function from categoryService
    // After deletion, refresh categories and reset selected category if needed
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
    />
  );
};

export default CategoryDropdownWrapper;
