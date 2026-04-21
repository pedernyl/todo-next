// Type definition for a Todo item
export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  sort_index?: number | null;
  owner_id: number;
  category_id?: string | null;
  parent_todo?: string | null;
  deleted_timestamp?: number | null;
  deleted_by?: number | null;
}
