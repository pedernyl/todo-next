import React, { useState } from "react";
import { CATEGORY_DROPDOWN_IDS, CATEGORY_DROPDOWN_TEXT, DROPDOWN_OPTIONS } 
  from "../constants/dropdowns/categoryDropDown";

//@todo add hasActiveTodos, completed, deleted
interface CategoryDropdownProps {
  categories: { 
    id: string; 
    title: string;
    hasActiveTodos: boolean;
    completed: boolean;
    deleted_timestamp?: string | null;
  }[];
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

  //@todo create handeDelete 

  return (
    <div className="relative inline-block text-left" data-testid={CATEGORY_DROPDOWN_IDS.ROOT}>
      <select
        className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow text-sm focus:outline-none"
        value={selectedCategory}
        onChange={e => onCategorySelect(e.target.value)}
        data-testid={CATEGORY_DROPDOWN_IDS.SELECT}
      >
        <option
          value={DROPDOWN_OPTIONS.ALL_CATEGORIES.value}
          data-testid={DROPDOWN_OPTIONS.ALL_CATEGORIES.testId}
        >
          {DROPDOWN_OPTIONS.ALL_CATEGORIES.label}
        </option>
        {categories.map((cat) => (
          <option
            key={cat.id}
            value={cat.id}
            data-testid={CATEGORY_DROPDOWN_IDS.CATEGORY_OPTION(cat.id)}
          >
            {cat.title} 
            {
            //@todo add hasActiveTodos, completed, deleted
            }
          </option>
        ))}
        <option
          value={DROPDOWN_OPTIONS.CREATE_CATEGORY.value}
          data-testid={DROPDOWN_OPTIONS.CREATE_CATEGORY.testId}
        >
          {DROPDOWN_OPTIONS.CREATE_CATEGORY.label}
        </option>
      </select>
      {selectedCategory === DROPDOWN_OPTIONS.CREATE_CATEGORY.value && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded shadow p-2 z-20"
          data-testid={CATEGORY_DROPDOWN_IDS.CREATE_CATEGORY_PANEL}
        >
          <div className="flex justify-end">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 text-xl font-bold mb-1"
              aria-label={CATEGORY_DROPDOWN_TEXT.CLOSE}
              data-testid={CATEGORY_DROPDOWN_IDS.CLOSE_CREATE_PANEL_BUTTON}
              onClick={() => {
                setNewCategory("");
                setNewDescription("");
                onCategorySelect(DROPDOWN_OPTIONS.ALL_CATEGORIES.value);
              }}
            >
              &times;
            </button>
          </div>
          <input
            type="text"
            className="w-full px-2 py-1 border rounded mb-2 text-sm"
            placeholder={CATEGORY_DROPDOWN_TEXT.NEW_CATEGORY_PLACEHOLDER}
            data-testid={CATEGORY_DROPDOWN_IDS.NEW_CATEGORY_INPUT}
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full px-2 py-1 border rounded mb-2 text-sm resize-y min-h-[48px]"
            placeholder={CATEGORY_DROPDOWN_TEXT.NEW_CATEGORY_DESCRIPTION_PLACEHOLDER}
            data-testid={CATEGORY_DROPDOWN_IDS.NEW_CATEGORY_DESCRIPTION}
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <button
            className="w-full bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
            onClick={handleCreate}
            data-testid={CATEGORY_DROPDOWN_IDS.CREATE_BUTTON}
          >
            {CATEGORY_DROPDOWN_TEXT.CREATE}
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;
