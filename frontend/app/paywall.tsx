// =====================================================
// FINAI — PAYWALL SCREEN (two-tier: monthly + annual)
// app/paywall.tsx
// =====================================================
// Apple-compliant subscription paywall. Shows monthly and annual
// plans as selectable cards (annual highlighted as best value), the
// live prices from the offering, auto-renewal disclosure, Restore
// Purchases, and the required Terms / Privacy links. Reuses the
// existing billing service.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { PurchasesPackage } from "react-native-purchases";

import { useTheme } from "../src/theme/ThemeContext";
import { useFinanceStore } from "../src/store/financeStore";
import {
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
} from "../src/services/billing";

const TERMS_URL = "https://finbudgetai.com/terms";
const PRIVACY_URL = "https://finbudgetai.com/privacy";

const BENEFITS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: "zap", text: "Unlimited AI financial simulations" },
  { icon: "trending-up", text: "Unlimited budget-aware AI insights" },
  { icon: "pie-chart", text: "Deeper spending analysis across every category" },
  { icon: "shield", text: "Priority access to new features" },
];

function isAnnual(pkg: PurchasesPackage): boolean {
  const t = (pkg as any).packageType;
  return t === "ANNUAL" || /annual|year/i.test(pkg.identifier);
}

export default function PaywallScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const setQuota = useFinanceStore((s) => s.setQuota);
  const quota = useFinanceStore((s) => s.quota);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  /* ================= LOAD OFFERING ================= */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPkg(true);
      try {
        const pkgs = await getAvailablePackages();
        if (!cancelled) {
          setPackages(pkgs);
          // Default-select the annual plan (best value) if present.
          const annual = pkgs.find(isAnnual);
          setSelectedId((annual ?? pkgs[0])?.identifier ?? null);
        }
      } catch {
        if (!cancelled) setPackages([]);
      } finally {
        if (!cancelled) setLoadingPkg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthly = useMemo(() => packages.find((p) => !isAnnual(p)), [packages]);
  const annual = useMemo(() => packages.find(isAnnual), [packages]);
  const selected = useMemo(
    () => packages.find((p) => p.identifier === selectedId) ?? null,
    [packages, selectedId]
  );

  // Rough savings label for the annual card (vs. 12x monthly), computed
  // from the live prices when both are available.
  const savingsPct = useMemo(() => {
    const m = monthly?.product?.price;
    const a = annual?.product?.price;
    if (!m || !a) return null;
    const yearlyIfMonthly = m * 12;
    if (yearlyIfMonthly <= 0) return null;
    const pct = Math.round((1 - a / yearlyIfMonthly) * 100);
    return pct > 0 ? pct : null;
  }, [monthly, annual]);

  /* ================= PURCHASE ================= */
  const handleSubscribe = useCallback(async () => {
    if (purchasing || !selected) return;
    setPurchasing(true);
    try {
      const result = await purchasePackage(selected);
      if (result.cancelled) return;

      if (result.success && result.unlimited) {
        setQuota({
          limit: quota?.limit ?? null,
          used: quota?.used ?? 0,
          remaining: null,
          unlimited: true,
        });
        Alert.alert(
          "You're all set",
          "You now have unlimited access. Thanks for subscribing!",
          [{ text: "Continue", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Purchase incomplete",
          result.error || "Something went wrong. You have not been charged."
        );
      }
    } catch {
      Alert.alert("Purchase failed", "Please try again in a moment.");
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, selected, quota, setQuota, router]);

  /* ================= RESTORE ================= */
  const handleRestore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.unlimited) {
        setQuota({
          limit: quota?.limit ?? null,
          used: quota?.used ?? 0,
          remaining: null,
          unlimited: true,
        });
        Alert.alert("Restored", "Your subscription has been restored.", [
          { text: "Continue", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          "Nothing to restore",
          "We couldn't find an active subscription for this account."
        );
      }
    } catch {
      Alert.alert("Restore failed", "Please try again in a moment.");
    } finally {
      setRestoring(false);
    }
  }, [restoring, quota, setQuota, router]);

  const renderPlanCard = (
    pkg: PurchasesPackage | undefined,
    opts: { periodLabel: string; perLabel: string; badge?: string | null }
  ) => {
    if (!pkg) return null;
    const isSel = pkg.identifier === selectedId;
    const priceString = pkg.product?.priceString ?? "";
    return (
      <TouchableOpacity
        key={pkg.identifier}
        activeOpacity={0.9}
        onPress={() => setSelectedId(pkg.identifier)}
        style={[
          styles.planCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: isSel ? theme.colors.primary : theme.colors.border,
            borderWidth: isSel ? 2 : 1,
          },
        ]}
      >
        {opts.badge ? (
          <View
            style={[styles.planBadge, { backgroundColor: theme.colors.primary }]}
          >
            <Text
              style={[
                styles.planBadgeText,
                {
                  color: theme.colors.background,
                  fontFamily: theme.fonts.semibold,
                },
              ]}
            >
              {opts.badge}
            </Text>
          </View>
        ) : null}

        <View style={styles.planLeft}>
          <View
            style={[
              styles.radio,
              {
                borderColor: isSel
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
          >
            {isSel ? (
              <View
                style={[
                  styles.radioDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            ) : null}
          </View>
          <Text
            style={[
              styles.planPeriod,
              { color: theme.colors.text, fontFamily: theme.fonts.semibold },
            ]}
          >
            {opts.periodLabel}
          </Text>
        </View>

        <View style={styles.planRight}>
          <Text
            style={[
              styles.planPrice,
              { color: theme.colors.text, fontFamily: theme.fonts.semibold },
            ]}
          >
            {priceString}
          </Text>
          <Text
            style={[
              styles.planPer,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
              },
            ]}
          >
            {opts.perLabel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="x" size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.badge,
              { backgroundColor: `${theme.colors.primary}18` },
            ]}
          >
            <Feather name="star" size={28} color={theme.colors.primary} />
          </View>
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, fontFamily: theme.fonts.semibold },
            ]}
          >
            FinBudgetAI Unlimited
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
              },
            ]}
          >
            Unlock the full power of your AI financial companion.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View
                style={[
                  styles.benefitIcon,
                  { backgroundColor: `${theme.colors.primary}14` },
                ]}
              >
                <Feather name={b.icon} size={16} color={theme.colors.primary} />
              </View>
              <Text
                style={[
                  styles.benefitText,
                  { color: theme.colors.text, fontFamily: theme.fonts.primary },
                ]}
              >
                {b.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        {loadingPkg ? (
          <ActivityIndicator
            color={theme.colors.primary}
            style={{ marginVertical: 24 }}
          />
        ) : (
          <View style={styles.plans}>
            {renderPlanCard(annual, {
              periodLabel: "Annual",
              perLabel: "per year",
              badge: savingsPct ? `BEST VALUE · SAVE ${savingsPct}%` : "BEST VALUE",
            })}
            {renderPlanCard(monthly, {
              periodLabel: "Monthly",
              perLabel: "per month",
              badge: null,
            })}
          </View>
        )}

        <Text
          style={[
            styles.renewNote,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.fonts.primary,
            },
          ]}
        >
          Auto-renews. Cancel anytime.
        </Text>

        {/* Subscribe */}
        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            {
              backgroundColor:
                selected && !purchasing
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
              opacity: purchasing ? 0.7 : selected ? 1 : 0.5,
            },
          ]}
          onPress={handleSubscribe}
          disabled={purchasing || !selected}
          activeOpacity={0.9}
        >
          {purchasing ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text
              style={[
                styles.subscribeText,
                {
                  color: theme.colors.background,
                  fontFamily: theme.fonts.semibold,
                },
              ]}
            >
              Subscribe
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text
            style={[
              styles.restoreText,
              { color: theme.colors.primary, fontFamily: theme.fonts.primary },
            ]}
          >
            {restoring ? "Restoring…" : "Restore Purchases"}
          </Text>
        </TouchableOpacity>

        {/* Legal disclosure — required by Apple */}
        <Text
          style={[
            styles.legal,
            {
              color: theme.colors.textMuted ?? theme.colors.textSecondary,
              fontFamily: theme.fonts.primary,
            },
          ]}
        >
          Payment will be charged to your Apple Account at confirmation of
          purchase. The subscription automatically renews unless it is canceled
          at least 24 hours before the end of the current period. Your account
          will be charged for renewal within 24 hours prior to the end of the
          current period. You can manage and cancel your subscription in your
          Apple Account settings.
        </Text>

        {/* Terms + Privacy links — required by Apple */}
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text
              style={[
                styles.linkText,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              Terms of Use
            </Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.textSecondary }}>  ·  </Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text
              style={[
                styles.linkText,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  closeBtn: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: "center", marginTop: 20, marginBottom: 24 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, letterSpacing: -0.5, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },
  benefits: { marginBottom: 24, gap: 14 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { fontSize: 15, flex: 1 },
  plans: { gap: 12, marginBottom: 10 },
  planCard: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  planBadge: {
    position: "absolute",
    top: -9,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  planBadgeText: { fontSize: 10, letterSpacing: 0.4 },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  planPeriod: { fontSize: 16 },
  planRight: { alignItems: "flex-end" },
  planPrice: { fontSize: 18, letterSpacing: -0.3 },
  planPer: { fontSize: 12, marginTop: 2 },
  renewNote: { fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 18 },
  subscribeBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  subscribeText: { fontSize: 17 },
  restoreBtn: { alignItems: "center", paddingVertical: 10, marginBottom: 20 },
  restoreText: { fontSize: 15 },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", marginBottom: 16 },
  linksRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  linkText: { fontSize: 13, textDecorationLine: "underline" },
});
