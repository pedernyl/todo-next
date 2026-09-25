"use server"

export async function deleteCategory(categoryId: string | number): 
  Promise<{ success: boolean; error?: string }> {

    console.log('from server actiohns', categoryId);

    return { success: true };

}