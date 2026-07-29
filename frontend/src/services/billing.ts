// =====================================================
// FINAI — BILLING (RevenueCat)
// src/services/billing.ts
// =====================================================
// Wraps react-native-purchases. Requires a development build — the
// native SDK does NOT run in Expo Go. You already have an ios/ project
// and expo-dev-client, so this runs in your dev build directly.
//
// Setup outside code:
//   1. App Store Connect / Play Console: create the subscription
//      product (e.g. "finai_unlimited_monthly").
//   2. RevenueCat dashboard: connect both stores, define an entitlement
//      named "unlimited", map the product(s) to it.
//   3. Put the public SDK keys in app config (see API_KEYS below).

import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";

// The entitlement identifier configured in the RevenueCat dashboard.
// This is what grants unlimited simulations.
const ENTITLEMENT_ID = "unlimited";

// Public SDK keys — safe to ship in the app (they're not secrets, the
// way a Stripe secret key is). Read from app config.
const API_KEYS = {
  ios: Constants.expoConfig?.extra?.revenueCatIosKey as string | undefined,
  android: Constants.expoConfig?.extra?.revenueCatAndroidKey as
    | string
    | undefined,
};

let configured = false;

/* =====================================================
   CONFIGURE
===================================================== */
// Call once at app startup, before any other billing call.

export function configureBilling(): void {
  if (configured) return;

  const apiKey = Platform.OS === "ios" ? API_KEYS.ios : API_KEYS.android;

  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        "RevenueCat key missing for",
        Platform.OS,
        "— billing disabled. Set revenueCatIosKey / revenueCatAndroidKey in app config."
      );
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey });
  configured = true;
}

/* =====================================================
   IDENTIFY
===================================================== */
// Tie the device's purchases to your backend user. The app_user_id we
// pass here is exactly what arrives in the webhook's app_user_id field,
// which is how the backend maps a purchase to a User row.

export async function identifyUser(userId: string): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    if (__DEV__) console.error("RevenueCat logIn failed:", err);
  }
}

// Call on logout so the next user on this device starts anonymous.
export async function resetBillingIdentity(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut throws if already anonymous — harmless.
  }
}

/* =====================================================
   ENTITLEMENT CHECK
===================================================== */
// The app's local view of entitlement, straight from the SDK's cached
// CustomerInfo. This is what lifts the paywall immediately after a
// purchase, before the backend webhook round-trips. The backend remains
// the authority for the quota endpoint; this is the optimistic local
// mirror.

export function hasUnlimited(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function checkEntitlement(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return hasUnlimited(info);
  } catch (err) {
    if (__DEV__) console.error("getCustomerInfo failed:", err);
    return false;
  }
}

/* =====================================================
   OFFERINGS
===================================================== */
// The packages available to purchase, as configured in RevenueCat.
// Returns the current offering's packages, or [] if none configured.

export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (err) {
    if (__DEV__) console.error("getOfferings failed:", err);
    return [];
  }
}

/* =====================================================
   PURCHASE
===================================================== */

export interface PurchaseResult {
  success: boolean;
  unlimited: boolean;
  cancelled?: boolean;
  error?: string;
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<PurchaseResult> {
  if (!configured) {
    return { success: false, unlimited: false, error: "Billing not configured" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      success: true,
      unlimited: hasUnlimited(customerInfo),
    };
  } catch (err: any) {
    // The SDK sets userCancelled when the user backs out of the native
    // sheet — that's not an error to surface.
    if (err?.userCancelled) {
      return { success: false, unlimited: false, cancelled: true };
    }
    if (__DEV__) console.error("purchase failed:", err);
    return {
      success: false,
      unlimited: false,
      error: err?.message || "Purchase failed",
    };
  }
}

/* =====================================================
   RESTORE
===================================================== */
// Apple requires a visible "Restore Purchases" action. A user who
// reinstalls, or is on a second device, uses this to regain access.

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!configured) {
    return { success: false, unlimited: false, error: "Billing not configured" };
  }

  try {
    const info = await Purchases.restorePurchases();
    return { success: true, unlimited: hasUnlimited(info) };
  } catch (err: any) {
    if (__DEV__) console.error("restore failed:", err);
    return {
      success: false,
      unlimited: false,
      error: err?.message || "Restore failed",
    };
  }
}