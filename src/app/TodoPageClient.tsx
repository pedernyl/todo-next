"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import TodoList from "../components/TodoList";
import CategoryDropdownWrapper from "../components/CategoryDropdownWrapper";
import { useUserId } from "../context/UserIdContext";
import { API_PATHS } from "../constants/api/apiPaths";
import { Todo } from "../../types";
import type { Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";

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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const { userId } = useUserId();
  const { runBlockingFetch } = useGlobalBlockingLoader();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef<boolean>(false);
  const inFlightRequestKeysRef = useRef<Set<string>>(new Set());
  const offsetRef = useRef<number>(offset);
  const pageSizeRef = useRef<number>(pageSize);
  const hasMoreRef = useRef<boolean>(hasMore);
  const isRefreshingRef = useRef<boolean>(false);
  const refreshSeqRef = useRef<number>(0);
  const showCompletedRef = useRef<boolean>(showCompleted);
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
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    selectedCategoryIdRef.current = selectedCategory?.id ?? null;
  }, [selectedCategory]);

  const loadMore = useCallback(async () => {
    if (!userId || isRefreshingRef.current || !hasMoreRef.current || isLoadingMoreRef.current) return;

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
        showCompleted: String(showCompletedRef.current),
      });

      if (categoryId) {
        params.set("category_id", categoryId);
      }

      const res = await fetch(`${API_PATHS.TODOS}?${params.toString()}`, {
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
    showCompletedRef.current = showCompleted;
  }, [showCompleted]);

   // Toggle show/hide completed todos
    const handleToggleShowCompleted = () => { 
      setShowCompleted((prev) => !prev);
    };

  useEffect(() => {
    if (!userId) return;
    const currentRefreshSeq = ++refreshSeqRef.current;

    inFlightRequestKeysRef.current.clear();
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setIsRefreshing(true);
    // Reset paging before category refresh to avoid stale offsets during in-flight loads.
    setOffset(0);
    setHasMore(true);
   
    const params = new URLSearchParams({
      showCompleted: String(showCompletedRef.current),
    });

    if (selectedCategory && selectedCategory.id) {
      params.set("category_id", selectedCategory.id);
    }

    const url = `${API_PATHS.TODOS}?${params.toString()}`;

    runBlockingFetch(url, undefined, {
      label: GLOBAL.LOADER_LABELS.LOADING_TODOS,
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
        if (refreshSeqRef.current !== currentRefreshSeq) {
          return;
        }
        setTodos(data.todos);
        setPageSize((prev) => (prev === data.limit ? prev : data.limit));
        setOffset(data.todos.length);
        setHasMore(data.todos.length >= data.limit);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      })
      .finally(() => {
        if (refreshSeqRef.current === currentRefreshSeq) {
          setIsRefreshing(false);
        }
      });
  }, [selectedCategory, userId, showCompleted, runBlockingFetch]);

  useEffect(() => {
    if (isRefreshing) return;

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
  }, [loadMore, isRefreshing]);

  return (
    <>
      <div className="absolute right-10 top-2 z-10">
        <CategoryDropdownWrapper onCategoryChange={setSelectedCategory} />
      </div>
      <TodoList 
        initialTodos={todos} 
        selectedCategory={selectedCategory} 
        showCompleted={showCompleted} 
        handleToggleShowCompleted={handleToggleShowCompleted}
      />
      <div ref={sentinelRef} className="py-4 text-center text-sm text-gray-600">
        {isRefreshing ? GLOBAL.UI_TEXT.TODOS.LOADING_STATE : isLoadingMore ? GLOBAL.UI_TEXT.TODOS.LOADING_MORE : !hasMore ? GLOBAL.UI_TEXT.TODOS.ALL_LOADED : ""}
      </div>
    </>
  );
}
