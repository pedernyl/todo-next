"use server"

import { categoryHasActiveTodos } from "@/lib/categoryService";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { supabase } from "@/lib/supabaseClient";
import { isUserAuthenticated, getAuthenticatedUserId } from "@/lib/userService";

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

async function updateCategoryQuery(categoryId: number, ownerId: number, updateValues: object): Promise<void> {
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