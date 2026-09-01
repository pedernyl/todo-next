import { supabase } from './supabaseClient';
import { API_PATHS } from '../constants/api/apiPaths';
import { API_MESSAGES } from '../constants/api/apiMessages';

export interface Category {
  id: string;
  title: string;
  description?: string;
  owner_id: number;
  has_active_todos: boolean;
  completed: boolean;
  deleted_timestamp?: string | null;
}

// Fetch all categories for a user
export async function getCategories({
  ownerId,
  completed,
  deleted
}: {
  ownerId: number;
  completed: boolean;
  deleted?: boolean;
}): Promise<Category[]> {
  const { data, error } = 
    await supabase.rpc
      (
        'get_categories_with_has_active_todos', 
        { 
          p_owner_id: ownerId, 
          p_completed: completed,
          p_deleted: deleted || false
        }
      );
  if (error) throw error;
  return data as Category[];
}


// Create a new category
export async function createCategory(title: string, owner_id: number, description?: string): Promise<Category> {
  const { data, error } = await supabase
    .from('Category')
    .insert([{ title, owner_id, description }])
    .select()
    .single();
  if (error) throw error;
  
  data.has_active_todos = false; // Newly created categories won't have active todos
  return data as Category;
}

export async function categoryHasActiveTodos(categoryId: number, ownerId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    'get_categories_with_has_active_todos',
    {
      p_owner_id: ownerId,
      p_category_id: categoryId,
      p_completed: false,
      p_deleted: false,
    }
  );
  if (error) throw error;

  return data?.[0]?.has_active_todos ?? false;
}

//Delete category  
type DeleteCategoryResponse =
  | { status: 200; message: string }
  | { status: number; error: string };
  
export async function deleteCategory(categoryId: number): Promise<DeleteCategoryResponse> {
  if (!categoryId) {
    throw new Error('Category ID is required');
  }
  const response = await fetch(API_PATHS.CATEGORIES, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: categoryId  }),
  });

  const responseBody = await response.json();
  if (response.status !== 200) {
    throw new Error(
      responseBody.error ??
      `${API_MESSAGES.CATEGORIES.COULD_NOT_DELETE_CATEGORY(categoryId)}`);
  }
  return responseBody;
}
