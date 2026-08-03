"use client";
import React, 
    { 
        createContext, 
        useContext, 
        useState, 
        useCallback, 
        useMemo, 
        ReactNode 
    } from "react";
import { getCategories, Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "./GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";
import { useSession } from "next-auth/react";

type CategoriesActions = {
    refreshCategories: () => Promise<void>;
};

const CategoriesDataContext = createContext<Category[]>([]);
const CategoriesActionsContext = createContext<CategoriesActions | null>(null);

export function useCategoriesData() {
    return useContext(CategoriesDataContext);
}

export function useCategoriesActions() {
    const context = useContext(CategoriesActionsContext);
    if (!context) {
        throw new Error("useCategoriesActions must be used within a CategoriesProvider");
    }
    return context;
}

export function CategoriesProvider({ 
    children, 
    initialCategories 
  }: {
    children: ReactNode; 
    initialCategories: Category[]; 
    }) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const { runBlocking } = useGlobalBlockingLoader();

    const refreshCategories = useCallback(async () => {
        if (!userId) return;
        try {
            const fetchedCategories = await runBlocking(
                async () => getCategories(
                    {
                        ownerId: userId,
                        completed: false,
                        deleted: false
                    }),
                { label: GLOBAL.LOADER_LABELS.LOADING_CATEGORIES, cancellable: false }
            );
            setCategories(fetchedCategories);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            setCategories([]);
        }
    }, [userId, runBlocking]);

    const actions = useMemo(() => ({ refreshCategories }), [refreshCategories]);

    return (
        <CategoriesActionsContext.Provider value={actions}>
            <CategoriesDataContext.Provider value={categories}>
                {children}
            </CategoriesDataContext.Provider>
        </CategoriesActionsContext.Provider>
    )

}
