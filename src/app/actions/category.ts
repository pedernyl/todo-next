"use server"

import { categoryHasActiveTodos } from "@/lib/categoryService";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { supabase } from "@/lib/supabaseClient";
import { isUserAuthenticated, getAuthenticatedUserId } from "@/lib/userService";
import type { Category } from '../../../types';

type CategoryActionResult = { success: boolean; error?: string };

export async function deleteCategory(categoryId: string | number): Promise<CategoryActionResult> {
    if (!isUserAuthenticated()) {
      return { success: false, error: 'User not authenticated' };
    }

    const ownerId = await getAuthenticatedUserId(); 

    if (!ownerId || !categoryId) {
      return { success: false, error: 'Invalid owner or category ID' };
    }

    if (await categoryHasActiveTodos(supabaseAdmin, Number(categoryId), Number(ownerId))) {
        return { success: false, error: 'Category has active todos' };
    }

    const updateValues = {
        deleted_timestamp: new Date().toISOString(),
        deleted_by: ownerId
    };

    await updateCategoryQuery(Number(categoryId), Number(ownerId), updateValues);

    return { success: true };

}


export async function updateCategoryCompletion(
  {
    categoryId,
    completed
  }: {
    categoryId: number,
    completed: boolean
  }
): Promise<CategoryActionResult> {
  if (!isUserAuthenticated()) {
    return { success: false, error: 'User not authenticated' };
  }

  const ownerId = await getAuthenticatedUserId();

  if (!ownerId || !categoryId) {
    return { success: false, error: 'Invalid owner or category ID' };
  }

  const { error } = await supabaseAdmin.rpc('update_category_completion', {
    p_category_id: categoryId,
    p_owner_id: ownerId,
    p_completed: completed,
  });

  if (error) {
    return { success: false, error: error.message ?? 'Failed to update category completion' };
  }

  return { success: true };

}

export async function createCategory(
  title: string,
  description?: string
): Promise<Category> {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('Category')
    .insert({
      title,
      owner_id: ownerId,
      description
    })
    .select()
    .single();

     data.has_active_todos = false; // Newly created categories won't have active todos

  if (error) throw error;

  return data as Category;
}

async function updateCategoryQuery(
  categoryId: number, 
  ownerId: number, 
  updateValues: object): Promise<void> {
  if (!isUserAuthenticated()) {
      throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('Category')
    .update(updateValues)
    .eq('id', categoryId)
    .eq('owner_id', ownerId);

  if (error) throw error;
}