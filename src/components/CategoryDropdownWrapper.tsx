"use client";
import React, { useEffect, useState } from "react";
import CategoryDropdown from "./CategoryDropdown";
import { useUserId } from "../context/UserIdContext";
import { getCategories, createCategory, Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";
import { DROPDOWN_OPTIONS } from "../constants/dropdowns/categoryDropDown";

interface CategoryDropdownWrapperProps {
  onCategoryChange: (category: Category | null) => void;
}

const CategoryDropdownWrapper: React.FC<CategoryDropdownWrapperProps> = ({ onCategoryChange }) => {
  const { userId } = useUserId();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { runBlocking } = useGlobalBlockingLoader();

  useEffect(() => {
    if (userId) {
      runBlocking(
        async () => getCategories(userId),
        { label: GLOBAL.LOADER_LABELS.LOADING_CATEGORIES, cancellable: false }
      )
        .then(setCategories)
        .catch(() => setCategories([]));
    }
  }, [userId, runBlocking]);

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
    setCategories(prev => [...prev, newCat]);
    setSelectedCategory(newCat.id);
    onCategoryChange(newCat);
  };

  return (
    <CategoryDropdown
      categories={categories.map(c => ({ id: c.id, title: c.title }))}
      selectedCategory={selectedCategory}
      onCategorySelect={handleCategorySelect}
      onCreateCategory={handleCreateCategory}
    />
  );
};

export default CategoryDropdownWrapper;
