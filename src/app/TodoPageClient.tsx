"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import TodoList from "../components/TodoList";
import CategoryDropdownWrapper from "../components/CategoryDropdownWrapper";
import { useUserId } from "../context/UserIdContext";
import { Todo } from "../../types";
import type { Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";

type TodosResponse = {
  todos: Todo[];
  limit: number;
};

export default function TodoPageClient({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [offset, setOffset] = useState<number>(initialTodos.length);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const { userId } = useUserId();
  const { runBlockingFetch } = useGlobalBlockingLoader();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(pageSize),
      });

      if (selectedCategory?.id) {
        params.set("category_id", selectedCategory.id);
      }

      const res = await fetch(`/api/todos?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load more todos");
      }

      const data: TodosResponse = await res.json();
      setTodos((prev) => [...prev, ...data.todos]);
      setOffset((prev) => prev + data.todos.length);
      setHasMore(data.todos.length >= pageSize);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, hasMore, isLoadingMore, offset, pageSize, selectedCategory]);

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
      .then(async (res) => {
        if (!res.ok) {
          return { todos: [], limit: pageSize } as TodosResponse;
        }
        const data = (await res.json()) as TodosResponse;
        return data;
      })
      .then((data) => {
        setTodos(data.todos);
        setPageSize(data.limit);
        setOffset(data.todos.length);
        setHasMore(data.todos.length >= data.limit);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });
  }, [selectedCategory, userId, runBlockingFetch, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="absolute right-10 top-2 z-10">
        <CategoryDropdownWrapper onCategoryChange={setSelectedCategory} />
      </div>
      <TodoList initialTodos={todos} selectedCategory={selectedCategory} />
      <div ref={sentinelRef} className="py-4 text-center text-sm text-gray-600">
        {isLoadingMore ? "Loading more todos..." : !hasMore ? "All todos loaded" : ""}
      </div>
    </>
  );
}
