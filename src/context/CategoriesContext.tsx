"use client";
import React, 
    { 
        createContext, 
        useContext, 
        useState, 
        useEffect, 
        useCallback, 
        useMemo, 
        ReactNode 
    } from "react";
import { getCategories, Category } from "../lib/categoryService";
import { useUserId } from "./UserIdContext";
import { useGlobalBlockingLoader } from "./GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";

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



export function CategoriesProvider({ children }: { children: ReactNode }) {
    const { userId } = useUserId();

    const [categories, setCategories] = useState<Category[]>([]);
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

    useEffect(() => {
        refreshCategories();
    }, [refreshCategories]);


    const actions = useMemo(() => ({ refreshCategories }), [refreshCategories]);

    return (
        <CategoriesActionsContext.Provider value={actions}>
            <CategoriesDataContext.Provider value={categories}>
                {children}
            </CategoriesDataContext.Provider>
        </CategoriesActionsContext.Provider>
    )

}
