// =====================================================
// 💎 FINAI — SETTINGS SCREEN
// =====================================================
// FILE:
// app/settings.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert as RNAlert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { api } from "../src/services/api";
import { useTheme } from "../src/theme/ThemeContext";

/* =====================================================
   TYPES
===================================================== */

type ThemeOption = {
  id: string;
  label: string;
  description: string;
};

type NavigationLink = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  path: string;
};

/* =====================================================
   COMPONENT
===================================================== */

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, mode, setThemeMode } = useTheme();
  const { logout, user } = useAuth();

  /* ===================================================
     THEMES
  =================================================== */

  const themes = useMemo<ThemeOption[]>(
    () => [
      { id: "light", label: "Professional", description: "Clean fintech light mode" },
      { id: "night", label: "Night", description: "Executive dark mode" },
      { id: "finTerminal", label: "Fin Terminal", description: "Quant terminal aesthetic" },
      { id: "highContrast", label: "High Contrast", description: "Accessibility + cyber mode" },
      { id: "bloomberg", label: "Bloomberg", description: "Executive dark mode with Bloomberg aesthetic" },
      { id: "wallStreetOLED", label: "Wall Street OLED", description: "Minimal institutional OLED fintech" },
      { id: "quantMatrix", label: "Quant Matrix", description: "Renaissance-grade quant terminal" },
      { id: "deepNavy", label: "Deep Navy", description: "Institutional banking aesthetic" },
      { id: "visionGlass", label: "Vision Glass", description: "Futuristic glass financial OS" },
    ],
    []
  );

  /* ===================================================
     NAVIGATION
  =================================================== */

  const navigationLinks = useMemo<NavigationLink[]>(
    () => [
      { label: "Income Tracker", icon: "attach-money", path: "/income" },
      { label: "Financial Profile", icon: "person-outline", path: "/profile" },
      { label: "Financial Simulations", icon: "trending-up", path: "/simulate" },
      { label: "Analytics Dashboard", icon: "bar-chart", path: "/analytics" },
      { label: "Calendar Timeline", icon: "calendar-today", path: "/calendar" },
    ],
    []
  );

  /* ===================================================
     HANDLERS
  =================================================== */

  function navigateTo(path: string) {
    router.push(path as never);
  }

  /* ===================================================
     UI
  =================================================== */

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        translucent={false}
        backgroundColor={theme.colors.background}
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* =========================================
            HEADER
        ========================================= */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              Settings
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.primary }]}>
              Personalize your experience
            </Text>
          </View>
        </View>

        {/* =========================================
            QUICK ACTION
        ========================================= */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigateTo("/add")}
          style={[styles.quickAddCard, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.quickAddLeft}>
            <MaterialIcons name="add-circle-outline" size={24} color={theme.colors.textInverse} />
            <Text style={[styles.quickAddText, { color: theme.colors.textInverse, fontFamily: theme.fonts.semibold }]}>
              New Transaction
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={theme.colors.textInverse} />
        </TouchableOpacity>

        {/* =========================================
            NAVIGATION
        ========================================= */}
        <Text style={[styles.section, { color: theme.colors.textMuted, fontFamily: theme.fonts.primary }]}>
          Quick Links
        </Text>

        {navigationLinks.map((link) => (
          <TouchableOpacity
            key={link.path}
            activeOpacity={0.8}
            onPress={() => navigateTo(link.path)}
            style={[styles.navLinkCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <View style={styles.leftRow}>
              <MaterialIcons name={link.icon} size={22} color={theme.colors.primary} />
              <Text style={[styles.navLinkTitle, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
                {link.label}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* =========================================
            APPEARANCE
        ========================================= */}
        <Text style={[styles.section, { color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: 24 }]}>
          Appearance
        </Text>

        {themes.map((item) => {
          const isActive = mode === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => setThemeMode(item.id as never)}
              style={[
                styles.themeCard,
                { backgroundColor: theme.colors.card, borderColor: isActive ? theme.colors.primary : theme.colors.border },
              ]}
            >
              <View style={styles.left}>
                <Text style={[styles.themeTitle, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
                  {item.label}
                </Text>
                <Text style={[styles.themeDescription, { color: theme.colors.textMuted, fontFamily: theme.fonts.primary }]}>
                  {item.description}
                </Text>
              </View>
              {isActive && (
                <View style={[styles.activeCircle, { backgroundColor: theme.colors.primary }]}>
                  <Feather name="check" size={14} color={theme.colors.textInverse} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* =========================================
            ADMIN PANEL (only visible to admins)
        ========================================= */}
        {user?.is_admin && (
          <>
            <Text
              style={[
                styles.section,
                { color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: 24 },
              ]}
            >
              Admin
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/admin" as never)}
              style={[
                styles.navLinkCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <View style={styles.leftRow}>
                <MaterialIcons name="admin-panel-settings" size={22} color={theme.colors.primary} />
                <View>
                  <Text style={[styles.navLinkTitle, { color: theme.colors.primary, fontFamily: theme.fonts.semibold }]}>
                    Admin Panel
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                    Manage users, stats & platform
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </>
        )}

        {/* =========================================
            ACCOUNT
        ========================================= */}
        <Text
          style={[styles.section, { color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: 24 }]}
        >
          Account
        </Text>

        {/* SIGN OUT */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            RNAlert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                  await logout();
                  router.replace("/(auth)/login" as any);
                },
              },
            ]);
          }}
          style={[styles.navLinkCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        >
          <View style={styles.leftRow}>
            <MaterialIcons name="logout" size={22} color="#EF4444" />
            <Text style={[styles.navLinkTitle, { color: "#EF4444", fontFamily: theme.fonts.semibold }]}>
              Sign Out
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* DELETE ACCOUNT */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            RNAlert.alert(
              "Delete Account",
              "This permanently deletes your account and all financial data. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await api.delete(`/auth/delete/${user?.id}`);
                      await logout();
                      router.replace("/(auth)/login" as any);
                    } catch {
                      RNAlert.alert("Error", "Failed to delete account. Try again.");
                    }
                  },
                },
              ]
            );
          }}
          style={[styles.navLinkCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        >
          <View style={styles.leftRow}>
            <MaterialIcons name="delete-forever" size={22} color="#EF4444" />
            <Text style={[styles.navLinkTitle, { color: "#EF4444", fontFamily: theme.fonts.semibold }]}>
              Delete Account
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 36 },
  backButton: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleWrapper: { marginLeft: 16, flex: 1 },
  title: { fontSize: 30, letterSpacing: -0.8 },
  subtitle: { marginTop: 2, fontSize: 13 },
  section: { fontSize: 13, marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" },
  quickAddCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, marginBottom: 32, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  quickAddLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  quickAddText: { fontSize: 15 },
  navLinkCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  leftRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  navLinkTitle: { fontSize: 15 },
  themeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 14 },
  left: { flex: 1 },
  themeTitle: { fontSize: 16 },
  themeDescription: { fontSize: 12, marginTop: 4 },
  activeCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
});