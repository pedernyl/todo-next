"use server";
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdminClient';
import { supabase } from './supabaseClient';

import type { Category } from '../../types';
import { getAuthenticatedUserId } from './userService';
import { deleteCategory as deleteCategoryAction } from '../app/actions/category'; 

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

export async function getCategoryById({
  categoryId,
  ownerId,
  completed,
  deleted
}: {
  categoryId: number,
  ownerId: number,
  completed?: boolean,
  deleted?: boolean
}): Promise<Category | null> {
  const { data, error } = await supabase.rpc(
    'get_categories_with_has_active_todos',
    {
      p_owner_id: ownerId,
      p_category_id: categoryId,
      p_completed: completed ?? false,
      p_deleted: deleted ?? false,
    }
  );
  if (error) throw error;

  return data?.[0] ?? null;
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

export async function categoryHasActiveTodos(
  client: SupabaseClient,
  categoryId: number, 
  ownerId: number
): Promise<boolean> {
  const { data, error } = await client.rpc(
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
  | { success: boolean; message?: string }
  | { success: boolean; error: string };
  
export async function deleteCategory(categoryId: number): Promise<DeleteCategoryResponse> {
  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const deleteActionResponse = await deleteCategoryAction(categoryId);

  if (!deleteActionResponse.success) {
    return { success: false, error: deleteActionResponse.error ?? 'Failed to delete category' };
  }

  return deleteActionResponse;

  
}

// Change the completion status of a category and its todos
export async function updateCategoryCompletion({
  categoryId,
  completed
}: {
  categoryId: number,
  completed: boolean
}): Promise<void> {

  const userId = await getAuthenticatedUserId();
  
  const { error } = await supabaseAdmin.rpc('update_category_completion', {
    p_category_id: categoryId,
    p_owner_id: userId,
    p_completed: completed,
  });

  if (error) throw error;

}

export async function updateCategoryQuery(categoryId: number, ownerId: number, updateValues: object): Promise<void> {
  const { error } = await supabase
    .from('Category')
    .update(updateValues)
    .eq('id', categoryId)
    .eq('owner_id', ownerId);

  if (error) throw error;
}
