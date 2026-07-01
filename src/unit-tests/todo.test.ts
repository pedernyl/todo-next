import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTodo, softDeleteTodo } from '../lib/dataService';
import { API_PATHS } from '../constants/api/apiPaths';

vi.mock('../lib/markdown', () => ({
  renderSanitizedMarkdown: vi.fn(async (input: string) =>
    `<p>${input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')}</p>`
  ),
}));

// Mock supabaseClient with full method chains (must be first)
vi.mock('../lib/supabaseClient', () => {
  // update chain for softDeleteTodo: .update().eq('id').select().single()
  function makeUpdateEqChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    chain['eq'] = vi.fn(() => chain);
    chain['select'] = vi.fn(() => ({
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
    }));
    return chain;
  }

  return {
    supabase: {
      rpc: vi.fn(async (_fn: string, params: { p_title?: string; p_description?: string }) =>
        Promise.resolve({
          data: {
            id: '1',
            title: params.p_title ?? 'Test Todo',
            description: params.p_description ?? '',
            completed: false,
            owner_id: 1,
            sort_index: 0,
          },
          error: null,
        })
      ),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: vi.fn((_table: string) => ({
        update: vi.fn(() => makeUpdateEqChain()),
      })),
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
  if (String(url).includes(API_PATHS.USER_ID)) {
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
    expect(todo.description_html).toBe('<p></p>');
  });

  it('returns sanitized description_html for created todos', async () => {
    const todo = await createTodo('Test Todo', '<script>alert(1)</script>hello', undefined, undefined);

    expect(todo.description_html).toContain('hello');
    expect(todo.description_html).not.toContain('<script');
  });

  it('calls insert_todo_at_top RPC with correct parameters', async () => {
    const { supabase } = await import('../lib/supabaseClient');
    await createTodo('Test Todo', 'desc', undefined, undefined);

    expect(supabase.rpc).toHaveBeenCalledWith('insert_todo_at_top', {
      p_title: 'Test Todo',
      p_description: 'desc',
      p_owner_id: 1,
      p_parent_todo: null,
      p_category_id: null,
    });
  });

  it('soft deletes a todo', async () => {
    const deleted = await softDeleteTodo('1', 'user1');
    expect(deleted).toBeDefined();
    expect(deleted.deleted_by).toBe('user1');
  });
});
