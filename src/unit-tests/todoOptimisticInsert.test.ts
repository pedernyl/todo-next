import { describe, expect, it } from 'vitest';
import { Todo } from '../../types';
import { insertTodoAtTop } from '../components/TodoList';

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: String(overrides.id ?? Math.random()),
    title: overrides.title ?? 'todo',
    description: overrides.description ?? '',
    completed: overrides.completed ?? false,
    owner_id: overrides.owner_id ?? 1,
    sort_index: overrides.sort_index ?? 0,
    parent_todo: typeof overrides.parent_todo === 'undefined' ? null : overrides.parent_todo,
    category_id: typeof overrides.category_id === 'undefined' ? null : overrides.category_id,
    ...overrides,
  };
}

describe('applyOptimisticTodoInsert', () => {
  it('keeps existing todos unchanged and inserts a new top-level todo with a higher sort_index', () => {
    const prev = [
      makeTodo({ id: '1', title: 'A', sort_index: 0, parent_todo: null, category_id: null }),
      makeTodo({ id: '2', title: 'B', sort_index: 1000, parent_todo: null, category_id: null }),
      makeTodo({ id: '3', title: 'Child', sort_index: 0, parent_todo: '1', category_id: null }),
    ];

    const newTodo = makeTodo({
      id: '99',
      title: 'New',
      sort_index: 0,
      parent_todo: null,
      category_id: null,
      completed: false,
    });

    const next = insertTodoAtTop(prev, newTodo);

    expect(next[0]?.id).toBe('99');
    expect(next.find((t) => t.id === '99')?.sort_index).toBe(2000);
    expect(next.find((t) => t.id === '1')?.sort_index).toBe(0);
    expect(next.find((t) => t.id === '2')?.sort_index).toBe(1000);
    expect(next.find((t) => t.id === '3')?.sort_index).toBe(0);
  });

  it('assigns a new subtodo sort_index from the owner-wide maximum without changing siblings', () => {
    const prev = [
      makeTodo({ id: '10', title: 'P', sort_index: 0, parent_todo: null }),
      makeTodo({ id: '11', title: 'C1', sort_index: 1000, parent_todo: '10', category_id: null }),
      makeTodo({ id: '12', title: 'C2', sort_index: 2000, parent_todo: '10', category_id: null }),
      makeTodo({ id: '13', title: 'OtherRoot', sort_index: 3000, parent_todo: null, category_id: null }),
    ];

    const newSubtodo = makeTodo({
      id: '100',
      title: 'NewSub',
      sort_index: 0,
      parent_todo: '10',
      category_id: null,
      completed: false,
    });

    const next = insertTodoAtTop(prev, newSubtodo);

    expect(next[0]?.id).toBe('100');
    expect(next.find((t) => t.id === '100')?.sort_index).toBe(4000);
    expect(next.find((t) => t.id === '11')?.sort_index).toBe(1000);
    expect(next.find((t) => t.id === '12')?.sort_index).toBe(2000);
    expect(next.find((t) => t.id === '13')?.sort_index).toBe(3000);
  });

  it('uses the owner-wide maximum regardless of completed or category scope', () => {
    const prev = [
      makeTodo({ id: '20', title: 'Cat A active', sort_index: 1000, parent_todo: null, category_id: 'cat-a', completed: false }),
      makeTodo({ id: '21', title: 'Cat A done', sort_index: 5000, parent_todo: null, category_id: 'cat-a', completed: true }),
      makeTodo({ id: '22', title: 'No Cat active', sort_index: 3000, parent_todo: null, category_id: null, completed: false }),
    ];

    const newCatTodo = makeTodo({
      id: '200',
      title: 'New Cat A active',
      sort_index: 0,
      parent_todo: null,
      category_id: 'cat-a',
      completed: false,
    });

    const next = insertTodoAtTop(prev, newCatTodo);

    expect(next[0]?.id).toBe('200');
    expect(next.find((t) => t.id === '200')?.sort_index).toBe(6000);
    expect(next.find((t) => t.id === '20')?.sort_index).toBe(1000);
    expect(next.find((t) => t.id === '21')?.sort_index).toBe(5000);
    expect(next.find((t) => t.id === '22')?.sort_index).toBe(3000);
  });

  it('appends above cross-category top-level siblings using a gap-based sort_index', () => {
    const prev = [
      makeTodo({ id: '379', title: 'hello', sort_index: 3000, parent_todo: null, category_id: null, completed: false }),
      makeTodo({ id: '247', title: 'SIKT', sort_index: 4000, parent_todo: null, category_id: 'cat-19', completed: false }),
    ];

    const newTodo = makeTodo({
      id: '383',
      title: 'fifth',
      sort_index: 0,
      parent_todo: null,
      category_id: null,
      completed: false,
    });

    const next = insertTodoAtTop(prev, newTodo);

    expect(next.find((t) => t.id === '383')?.sort_index).toBe(5000);
    expect(next.find((t) => t.id === '379')?.sort_index).toBe(3000);
    expect(next.find((t) => t.id === '247')?.sort_index).toBe(4000);
    const helloIdx = next.findIndex((t) => t.id === '379');
    const siktIdx = next.findIndex((t) => t.id === '247');
    expect(helloIdx).toBeLessThan(siktIdx);
  });

  it('uses the highest finite owner-wide sort_index when inserting', () => {
    const prev = [
      makeTodo({ id: '30', title: 'Valid', sort_index: 2000, parent_todo: null, category_id: null, completed: false }),
      makeTodo({ id: '31', title: 'Null', sort_index: null, parent_todo: null, category_id: null, completed: false }),
      makeTodo({ id: '32', title: 'Negative', sort_index: -1, parent_todo: null, category_id: null, completed: false }),
      makeTodo({ id: '33', title: 'NaN', sort_index: Number.NaN, parent_todo: null, category_id: null, completed: false }),
      makeTodo({ id: '34', title: 'Infinity', sort_index: Number.POSITIVE_INFINITY, parent_todo: null, category_id: null, completed: false }),
    ];

    const newTodo = makeTodo({
      id: '300',
      title: 'Inserted',
      sort_index: 0,
      parent_todo: null,
      category_id: null,
      completed: false,
    });

    const next = insertTodoAtTop(prev, newTodo);

  expect(next.find((t) => t.id === '300')?.sort_index).toBe(3000);
  expect(next.find((t) => t.id === '30')?.sort_index).toBe(2000);
    expect(next.find((t) => t.id === '31')?.sort_index).toBeNull();
    expect(next.find((t) => t.id === '32')?.sort_index).toBe(-1);
    expect(next.find((t) => t.id === '33')?.sort_index).toBeNaN();
    expect(next.find((t) => t.id === '34')?.sort_index).toBe(Number.POSITIVE_INFINITY);
  });
});
