import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTodo, softDeleteTodo } from '../lib/dataService';

vi.mock('../lib/markdown', () => ({
  renderSanitizedMarkdown: vi.fn(async (input: string) =>
    `<p>${input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')}</p>`
  ),
}));

const maxSortQuery = {
  eq: vi.fn(() => maxSortQuery),
  is: vi.fn(() => maxSortQuery),
  not: vi.fn(() => maxSortQuery),
  order: vi.fn(() => maxSortQuery),
  limit: vi.fn(() => Promise.resolve({ data: [{ sort_index: 2 }], error: null })),
};

// Mock supabaseClient with full method chains (must be first)
vi.mock('../lib/supabaseClient', () => {
  const updateChain = {
    eq: () => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: '1',
              title: 'Test Todo',
              description: '',
              completed: false,
              owner_id: 1,
              deleted_timestamp: 1234567890,
              deleted_by: 'user1',
            },
            error: null,
          }),
      }),
    }),
  };
  return {
    supabase: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: (_table: string) => ({
        select: () => maxSortQuery,
        insert: (rows: Array<{ title: string; description: string; completed: boolean; owner_id: number }>) => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: '1',
                  title: rows[0]?.title ?? 'Test Todo',
                  description: rows[0]?.description ?? '',
                  completed: rows[0]?.completed ?? false,
                  owner_id: rows[0]?.owner_id ?? 1,
                },
                error: null,
              }),
          }),
        }),
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
    maxSortQuery.limit.mockResolvedValue({ data: [{ sort_index: 2 }], error: null });
  });

  it('creates a todo', async () => {
    const todo = await createTodo('Test Todo', '', undefined, undefined);
    expect(todo).toBeDefined();
    expect(todo.title).toBe('I want to fail Test Todo');
    expect(todo.description_html).toBe('<p></p>');
  });

  it('returns sanitized description_html for created todos', async () => {
    const todo = await createTodo('Test Todo', '<script>alert(1)</script>hello', undefined, undefined);

    expect(todo.description_html).toContain('hello');
    expect(todo.description_html).not.toContain('<script');
  });

  it('filters out null sort_index values when computing the next sort index', async () => {
    await createTodo('Test Todo', '', undefined, undefined);

    expect(maxSortQuery.not).toHaveBeenCalledWith('sort_index', 'is', null);
  });

  it('soft deletes a todo', async () => {
    const deleted = await softDeleteTodo('1', 'user1');
    expect(deleted).toBeDefined();
    expect(deleted.deleted_by).toBe('user1');
  });
});
