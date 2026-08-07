
import { NextRequest, NextResponse } from 'next/server';
import { API_MESSAGES } from '../../../constants/api/apiMessages';
import { getAuthenticatedUserId } from "@/lib/userService";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

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
  const ownerId = await getAuthenticatedUserId(); 
  const { categoryId } = await req.json();

  if (!categoryId || !ownerId) {
    return NextResponse.json(
        { error: API_MESSAGES.CATEGORIES.MISSING_CATEGORY_ID_OR_OWNER_ID }, 
        { status: 400 }
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