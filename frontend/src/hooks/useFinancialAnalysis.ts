// =====================================================
// 💎 FINAI — useFinancialAnalysis
// =====================================================

import { useCallback, useMemo } from "react";
import { analyzeFinancial } from "../../src/services/api";
import { useFinanceStore } from "../../src/store/financeStore";
import type {
  FinancialAnalysisResponse,
  PurchaseCategory,
} from "../../src/types/financial";

/* =====================================================
   CACHE TTL — 5 minutes
===================================================== */

const ANALYSIS_CACHE_TTL = 1000 * 60 * 5;

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapCategory(category: string): PurchaseCategory {
  const c = String(category || "").trim().toLowerCase();
  if (c.includes("home") || c.includes("housing")) return "housing";
  if (c.includes("car") || c.includes("vehicle") || c.includes("auto")) return "vehicle";
  if (c.includes("school") || c.includes("college") || c.includes("education")) return "education";
  if (c.includes("business")) return "business";
  if (c.includes("travel") || c.includes("vacation") || c.includes("experience")) return "experience";
  return "other";
}

function normalizeAnalysis(result: any): FinancialAnalysisResponse {
  return {
    ...result,
    global_financial_score: safeNumber(result?.global_financial_score),
    risk_level: result?.risk_level || "moderate",
    engines: result?.engines || {},
    engine_timings: result?.engine_timings || {},
    generated_at: result?.generated_at || new Date().toISOString(),
  };
}

/* =====================================================
   MAIN HOOK
===================================================== */

export function useFinancialAnalysis() {

  const income = useFinanceStore((s) => s.income);
  const rawTransactions = useFinanceStore((s) => s.transactions);
  const profile = useFinanceStore((s) => s.profile);
  const analysis = useFinanceStore((s) => s.analysis);
  const lastAnalyzedAt = useFinanceStore((s) => s.lastAnalyzedAt);
  const setAnalysis = useFinanceStore((s) => s.setAnalysis);
  const setAnalyzing = useFinanceStore((s) => s.setAnalyzing);
  const setError = useFinanceStore((s) => s.setAnalysisError);

  const transactions = useMemo(() => {
    return Array.isArray(rawTransactions) ? rawTransactions : [];
  }, [rawTransactions]);

  const totalSpending = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + safeNumber(tx?.amount), 0);
  }, [transactions]);

  const remainingCashflow = useMemo(() => {
    return safeNumber(income) - totalSpending;
  }, [income, totalSpending]);

  const cacheValid = useMemo(() => {
    if (!analysis || !lastAnalyzedAt) return false;
    return Date.now() - lastAnalyzedAt < ANALYSIS_CACHE_TTL;
  }, [analysis, lastAnalyzedAt]);

  const runAnalysis = useCallback(
    async (override?: {
      amount?: number;
      category?: string;
      termMonths?: number;
      forceRefresh?: boolean;
      income?: number;
    }): Promise<FinancialAnalysisResponse> => {
      // Prefer an explicit override, then the live store value (synchronous
      // in Zustand), then the closed-over selector value. This avoids a
      // stale-closure bug where runAnalysis() called right after setIncome()
      // still sees the old income.
      const effectiveIncome =
        override?.income != null
          ? override.income
          : (useFinanceStore.getState().income || income);
      if (!effectiveIncome || effectiveIncome <= 0) {
        throw new Error("Income is required before analysis");
      }

      if (!profile) {
        throw new Error("Financial profile missing");
      }

      if (cacheValid && !override?.forceRefresh && analysis) {
        console.log("⚡ Using cached financial analysis");
        return analysis;
      }

      setAnalyzing(true);
      setError(null);

      try {
        const safeIncome = Math.max(1, safeNumber(effectiveIncome, 1));
        const safeAmount = Math.max(1, safeNumber(override?.amount, 50));
        const safeTerm = Math.max(1, safeNumber(override?.termMonths, 36));
        const safeCategory = mapCategory(override?.category || "other");

        // monthly_expenses must be > 0 per backend validation.
        // If user has no logged spending yet, fall back to a small
        // nominal expense estimate so the analysis can still run.
        const rawExpenses = safeNumber(totalSpending, 0);
        const safeMonthlyExpenses = rawExpenses > 0
          ? rawExpenses
          : Math.max(1, safeIncome * 0.5);

        // =============================================
        // FULL FINANCIAL ANALYSIS PAYLOAD
        // Uses new FinancialAnalysisRequest schema
        // =============================================

          const payload: import("../../src/types/financial").FinancialAnalysisRequest = {
            schema_version: "2.0",
            request_origin: "mobile" as const,

          // Core financials
          monthly_income: safeIncome,
          monthly_expenses: safeMonthlyExpenses,
          monthly_payment: safeAmount,
          term_months: safeTerm,



          // Demographics
          age: safeNumber(profile.age, 25),

          employment_type: (profile.employment_type || "salary") as any,
          risk_tolerance: (profile.risk_tolerance || "moderate") as any,
          investment_experience: (profile.investment_experience || "beginner") as any,
          lifestyle_priority: (profile.lifestyle_priority || "balanced") as any,
          income_stability: (profile.income_stability || "stable") as any,
          purchase_category: safeCategory as any,
          currency: "USD" as const,
          region: "US" as const,

          // Financial snapshot
          savings_buffer: safeNumber(profile.savings_buffer),
          existing_debt: safeNumber(profile.existing_debt),
          emergency_fund_months: safeNumber(profile.emergency_fund_months),
          


          financial_goal: profile.financial_goal || undefined,

          // Lifestyle utility
          family_value: safeNumber(profile.family_value),
          personal_satisfaction: safeNumber(profile.personal_satisfaction),

          // Goal modeling
          decision_horizon_years: 30,
        };

        console.log("🔥 FINANCIAL PAYLOAD:", payload);

        let result = await analyzeFinancial(payload);

        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch (parseError) {
            console.error("❌ JSON parse failure:", parseError);
            throw new Error("Backend returned malformed JSON");
          }
        }

        if (!result || typeof result !== "object") {
          throw new Error("Invalid backend response");
        }

        const normalized = normalizeAnalysis(result);

        console.log("✅ NORMALIZED ANALYSIS:", normalized);

        setAnalysis(normalized);

        return normalized;

      } catch (err: any) {
        console.error(
          "❌ FINANCIAL ANALYSIS FAILURE:",
          err?.response?.data || err?.message || err
        );

        const errorMessage =
          err?.response?.data?.detail?.message ||
          err?.message ||
          "Financial analysis failed";

        setError(errorMessage);
        throw err;

      } finally {
        setAnalyzing(false);
      }
    },
    [
      analysis,
      cacheValid,
      income,
      profile,
      remainingCashflow,
      setAnalysis,
      setAnalyzing,
      setError,
    ]
  );

  return useMemo(() => ({ runAnalysis }), [runAnalysis]);
}