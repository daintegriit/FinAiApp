import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeContext";
import { useFinanceStore } from "../../src/store/financeStore";
import { useAuth } from "../../src/context/AuthContext";
import { api } from "../../src/services/api";
import Globe from "../../src/components/header/Globe";
import DashboardHeader from "../../src/components/header/DashboardHeader";

/* =====================================================
   RADIUS OPTIONS
===================================================== */

const RADIUS_OPTIONS = [
  { label: "25 mi", value: 25 },
  { label: "50 mi", value: 50 },
  { label: "100 mi", value: 100 },
  { label: "National", value: 0 },
];

/* =====================================================
   TYPES
===================================================== */

interface PeerStats {
  scope: string;
  data_source: string;
  peer_count: number;
  avg_monthly_income: number;
  median_monthly_income: number;
  avg_savings_rate: number;
  avg_debt: number;
  avg_emergency_fund_months: number;
  avg_savings_amount: number;
}

interface PeerCluster {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  peer_count: number;
  avg_monthly_income?: number | null;
  avg_savings_rate?: number | null;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function PeersScreen() {

  const { theme } = useTheme();
  const { user } = useAuth();
  const profile = useFinanceStore((s) => s.profile);
  const analysis = useFinanceStore((s) => s.analysis);
  const income = useFinanceStore((s) => s.income);

  const [radius, setRadius] = useState(50);
  const [peerStats, setPeerStats] = useState<PeerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mapClusters, setMapClusters] = useState<PeerCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<PeerCluster | null>(null);

  // ===================================================
  // FETCH PEER DATA
  // ===================================================

  const fetchPeers = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        user_id: user.id,
        monthly_income: String(income || 0),
        country: "US",
        radius_miles: String(radius),
      });

      if (profile?.latitude) {
        params.append("latitude", String(profile.latitude));
      }
      if (profile?.longitude) {
        params.append("longitude", String(profile.longitude));
      }
      if (profile?.state) {
        params.append("state", profile.state);
      }

      const res = await api.get(`/peers/benchmark?${params.toString()}`);
      setPeerStats(res.data);

    } catch (err: any) {
      console.error("❌ Peer fetch failed:", err);
      setError("Could not load peer data.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, income, radius, profile?.latitude, profile?.longitude, profile?.state]);

  useEffect(() => {
    fetchPeers();
  }, [fetchPeers]);

  // ===================================================
  // FETCH PEER MAP CLUSTERS
  // ===================================================

  useEffect(() => {
    if (!user?.id) return;

    async function fetchMapClusters() {
      try {
        const res = await api.get(`/peers/map?user_id=${user!.id}`);
        const clusters = Array.isArray(res.data?.clusters) ? res.data.clusters : [];
        setMapClusters(clusters);
      } catch (err) {
        console.error("⚠️ Failed to fetch peer map clusters:", err);
      }
    }

    fetchMapClusters();
  }, [user?.id]);

  // ===================================================
  // YOUR STATS
  // ===================================================

  const yourSavingsRate = analysis?.financial_health?.savings_rate || 0;
  const yourIncome = analysis?.financial_health?.income || income || 0;

  // ===================================================
  // SCOPE LABEL
  // ===================================================

  function getScopeLabel(scope: string): string {
    if (scope === "synthetic") return "Estimated (few local users yet)";
    if (scope.startsWith("local_")) return `Within ${radius} miles`;
    if (scope.startsWith("state_")) return `${profile?.state || "Your state"}`;
    if (scope === "national") return "National";
    if (scope === "global") return "Global";
    return scope;
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
      >
        <DashboardHeader hideSettings showBackButton />

        {/* HEADER */}
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
          Peer Benchmarks
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
          See how you compare to people near you
        </Text>

        {/* ================================================= */}
        {/* GLOBE */}
        {/* ================================================= */}

        <View style={styles.globeContainer}>
          <Globe
            size={280}
            markers={mapClusters}
            onMarkerPress={(cluster) => setSelectedCluster(cluster as PeerCluster)}
          />

          <View style={[styles.locationBadge, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Feather name="map-pin" size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.locationText, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>
              {profile?.city && profile?.state
                ? `${profile.city}, ${profile.state}`
                : "Location not set"}
            </Text>
          </View>

          {selectedCluster && (
            <View
              style={[
                styles.clusterCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.clusterTitle, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
                  {selectedCluster.city}, {selectedCluster.state}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCluster(null)}>
                  <Feather name="x" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.clusterSubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                {selectedCluster.peer_count} {selectedCluster.peer_count === 1 ? "peer" : "peers"} in this area
              </Text>

              {selectedCluster.avg_savings_rate != null && (
                <Text style={[styles.clusterStat, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>
                  Avg savings rate: {Math.round(selectedCluster.avg_savings_rate * 100)}%
                </Text>
              )}

              {selectedCluster.avg_monthly_income != null && (
                <Text style={[styles.clusterStat, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>
                  Avg monthly income: ${Math.round(selectedCluster.avg_monthly_income).toLocaleString()}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ================================================= */}
        {/* RADIUS FILTER */}
        {/* ================================================= */}

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
          Search Radius
        </Text>

        <View style={styles.chipRow}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                {
                  backgroundColor: radius === opt.value ? theme.colors.text : theme.colors.card,
                  borderColor: radius === opt.value ? theme.colors.text : theme.colors.border,
                },
              ]}
              onPress={() => setRadius(opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: radius === opt.value ? theme.colors.background : theme.colors.text,
                    fontFamily: theme.fonts.primary,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================================================= */}
        {/* LOADING */}
        {/* ================================================= */}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.text} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Finding your peers...
            </Text>
          </View>
        )}

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && !loading && (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger, fontFamily: theme.fonts.primary }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={fetchPeers} style={{ marginTop: 8 }}>
              <Text style={[{ color: theme.colors.text, fontFamily: theme.fonts.primary, fontSize: 13 }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================================================= */}
        {/* PEER COUNT CARD */}
        {/* ================================================= */}

        {peerStats && !loading && (
          <>
            <View style={[styles.scopeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Feather name="users" size={22} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.scopeTitle, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
                {peerStats.peer_count.toLocaleString()} peers
              </Text>
              <Text style={[styles.scopeSubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                {getScopeLabel(peerStats.scope)}
              </Text>
              {peerStats.data_source === "synthetic" && (
                <Text style={[styles.syntheticNote, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  Based on statistical estimates — improves as more users join
                </Text>
              )}
            </View>

            {/* ============================================= */}
            {/* STATS */}
            {/* ============================================= */}

            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Peer Averages vs You
            </Text>

            <StatRow
              icon="trending-up"
              label="Savings Rate"
              peer={`${Math.round(peerStats.avg_savings_rate * 100)}%`}
              you={`${Math.round(yourSavingsRate * 100)}%`}
              better={yourSavingsRate >= peerStats.avg_savings_rate}
              theme={theme}
            />

            <StatRow
              icon="dollar-sign"
              label="Monthly Income"
              peer={`$${Math.round(peerStats.avg_monthly_income).toLocaleString()}`}
              you={`$${Math.round(yourIncome).toLocaleString()}`}
              better={yourIncome >= peerStats.avg_monthly_income}
              theme={theme}
            />

            <StatRow
              icon="credit-card"
              label="Total Debt"
              peer={`$${Math.round(peerStats.avg_debt).toLocaleString()}`}
              you={profile?.existing_debt ? `$${Number(profile.existing_debt).toLocaleString()}` : "—"}
              better={(profile?.existing_debt || 0) <= peerStats.avg_debt}
              theme={theme}
            />

            <StatRow
              icon="shield"
              label="Emergency Fund"
              peer={`${peerStats.avg_emergency_fund_months} mo`}
              you={profile?.emergency_fund_months ? `${profile.emergency_fund_months} mo` : "—"}
              better={(profile?.emergency_fund_months || 0) >= peerStats.avg_emergency_fund_months}
              theme={theme}
            />

            <StatRow
              icon="bar-chart-2"
              label="Avg Savings"
              peer={`$${Math.round(peerStats.avg_savings_amount).toLocaleString()}`}
              you={profile?.savings_buffer ? `$${Number(profile.savings_buffer).toLocaleString()}` : "—"}
              better={(profile?.savings_buffer || 0) >= peerStats.avg_savings_amount}
              theme={theme}
            />
          </>
        )}

        {/* ================================================= */}
        {/* COMING SOON */}
        {/* ================================================= */}

        <View style={[styles.comingSoon, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Feather name="globe" size={24} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.comingSoonTitle, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
            More peer insights coming soon
          </Text>
          <Text style={[styles.comingSoonText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            As more users join, local benchmarks will become more accurate and detailed.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   STAT ROW
===================================================== */

function StatRow({
  icon,
  label,
  peer,
  you,
  better,
  theme,
}: {
  icon: any;
  label: string;
  peer: string;
  you: string;
  better: boolean;
  theme: any;
}) {
  return (
    <View style={[styles.statRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.statHeader}>
        <Feather name={icon} size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
          {label}
        </Text>
      </View>

      <View style={styles.statValues}>
        <View style={styles.statCol}>
          <Text style={[styles.statCaption, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Peers avg
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
            {peer}
          </Text>
        </View>

        <View style={[styles.statCol, { alignItems: "flex-end" }]}>
          <Text style={[styles.statCaption, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            You
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather
              name={better ? "arrow-up" : "arrow-down"}
              size={12}
              color={better ? theme.colors.success : theme.colors.danger}
            />
            <Text style={[styles.statValue, { color: better ? theme.colors.success : theme.colors.danger, fontFamily: theme.fonts.display }]}>
              {you}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  title: { fontSize: 32, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  globeContainer: { alignItems: "center", marginBottom: 24 },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  locationText: { fontSize: 13 },
  sectionLabel: { fontSize: 13, marginBottom: 10, marginTop: 8 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14 },
  loadingContainer: { alignItems: "center", paddingVertical: 32, gap: 12 },
  loadingText: { fontSize: 14 },
  errorCard: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center", marginBottom: 16 },
  errorText: { fontSize: 14 },
  scopeCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: "center", marginBottom: 24 },
  scopeTitle: { fontSize: 40, letterSpacing: -1 },
  scopeSubtitle: { fontSize: 14, marginTop: 4 },
  syntheticNote: { fontSize: 12, marginTop: 8, textAlign: "center" },
  statRow: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  statLabel: { fontSize: 13 },
  statValues: { flexDirection: "row", justifyContent: "space-between" },
  statCol: { flex: 1 },
  statCaption: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 20, letterSpacing: -0.5 },
  comingSoon: { padding: 24, borderRadius: 16, borderWidth: 1, marginTop: 16, alignItems: "center" },
  comingSoonTitle: { fontSize: 16, marginBottom: 8, textAlign: "center" },
  comingSoonText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  clusterCard: {
    marginTop: 16,
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  clusterTitle: { fontSize: 16 },
  clusterSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 8 },
  clusterStat: { fontSize: 13, marginTop: 2 },
});