// =====================================================
// 💎 FINAI — ELITE ADMIN PANEL
// =====================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeContext";
import { api } from "../src/services/api";

// =====================================================
// TYPES
// =====================================================

type Tab = "overview" | "users" | "push" | "flags" | "health";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string | null;
  last_login: string | null;
  monthly_income: number | null;
  city: string | null;
  state: string | null;
  financial_goal: string | null;
  age: number | null;
  employment_type: string | null;
  risk_tolerance: string | null;
  transaction_count?: number;
  simulation_count?: number;
}

interface AdminStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  admin_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_transactions: number;
  total_simulations: number;
  total_categories: number;
  avg_income: number | null;
  users_with_profiles: number;
  users_with_location: number;
}

interface HealthData {
  status: string;
  timestamp: string;
  checks: Record<string, any>;
}

interface FeatureFlags {
  flags: Record<string, boolean>;
}

// =====================================================
// COMPONENT
// =====================================================

export default function AdminScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Push notification state
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushTarget, setPushTarget] = useState<"broadcast" | string>("broadcast");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  // Reset password state
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [statsRes, usersRes, healthRes, flagsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users?limit=500"),
        api.get("/admin/health"),
        api.get("/admin/feature-flags"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setHealth(healthRes.data);
      setFlags(flagsRes.data?.flags || {});
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setError("Admin access required");
      } else {
        setError("Failed to load admin data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  // =====================================================
  // USER ACTIONS
  // =====================================================

  async function handleBan(user: AdminUser) {
    Alert.alert("Ban User", `Ban ${user.email}? They will lose access immediately.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Ban", style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/admin/users/${user.id}/ban`);
            void loadData();
          } catch { Alert.alert("Error", "Failed to ban user"); }
        },
      },
    ]);
  }

  async function handleUnban(user: AdminUser) {
    try {
      await api.post(`/admin/users/${user.id}/unban`);
      void loadData();
    } catch { Alert.alert("Error", "Failed to unban user"); }
  }

  async function handleDelete(user: AdminUser) {
    Alert.alert("Delete Account", `Permanently delete ${user.email} and ALL their data? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Forever", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/admin/users/${user.id}`);
            void loadData();
          } catch { Alert.alert("Error", "Failed to delete user"); }
        },
      },
    ]);
  }

  async function handlePromote(user: AdminUser) {
    const action = user.is_admin ? "demote from admin" : "promote to admin";
    Alert.alert("Confirm", `Are you sure you want to ${action} ${user.email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await api.post(`/admin/users/${user.id}/promote`, { is_admin: !user.is_admin });
            void loadData();
          } catch { Alert.alert("Error", "Failed to update admin status"); }
        },
      },
    ]);
  }

  async function handleResetPassword(userId: string) {
    if (!resetPassword || resetPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    try {
      await api.post(`/admin/users/${userId}/reset-password`, { new_password: resetPassword });
      Alert.alert("Success", "Password reset successfully");
      setResetUserId(null);
      setResetPassword("");
    } catch {
      Alert.alert("Error", "Failed to reset password");
    }
  }

  // =====================================================
  // PUSH NOTIFICATIONS
  // =====================================================

  async function handleSendPush() {
    if (!pushTitle.trim() || !pushBody.trim()) {
      Alert.alert("Error", "Title and body are required");
      return;
    }

    setPushSending(true);
    setPushResult(null);

    try {
      const endpoint = pushTarget === "broadcast"
        ? "/admin/push/broadcast"
        : `/admin/users/${pushTarget}/push`;

      const res = await api.post(endpoint, {
        title: pushTitle.trim(),
        body: pushBody.trim(),
      });

      const { sent, errors, total_tokens } = res.data;
      setPushResult(`✅ Sent: ${sent ?? 1}${total_tokens ? ` / ${total_tokens}` : ""}${errors ? ` · ${errors} errors` : ""}`);
      setPushTitle("");
      setPushBody("");
    } catch (e: any) {
      setPushResult(`❌ ${e?.backendMessage || "Failed to send push"}`);
    } finally {
      setPushSending(false);
    }
  }

  // =====================================================
  // FEATURE FLAGS
  // =====================================================

  async function toggleFlag(key: string, value: boolean) {
    try {
      setFlags((prev) => ({ ...prev, [key]: value }));
      await api.patch("/admin/feature-flags", { flags: { [key]: value } });
    } catch {
      setFlags((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Error", "Failed to update feature flag");
    }
  }

  // =====================================================
  // FILTERED USERS
  // =====================================================

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  // =====================================================
  // STYLES
  // =====================================================

  const c = theme.colors;
  const f = theme.fonts;

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textMuted, marginTop: 12, fontFamily: f.primary }}>
          Loading admin panel…
        </Text>
      </View>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.background }}>

      {/* ── HEADER ── */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: c.border, gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontFamily: f.semibold, color: c.text, flex: 1 }}>
          Admin Panel
        </Text>
        <TouchableOpacity onPress={() => void loadData()}>
          <Feather name="refresh-cw" size={18} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── TABS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: "row" }}
      >
        {(["overview", "users", "push", "flags", "health"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8,
              borderRadius: 10, borderWidth: 1,
              backgroundColor: tab === t ? c.primary : c.card,
              borderColor: tab === t ? c.primary : c.border,
            }}
          >
            <Text style={{
              fontSize: 13, fontFamily: f.semibold,
              color: tab === t ? c.textInverse : c.textMuted,
              textTransform: "capitalize",
            }}>
              {t === "users" ? `Users (${users.length})` : t === "flags" ? "Feature Flags" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <Text style={{ color: "#EF4444", textAlign: "center", fontFamily: f.primary, padding: 20 }}>
          {error}
        </Text>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 60 }}
        >

          {/* ══════════════════════════════════════════ */}
          {/* OVERVIEW TAB                              */}
          {/* ══════════════════════════════════════════ */}

          {tab === "overview" && stats && (
            <>
              <Text style={{ paddingHorizontal: 20, marginBottom: 12, marginTop: 4, fontSize: 12, fontFamily: f.primary, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Platform Stats
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Total Users", value: stats.total_users, sub: `+${stats.new_users_today} today`, color: c.primary },
                  { label: "Active", value: stats.active_users, sub: `${stats.total_users - stats.active_users} banned`, color: "#10B981" },
                  { label: "New This Week", value: stats.new_users_this_week, sub: `+${stats.new_users_today} today`, color: "#F59E0B" },
                  { label: "Admins", value: stats.admin_users, sub: "platform admins", color: c.primary },
                  { label: "Transactions", value: stats.total_transactions, sub: "all users", color: "#10B981" },
                  { label: "Simulations", value: stats.total_simulations, sub: `${stats.verified_users} verified users`, color: "#3B82F6" },
                  { label: "With Profiles", value: stats.users_with_profiles, sub: `${stats.users_with_location} with location`, color: "#8B5CF6" },
                  { label: "Avg Income", value: stats.avg_income ? `$${Math.round(stats.avg_income).toLocaleString()}` : "—", sub: "monthly avg", color: "#F59E0B" },
                ].map((item) => (
                  <View key={item.label} style={{
                    width: "47%", backgroundColor: c.card,
                    borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16,
                  }}>
                    <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 26, fontFamily: f.semibold, color: item.color }}>
                      {item.value}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted, marginTop: 4 }}>
                      {item.sub}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: c.primary, borderRadius: 12, padding: 14, alignItems: "center" }}
                onPress={() => setTab("users")}
              >
                <Text style={{ color: c.textInverse, fontFamily: f.semibold, fontSize: 15 }}>
                  Manage Users →
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginHorizontal: 20, backgroundColor: c.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border }}
                onPress={() => setTab("push")}
              >
                <Text style={{ color: c.text, fontFamily: f.semibold, fontSize: 15 }}>
                  Send Push Notification →
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* USERS TAB                                 */}
          {/* ══════════════════════════════════════════ */}

          {tab === "users" && (
            <>
              <TextInput
                style={{
                  marginHorizontal: 20, marginBottom: 12,
                  backgroundColor: c.card, borderRadius: 12, borderWidth: 1,
                  borderColor: c.border, paddingHorizontal: 14, paddingVertical: 10,
                  fontSize: 14, color: c.text, fontFamily: f.primary,
                }}
                placeholder="Search email or username…"
                placeholderTextColor={c.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />

              <Text style={{ paddingHorizontal: 20, marginBottom: 12, fontSize: 12, fontFamily: f.primary, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {filteredUsers.length} of {users.length} users
              </Text>

              {filteredUsers.map((u) => {
                const isExpanded = expandedUser === u.id;

                return (
                  <View key={u.id} style={{
                    marginHorizontal: 20, marginBottom: 10,
                    backgroundColor: c.card, borderRadius: 14,
                    borderWidth: 1, borderColor: isExpanded ? c.primary : c.border, padding: 14,
                  }}>
                    {/* User info row */}
                    <TouchableOpacity
                      onPress={() => setExpandedUser(isExpanded ? null : u.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}
                    >
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: u.is_admin ? c.primary : c.surface,
                        alignItems: "center", justifyContent: "center",
                        borderWidth: 1, borderColor: c.border,
                      }}>
                        <Text style={{ color: u.is_admin ? c.textInverse : c.text, fontFamily: f.semibold, fontSize: 16 }}>
                          {u.email[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: f.semibold, color: c.text }}>
                          {u.email}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textMuted, marginTop: 2 }}>
                          @{u.username}{u.city && u.state ? ` · ${u.city}, ${u.state}` : ""}
                        </Text>
                        {u.monthly_income && (
                          <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textMuted }}>
                            ${u.monthly_income.toLocaleString()}/mo
                          </Text>
                        )}
                      </View>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={c.textMuted} />
                    </TouchableOpacity>

                    {/* Badges */}
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, backgroundColor: u.is_active ? "#10B98120" : "#EF444420", borderColor: u.is_active ? "#10B981" : "#EF4444" }}>
                        <Text style={{ fontSize: 11, fontFamily: f.semibold, color: u.is_active ? "#10B981" : "#EF4444" }}>
                          {u.is_active ? "Active" : "Banned"}
                        </Text>
                      </View>
                      {u.is_verified && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, backgroundColor: "#10B98110", borderColor: "#10B98140" }}>
                          <Text style={{ fontSize: 11, fontFamily: f.semibold, color: "#10B981" }}>✓ Verified</Text>
                        </View>
                      )}
                      {u.is_admin && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, backgroundColor: `${c.primary}20`, borderColor: `${c.primary}40` }}>
                          <Text style={{ fontSize: 11, fontFamily: f.semibold, color: c.primary }}>Admin</Text>
                        </View>
                      )}
                      {u.financial_goal && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, backgroundColor: "#3B82F620", borderColor: "#3B82F640" }}>
                          <Text style={{ fontSize: 11, fontFamily: f.semibold, color: "#3B82F6" }}>{u.financial_goal.replace(/_/g, " ")}</Text>
                        </View>
                      )}
                    </View>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, marginBottom: 10, gap: 6 }}>
                        {u.age && <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textSecondary }}>Age: {u.age}</Text>}
                        {u.employment_type && <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textSecondary }}>Employment: {u.employment_type.replace(/_/g, " ")}</Text>}
                        {u.risk_tolerance && <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textSecondary }}>Risk tolerance: {u.risk_tolerance}</Text>}
                        {u.transaction_count !== undefined && <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textSecondary }}>Transactions: {u.transaction_count}</Text>}
                        {u.simulation_count !== undefined && <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textSecondary }}>Simulations: {u.simulation_count}</Text>}
                        <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted }}>
                          ID: {u.id}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted }}>
                          Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </Text>

                        {/* Reset password inline */}
                        {resetUserId === u.id ? (
                          <View style={{ marginTop: 8, gap: 8 }}>
                            <TextInput
                              style={{ backgroundColor: c.input, borderRadius: 8, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: c.text, fontFamily: f.primary }}
                              placeholder="New password (min 6 chars)"
                              placeholderTextColor={c.textMuted}
                              secureTextEntry
                              value={resetPassword}
                              onChangeText={setResetPassword}
                            />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity
                                onPress={() => handleResetPassword(u.id)}
                                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#3B82F615", borderWidth: 1, borderColor: "#3B82F6", alignItems: "center" }}
                              >
                                <Text style={{ fontSize: 12, fontFamily: f.semibold, color: "#3B82F6" }}>Set Password</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => { setResetUserId(null); setResetPassword(""); }}
                                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center" }}
                              >
                                <Text style={{ fontSize: 12, fontFamily: f.semibold, color: c.textMuted }}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => { setResetUserId(u.id); setResetPassword(""); }}
                            style={{ marginTop: 4, alignSelf: "flex-start" }}
                          >
                            <Text style={{ fontSize: 12, fontFamily: f.semibold, color: "#3B82F6" }}>
                              Reset Password
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      {!u.is_admin && (
                        u.is_active ? (
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: "#EF4444", backgroundColor: "#EF444415" }}
                            onPress={() => handleBan(u)}
                          >
                            <Text style={{ fontSize: 12, fontFamily: f.semibold, color: "#EF4444" }}>Ban</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: "#10B981", backgroundColor: "#10B98115" }}
                            onPress={() => handleUnban(u)}
                          >
                            <Text style={{ fontSize: 12, fontFamily: f.semibold, color: "#10B981" }}>Unban</Text>
                          </TouchableOpacity>
                        )
                      )}

                      {!u.is_admin && (
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: c.border, backgroundColor: c.background }}
                          onPress={() => handleDelete(u)}
                        >
                          <Text style={{ fontSize: 12, fontFamily: f.semibold, color: c.textMuted }}>Delete</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: "#8B5CF640", backgroundColor: "#8B5CF615" }}
                        onPress={() => handlePromote(u)}
                      >
                        <Text style={{ fontSize: 12, fontFamily: f.semibold, color: "#8B5CF6" }}>
                          {u.is_admin ? "Demote" : "Promote"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: "#3B82F640", backgroundColor: "#3B82F615" }}
                        onPress={() => { setPushTarget(u.id); setTab("push"); }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: f.semibold, color: "#3B82F6" }}>Push</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {filteredUsers.length === 0 && (
                <Text style={{ color: c.textMuted, textAlign: "center", padding: 20, fontFamily: f.primary }}>
                  No users found
                </Text>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* PUSH TAB                                  */}
          {/* ══════════════════════════════════════════ */}

          {tab === "push" && (
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Send Push Notification
              </Text>

              {/* Target selector */}
              <View style={{ backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: f.semibold, color: c.text }}>Target</Text>
                <TouchableOpacity
                  onPress={() => setPushTarget("broadcast")}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    borderColor: pushTarget === "broadcast" ? c.primary : c.border,
                    backgroundColor: pushTarget === "broadcast" ? c.primary : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {pushTarget === "broadcast" && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.textInverse }} />}
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: f.primary, color: c.text }}>
                    Broadcast to all active users ({users.filter(u => u.is_active).length})
                  </Text>
                </TouchableOpacity>

                {pushTarget !== "broadcast" && (
                  <View style={{ backgroundColor: c.surface, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: c.primary }}>
                    <Text style={{ fontSize: 12, fontFamily: f.semibold, color: c.primary }}>
                      → {users.find(u => u.id === pushTarget)?.email || pushTarget}
                    </Text>
                    <TouchableOpacity onPress={() => setPushTarget("broadcast")}>
                      <Text style={{ fontSize: 11, fontFamily: f.primary, color: c.textMuted, marginTop: 4 }}>
                        Switch to broadcast
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Message form */}
              <View style={{ backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: f.semibold, color: c.text }}>Message</Text>

                <TextInput
                  style={{ backgroundColor: c.input, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, fontFamily: f.primary }}
                  placeholder="Notification title"
                  placeholderTextColor={c.textMuted}
                  value={pushTitle}
                  onChangeText={setPushTitle}
                />

                <TextInput
                  style={{ backgroundColor: c.input, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, fontFamily: f.primary, minHeight: 80, textAlignVertical: "top" }}
                  placeholder="Notification body"
                  placeholderTextColor={c.textMuted}
                  value={pushBody}
                  onChangeText={setPushBody}
                  multiline
                />
              </View>

              <TouchableOpacity
                onPress={handleSendPush}
                disabled={pushSending}
                style={{
                  backgroundColor: pushSending ? c.textMuted : c.primary,
                  borderRadius: 12, padding: 16, alignItems: "center",
                  opacity: pushSending ? 0.6 : 1,
                }}
              >
                {pushSending ? (
                  <ActivityIndicator color={c.textInverse} />
                ) : (
                  <Text style={{ color: c.textInverse, fontFamily: f.semibold, fontSize: 15 }}>
                    {pushTarget === "broadcast" ? "📣 Broadcast to All Users" : "📩 Send to User"}
                  </Text>
                )}
              </TouchableOpacity>

              {pushResult && (
                <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border }}>
                  <Text style={{ fontSize: 14, fontFamily: f.primary, color: c.text }}>{pushResult}</Text>
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* FEATURE FLAGS TAB                         */}
          {/* ══════════════════════════════════════════ */}

          {tab === "flags" && (
            <View style={{ padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Feature Flags
              </Text>

              <Text style={{ fontSize: 13, fontFamily: f.primary, color: c.textSecondary, marginBottom: 8 }}>
                Toggle features on/off in real time across all users. Changes take effect immediately for new requests.
              </Text>

              {Object.entries(flags).map(([key, value]) => (
                <View key={key} style={{
                  backgroundColor: c.card, borderRadius: 14, borderWidth: 1,
                  borderColor: value ? `${c.success}40` : c.border,
                  padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: f.semibold, color: c.text }}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: f.primary, color: value ? c.success : c.textMuted, marginTop: 2 }}>
                      {value ? "Enabled" : "Disabled"}
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={(v) => toggleFlag(key, v)}
                    trackColor={{ false: c.border, true: `${c.success}60` }}
                    thumbColor={value ? c.success : c.textMuted}
                  />
                </View>
              ))}

              {Object.keys(flags).length === 0 && (
                <Text style={{ color: c.textMuted, textAlign: "center", fontFamily: f.primary }}>
                  No feature flags configured
                </Text>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* HEALTH TAB                                */}
          {/* ══════════════════════════════════════════ */}

          {tab === "health" && health && (
            <View style={{ padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                System Health
              </Text>

              <View style={{
                backgroundColor: health.status === "healthy" ? "#10B98115" : "#EF444415",
                borderRadius: 14, borderWidth: 1,
                borderColor: health.status === "healthy" ? "#10B981" : "#EF4444",
                padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
              }}>
                <Feather
                  name={health.status === "healthy" ? "check-circle" : "alert-circle"}
                  size={24}
                  color={health.status === "healthy" ? "#10B981" : "#EF4444"}
                />
                <View>
                  <Text style={{ fontSize: 16, fontFamily: f.semibold, color: c.text }}>
                    {health.status === "healthy" ? "All Systems Operational" : "Issues Detected"}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: f.primary, color: c.textMuted, marginTop: 2 }}>
                    {new Date(health.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>

              {Object.entries(health.checks).map(([key, value]) => (
                <View key={key} style={{
                  backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16,
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                }}>
                  <Text style={{ fontSize: 14, fontFamily: f.semibold, color: c.text }}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                  <Text style={{
                    fontSize: 13, fontFamily: f.primary,
                    color: String(value).includes("error") ? "#EF4444" : c.success,
                  }}>
                    {typeof value === "number" ? value.toLocaleString() : String(value)}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => void loadData()}
                style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border, marginTop: 8 }}
              >
                <Text style={{ color: c.text, fontFamily: f.semibold, fontSize: 14 }}>
                  Refresh Health Check
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}