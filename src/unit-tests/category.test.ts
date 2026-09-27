import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createCategoryActionMock, deleteCategoryActionMock } = vi.hoisted(() => ({
  createCategoryActionMock: vi.fn(),
  deleteCategoryActionMock: vi.fn(),
}));

vi.mock('../app/actions/category', () => ({
  createCategory: createCategoryActionMock,
  deleteCategory: deleteCategoryActionMock,
}));

const categoryTestId = 1;

import { createCategory, deleteCategory } from '../lib/categoryService';

describe('Category Service tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a category', async () => {
    const expectedCategory = {
      id: categoryTestId,
      title: 'Test Category',
      owner_id: 1,
    };
    createCategoryActionMock.mockResolvedValue(expectedCategory);

    const category = await createCategory('Test Category', 'Test Description');

    expect(category).toEqual(expectedCategory);
    expect(createCategoryActionMock).toHaveBeenCalledWith('Test Category', 'Test Description');
  });

  it('deletes a category', async () => {
    deleteCategoryActionMock.mockResolvedValue({ success: true });

    const response = await deleteCategory(categoryTestId);

    expect(deleteCategoryActionMock).toHaveBeenCalledOnce();
    expect(deleteCategoryActionMock).toHaveBeenCalledWith(categoryTestId);
    expect(response).toEqual({ success: true });
  });
});
