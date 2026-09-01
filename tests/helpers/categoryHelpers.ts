import { CATEGORY_DROPDOWN_IDS } from '@/constants/dropdowns/categoryDropDown';
import { type Category, createCategory } from '@/lib/categoryService';
import { createTodo } from '@/lib/dataService';
import { useSession } from 'next-auth/react';
import { Todo } from '../../types';

export async function selectCategory(page: import('@playwright/test').Page, categoryId: string) {
  await page.getByTestId(CATEGORY_DROPDOWN_IDS.TRIGGER_BUTTON).click();
  await page.getByTestId(CATEGORY_DROPDOWN_IDS.CATEGORY_OPTION(categoryId)).click();
}

export async function createCategoryWithActiveTodoForAuthenticatedUser(): Promise<{ category: Category; todo: Todo }> {

  const userId = useSession().data?.user?.id;
  if (typeof userId !== 'number') {
    throw new Error('User ID is not available');
  }
  console.log('User ID:', userId);
  const category: Category = await createCategory('testen', userId);
  const todo: Todo = await createTodo({
    title: 'Test Todo',
    description: '',
    parent_todo: undefined,
    category_id: category.id,
  });
  return { category, todo };
}
