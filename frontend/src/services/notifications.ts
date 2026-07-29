import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

// ===================================================
// CONFIGURE HOW NOTIFICATIONS APPEAR
// ===================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ===================================================
// REGISTER FOR PUSH NOTIFICATIONS
// ===================================================
// No userId argument — the /notifications/register endpoint derives
// the user from the bearer token and rejects a body user_id.

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications only work on physical devices");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "aba94def-8be2-4272-a03c-0a0efa1e88ed",
    });

    const token = tokenData.data;

    // Save token to backend. Identity comes from the auth token.
    await api.post("/notifications/register", {
      push_token: token,
      platform: Platform.OS,
    });

    console.log("✅ Push token registered:", token);
    return token;

  } catch (err) {
    console.error("❌ Push notification registration failed:", err);
    return null;
  }
}

// ===================================================
// SEND LOCAL NOTIFICATION (for testing)
// ===================================================

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {} },
    trigger: null,
  });
}

// ===================================================
// SCHEDULE BUDGET ALERT
// ===================================================

export async function scheduleBudgetAlert(
  category: string,
  spent: number,
  budget: number
) {
  const pct = Math.round((spent / budget) * 100);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${category} Budget Alert`,
      body: `You've used ${pct}% of your ${category} budget ($${spent} of $${budget})`,
      data: { category, spent: String(spent), budget: String(budget) },
    },
    trigger: null,
  });
}