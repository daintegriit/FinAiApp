const API = "https://finai-backend-466323878357.us-east1.run.app/api";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string | null;
  last_login: string | null;
  age: number | null;
  country: string | null;
  monthly_income: number | null;
  financial_goal: string | null;
  city: string | null;
  state: string | null;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  admin_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_transactions: number;
  total_simulations: number;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function loginAdmin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");

  // Verify admin status
  const meRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const me = await meRes.json();
  if (!me.is_admin) throw new Error("Account does not have admin privileges");

  localStorage.setItem("admin_token", data.access_token);
  return data.access_token;
}

export function logoutAdmin() {
  localStorage.removeItem("admin_token");
}

export async function fetchStats(): Promise<AdminStats> {
  const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchUsers(search?: string): Promise<AdminUser[]> {
  const params = new URLSearchParams({ limit: "200" });
  if (search) params.set("search", search);
  const res = await fetch(`${API}/admin/users?${params}`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function banUser(id: string): Promise<void> {
  await fetch(`${API}/admin/users/${id}/ban`, { method: "POST", headers: authHeaders() });
}

export async function unbanUser(id: string): Promise<void> {
  await fetch(`${API}/admin/users/${id}/unban`, { method: "POST", headers: authHeaders() });
}

export async function deleteUser(id: string): Promise<void> {
  await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
}