import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTodo, softDeleteTodo } from '../lib/dataService';

vi.mock('../lib/markdown', () => ({
  renderSanitizedMarkdown: vi.fn(async (input: string) =>
    `<p>${input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')}</p>`
  ),
}));

// Mock supabaseClient with full method chains (must be first)
vi.mock('../lib/supabaseClient', () => {
  // A chainable thenable: every filter method returns itself, and awaiting
  // it resolves to an empty sibling list (no siblings to shift).
  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    const resolve = Promise.resolve({ data: [], error: null });
    chain['then'] = resolve.then.bind(resolve);
    chain['catch'] = resolve.catch.bind(resolve);
    for (const method of ['eq', 'is', 'gte', 'not', 'in', 'order', 'limit']) {
      chain[method] = vi.fn(() => chain);
    }
    return chain;
  }

  const softDeleteData = {
    id: '1',
    title: 'Test Todo',
    description: '',
    completed: false,
    owner_id: 1,
    deleted_timestamp: 1234567890,
    deleted_by: 'user1',
  };

  // A flexible update chain that satisfies both:
  //   softDeleteTodo: .update().eq('id').select().single()
  //   sibling shift:  .update().eq('id').eq('owner_id')  → resolves
  function makeUpdateEqChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    chain['eq'] = vi.fn(() => chain);
    chain['select'] = vi.fn(() => ({
      single: () => Promise.resolve({ data: softDeleteData, error: null }),
    }));
    chain['then'] = (resolve: (v: unknown) => unknown) =>
      resolve({ data: null, error: null });
    return chain;
  }

  return {
    supabase: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => makeSelectChain()),
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
    expect(todo.description_html).toBe('<p></p>');
  });

  it('returns sanitized description_html for created todos', async () => {
    const todo = await createTodo('Test Todo', '<script>alert(1)</script>hello', undefined, undefined);

    expect(todo.description_html).toContain('hello');
    expect(todo.description_html).not.toContain('<script');
  });

  it('does not shift siblings when there are none (no upsert or update called)', async () => {
    const { supabase } = await import('../lib/supabaseClient');
    // Mock returns no siblings, so no update should be issued
    await createTodo('Test Todo', '', undefined, undefined);
    const fromInstance = (supabase.from as ReturnType<typeof vi.fn>).mock.results.find(
      (r) => r.value?.update
    )?.value;
    expect(fromInstance?.update).not.toHaveBeenCalled();
  });

  it('soft deletes a todo', async () => {
    const deleted = await softDeleteTodo('1', 'user1');
    expect(deleted).toBeDefined();
    expect(deleted.deleted_by).toBe('user1');
  });
});
