import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddTodo from '../components/AddTodo';

const runBlockingFetchMock = vi.fn();

vi.mock('../context/GlobalBlockingLoaderContext', () => ({
  useGlobalBlockingLoader: () => ({
    runBlockingFetch: runBlockingFetchMock,
  }),
}));

describe('AddTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('preserves title and description when create request is cancelled from loader', async () => {
    runBlockingFetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

    const onTodoAdded = vi.fn();

    render(<AddTodo userId={1} onTodoAdded={onTodoAdded} />);

    const titleInput = screen.getByPlaceholderText('Title') as HTMLInputElement;
    const descriptionInput = screen.getByPlaceholderText('Description') as HTMLTextAreaElement;

    fireEvent.change(titleInput, { target: { value: 'My pending todo' } });
    fireEvent.change(descriptionInput, { target: { value: 'Keep this text' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Todo' }));

    await waitFor(() => {
      expect(runBlockingFetchMock).toHaveBeenCalledTimes(1);
    });

    expect(runBlockingFetchMock).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
      { label: 'Creating todo...', cancellable: true }
    );

    expect(onTodoAdded).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
    expect(titleInput.value).toBe('My pending todo');
    expect(descriptionInput.value).toBe('Keep this text');
  });

  it('shows an error and preserves title and description when create request fails', async () => {
    runBlockingFetchMock.mockRejectedValueOnce(new Error('Server unavailable'));

    const onTodoAdded = vi.fn();

    render(<AddTodo userId={1} onTodoAdded={onTodoAdded} />);

    const titleInput = screen.getByPlaceholderText('Title') as HTMLInputElement;
    const descriptionInput = screen.getByPlaceholderText('Description') as HTMLTextAreaElement;

    fireEvent.change(titleInput, { target: { value: 'Keep this title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Keep this description' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Todo' }));

    await waitFor(() => {
      expect(runBlockingFetchMock).toHaveBeenCalledTimes(1);
    });

    expect(runBlockingFetchMock).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
      { label: 'Creating todo...', cancellable: true }
    );

    expect(onTodoAdded).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Server unavailable');
    expect(titleInput.value).toBe('Keep this title');
    expect(descriptionInput.value).toBe('Keep this description');
  });
});
