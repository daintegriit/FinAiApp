import { api } from "./api";

export interface AnalyticsResponse {
  total_spending: number;
  budget_remaining: number;
  income: number;

  daily_trend: {
    day: number;
    amount: number;
  }[];

  category_breakdown: {
    category: string;
    amount: number;
  }[];
}

export async function getMonthlyAnalytics(): Promise<AnalyticsResponse> {
  try {

    const res = await api.get("/analytics/monthly");

    return res.data;

  } catch (error) {

    console.error("Failed to fetch analytics:", error);
    throw error;

  }
}