// =====================================================
// FINAI — SIMULATION SCREEN
// src/screens/SimulateScreen.tsx
// =====================================================

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/theme/ThemeContext";
import { useFinancialAnalysis } from "../../src/hooks/useFinancialAnalysis";
import { useFinanceStore } from "../../src/store/financeStore";
import { useAuth } from "../../src/context/AuthContext";
import {
  fetchSimulations,
  createSimulation,
  fetchQuota,
} from "../../src/services/api";
import {
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
} from "../../src/services/billing";

import type {
  FinancialAnalysisResponse,
  PurchaseCategory,
  ScenarioResult,
} from "../../src/types/financial";

import DashboardHeader from "../../src/components/header/DashboardHeader";

const CATEGORY_OPTIONS: PurchaseCategory[] = [
  "housing",
  "vehicle",
  "education",
  "business",
  "experience",
  "other",
];

/* =====================================================
   SCREEN
===================================================== */

export default function SimulateScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { runAnalysis } = useFinancialAnalysis();
  const { user } = useAuth();

  const profile = useFinanceStore((s) => s.profile);
  const simulations = useFinanceStore((s) => s.simulations);
  const addSimulation = useFinanceStore((s) => s.addSimulation);
  const setSimulations = useFinanceStore((s) => s.setSimulations);
  const quota = useFinanceStore((s) => s.quota);
  const setQuota = useFinanceStore((s) => s.setQuota);

  const latestSimulation = simulations?.[0];

  const [loadingSims, setLoadingSims] = useState(false);

  /* ===================================================
     LOAD SAVED SIMULATIONS + QUOTA
  =================================================== */
  // Both come from the server keyed on the auth token — no user_id
  // is sent. Quota is fetched fresh every mount so the button state
  // reflects the real remaining count, never a stale cached one.

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function load() {
      setLoadingSims(true);
      try {
        const [remote, quotaState] = await Promise.all([
          fetchSimulations(),
          fetchQuota(),
        ]);

        if (cancelled) return;

        const mapped = remote.map((s: any) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          term: s.term,
          category: s.category,
          result: s.result,
          narrative: s.narrative,
          created_at: s.created_at,
        }));

        // Always set — an empty array must clear the list, not be
        // ignored, or a user who deleted everything still sees stale
        // rows.
        setSimulations(mapped);
        setQuota(quotaState);
      } catch (err) {
        if (__DEV__) console.error("Failed to load simulations/quota:", err);
      } finally {
        if (!cancelled) setLoadingSims(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, setSimulations, setQuota]);

  /* ===================================================
     FORM
  =================================================== */

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("36");
  const [termUnit, setTermUnit] = useState<"days" | "weeks" | "months" | "years">("months");
  const [category, setCategory] = useState<PurchaseCategory>("other");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) ? value : 0;
  }, [amount]);

  const parsedTerm = useMemo(() => {
    const n = Number(term);
    const months =
      termUnit === "days" ? n / 30 :
      termUnit === "weeks" ? n / 4.33 :
      termUnit === "years" ? n * 12 :
      n;
    return Number.isFinite(months) ? months : 0;
  }, [term, termUnit]);

  const isValid = parsedAmount > 0 && parsedTerm > 0;

  /* ===================================================
     QUOTA DERIVED STATE
  =================================================== */

  const isUnlimited = quota?.unlimited === true;
  const remaining = quota?.remaining ?? null;
  const outOfQuota = !isUnlimited && remaining !== null && remaining <= 0;

  /* ===================================================
     UPGRADE / PURCHASE
  =================================================== */

  const [purchasing, setPurchasing] = useState(false);

  const handleUpgrade = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleRestore = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.unlimited) {
        setQuota({
          limit: quota?.limit ?? null,
          used: quota?.used ?? 0,
          remaining: null,
          unlimited: true,
        });
        Alert.alert("Restored", "Your subscription has been restored.");
      } else {
        Alert.alert(
          "Nothing to restore",
          "We couldn't find an active subscription for this account."
        );
      }
    } catch {
      Alert.alert("Restore failed", "Please try again in a moment.");
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, quota, setQuota]);

  /* ===================================================
     RUN
  =================================================== */

  const handleRun = useCallback(async () => {
    setError(null);

    if (!isValid) {
      setError("Please enter a valid amount and term.");
      return;
    }

    if (!profile) {
      setError("Please complete your financial profile first.");
      return;
    }

    if (!user?.id) {
      setError("You need to be signed in to run a simulation.");
      return;
    }

    // Block before doing any billable work. runAnalysis and the
    // server-side narrative are the expensive steps; there's no point
    // running them if the save will 402.
    if (outOfQuota) {
      setError(null);
      return; // banner already shows the limit state
    }

    try {
      setLoading(true);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await runAnalysis({
        amount: parsedAmount,
        category,
        termMonths: parsedTerm,
        forceRefresh: true,
        persist: false,
      });

      if (!result || typeof result !== "object") {
        throw new Error("Invalid backend response");
      }

      const simName = name?.trim() || "Untitled Simulation";

      // Persist server-side. The response carries the AI narrative and
      // the updated quota. There is deliberately NO local fallback: if
      // the save fails we surface the real reason rather than faking a
      // saved card, which would also mask a 402.
      const saved = await createSimulation({
        name: simName,
        amount: parsedAmount,
        term: parsedTerm,
        category,
        result,
      });

      addSimulation({
        id: saved.id,
        name: saved.name,
        amount: saved.amount,
        term: saved.term,
        category: saved.category,
        result: saved.result,
        narrative: saved.narrative,
        created_at: saved.created_at,
      });

      // Server returns authoritative remaining count with the save.
      if (saved.quota) {
        setQuota({
          limit: quota?.limit ?? null,
          used: (quota?.used ?? 0) + 1,
          remaining: saved.quota.remaining,
          unlimited: saved.quota.unlimited ?? false,
        });
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      setName("");
      setAmount("");
      setTerm("36");
    setTermUnit("months");
      setCategory("other");
    } catch (err: any) {
      if (__DEV__) console.error("SIMULATION FAILURE:", err);

      if (err?.isOffline) {
        setError("No internet connection. Please check your network.");
      } else if (err?.isQuotaExceeded) {
        // Server said no — sync the banner to the truth and don't
        // show a red error. The limit UI communicates it.
        setQuota({
          limit: err.quota?.limit ?? quota?.limit ?? null,
          used: err.quota?.used ?? quota?.used ?? 0,
          remaining: 0,
          unlimited: false,
        });
      } else if (err?.isAuthFailure) {
        setError("Your session expired. Please sign in again.");
      } else {
        setError(
          err?.backendMessage || err?.message || "Simulation failed. Try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    addSimulation,
    category,
    isValid,
    name,
    outOfQuota,
    parsedAmount,
    parsedTerm,
    profile,
    quota,
    runAnalysis,
    setQuota,
    user,
  ]);

  /* ===================================================
     UI
  =================================================== */

  const buttonDisabled = !isValid || loading || outOfQuota;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 180 + insets.bottom,
          }}
        >
          <DashboardHeader hideSettings showBackButton />

          {/* PROFILE PROMPT — shown when no profile yet */}
          {!profile && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/profile")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                marginBottom: 16,
                borderColor: theme.colors.primary,
                backgroundColor: `${theme.colors.primary}14`,
              }}
            >
              <Feather name="user-plus" size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.semibold, fontSize: 14 }}>
                  Complete your profile to run simulations
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, fontSize: 12, marginTop: 2 }}>
                  Set your income and financial details to model scenarios.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {/* QUOTA BANNER */}
          {quota && !isUnlimited && (
            <QuotaBanner
              remaining={remaining ?? 0}
              limit={quota.limit ?? 0}
              theme={theme}
              purchasing={purchasing}
              onUpgrade={handleUpgrade}
              onRestore={handleRestore}
            />
          )}

          {/* ERROR BANNER */}
          {error && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#EF4444",
                backgroundColor: "#EF444420",
                marginBottom: 16,
              }}
            >
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={{ flex: 1, color: "#EF4444", fontSize: 13 }}>
                {error}
              </Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Feather name="x" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* FORM */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Input label="Simulation Name" value={name} setValue={setName} theme={theme} />
            <Input label="Monthly Payment ($)" value={amount} setValue={setAmount} theme={theme} />
            <Input label="Term" value={term} setValue={setTerm} theme={theme} />

            {/* TERM UNIT SELECTOR */}
            <View style={[styles.row, { marginTop: 4, marginBottom: 4 }]}>
              {(["days", "weeks", "months", "years"] as const).map((u) => {
                const sel = termUnit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    activeOpacity={0.85}
                    onPress={() => setTermUnit(u)}
                    style={[
                      styles.option,
                      {
                        borderColor: sel ? theme.colors.primary : theme.colors.divider,
                        backgroundColor: sel ? `${theme.colors.primary}18` : theme.colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: sel ? theme.colors.primary : theme.colors.textSecondary,
                        fontFamily: theme.fonts.primary,
                        textTransform: "capitalize",
                      }}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PAYMENT BREAKDOWN */}
            {parsedAmount > 0 && (
              <View style={[styles.breakdownCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.divider }]}>
                {[
                  { k: "Daily", v: parsedAmount / 30 },
                  { k: "Weekly", v: parsedAmount / 4.33 },
                  { k: "Monthly", v: parsedAmount },
                  { k: "Yearly", v: parsedAmount * 12 },
                ].map((row) => (
                  <View key={row.k} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                      {row.k}
                    </Text>
                    <Text style={[styles.breakdownValue, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
                      ${row.v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text
              style={[
                styles.label,
                { color: theme.colors.text, fontFamily: theme.fonts.display },
              ]}
            >
              Purchase Category
            </Text>

            <View style={styles.row}>
              {CATEGORY_OPTIONS.map((type) => {
                const selected = category === type;
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.85}
                    onPress={() => setCategory(type)}
                    style={[
                      styles.option,
                      {
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.divider,
                        backgroundColor: selected
                          ? `${theme.colors.primary}18`
                          : theme.colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                        fontFamily: theme.fonts.primary,
                        textTransform: "capitalize",
                      }}
                    >
                      {type.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* LATEST */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, fontFamily: theme.fonts.display },
            ]}
          >
            Latest Simulation
          </Text>

          {loadingSims && !latestSimulation && (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  fontFamily: theme.fonts.primary,
                }}
              >
                Loading saved simulations...
              </Text>
            </View>
          )}

          {latestSimulation ? (
            <ResultPanel
              analysis={latestSimulation.result}
              theme={theme}
              title={latestSimulation.name}
              narrative={(latestSimulation as any).narrative}
              meta={{
                amount: latestSimulation.amount,
                term: latestSimulation.term,
                category: latestSimulation.category,
              }}
            />
          ) : (
            !loadingSims && (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.divider,
                  },
                ]}
              >
                <Feather name="activity" size={28} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                  ]}
                >
                  No financial simulations yet.
                </Text>
              </View>
            )
          )}

          {/* HISTORY */}
          {simulations?.length > 1 && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text, fontFamily: theme.fonts.display },
                ]}
              >
                Simulation History
              </Text>

              {simulations.slice(1).map((sim) => (
                <ResultPanel
                  key={sim.id}
                  analysis={sim.result}
                  theme={theme}
                  title={sim.name}
                  narrative={(sim as any).narrative}
                  meta={{ amount: sim.amount, term: sim.term, category: sim.category }}
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* ACTION BUTTON */}
        <View
          style={[
            styles.bottomWrap,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={buttonDisabled}
            onPress={handleRun}
            style={[
              styles.button,
              {
                backgroundColor:
                  isValid && !outOfQuota ? theme.colors.primary : theme.colors.card,
                opacity: loading ? 0.7 : buttonDisabled ? 0.45 : 1,
              },
            ]}
          >
            <Feather
              name={outOfQuota ? "lock" : loading ? "loader" : "play"}
              size={18}
              color={theme.colors.background}
            />
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.background, fontFamily: theme.fonts.display },
              ]}
            >
              {outOfQuota
                ? "Monthly Limit Reached"
                : loading
                ? "Running Analysis..."
                : "Run Financial Simulation"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =====================================================
   QUOTA BANNER
===================================================== */

function QuotaBanner({
  remaining,
  limit,
  theme,
  purchasing,
  onUpgrade,
  onRestore,
}: {
  remaining: number;
  limit: number;
  theme: any;
  purchasing: boolean;
  onUpgrade: () => void;
  onRestore: () => void;
}) {
  const atLimit = remaining <= 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 16,
        borderColor: atLimit ? theme.colors.warning : theme.colors.divider,
        backgroundColor: atLimit
          ? `${theme.colors.warning}14`
          : theme.colors.card,
      }}
    >
      <Feather
        name={atLimit ? "lock" : "zap"}
        size={16}
        color={atLimit ? theme.colors.warning : theme.colors.primary}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
          }}
        >
          {atLimit
            ? "You've used all your free simulations this month"
            : `${remaining} of ${limit} free simulations left this month`}
        </Text>
        {atLimit && (
          <TouchableOpacity onPress={onRestore} disabled={purchasing}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 12,
                fontFamily: theme.fonts.primary,
                marginTop: 2,
                textDecorationLine: "underline",
              }}
            >
              Already subscribed? Restore
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {atLimit && (
        <TouchableOpacity
          onPress={onUpgrade}
          disabled={purchasing}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: theme.colors.primary,
            opacity: purchasing ? 0.6 : 1,
            minWidth: 74,
            alignItems: "center",
          }}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text
              style={{
                color: theme.colors.background,
                fontSize: 12,
                fontFamily: theme.fonts.semibold,
              }}
            >
              Upgrade
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

/* =====================================================
   RESULT PANEL
===================================================== */

function ResultPanel({
  analysis,
  theme,
  title,
  meta,
  narrative: storedNarrative,
}: {
  analysis: FinancialAnalysisResponse;
  theme: any;
  title?: string;
  meta?: { amount?: number; term?: number; category?: string };
  narrative?: string | null;
}) {
  if (!analysis) return null;

  const narrative = storedNarrative ?? null;

  const scenario = analysis?.engines?.scenarios?.scenario_results?.[0] as
    | ScenarioResult
    | undefined;

  const score = Math.round(
    Number(
      scenario?.global_financial_score ??
        analysis?.global_financial_score ??
        0
    )
  );

  const band = scenario?.explanation_band || "stable";
  const riskText = scenario?.key_risks?.[0] || "No major risk vectors detected.";
  const backendRisk = analysis?.risk_level || "moderate";

  let color = theme.colors.success;
  let bg = `${theme.colors.success}14`;
  let icon: keyof typeof Feather.glyphMap = "shield";
  let label = "Stable";

  if (backendRisk === "critical") {
    color = theme.colors.criticalDanger;
    bg = `${theme.colors.criticalDanger}14`;
    icon = "alert-octagon";
    label = "Critical Risk";
  } else if (backendRisk === "high") {
    color = theme.colors.danger;
    bg = `${theme.colors.danger}14`;
    icon = "alert-triangle";
    label = "High Risk";
  } else if (backendRisk === "moderate") {
    color = theme.colors.warning;
    bg = `${theme.colors.warning}14`;
    icon = "activity";
    label = "Moderate";
  }

  return (
    <View style={[styles.panel, { borderColor: `${color}35`, backgroundColor: bg }]}>
      {title && (
        <Text
          style={[
            styles.panelTitle,
            { color: theme.colors.text, fontFamily: theme.fonts.display },
          ]}
        >
          {title}
        </Text>
      )}

      {meta && (
        <Text
          style={[
            styles.meta,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
          ]}
        >
          ${meta.amount ?? 0}
          {" / month • "}
          {meta.term ?? 0}
          {" months • "}
          {meta.category ?? "other"}
        </Text>
      )}

      <Text style={[styles.score, { color, fontFamily: theme.fonts.display }]}>
        {score}/100
      </Text>

      <Text
        style={[
          styles.subText,
          { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
        ]}
      >
        Behavioral Band: {band}
      </Text>

      <Text
        style={[
          styles.subText,
          { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
        ]}
      >
        {riskText}
      </Text>

      <View style={styles.rowInline}>
        <Feather name={icon} size={18} color={color} />
        <Text style={[styles.status, { color, fontFamily: theme.fonts.primary }]}>
          {label}
        </Text>
      </View>

      {narrative && (
        <View
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: `${color}25`,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 11, color: theme.colors.accent }}>✦</Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: theme.fonts.semibold,
                color: theme.colors.accent,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              AI Insight
            </Text>
          </View>
          <Text
            style={{
              fontSize: 13,
              fontFamily: theme.fonts.primary,
              color: theme.colors.text,
              lineHeight: 19,
            }}
          >
            {narrative}
          </Text>
        </View>
      )}
    </View>
  );
}

/* =====================================================
   INPUT
===================================================== */

function Input({
  label,
  value,
  setValue,
  theme,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  theme: any;
}) {
  const isMoney = label === "Monthly Payment ($)";
  const isName = label === "Simulation Name";

  return (
    <View style={styles.inputWrap}>
      <Text
        style={[
          styles.inputLabel,
          { color: theme.colors.text, fontFamily: theme.fonts.primary },
        ]}
      >
        {label}
      </Text>

      {isMoney ? (
        <View
          style={[
            styles.moneyInput,
            { borderColor: theme.colors.divider, backgroundColor: theme.colors.background },
          ]}
        >
          <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>$</Text>
          <TextInput
            value={value}
            onChangeText={(text) => setValue(text.replace(/[^0-9]/g, ""))}
            placeholder="0"
            placeholderTextColor={theme.colors.placeholder}
            keyboardType="numeric"
            style={{ flex: 1, color: theme.colors.text, fontFamily: theme.fonts.primary }}
          />
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={(text) => {
            if (!isName) {
              setValue(text.replace(/[^0-9]/g, ""));
              return;
            }
            setValue(text);
          }}
          placeholder={isName ? "Enter simulation name" : "0"}
          placeholderTextColor={theme.colors.placeholder}
          keyboardType={isName ? "default" : "numeric"}
          style={[
            styles.input,
            {
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: theme.fonts.primary,
            },
          ]}
        />
      )}
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  breakdownCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 8, gap: 8 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 14 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  formCard: { borderRadius: 28, borderWidth: 1, padding: 20 },
  label: { marginTop: 22, marginBottom: 10, fontSize: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sectionTitle: { marginTop: 30, marginBottom: 10, fontSize: 20 },
  panel: { marginTop: 16, borderRadius: 24, borderWidth: 1, padding: 18 },
  panelTitle: { fontSize: 16, marginBottom: 6 },
  meta: { fontSize: 12, marginBottom: 10, textTransform: "capitalize" },
  score: { fontSize: 40, marginBottom: 6 },
  subText: { marginTop: 6, fontSize: 13, lineHeight: 20 },
  rowInline: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  status: { marginLeft: 8, fontSize: 14 },
  emptyState: {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { marginTop: 12, fontSize: 14 },
  bottomWrap: { position: "absolute", left: 20, right: 20, bottom: 0 },
  button: {
    height: 60,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { marginLeft: 10, fontSize: 17 },
  inputWrap: { marginTop: 18 },
  inputLabel: { marginBottom: 8, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
  },
  moneyInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});