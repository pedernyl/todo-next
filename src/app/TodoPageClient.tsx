"use client";

import React, { useState, useEffect } from "react";
import TodoList from "../components/TodoList";
import CategoryDropdownWrapper from "../components/CategoryDropdownWrapper";
import { useUserId } from "../context/UserIdContext";
import { Todo } from "../../types";
import type { Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";

export default function TodoPageClient({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { userId } = useUserId();
  const { runBlockingFetch } = useGlobalBlockingLoader();

  useEffect(() => {
    if (!userId) return;
    let url = "/api/todos";
    if (selectedCategory && selectedCategory.id) {
      url += `?category_id=${selectedCategory.id}`;
    }
    runBlockingFetch(url, undefined, {
      label: "Loading todos...",
      cancellable: true,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then(setTodos)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });
  }, [selectedCategory, userId, runBlockingFetch]);

  return (
    <>
      <div className="absolute right-10 top-2 z-10">
        <CategoryDropdownWrapper onCategoryChange={setSelectedCategory} />
      </div>
      <TodoList initialTodos={todos} selectedCategory={selectedCategory} />
    </>
  );
}
