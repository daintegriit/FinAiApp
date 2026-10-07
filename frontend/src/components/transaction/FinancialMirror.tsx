// =====================================================
// 💎 FINAI — FINANCIAL MIRROR
// =====================================================
// Shows the causal ripple of a transaction across
// all financial engines. Never seen before in fintech.
// =====================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useFinanceStore } from "../../store/financeStore";
import { analyzeFinancial } from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 80;

// =====================================================
// TYPES
// =====================================================

interface MirrorProps {
  visible: boolean;
  onClose: () => void;
  originalAmount: number;
  category: string;
  merchant?: string;
  isRecurring?: boolean;
  recurringTermMonths?: number | null;
}

interface EngineSnapshot {
  score: number;
  riskLevel: string;
  driftScore: number;
  driftBand: string;
  incomeShare: number;
  cashflowShare: number;
  futureValueIfInvested: number;
  annualReturnUsed: number;
  medianWealth: number;
  savingsRate: number;
}

// =====================================================
// HELPERS
// =====================================================

function extractSnapshot(analysis: any): EngineSnapshot {
  const engines = analysis?.engines || {};
  const commitment = engines?.behavioral_drift?.supporting_engines?.commitment_lock || engines?.commitment || {};
  const portfolio = engines?.portfolio || {};
  const drift = engines?.behavioral_drift || {};
  const health = analysis?.financial_health || {};

  return {
    score: parseFloat(analysis?.global_financial_score || 0),
    riskLevel: analysis?.risk_level || "moderate",
    driftScore: drift?.drift_score || 0,
    driftBand: drift?.drift_band?.label || "stable",
    incomeShare: parseFloat(commitment?.income_share || 0),
    cashflowShare: parseFloat(commitment?.free_cashflow_share || 0),
    futureValueIfInvested: parseFloat(commitment?.future_value_if_invested || 0),
    annualReturnUsed: parseFloat(commitment?.annual_return_used ?? 0.07),
    medianWealth: parseFloat(portfolio?.median_wealth || 0),
    savingsRate: parseFloat(health?.savings_rate || 0),
  };
}

// Genuine lump-sum future value — used for one-time purchases, where
// the money is invested once today rather than contributed monthly.
// This is mathematically distinct from the engine's annuity-based
// future_value_if_invested, which assumes repeated monthly payments
// and is only correct for genuinely recurring commitments.
function computeLumpSumFutureValue(
  amount: number,
  annualReturn: number,
  years: number
): number {
  if (!amount || amount <= 0) return 0;
  return amount * Math.pow(1 + (annualReturn || 0.07), years);
}

function getDelta(before: number, after: number): number {
  return after - before;
}

function formatDelta(delta: number, prefix = ""): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${prefix}${Math.abs(delta).toFixed(1)}`;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getRiskColor(level: string, colors: any): string {
  switch (level?.toLowerCase()) {
    case "low": return colors.success;
    case "moderate": return colors.warning;
    case "high": return colors.danger;
    case "critical": return colors.criticalDanger || colors.danger;
    default: return colors.text;
  }
}

function getDriftColor(band: string, colors: any): string {
  switch (band?.toLowerCase()) {
    case "improving": return colors.success;
    case "stable": return colors.chart2;
    case "early_drift": return colors.warning;
    case "concerning_drift": return colors.danger;
    default: return colors.text;
  }
}

async function fetchNarrative(
  snapshot: EngineSnapshot,
  amount: number,
  category: string,
  merchant: string | undefined,
  originalAmount: number,
  budgetInfo?: { budget: number; spent: number; remaining: number }
): Promise<{ narrative: string; source: string; outOfQuota?: boolean } | null> {
  try {
    const { api } = await import("../../services/api");

    const res = await api.post("/ai/narrate", {
      score: snapshot.score,
      risk_level: snapshot.riskLevel,
      drift_band: snapshot.driftBand,
      drift_score: snapshot.driftScore,
      income_share: snapshot.incomeShare,
      cashflow_share: snapshot.cashflowShare,
      future_value_if_invested: snapshot.futureValueIfInvested,
      median_wealth: snapshot.medianWealth,
      savings_rate: snapshot.savingsRate,
      amount: originalAmount,
      category,
      merchant,
      slider_amount: amount !== originalAmount ? amount : undefined,
      category_budget: budgetInfo?.budget || undefined,
      category_spent: budgetInfo?.spent ?? undefined,
      category_remaining: budgetInfo?.remaining ?? undefined,
    });

    return { ...res.data, outOfQuota: false };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 402) {
      // Quota exhausted — not an error, a premium boundary.
      return { narrative: "", source: "quota", outOfQuota: true };
    }
    console.error("❌ Narrative fetch failed:", err);
    return null;
  }
}

// =====================================================
// COMPONENT
// =====================================================

export default function FinancialMirror({
  visible,
  onClose,
  originalAmount,
  category,
  merchant,
  isRecurring = false,
  recurringTermMonths = null,
}: MirrorProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const c = theme.colors;
  const f = theme.fonts;

  const profile = useFinanceStore((s) => s.profile);
  const income = useFinanceStore((s) => s.income);
  const transactions = useFinanceStore((s) => s.transactions);
  const userCategoryGrid = useFinanceStore((s) => s.userCategoryGrid);

  // Budget context for this transaction's category.
  // We expose the total spent AND the spend excluding this transaction's
  // original amount, so the card can react to the what-if slider.
  const categoryBudgetBase = useMemo(() => {
    const norm = (v?: string) => String(v || "").trim().toLowerCase();
    const match = (userCategoryGrid || []).find(
      (cAny: any) => norm(cAny?.name) === norm(category)
    ) as any;
    const budget = Number(match?.budget || 0);
    const spentThisCategory = (transactions || []).reduce(
      (sum: number, tx: any) =>
        norm(tx?.category) === norm(category)
          ? sum + Number(tx?.amount || 0)
          : sum,
      0
    );
    // Spending in this category from OTHER transactions (exclude this one's
    // original amount so the slider can substitute a hypothetical value).
    const spentExcludingThis = Math.max(0, spentThisCategory - (originalAmount || 0));
    return { budget, spentThisCategory, spentExcludingThis, hasBudget: budget > 0 };
  }, [userCategoryGrid, transactions, category, originalAmount]);

  const [sliderAmount, setSliderAmount] = useState(originalAmount);

  // Slider-aware budget context: other spending + the current what-if amount.
  const categoryBudgetInfo = useMemo(() => {
    const budget = categoryBudgetBase.budget;
    const spent = categoryBudgetBase.spentExcludingThis + (sliderAmount || 0);
    const remaining = budget - spent;
    const usagePct = budget > 0 ? (spent / budget) * 100 : 0;
    return {
      budget,
      spentThisCategory: spent,
      remaining,
      usagePct,
      hasBudget: categoryBudgetBase.hasBudget,
    };
  }, [categoryBudgetBase, sliderAmount]);

  const [beforeSnapshot, setBeforeSnapshot] = useState<EngineSnapshot | null>(null);
  const [afterSnapshot, setAfterSnapshot] = useState<EngineSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sliderLoading, setSliderLoading] = useState(false);

  const sliderX = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [outOfQuota, setOutOfQuota] = useState(false);

  const onUpgradePress = () => {
    router.push("/paywall");
  };


  // The opportunity-cost figure shown in the ripple card and narrative.
  // Recurring: the engine's real annuity-based future value over the
  // actual term. One-time: a lump-sum projection over the 30-year
  // decision horizon, since the engine's annuity math doesn't apply
  // to a single non-recurring transaction.
  const getOpportunityCost = useCallback(
    (snapshot: EngineSnapshot, amountForCalc: number): number => {
      if (isRecurring) {
        return snapshot.futureValueIfInvested;
      }
      return computeLumpSumFutureValue(amountForCalc, snapshot.annualReturnUsed, 30);
    },
    [isRecurring]
  );

  const opportunityCostLabel = isRecurring
    ? `${recurringTermMonths || 12}-Month Opportunity Cost`
    : "30-Year Opportunity Cost";

  const safeOriginalAmount = originalAmount || 0;
  const maxAmount = Math.max(safeOriginalAmount * 5, 1000);

  // Snap the what-if slider back to the user's actual entered amount.
  const resetSlider = () => {
    const pct = (originalAmount || 0) / maxAmount;
    Animated.timing(sliderX, {
      toValue: Math.max(0, Math.min(pct * SLIDER_WIDTH, SLIDER_WIDTH)),
      duration: 180,
      useNativeDriver: false,
    }).start();
    setSliderAmount(originalAmount);
  };

  // =====================================================
  // SLIDER
  // =====================================================

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const rawX = Math.max(0, Math.min(gestureState.moveX - 40, SLIDER_WIDTH));
        sliderX.setValue(rawX);
        const pct = rawX / SLIDER_WIDTH;
        const amount = Math.round(pct * maxAmount);
        setSliderAmount(Math.max(1, amount));
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Set initial slider position
  useEffect(() => {
    if (visible) {
      const pct = originalAmount / maxAmount;
      sliderX.setValue(pct * SLIDER_WIDTH);
      setSliderAmount(originalAmount);
    }
  }, [visible, originalAmount]);

  // =====================================================
  // FETCH ANALYSIS
  // =====================================================
    const buildPayload = useCallback((amount: number): any => {


    const safeIncome = Math.max(1, income || parseFloat(profile?.savings_buffer as any) || 5000);
    const totalSpending = transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0);
    const monthlyExpenses = Math.max(1, totalSpending > 0 ? totalSpending : safeIncome * 0.5);

    // Recurring commitments use their real term so the engine's
    // annuity math (income share, cashflow share, future value) is
    // computed over the actual commitment duration. One-time
    // purchases use term_months: 1 so income/cashflow share reflect
    // just that single month's impact — never a fictional year of
    // recurring payments for a transaction that only happened once.
    const effectiveTermMonths = isRecurring ? (recurringTermMonths || 12) : 1;

    return {
      schema_version: "2.0",
      request_origin: "mobile",
      monthly_income: safeIncome,
      monthly_expenses: monthlyExpenses,
      monthly_payment: amount,
      term_months: effectiveTermMonths,
      age: profile?.age || 28,
      employment_type: profile?.employment_type || "full_time",
      risk_tolerance: profile?.risk_tolerance || "moderate",
      investment_experience: profile?.investment_experience || "beginner",
      lifestyle_priority: profile?.lifestyle_priority || "balanced",
      income_stability: profile?.income_stability || "stable",
      purchase_category: "other",
      currency: "USD",
      region: "US",
      savings_buffer: parseFloat(profile?.savings_buffer as any) || 1000,
      existing_debt: parseFloat(profile?.debt_amount as any) || 0,
      emergency_fund_months: profile?.emergency_fund_months || 3,
      family_value: 5,
      personal_satisfaction: 5,
      decision_horizon_years: 30,
    };
  }, [income, profile, transactions, category, isRecurring, recurringTermMonths]);

  useEffect(() => {
    if (!visible) return;

    async function loadInitial() {
      setLoading(true);
      try {
        // Before: without this transaction (use $1 minimum since backend requires > 0)
        const beforePayload = buildPayload(1);
        const afterPayload = buildPayload(originalAmount);

        const [beforeResult, afterResult] = await Promise.all([
          analyzeFinancial(beforePayload),
          analyzeFinancial(afterPayload),
        ]);

        const afterSnap = extractSnapshot(afterResult);

        setBeforeSnapshot(extractSnapshot(beforeResult));
        setAfterSnapshot(afterSnap);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();

        // Fetch initial narrative
        setNarrativeLoading(true);
        const narrateResult = await fetchNarrative(
          { ...afterSnap, futureValueIfInvested: getOpportunityCost(afterSnap, originalAmount) },
          originalAmount,
          category,
          merchant,
          originalAmount,
          categoryBudgetInfo.hasBudget
            ? { budget: categoryBudgetInfo.budget, spent: categoryBudgetInfo.spentThisCategory, remaining: categoryBudgetInfo.remaining }
            : undefined
        );
        if (narrateResult) {
          setOutOfQuota(!!narrateResult.outOfQuota);
          setNarrative(narrateResult.outOfQuota ? null : narrateResult.narrative);
        }
        setNarrativeLoading(false);

      } catch (err) {
        console.error("❌ Financial Mirror analysis failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [visible]);
  // Debounced slider analysis
  useEffect(() => {
    if (!visible || !beforeSnapshot) return;
    if (sliderAmount === originalAmount) {
      setAfterSnapshot(afterSnapshot);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSliderLoading(true);
      try {
        const payload = buildPayload(sliderAmount);
        const result = await analyzeFinancial(payload);
        const snap = extractSnapshot(result);
        setAfterSnapshot(snap);

        // Refresh narrative for the new slider amount
        if (narrateDebounceRef.current) clearTimeout(narrateDebounceRef.current);
        narrateDebounceRef.current = setTimeout(async () => {
          setNarrativeLoading(true);
          const narrateResult = await fetchNarrative(
            { ...snap, futureValueIfInvested: getOpportunityCost(snap, sliderAmount) },
            sliderAmount,
            category,
            merchant,
            originalAmount,
            categoryBudgetInfo.hasBudget
              ? { budget: categoryBudgetInfo.budget, spent: categoryBudgetInfo.spentThisCategory, remaining: categoryBudgetInfo.remaining }
              : undefined
          );
          if (narrateResult) {
            setOutOfQuota(!!narrateResult.outOfQuota);
            setNarrative(narrateResult.outOfQuota ? null : narrateResult.narrative);
          }
          setNarrativeLoading(false);
        }, 300);

      } catch (err) {
        console.error("❌ Slider analysis failed:", err);
      } finally {
        setSliderLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (narrateDebounceRef.current) clearTimeout(narrateDebounceRef.current);
    };
  }, [sliderAmount]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: c.background }}>

        {/* HEADER */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: c.border,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: f.semibold, color: c.text, letterSpacing: -0.5 }}>
              Financial Mirror
            </Text>
            <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.textSecondary, marginTop: 2 }}>
              {merchant ? `${merchant} · ` : ""}{category || "Transaction"} · ${(originalAmount || 0).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border }}
          >
            <Feather name="x" size={16} color={c.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={{ fontSize: 14, fontFamily: f.primary, color: c.textSecondary }}>
              Calculating financial impact…
            </Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={{ flex: 1, opacity: fadeAnim }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          >

            {/* =========================================== */}
            {/* INTERACTIVE SLIDER                          */}
            {/* =========================================== */}

            <View style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 20, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  What if the amount was…
                </Text>
                {Math.round(sliderAmount) !== Math.round(originalAmount) && (
                  <TouchableOpacity onPress={resetSlider} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="rotate-ccw" size={12} color={c.accent} />
                    <Text style={{ fontSize: 12, fontFamily: f.semibold, color: c.accent }}>
                      Reset to ${(originalAmount || 0).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <Text style={{ fontSize: 36, fontFamily: f.semibold, color: c.text, letterSpacing: -1 }}>
                  ${sliderAmount.toLocaleString()}
                </Text>
                {sliderLoading && (
                  <ActivityIndicator size="small" color={c.accent} />
                )}
              </View>

              {/* Slider track */}
              <View style={{ height: 40, justifyContent: "center" }} {...panResponder.panHandlers}>
                <View style={{ height: 4, backgroundColor: c.border, borderRadius: 2 }}>
                  <Animated.View style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    backgroundColor: c.primary, borderRadius: 2,
                    width: sliderX,
                  }} />
                </View>
                <Animated.View style={{
                  position: "absolute",
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: c.primary,
                  borderWidth: 3, borderColor: c.background,
                  shadowColor: c.primary, shadowOpacity: 0.4,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                  transform: [{ translateX: Animated.subtract(sliderX, 12) }],
                }} />
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted }}>$0</Text>
                <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted }}>
                  {formatCurrency(maxAmount)}
                </Text>
              </View>
            </View>

            {/* =========================================== */}
            {/* BUDGET CONTEXT                              */}
            {/* =========================================== */}
            {categoryBudgetInfo.hasBudget && (
              <View style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 20, marginBottom: 20 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {category} Budget
                  </Text>
                  <Text style={{
                    fontSize: 12, fontFamily: f.semibold,
                    color: categoryBudgetInfo.usagePct > 100 ? c.danger
                         : categoryBudgetInfo.usagePct > 80 ? c.warning
                         : c.success,
                  }}>
                    {Math.round(categoryBudgetInfo.usagePct)}% used
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
                  <Text style={{ fontSize: 28, fontFamily: f.semibold, color: c.text, letterSpacing: -0.5 }}>
                    ${categoryBudgetInfo.spentThisCategory.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 15, fontFamily: f.primary, color: c.textSecondary, marginLeft: 6 }}>
                    of ${categoryBudgetInfo.budget.toLocaleString()} / month
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={{ height: 8, backgroundColor: c.border, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <View style={{
                    height: "100%",
                    width: `${Math.min(categoryBudgetInfo.usagePct, 100)}%`,
                    backgroundColor: categoryBudgetInfo.usagePct > 100 ? c.danger
                                   : categoryBudgetInfo.usagePct > 80 ? c.warning
                                   : c.success,
                    borderRadius: 4,
                  }} />
                </View>

                <Text style={{ fontSize: 13, fontFamily: f.primary, color: categoryBudgetInfo.remaining < 0 ? c.danger : c.textSecondary }}>
                  {categoryBudgetInfo.remaining >= 0
                    ? `$${categoryBudgetInfo.remaining.toLocaleString()} left in ${category} this month`
                    : `$${Math.abs(categoryBudgetInfo.remaining).toLocaleString()} over your ${category} budget`}
                </Text>
              </View>
            )}

            {/* =========================================== */}
            {/* CAUSAL RIPPLE CARDS                        */}
            {/* =========================================== */}

            {beforeSnapshot && afterSnapshot && (
              <>
                <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Impact Across Your Finances
                </Text>

                {/* Financial Score */}
                <RippleCard
                  icon="activity"
                  label="Financial Score"
                  before={beforeSnapshot.score.toFixed(1)}
                  after={afterSnapshot.score.toFixed(1)}
                  delta={getDelta(beforeSnapshot.score, afterSnapshot.score)}
                  deltaStr={formatDelta(getDelta(beforeSnapshot.score, afterSnapshot.score))}
                  positiveIsGood={false}
                  color={getRiskColor(afterSnapshot.riskLevel, c)}
                  theme={theme}
                />

                {/* Behavioral Drift */}
                <RippleCard
                  icon="trending-up"
                  label="Behavioral Drift"
                  before={beforeSnapshot.driftBand.replace(/_/g, " ")}
                  after={afterSnapshot.driftBand.replace(/_/g, " ")}
                  delta={getDelta(beforeSnapshot.driftScore, afterSnapshot.driftScore)}
                  deltaStr={formatDelta(getDelta(beforeSnapshot.driftScore, afterSnapshot.driftScore))}
                  positiveIsGood={false}
                  color={getDriftColor(afterSnapshot.driftBand, c)}
                  theme={theme}
                  isText
                />

                {/* Income Commitment */}
                <RippleCard
                  icon="percent"
                  label="Income Committed"
                  before={`${(beforeSnapshot.incomeShare * 100).toFixed(1)}%`}
                  after={`${(afterSnapshot.incomeShare * 100).toFixed(1)}%`}
                  delta={getDelta(beforeSnapshot.incomeShare, afterSnapshot.incomeShare) * 100}
                  deltaStr={formatDelta(getDelta(beforeSnapshot.incomeShare, afterSnapshot.incomeShare) * 100) + "%"}
                  positiveIsGood={false}
                  color={afterSnapshot.incomeShare > 0.3 ? c.danger : c.success}
                  theme={theme}
                />

                {/* Savings Rate */}
                <RippleCard
                  icon="shield"
                  label="Savings Rate"
                  before={`${(beforeSnapshot.savingsRate * 100).toFixed(1)}%`}
                  after={`${(afterSnapshot.savingsRate * 100).toFixed(1)}%`}
                  delta={getDelta(beforeSnapshot.savingsRate, afterSnapshot.savingsRate) * 100}
                  deltaStr={formatDelta(getDelta(beforeSnapshot.savingsRate, afterSnapshot.savingsRate) * 100) + "%"}
                  positiveIsGood={true}
                  color={afterSnapshot.savingsRate > 0.2 ? c.success : c.warning}
                  theme={theme}
                />

                {/* Opportunity Cost — annuity (recurring) or lump-sum (one-time) */}
                <RippleCard
                  icon="clock"
                  label={opportunityCostLabel}
                  before={formatCurrency(getOpportunityCost(beforeSnapshot, 1))}
                  after={formatCurrency(getOpportunityCost(afterSnapshot, sliderAmount))}
                  delta={getDelta(getOpportunityCost(beforeSnapshot, 1), getOpportunityCost(afterSnapshot, sliderAmount))}
                  deltaStr={formatCurrency(Math.abs(getDelta(getOpportunityCost(beforeSnapshot, 1), getOpportunityCost(afterSnapshot, sliderAmount))))}
                  positiveIsGood={false}
                  color={c.chart2}
                  theme={theme}
                  highlight
                />

                {/* Portfolio Wealth */}
                <RippleCard
                  icon="bar-chart-2"
                  label="Projected Median Wealth"
                  before={formatCurrency(beforeSnapshot.medianWealth)}
                  after={formatCurrency(afterSnapshot.medianWealth)}
                  delta={getDelta(beforeSnapshot.medianWealth, afterSnapshot.medianWealth)}
                  deltaStr={formatCurrency(Math.abs(getDelta(beforeSnapshot.medianWealth, afterSnapshot.medianWealth)))}
                  positiveIsGood={false}
                  color={c.chart3}
                  theme={theme}
                />
              </>
            )}

            {/* =========================================== */}
            {/* AI NARRATIVE INSIGHT                       */}
            {/* =========================================== */}

            {afterSnapshot && (
              <View style={{ backgroundColor: `${c.accent}10`, borderRadius: 16, borderWidth: 1, borderColor: `${c.accent}30`, padding: 16, marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: c.accent }}>✦</Text>
                  <Text style={{ fontSize: 13, fontFamily: f.semibold, color: c.accent }}>
                    Financial Mirror Insight
                  </Text>
                  {narrativeLoading && (
                    <ActivityIndicator size="small" color={c.accent} style={{ marginLeft: 4 }} />
                  )}
                </View>

                {narrative ? (
                  <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.text, lineHeight: 20 }}>
                    {narrative}
                  </Text>
                ) : outOfQuota ? (
                  <View>
                    <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.text, lineHeight: 20, marginBottom: 10 }}>
                      You've used all your free AI insights this month. The numbers above are always free — upgrade to Premium for unlimited AI-written analysis on every decision.
                    </Text>
                    <TouchableOpacity
                      onPress={onUpgradePress}
                      activeOpacity={0.85}
                      style={{ backgroundColor: c.accent, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: f.semibold, color: c.background }}>
                        ✦ Unlock unlimited AI insights
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : narrativeLoading ? (
                  <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.textMuted, lineHeight: 20, fontStyle: "italic" }}>
                    Generating personalized insight…
                  </Text>
                ) : null}
              </View>
            )}

          </Animated.ScrollView>
        )}
      </View>
    </Modal>
  );
}

// =====================================================
// RIPPLE CARD
// =====================================================

function RippleCard({
  icon, label, before, after, delta,
  deltaStr, positiveIsGood, color, theme, isText, highlight,
}: {
  icon: any;
  label: string;
  before: string;
  after: string;
  delta: number;
  deltaStr: string;
  positiveIsGood: boolean;
  color: string;
  theme: any;
  isText?: boolean;
  highlight?: boolean;
}) {
  const c = theme.colors;
  const f = theme.fonts;

  const isPositive = delta > 0;
  const isNeutral = delta === 0 || isText;

  const deltaColor = isNeutral
    ? c.textMuted
    : (isPositive === positiveIsGood)
      ? c.success
      : c.danger;

  const arrowIcon = isNeutral
    ? "minus"
    : isPositive
      ? "arrow-up"
      : "arrow-down";

  return (
    <View style={{
      backgroundColor: highlight ? `${color}08` : c.card,
      borderRadius: 16, borderWidth: 1,
      borderColor: highlight ? `${color}30` : c.border,
      padding: 16, marginBottom: 10,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Feather name={icon} size={14} color={c.textSecondary} />
        <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {/* Before */}
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted, marginBottom: 4 }}>Before</Text>
          <Text style={{ fontSize: 16, fontFamily: f.semibold, color: c.textSecondary }}>{before}</Text>
        </View>

        {/* Arrow */}
        <View style={{ alignItems: "center", paddingHorizontal: 12 }}>
          <Feather name="arrow-right" size={16} color={c.border} />
        </View>

        {/* After */}
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted, marginBottom: 4 }}>After</Text>
          <Text style={{ fontSize: 16, fontFamily: f.semibold, color }}>{after}</Text>
        </View>

        {/* Delta */}
        <View style={{ alignItems: "flex-end", flex: 1 }}>
          <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted, marginBottom: 4 }}>Change</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name={arrowIcon} size={12} color={deltaColor} />
            <Text style={{ fontSize: 13, fontFamily: f.semibold, color: deltaColor }}>{deltaStr}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}