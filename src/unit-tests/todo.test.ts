import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTodo, softDeleteTodo } from '../lib/dataService';

// Mock supabaseClient with full method chains (must be first)
vi.mock('../lib/supabaseClient', () => {
  const maxSortQuery = {
    eq: () => maxSortQuery,
    is: () => maxSortQuery,
    order: () => maxSortQuery,
    limit: () => Promise.resolve({ data: [{ sort_index: 2 }], error: null }),
  };
  const insertChain = { select: () => ({ single: () => Promise.resolve({ data: { id: '1', title: 'Test Todo', description: '', completed: false }, error: null }) }) };
  const updateChain = { eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: '1', deleted_timestamp: 1234567890, deleted_by: 'user1' }, error: null }) }) }) };
  return {
    supabase: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: (_table: string) => ({
        select: () => maxSortQuery,
        insert: () => insertChain,
        update: () => updateChain,
      })
    }
  };
});

// Mock next-auth getServerSession
vi.mock('next-auth', () => ({
  getServerSession: async () => ({ user: { email: 'test@example.com' } })
}));

// Mock fetch for user id
type SimpleResponse = { ok: boolean; json: () => Promise<{ userId: number }> };
// @ts-expect-error - mocking global.fetch in the test environment
global.fetch = vi.fn(async (url: unknown): Promise<SimpleResponse> => {
  if (String(url).includes('/api/userid')) {
    return {
      ok: true,
      json: async () => ({ userId: 1 })
    };
  }
  throw new Error('Unknown fetch');
});

describe('Todo API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a todo', async () => {
    const todo = await createTodo('Test Todo', '', undefined, undefined);
    expect(todo).toBeDefined();
    expect(todo.title).toBe('Test Todo');
  });

  it('soft deletes a todo', async () => {
    const deleted = await softDeleteTodo('1', 'user1');
    expect(deleted).toBeDefined();
    expect(deleted.deleted_by).toBe('user1');
  });
});
