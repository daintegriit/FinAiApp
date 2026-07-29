import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import { api } from "../../src/services/api";
import { useAuth } from "../../src/context/AuthContext";

export default function TermsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/accept-terms");
      await refreshUser();

      // Route based on whether profile exists
      try {
        await api.get("/profile");
        router.replace("/(tabs)" as any);
      } catch {
        router.replace("/(auth)/onboarding" as any);
      }
    } catch (err: any) {
      setError(err?.backendMessage || "Failed to save acceptance. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right", "bottom"]}
    >
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <View
          style={[
            styles.logoBox,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.logoText, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
            F
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
            FinBudgetAI
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Terms & Privacy Policy
          </Text>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >

        <Text style={[styles.intro, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
          Please read these Terms of Service and Privacy Policy carefully before using FinBudgetAI. By tapping "I Agree", you confirm that you have read, understood, and agree to be bound by these terms.
        </Text>

        <Section title="Terms of Service" theme={theme} />

        <SubSection title="1. Not Financial Advice" theme={theme}>
          FinBudgetAI is an AI-powered financial management tool designed to provide general financial insights and budgeting assistance. The information, analysis, scores, and recommendations provided by FinBudgetAI do NOT constitute professional financial, investment, tax, or legal advice. FinBudgetAI is not a licensed financial advisor, broker, or investment manager.{"\n\n"}
          You should not rely solely on FinBudgetAI when making financial decisions. Always consult with a qualified financial professional before making significant financial decisions.
        </SubSection>

        <SubSection title="2. No Guarantee of Outcomes" theme={theme}>
          FinBudgetAI makes no representations or warranties regarding the accuracy, completeness, or reliability of any financial analysis, projections, or recommendations. Past performance data and AI-generated insights do not guarantee future financial outcomes. You acknowledge that all financial decisions carry inherent risk.
        </SubSection>

        <SubSection title="3. Eligibility" theme={theme}>
          You must be at least 18 years of age to use FinBudgetAI. By using the app, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these terms.
        </SubSection>

        <SubSection title="4. User Responsibilities" theme={theme}>
          You are responsible for:{"\n"}
          • Maintaining the security of your account credentials{"\n"}
          • Ensuring the accuracy of financial information you provide{"\n"}
          • Using the app only for lawful purposes{"\n"}
          • Not attempting to reverse-engineer, modify, or misuse the application{"\n"}
          • Keeping your contact information current
        </SubSection>

        <SubSection title="5. Account Termination" theme={theme}>
          FinBudgetAI reserves the right to suspend or terminate your account at any time if you violate these terms or engage in fraudulent, abusive, or illegal activity. You may delete your account at any time through the app settings.
        </SubSection>

        <SubSection title="6. Limitation of Liability" theme={theme}>
          To the maximum extent permitted by law, FinBudgetAI and its developers shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of the app, including but not limited to financial losses resulting from decisions made based on app insights or recommendations.
        </SubSection>

        <SubSection title="7. Intellectual Property" theme={theme}>
          All content, features, AI models, algorithms, and interfaces within FinBudgetAI are the exclusive property of FinBudgetAI and its licensors. You may not reproduce, distribute, or create derivative works without express written permission.
        </SubSection>

        <SubSection title="8. Changes to Terms" theme={theme}>
          We reserve the right to modify these terms at any time. We will notify you of material changes through the app. Continued use of FinBudgetAI after changes constitutes acceptance of the updated terms.
        </SubSection>

        <Section title="Privacy Policy" theme={theme} />

        <SubSection title="1. Information We Collect" theme={theme}>
          We collect the following information to provide and improve our services:{"\n\n"}
          <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.text }}>Personal Information:{"\n"}</Text>
          • Name and email address{"\n"}
          • Username{"\n"}
          • Age{"\n\n"}
          <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.text }}>Financial Information:{"\n"}</Text>
          • Monthly income{"\n"}
          • Employment type{"\n"}
          • Savings, debt, and emergency fund amounts{"\n"}
          • Spending transactions{"\n"}
          • Financial goals and risk tolerance{"\n\n"}
          <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.text }}>Location Information:{"\n"}</Text>
          • City, state, and zip code{"\n"}
          • Approximate geographic coordinates (for local peer benchmarking){"\n\n"}
          <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.text }}>Usage Data:{"\n"}</Text>
          • App interactions and feature usage{"\n"}
          • Device type and operating system
        </SubSection>

        <SubSection title="2. How We Use Your Information" theme={theme}>
          We use your information to:{"\n"}
          • Power AI financial analysis and scoring{"\n"}
          • Generate personalized financial insights and recommendations{"\n"}
          • Compare your financial metrics with anonymized peer benchmarks{"\n"}
          • Improve our AI models and app features{"\n"}
          • Send important account and service notifications{"\n"}
          • Provide customer support{"\n"}
          • Ensure app security and prevent fraud
        </SubSection>

        <SubSection title="3. Data Sharing" theme={theme}>
          We do NOT sell your personal or financial data to third parties.{"\n\n"}
          We may share anonymized, aggregated data for peer benchmarking features — your individual data is never identifiable in these comparisons.{"\n\n"}
          We may share data with:{"\n"}
          • Cloud infrastructure providers (Google Cloud) for app hosting{"\n"}
          • Email service providers for account notifications{"\n"}
          • Law enforcement when required by law
        </SubSection>

        <SubSection title="4. Data Security" theme={theme}>
          We implement industry-standard security measures including:{"\n"}
          • Encrypted data transmission (HTTPS/TLS){"\n"}
          • Secure token-based authentication (JWT){"\n"}
          • Encrypted local storage for sensitive credentials{"\n"}
          • Access controls and authentication on all backend systems{"\n\n"}
          While we take security seriously, no system is 100% secure. We cannot guarantee absolute security of your data.
        </SubSection>

        <SubSection title="5. Data Retention" theme={theme}>
          We retain your data for as long as your account is active. If you delete your account, we will delete your personal and financial data within 30 days, except where retention is required by law.
        </SubSection>

        <SubSection title="6. Your Rights" theme={theme}>
          You have the right to:{"\n"}
          • Access the personal data we hold about you{"\n"}
          • Correct inaccurate data{"\n"}
          • Request deletion of your data{"\n"}
          • Export your data{"\n"}
          • Opt out of non-essential communications{"\n\n"}
          To exercise these rights, contact us at support@finbudgetai.com
        </SubSection>

        <SubSection title="7. Children's Privacy" theme={theme}>
          FinBudgetAI is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we discover we have collected data from a minor, we will delete it immediately.
        </SubSection>

        <SubSection title="8. Third-Party Sign-In" theme={theme}>
          If you sign in using Google or Apple, we receive limited profile information (name, email) from those providers. Please review Google's and Apple's respective privacy policies for details on how they handle your data.
        </SubSection>

        <SubSection title="9. Location Data" theme={theme}>
          Location data is used solely for local peer benchmarking features. We collect your approximate location only when you explicitly grant permission. You can revoke location access at any time through your device settings.
        </SubSection>

        <SubSection title="10. Contact Us" theme={theme}>
          If you have questions about these terms or our privacy practices:{"\n\n"}
          Email: support@finbudgetai.com{"\n"}
          Website: finbudgetai.com
        </SubSection>

        <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
          Last updated: June 2026
        </Text>

      </ScrollView>

      {/* FOOTER */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.divider,
          },
        ]}
      >
        {error && (
          <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: theme.fonts.primary, marginBottom: -4 }}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: accepted ? theme.colors.text : "transparent",
                borderColor: accepted ? theme.colors.text : theme.colors.border,
              },
            ]}
          >
            {accepted && (
              <Text style={{ color: theme.colors.background, fontSize: 12, fontWeight: "700" }}>
                ✓
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.checkLabel,
              { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
            ]}
          >
            I have read and agree to the Terms of Service and Privacy Policy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: accepted ? theme.colors.text : theme.colors.card,
              opacity: accepted ? 1 : 0.5,
            },
          ]}
          onPress={handleAccept}
          disabled={!accepted || loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                {
                  color: accepted ? theme.colors.background : theme.colors.textSecondary,
                  fontFamily: theme.fonts.semibold,
                },
              ]}
            >
              I Agree — Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, theme }: { title: string; theme: any }) {
  return (
    <Text
      style={{
        fontSize: 22,
        letterSpacing: -0.5,
        marginTop: 32,
        marginBottom: 16,
        color: theme.colors.text,
        fontFamily: theme.fonts.semibold,
      }}
    >
      {title}
    </Text>
  );
}

function SubSection({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: any;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 15,
          fontFamily: theme.fonts.semibold,
          color: theme.colors.text,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: theme.fonts.primary,
          color: theme.colors.textSecondary,
          lineHeight: 22,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 20 },
  title: { fontSize: 18, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2 },
  intro: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  lastUpdated: { fontSize: 12, marginTop: 32, textAlign: "center" },
  footer: { padding: 20, borderTopWidth: 1, gap: 14 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkLabel: { flex: 1, fontSize: 13, lineHeight: 20 },
  button: { paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  buttonText: { fontSize: 17 },
});