// Mock supabaseClient with full method chains (must be first)
import { afterEach, vi } from 'vitest';

const categoryTestId = 1;
vi.mock('../lib/supabaseClient', () => {
  const insertChain = { select: () => (
    { single: () => Promise.resolve(
      { data: { 
        id: categoryTestId, 
        title: 
        'Test Category',
         owner_id: 1 
        }, error: null }) 
      }) 
    };
  return {
    supabase: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: (_table: string) => ({
        insert: () => insertChain,
      })
    }
  };
});

import { createCategory, deleteCategory } from '../lib/categoryService';
import { describe, it, expect, beforeEach } from 'vitest';
import { API_MESSAGES } from '../constants/api/apiMessages';
import { API_PATHS } from '../constants/api/apiPaths';

describe('Category Service tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a category', async () => {
    const category = await createCategory('Test Category', categoryTestId, 'Test Description');
    expect(category).toBeDefined();
    expect(category.title).toBe('Test Category');
  });

  it('deletes a category', async () => {
    const fakeResponse = {
      status: 200,
      json: () => Promise.resolve(
        { status: 200, 
          message: API_MESSAGES.CATEGORIES.DELETED_CATEGORY_SUCCESSFULLY(String(categoryTestId)) 
        })
    };

    const fetchMock = vi.fn().mockResolvedValue(fakeResponse);
    vi.stubGlobal('fetch', fetchMock);

    const response = await deleteCategory(categoryTestId);
    
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(API_PATHS.CATEGORIES, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: categoryTestId }),
    });

    expect(response).toEqual({
      status: 200,
      message: API_MESSAGES.CATEGORIES.DELETED_CATEGORY_SUCCESSFULLY(String(categoryTestId)),
    });
    

  });
});
