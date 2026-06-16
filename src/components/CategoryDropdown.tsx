import React, { useState } from "react";


interface CategoryDropdownProps {
  categories: { id: string; title: string }[];
  onCategorySelect: (categoryId: string) => void;
  onCreateCategory: (title: string, description?: string) => void;
  selectedCategory: string;
}

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categories,
  onCategorySelect,
  onCreateCategory,
  selectedCategory,
}) => {
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleCreate = () => {
    if (newCategory.trim()) {
      onCreateCategory(newCategory.trim(), newDescription.trim());
      setNewCategory("");
      setNewDescription("");
    }
  };

  return (
    <div className="relative inline-block text-left">
      <select
        className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow text-sm focus:outline-none"
        value={selectedCategory}
        onChange={e => onCategorySelect(e.target.value)}
        data-testid="category-select"
      >
        <option value="" data-testid="all-categories">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.title}</option>
        ))}
        <option value="__create__" data-testid="create-category">+ Create new category</option>
      </select>
      {selectedCategory === "__create__" && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded shadow p-2 z-20">
          <div className="flex justify-end">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 text-xl font-bold mb-1"
              aria-label="Close"
              onClick={() => {
                setNewCategory("");
                setNewDescription("");
                onCategorySelect("");
              }}
            >
              &times;
            </button>
          </div>
          <input
            type="text"
            className="w-full px-2 py-1 border rounded mb-2 text-sm"
            placeholder="New category name"
            data-testid="new-category-input"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full px-2 py-1 border rounded mb-2 text-sm resize-y min-h-[48px]"
            placeholder="Description (optional)"
            data-testid="new-category-description"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <button
            className="w-full bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
            onClick={handleCreate}
            data-testid="create-category-button"
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;
