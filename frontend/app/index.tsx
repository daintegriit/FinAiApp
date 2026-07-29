import { Redirect } from "expo-router";
import { useFinanceStore } from "../src/store/financeStore";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const profile = useFinanceStore((s) => s.profile);
  const hasHydrated = useFinanceStore((s) => s.hasHydrated);
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for hydration and auth
  if (!hasHydrated || isLoading) return null;

  // Not logged in → go to login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in but no local profile → go to tabs
  // (tabs/index.tsx will check backend profile and redirect to onboarding if needed)
  return <Redirect href="/(tabs)" />;
}