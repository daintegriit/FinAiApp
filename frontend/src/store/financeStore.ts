import {
  create,
  StateCreator,
} from "zustand";

import {
  persist,
  createJSONStorage,
} from "zustand/middleware";

import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  Transaction,
} from "../services/transactions";

import type {
  AnalyticsResponse,
} from "../services/analytics";

import type {
  FinancialAnalysisResponse,
  FinancialSimulation,
  FinancialProfile,
  Category,
  DraftTransaction,
} from "../../src/types/financial";

/* ===================================================== */
/* 💎 DEFAULT CATEGORIES */
/* ===================================================== */

export const DEFAULT_CATEGORIES = [
  {
    name: "Food",
    icon: "fast-food-outline",
  },
  {
    name: "Clothing",
    icon: "shirt-outline",
  },
  {
    name: "Phone",
    icon: "phone-portrait-outline",
  },
  {
    name: "Entertainment",
    icon: "game-controller-outline",
  },
  {
    name: "Medical",
    icon: "medkit-outline",
  },
  {
    name: "Home",
    icon: "home-outline",
  },
  {
    name: "Housing",
    icon: "business-outline",
  },
  {
    name: "Education",
    icon: "school-outline",
  },
  {
    name: "Car",
    icon: "car-outline",
  },
  {
    name: "Kids",
    icon: "happy-outline",
  },
  {
    name: "Costco",
    icon: "cart-outline",
  },
  {
    name: "Restaurant",
    icon: "restaurant-outline",
  },
  {
    name: "Travel",
    icon: "airplane-outline",
  },
  {
    name: "Gym",
    icon: "barbell-outline",
  },
  {
    name: "Subscriptions",
    icon: "repeat-outline",
  },
] as const;

/* ===================================================== */
/* 💎 TYPES */
/* ===================================================== */

export interface FinanceState {
  transactions: Transaction[];

  analytics: AnalyticsResponse | null;

  income: number;

  fixedExpenses: number;

  variableExpenses: number;

  profile: FinancialProfile | null;

  analysis: FinancialAnalysisResponse | null;

  lastAnalyzedAt: number | null;

  isAnalyzing: boolean;

  analysisError: string | null;

  hasHydrated: boolean;

  userCategoryGrid: Category[];

  draftTransaction: DraftTransaction;

  simulations: FinancialSimulation[];

  selectedSimulations: string[];

  /* =================================================== */
  /* QUOTA (server-authoritative, not persisted) */
  /* =================================================== */

  quota: {
    limit: number | null;
    used: number;
    remaining: number | null;
    unlimited: boolean;
  } | null;

  setQuota: (
    quota: FinanceState["quota"]
  ) => void;

  /* =================================================== */
  /* PROFILE */
  /* =================================================== */

  setProfile: (
    profile: FinancialProfile
  ) => void;

  /* =================================================== */
  /* HYDRATION */
  /* =================================================== */

  setHasHydrated: (
    state: boolean
  ) => void;

  setUserCategoryGrid: (
    categories: Category[]
  ) => void;

  /* =================================================== */
  /* CATEGORY */
  /* =================================================== */

  addUserCategory: (
    category: Category
  ) => void;

  removeUserCategory: (
    name: string
  ) => void;

  clearUserCategories: () => void;

  setCategoryBudget: (
    name: string,
    budget: number
  ) => void;

  /* =================================================== */
  /* DRAFT */
  /* =================================================== */

  setDraftTransaction: (
    draft: DraftTransaction
  ) => void;

  clearDraftTransaction: () => void;

  /* =================================================== */
  /* TRANSACTIONS */
  /* =================================================== */

  setTransactions: (
    transactions: Transaction[]
  ) => void;

  addTransaction: (
    transaction: Transaction
  ) => void;

  removeTransaction: (
    id: string | number
  ) => void;

  clearTransactions: () => void;

  /* =================================================== */
  /* ANALYTICS */
  /* =================================================== */

  setAnalytics: (
    analytics: AnalyticsResponse
  ) => void;

  /* =================================================== */
  /* FINANCIALS */
  /* =================================================== */

  setIncome: (
    income: number
  ) => void;

  setFixedExpenses: (
    value: number
  ) => void;

  setVariableExpenses: (
    value: number
  ) => void;

  /* =================================================== */
  /* ANALYSIS */
  /* =================================================== */

  setAnalysis: (
    analysis: FinancialAnalysisResponse | null
  ) => void;

  clearAnalysis: () => void;

  setAnalyzing: (
    loading: boolean
  ) => void;

  setAnalysisError: (
    error: string | null
  ) => void;

  /* =================================================== */
  /* SIMULATIONS */
  /* =================================================== */

  addSimulation: (
    sim: FinancialSimulation
  ) => void;

  setSimulations: (
    simulations: FinancialSimulation[]
  ) => void;

  deleteSimulation: (
    id: string
  ) => void;

  clearSimulations: () => void;

  /* =================================================== */
  /* COMPARISON */
  /* =================================================== */

  toggleSimulationSelection: (
    id: string
  ) => void;

  clearSelectedSimulations: () => void;

  getSelectedSimulations:
    () => FinancialSimulation[];

  canCompare: () => boolean;

  resetStore: () => void;

}

/* ===================================================== */
/* 💎 HELPERS */
/* ===================================================== */

function normalizeName(
  value?: string | null
): string {

  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeNumber(
  value: unknown
): number {

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function mergeCategoryDefaults(
  existing: Category,
  incoming?: Partial<Category>
): Category {

  return {

    ...existing,

    ...incoming,

    spent:
      safeNumber(
        incoming?.spent ??
          existing.spent
      ),

    budget:
      safeNumber(
        incoming?.budget ??
          existing.budget
      ),

    icon:
      incoming?.icon ??
      existing.icon,
  };
}

function recalculateCategorySpent(
  categories: Category[],
  transactions: Transaction[]
): Category[] {

  return categories.map((category) => {

    const spent =
      transactions
        .filter(
          (tx) =>
            normalizeName(
              tx.category
            ) ===
            normalizeName(
              category.name
            )
        )
        .reduce(
          (sum, tx) =>
            sum +
            safeNumber(
              tx.amount
            ),
          0
        );

    return {

      ...category,

      spent,
    };
  });
}

/* ===================================================== */
/* 💎 STORE CREATOR */
/* ===================================================== */

type FinanceStoreCreator =
  StateCreator<
    FinanceState,
    [],
    [],
    FinanceState
  >;

/* ===================================================== */
/* 💎 STORE */
/* ===================================================== */

const financeStoreCreator:
  FinanceStoreCreator = (
  set,
  get
) => ({

  /* =================================================== */
  /* CORE */
  /* =================================================== */

  transactions: [],

  analytics: null,

  income: 0,

  fixedExpenses: 0,

  variableExpenses: 0,

  profile: null,

  analysis: null,

  lastAnalyzedAt: null,

  isAnalyzing: false,

  analysisError: null,

  hasHydrated: false,

  userCategoryGrid: [],

  simulations: [],

  selectedSimulations: [],

  quota: null,

  draftTransaction: {
    amount: "",
    category: null,
  },

  /* =================================================== */
  /* HYDRATION */
  /* =================================================== */

  setHasHydrated: (
    state
  ) =>
    set({
      hasHydrated:
        Boolean(state),
    }),

  setUserCategoryGrid: (
    categories
  ) =>
    set((state) => ({

      userCategoryGrid:
        categories.map(
          (incoming) => {

            const existing =
              state.userCategoryGrid.find(
                (c) =>
                  normalizeName(c.name) ===
                  normalizeName(incoming.name)
              );

            return mergeCategoryDefaults(
              existing || incoming,
              incoming
            );
          }
        ),
    })),

  /* =================================================== */
  /* PROFILE */
  /* =================================================== */

  setProfile: (
    profile
  ) =>
    set((state) => ({
      profile: {
        ...state.profile,
        ...profile,
      },
    })),

  /* =================================================== */
  /* CATEGORY */
  /* =================================================== */

  addUserCategory: (
    category
  ) =>
    set((state) => {

      const incomingName =
        normalizeName(
          category.name
        );

      const existingIndex =
        state.userCategoryGrid.findIndex(
          (c) =>
            normalizeName(
              c.name
            ) === incomingName
        );

      if (
        existingIndex >= 0
      ) {

        const updated = [
          ...state.userCategoryGrid,
        ];

        updated[
          existingIndex
        ] =
          mergeCategoryDefaults(
            updated[
              existingIndex
            ],
            category
          );

        return {
          userCategoryGrid:
            updated,
        };
      }

      return {
        userCategoryGrid: [

          ...state.userCategoryGrid,

          {
            id:
              category.id,

            name:
              category.name,

            icon:
              category.icon,

            budget:
              safeNumber(
                category.budget
              ),

            spent:
              safeNumber(
                category.spent
              ),

            isDefault:
              category.is_default,
          },
        ],
      };
    }),

  removeUserCategory: (
    name
  ) =>
    set((state) => ({
      userCategoryGrid:
        state.userCategoryGrid.filter(
          (category) =>
            normalizeName(
              category.name
            ) !==
            normalizeName(name)
        ),
    })),

  clearUserCategories:
    () =>
      set({
        userCategoryGrid: [],
      }),

  setCategoryBudget: (
    name,
    budget
  ) =>
    set((state) => {

      let found =
        false;

      const updated =
        state.userCategoryGrid.map(
          (category) => {

            if (
              normalizeName(
                category.name
              ) ===
              normalizeName(name)
            ) {

              found = true;

              return {

                ...category,

                budget:
                  safeNumber(
                    budget
                  ),
              };
            }

            return category;
          }
        );

      if (!found) {

        updated.push({

          name,

          budget:
            safeNumber(
              budget
            ),

          spent: 0,

          icon:
            DEFAULT_CATEGORIES.find(
              (c) =>
                normalizeName(
                  c.name
                ) ===
                normalizeName(name)
            )?.icon,
        });
      }

      return {
        userCategoryGrid:
          updated,
      };
    }),

  /* =================================================== */
  /* DRAFT */
  /* =================================================== */

  setDraftTransaction: (
    draft
  ) =>
    set({
      draftTransaction: {

        amount:
          draft.amount ?? "",

        category:
          draft.category ?? null,
      },
    }),

  clearDraftTransaction:
    () =>
      set({
        draftTransaction: {
          amount: "",
          category: null,
        },
      }),

  /* =================================================== */
  /* TRANSACTIONS */
  /* =================================================== */

  setTransactions: (
    transactions
  ) =>
    set((state) => {

      const safeTransactions =
        Array.isArray(
          transactions
        )
          ? transactions
          : [];

      return {

        transactions:
          safeTransactions,

        userCategoryGrid:
          recalculateCategorySpent(
            state.userCategoryGrid,
            safeTransactions
          ),
      };
    }),

  addTransaction: (
    transaction
  ) =>
    set((state) => {

      const tx: Transaction = {
        ...transaction,
        id: transaction.id || String(Date.now()),

        amount:
          safeNumber(
            transaction.amount
          ),
      };

      const updatedTransactions =
        [
          tx,
          ...state.transactions,
        ];

      return {

        transactions:
          updatedTransactions,

        userCategoryGrid:
          recalculateCategorySpent(
            state.userCategoryGrid,
            updatedTransactions
          ),
      };
    }),

  removeTransaction: (
    id
  ) =>
    set((state) => {

      const updatedTransactions =
        state.transactions.filter(
          (tx) =>
            String(tx.id) !==
            String(id)
        );

      return {

        transactions:
          updatedTransactions,

        userCategoryGrid:
          recalculateCategorySpent(
            state.userCategoryGrid,
            updatedTransactions
          ),
      };
    }),

  clearTransactions:
    () =>
      set({

        transactions: [],

        userCategoryGrid:
          get()
            .userCategoryGrid
            .map((c) => ({
              ...c,
              spent: 0,
            })),
      }),

  /* =================================================== */
  /* ANALYTICS */
  /* =================================================== */

  setAnalytics: (
    analytics
  ) =>
    set({
      analytics,
    }),

  /* =================================================== */
  /* FINANCIALS */
  /* =================================================== */

  setIncome: (
    income
  ) =>
    set({

      income:
        safeNumber(
          income
        ),

      analysis: null,

      lastAnalyzedAt: null,
    }),

  setFixedExpenses: (
    value
  ) =>
    set({
      fixedExpenses:
        safeNumber(value),
    }),

  setVariableExpenses: (
    value
  ) =>
    set({
      variableExpenses:
        safeNumber(value),
    }),

  /* =================================================== */
  /* ANALYSIS */
  /* =================================================== */

  setAnalysis: (
    analysis
  ) =>
    set({

      analysis,

      lastAnalyzedAt:
        analysis
          ? Date.now()
          : null,
    }),

  clearAnalysis:
    () =>
      set({

        analysis: null,

        lastAnalyzedAt: null,

        analysisError: null,
      }),

  setAnalyzing: (
    loading
  ) =>
    set({
      isAnalyzing:
        Boolean(loading),
    }),

  setAnalysisError: (
    error
  ) =>
    set({
      analysisError:
        error || null,
    }),

  /* =================================================== */
  /* SIMULATIONS */
  /* =================================================== */

  addSimulation: (
    simulation
  ) =>
    set((state) => {

      const next =
        [
          simulation,
          ...state.simulations,
        ].slice(0, 30);

      return {
        simulations: next,
      };
    }),

  setSimulations: (
    simulations
  ) =>
    set({
      simulations: Array.isArray(simulations) ? simulations : [],
    }),

  setQuota: (
    quota
  ) =>
    set({
      quota: quota ?? null,
    }),

  deleteSimulation: (
    id
  ) =>
    set((state) => ({

      simulations:
        state.simulations.filter(
          (sim) =>
            sim.id !== id
        ),

      selectedSimulations:
        state.selectedSimulations.filter(
          (selectedId) =>
            selectedId !== id
        ),
    })),

  clearSimulations:
    () =>
      set({

        simulations: [],

        selectedSimulations: [],
      }),

  /* =================================================== */
  /* COMPARISON */
  /* =================================================== */

  toggleSimulationSelection:
    (id) =>
      set((state) => {

        let next = [
          ...state.selectedSimulations,
        ];

        if (
          next.includes(id)
        ) {

          next = next.filter(
            (selectedId) =>
              selectedId !== id
          );

        } else {

          if (
            next.length >= 2
          ) {
            next.shift();
          }

          next.push(id);
        }

        return {
          selectedSimulations:
            next,
        };
      }),

  clearSelectedSimulations:
    () =>
      set({
        selectedSimulations: [],
      }),

  getSelectedSimulations:
    () => {

      const state =
        get();

      return state.simulations.filter(
        (simulation) =>
          state.selectedSimulations.includes(
            simulation.id
          )
      );
    },

  canCompare:
    () =>
      get()
        .selectedSimulations
        .length === 2,

  resetStore: () =>
    set({
      transactions: [],
      analytics: null,
      income: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      profile: null,
      analysis: null,
      lastAnalyzedAt: null,
      isAnalyzing: false,
      analysisError: null,
      userCategoryGrid: [],
      simulations: [],
      selectedSimulations: [],
      quota: null,
      draftTransaction: { amount: "", category: null },
    }),
});

/* ===================================================== */
/* 💎 STORE EXPORT */
/* ===================================================== */

export const useFinanceStore =
  create<FinanceState>()(
    persist(
      financeStoreCreator,
      {

        name:
          "finance-storage",

        storage:
          createJSONStorage(
            () =>
              AsyncStorage
          ),

        partialize: (
          state
        ) => ({

          transactions:
            state.transactions,

          income:
            state.income,

          profile:
            state.profile,

          simulations:
            state.simulations,

          userCategoryGrid:
            state.userCategoryGrid,

          analysis:
            state.analysis,

          lastAnalyzedAt:
            state.lastAnalyzedAt,
        }),

        onRehydrateStorage:
          () =>
          (state) => {

            state?.setHasHydrated(
              true
            );
          },
      }
    )
  );