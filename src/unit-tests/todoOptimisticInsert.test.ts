import { describe, expect, it } from 'vitest';
import { Todo } from '../../types';
import { applyOptimisticTodoInsert } from '../components/TodoList';

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
  it('inserts a new top-level todo and increments top-level sibling sort indexes', () => {
    const prev = [
      makeTodo({ id: '1', title: 'A', sort_index: 0, parent_todo: null, category_id: null }),
      makeTodo({ id: '2', title: 'B', sort_index: 1, parent_todo: null, category_id: null }),
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

    const next = applyOptimisticTodoInsert(prev, newTodo);

    expect(next[0]?.id).toBe('99');
    expect(next.find((t) => t.id === '1')?.sort_index).toBe(1);
    expect(next.find((t) => t.id === '2')?.sort_index).toBe(2);
    expect(next.find((t) => t.id === '3')?.sort_index).toBe(0);
  });

  it('only increments siblings in the same parent scope for subtodos', () => {
    const prev = [
      makeTodo({ id: '10', title: 'P', sort_index: 0, parent_todo: null }),
      makeTodo({ id: '11', title: 'C1', sort_index: 0, parent_todo: '10', category_id: null }),
      makeTodo({ id: '12', title: 'C2', sort_index: 1, parent_todo: '10', category_id: null }),
      makeTodo({ id: '13', title: 'OtherRoot', sort_index: 2, parent_todo: null, category_id: null }),
    ];

    const newSubtodo = makeTodo({
      id: '100',
      title: 'NewSub',
      sort_index: 0,
      parent_todo: '10',
      category_id: null,
      completed: false,
    });

    const next = applyOptimisticTodoInsert(prev, newSubtodo);

    expect(next[0]?.id).toBe('100');
    expect(next.find((t) => t.id === '11')?.sort_index).toBe(1);
    expect(next.find((t) => t.id === '12')?.sort_index).toBe(2);
    expect(next.find((t) => t.id === '13')?.sort_index).toBe(2);
  });

  it('respects category and completed scope when shifting siblings', () => {
    const prev = [
      makeTodo({ id: '20', title: 'Cat A active', sort_index: 0, parent_todo: null, category_id: 'cat-a', completed: false }),
      makeTodo({ id: '21', title: 'Cat A done', sort_index: 0, parent_todo: null, category_id: 'cat-a', completed: true }),
      makeTodo({ id: '22', title: 'No Cat active', sort_index: 0, parent_todo: null, category_id: null, completed: false }),
    ];

    const newCatTodo = makeTodo({
      id: '200',
      title: 'New Cat A active',
      sort_index: 0,
      parent_todo: null,
      category_id: 'cat-a',
      completed: false,
    });

    const next = applyOptimisticTodoInsert(prev, newCatTodo);

    expect(next[0]?.id).toBe('200');
    expect(next.find((t) => t.id === '20')?.sort_index).toBe(1);
    expect(next.find((t) => t.id === '21')?.sort_index).toBe(0);
    expect(next.find((t) => t.id === '22')?.sort_index).toBe(0);
  });
});
