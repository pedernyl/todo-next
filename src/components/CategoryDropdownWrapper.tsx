"use client";
import React, { useState } from "react";
import { useCategoriesActions } from "../context/CategoriesContext";
import CategoryDropdown from "./CategoryDropdown";
import { useSession } from "next-auth/react";
import { createCategory, Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";
import { DROPDOWN_OPTIONS } from "../constants/dropdowns/categoryDropDown";

interface CategoryDropdownWrapperProps {
  onCategoryChange: (category: Category | null) => void;
}

const CategoryDropdownWrapper: React.FC<CategoryDropdownWrapperProps> = ({ onCategoryChange }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [categories, setCategories] = useState<Category[]>([]);
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

  //@todo create handleDeleteCategory
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
    />
  );
};

export default CategoryDropdownWrapper;
