import { api } from "./api";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export interface Transaction {
  id?: string | number;
  user_id?: string;
  category: string;
  merchant?: string;
  note?: string;
  amount: number;
  // Distinguishes one-time purchases (default) from genuinely
  // recurring commitments (subscriptions, rent, loan payments).
  // Determines which financial engine math applies downstream.
  is_recurring?: boolean;
  // Required when is_recurring is true; null/undefined otherwise.
  recurring_term_months?: number | null;
  created_at?: string;
}

// --------------------------------------------------
// INTERNAL NORMALIZER
// --------------------------------------------------

function normalizeTransaction(raw: any): Transaction {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    user_id: raw.user_id || undefined,
    category: raw.category || "Uncategorized",
    merchant: raw.merchant || "",
    note: raw.note || "",
    amount: typeof raw.amount === "string"
      ? parseFloat(raw.amount)
      : raw.amount || 0,
    is_recurring: Boolean(raw.is_recurring),
    recurring_term_months:
      raw.recurring_term_months != null
        ? Number(raw.recurring_term_months)
        : null,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

// --------------------------------------------------
// GET TRANSACTIONS
// --------------------------------------------------

export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const res = await api.get("/transactions");

    const data = Array.isArray(res.data) ? res.data : [];

    const normalized = data.map(normalizeTransaction).sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );

    return normalized;

  } catch (error: any) {
    console.error("❌ Failed to fetch transactions:", error?.response || error.message);
    return [];
  }
}

// --------------------------------------------------
// CREATE TRANSACTION
// --------------------------------------------------

export async function createTransaction(
  data: Transaction
): Promise<Transaction> {
  try {
    if (!data.user_id) {
      throw new Error("user_id is required");
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error("Invalid transaction amount");
    }

    if (!data.category) {
      throw new Error("Transaction category required");
    }
    if (data.is_recurring && !data.recurring_term_months) {
      throw new Error(
        "recurring_term_months is required when is_recurring is true"
      );
    }
    const payload = {
      ...data,
      amount: Number(data.amount),
      is_recurring: Boolean(data.is_recurring),
      recurring_term_months: data.is_recurring
        ? Number(data.recurring_term_months)
        : null,
    };

    const res = await api.post("/transactions", payload);

    return normalizeTransaction(res.data);

  } catch (error: any) {
    console.error("❌ Failed to create transaction:", error?.response || error.message);
    throw error;
  }
}

// --------------------------------------------------
// DELETE TRANSACTION
// --------------------------------------------------

export async function deleteTransaction(
  id: string | number,
  userId: string
): Promise<void> {
  try {
    await api.delete(`/transactions/${id}`);
  } catch (error: any) {
    console.error("❌ Failed to delete transaction:", error?.response || error.message);
    throw error;
  }
}