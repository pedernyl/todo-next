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
  const isLoadingMoreRef = useRef<boolean>(false);
  const inFlightRequestKeysRef = useRef<Set<string>>(new Set());
  const offsetRef = useRef<number>(offset);
  const pageSizeRef = useRef<number>(pageSize);
  const hasMoreRef = useRef<boolean>(hasMore);
  const selectedCategoryIdRef = useRef<string | null>(selectedCategory?.id ?? null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    selectedCategoryIdRef.current = selectedCategory?.id ?? null;
  }, [selectedCategory]);

  const loadMore = useCallback(async () => {
    if (!userId || !hasMoreRef.current || isLoadingMoreRef.current) return;

    const categoryId = selectedCategoryIdRef.current;
    const currentOffset = offsetRef.current;
    const currentPageSize = pageSizeRef.current;
    const requestKey = `${categoryId ?? "all"}:${currentOffset}:${currentPageSize}`;
    if (inFlightRequestKeysRef.current.has(requestKey)) return;

    inFlightRequestKeysRef.current.add(requestKey);
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({
        offset: String(currentOffset),
        limit: String(currentPageSize),
      });

      if (categoryId) {
        params.set("category_id", categoryId);
      }

      const res = await fetch(`/api/todos?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load more todos");
      }

      const data: TodosResponse = await res.json();
      if (selectedCategoryIdRef.current !== categoryId) {
        return;
      }
      if (offsetRef.current !== currentOffset) {
        return;
      }

      setTodos((prev) => [...prev, ...data.todos]);
      setOffset((prev) => prev + data.todos.length);
      setHasMore(data.todos.length >= currentPageSize);
    } catch {
      setHasMore(false);
    } finally {
      inFlightRequestKeysRef.current.delete(requestKey);
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    inFlightRequestKeysRef.current.clear();
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);

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
          return { todos: [], limit: pageSizeRef.current } as TodosResponse;
        }
        const data = (await res.json()) as TodosResponse;
        return data;
      })
      .then((data) => {
        setTodos(data.todos);
        setPageSize((prev) => (prev === data.limit ? prev : data.limit));
        setOffset(data.todos.length);
        setHasMore(data.todos.length >= data.limit);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });
  }, [selectedCategory, userId, runBlockingFetch]);

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
