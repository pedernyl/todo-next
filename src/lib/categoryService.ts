import { supabase } from './supabaseClient';

export interface Category {
  id: string;
  title: string;
  description?: string;
  owner_id: number;
  hasActiveTodos: boolean;
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
  return data as Category;
}

//@todo implement deleteCategory function
