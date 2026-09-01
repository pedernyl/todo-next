
import { NextRequest, NextResponse } from 'next/server';
import { API_MESSAGES } from '../../../constants/api/apiMessages';
import { getAuthenticatedUserId, isUserAuthenticated } from "@/lib/userService";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { categoryHasActiveTodos } from '@/lib/categoryService';

/**
 * DELETE /api/categories
 * Deletes a category for the authenticated user.
 * 
 * Request body:
 * {
 *   "categoryId": string
 * }
 * 
 * Response:
 * 200: { message: string }
 * 400: { error: string }
 * 500: { error: string }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {  
  // Check if the user is authenticated
  if (!await isUserAuthenticated()) {
    return NextResponse.json(
        { status: 401, error: API_MESSAGES.COMMON.UNAUTHORIZED }
    );
  }

  const ownerId = await getAuthenticatedUserId(); 
  const { id: categoryId }: { id: string } = await req.json();

  if (!categoryId || !ownerId) {
    return NextResponse.json(
        { error: API_MESSAGES.CATEGORIES.MISSING_CATEGORY_ID_OR_OWNER_ID }, 
        { status: 400 }
    );
  }

  if (await categoryHasActiveTodos(Number(categoryId), Number(ownerId))) {
    return NextResponse.json(
        { error: API_MESSAGES.CATEGORIES.CATEGORY_HAS_ACTIVE_TODOS },
        { status: 409 }
    );
  }

  const updateValues = {
    deleted_timestamp: new Date().toISOString(),
    deleted_by: ownerId
  };

  const { error } = await supabaseAdmin
    .from('Category')
    .update(updateValues)
    .eq('id', categoryId)
    .eq('owner_id', ownerId);

  if (error) {
    return NextResponse.json(
        { error: API_MESSAGES.CATEGORIES.COULD_NOT_DELETE_CATEGORY(categoryId) }, 
        { status: 500 }
    );
  }

  return NextResponse.json(
    { message: API_MESSAGES.CATEGORIES.DELETED_CATEGORY_SUCCESSFULLY(categoryId) },
    { status: 200 }
  );
}