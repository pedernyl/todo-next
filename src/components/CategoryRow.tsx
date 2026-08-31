import React from "react";
import { CATEGORY_DROPDOWN_IDS, CATEGORY_DROPDOWN_TEXT } from "../constants/dropdowns/categoryDropDown";

//@todo add completed, deleted
interface CategoryRowProps {
  id: string;
  title: string;
  isSelected: boolean;
  hasActiveTodos: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: (categoryId: string) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  id,
  title,
  isSelected,
  hasActiveTodos,
  onComplete,
  onEdit,
  onDelete,
}) => {

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
        isSelected ? "bg-blue-50" : "hover:bg-gray-100"
      }`}
      data-testid={CATEGORY_DROPDOWN_IDS.CATEGORY_OPTION(id)}
    >
      <span className={isSelected ? "font-semibold text-blue-600" : ""}>
        {title}
      </span>

      <div className="flex gap-2">
        {/* Complete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          title={CATEGORY_DROPDOWN_TEXT.COMPLETE}
          aria-label={`${CATEGORY_DROPDOWN_TEXT.COMPLETE} ${title}`}
          data-testid={CATEGORY_DROPDOWN_IDS.CATEGORY_ROW_COMPLETE_BUTTON(id)}
          className="text-green-500 hover:text-green-700 transition"
        >
          ✓
        </button>

        {/* Edit button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title={CATEGORY_DROPDOWN_TEXT.EDIT}
          aria-label={`${CATEGORY_DROPDOWN_TEXT.EDIT} ${title}`}
          data-testid={CATEGORY_DROPDOWN_IDS.CATEGORY_ROW_EDIT_BUTTON(id)}
          className="text-blue-500 hover:text-blue-700 transition"
        >
          ✏
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to delete the category "${title}"?`)) {
              onDelete(id);
            }
          }}
          disabled={hasActiveTodos}
          title={hasActiveTodos 
            ? CATEGORY_DROPDOWN_TEXT.HAS_ACTIVE_TODOS_TOOLTIP 
            : CATEGORY_DROPDOWN_TEXT.DELETE
          }
          aria-label={`${CATEGORY_DROPDOWN_TEXT.DELETE} ${title}`}
          data-testid={CATEGORY_DROPDOWN_IDS.CATEGORY_ROW_DELETE_BUTTON(id)}
          className={`transition ${
            hasActiveTodos
              ? "text-red-200 cursor-not-allowed"
              : "text-red-500 hover:text-red-700"
          }`}
        >
          🗑
        </button>
      </div>
    </div>
  );
};

export default CategoryRow;