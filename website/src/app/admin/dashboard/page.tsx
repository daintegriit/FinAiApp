"use client";
import { RiDashboardLine, RiGroupLine, RiExternalLinkLine, RiLogoutBoxLine } from "react-icons/ri";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchStats,
  fetchUsers,
  banUser,
  unbanUser,
  deleteUser,
  logoutAdmin,
  type AdminUser,
  type AdminStats,
} from "@/services/adminApi";

type Tab = "overview" | "users";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const handleUnauth = useCallback(() => {
    logoutAdmin();
    router.push("/admin");
  }, [router]);

  const loadStats = () => setRefreshCount((c) => c + 1);
  const loadUsers = () => setRefreshCount((c) => c + 1);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin"); return; }

    const statsPromise = fetchStats()
      .then((s) => { setStats(s); setStatsError(""); setStatsLoading(false); })
      .catch((e) => {
        if (e instanceof Error && e.message === "unauthorized") handleUnauth();
        else setStatsError("Failed to load stats");
        setStatsLoading(false);
      });

    const usersPromise = fetchUsers()
      .then((u) => { setUsers(u); setUsersError(""); setUsersLoading(false); })
      .catch((e) => {
        if (e instanceof Error && e.message === "unauthorized") handleUnauth();
        else setUsersError("Failed to load users");
        setUsersLoading(false);
      });

    return () => { void statsPromise; void usersPromise; };
  }, [refreshCount, router, handleUnauth]);

  async function handleBan(id: string) {
    if (!confirm("Ban this user?")) return;
    await banUser(id);
    loadUsers(); loadStats();
  }

  async function handleUnban(id: string) {
    await unbanUser(id);
    loadUsers(); loadStats();
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Permanently delete ${email} and ALL their data? This cannot be undone.`)) return;
    await deleteUser(id);
    loadUsers(); loadStats();
  }

  function handleLogout() {
    logoutAdmin();
    router.push("/admin");
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "1.5rem",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "1rem",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.2rem",
          }}
        >
          FinBudget AI
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.7rem", marginBottom: "2rem" }}>
          Admin Console
        </div>

        <SidebarLabel>Overview</SidebarLabel>
        <SidebarItem active={tab === "overview"} onClick={() => setTab("overview")}>
          <RiDashboardLine size={16} /> Dashboard
        </SidebarItem>

        <SidebarLabel>Manage</SidebarLabel>
        <SidebarItem active={tab === "users"} onClick={() => setTab("users")}>
          <RiGroupLine size={16} /> Users {users.length > 0 && <span style={{ marginLeft: "auto", background: "var(--surface2)", borderRadius: 100, padding: "0.1rem 0.5rem", fontSize: "0.7rem" }}>{users.length}</span>}
        </SidebarItem>

        <div style={{ marginTop: "auto" }}>
          <SidebarItem active={false} onClick={() => router.push("/")}>
            <RiExternalLinkLine size={16} /> View Site
          </SidebarItem>
          <SidebarItem active={false} onClick={handleLogout}>
            <RiLogoutBoxLine size={16} /> Sign Out
          </SidebarItem>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ padding: "2rem 2.5rem", overflowY: "auto" }}>

        {/* Overview tab */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.2rem" }}>Dashboard</h1>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Real-time platform overview</p>
              </div>
              <button onClick={loadStats} style={outlineBtn}>↻ Refresh</button>
            </div>

            {statsLoading ? (
              <div style={loadingStyle}>Loading stats…</div>
            ) : statsError ? (
              <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{statsError}</div>
            ) : stats ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
                  <StatCard label="Total Users" value={stats.total_users} color="accent"
                    sub={`+${stats.new_users_today} today · +${stats.new_users_this_week} this week`} />
                  <StatCard label="Active Users" value={stats.active_users} color="green"
                    sub={`${stats.total_users - stats.active_users} banned`} />
                  <StatCard label="Transactions" value={stats.total_transactions} color="accent"
                    sub="across all users" />
                  <StatCard label="Simulations" value={stats.total_simulations} color="green"
                    sub={`${stats.verified_users} verified users`} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
                  <StatCard label="New Today" value={stats.new_users_today} color="warning" sub="" />
                  <StatCard label="New This Week" value={stats.new_users_this_week} color="warning" sub="" />
                  <StatCard label="Verified" value={stats.verified_users} color="green" sub="" />
                  <StatCard label="Admins" value={stats.admin_users} color="accent" sub="" />
                </div>

                <div style={{ marginTop: "2rem" }}>
                  <button onClick={() => setTab("users")} style={{ ...primaryBtn }}>
                    View All Users →
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.2rem" }}>Users</h1>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                  {usersLoading ? "Loading…" : `${filteredUsers.length} of ${users.length} users`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search email or username…"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "0.5rem 1rem",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                    width: 240,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button onClick={loadUsers} style={outlineBtn}>↻</button>
              </div>
            </div>

            {usersLoading ? (
              <div style={loadingStyle}>Loading users…</div>
            ) : usersError ? (
              <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{usersError}</div>
            ) : (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.855rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
                      {["User", "Status", "Joined", "Location", "Income", "Actions"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "0.75rem 1.25rem",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--muted)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "0.9rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                color: "#fff",
                                flexShrink: 0,
                              }}
                            >
                              {u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{u.email}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                @{u.username}
                                {u.is_admin && <span style={{ color: "var(--accent)", marginLeft: 4 }}>· admin</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "0.9rem 1.25rem" }}>
                          <span style={u.is_active ? activeBadge : bannedBadge}>
                            {u.is_active ? "Active" : "Banned"}
                          </span>
                          {u.is_verified && (
                            <span style={{ ...verifiedBadge, marginLeft: 4 }}>✓</span>
                          )}
                        </td>
                        <td style={{ padding: "0.9rem 1.25rem", color: "var(--muted)", fontSize: "0.8rem" }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "0.9rem 1.25rem", color: "var(--muted)", fontSize: "0.8rem" }}>
                          {u.city && u.state ? `${u.city}, ${u.state}` : "—"}
                        </td>
                        <td style={{ padding: "0.9rem 1.25rem", fontSize: "0.85rem" }}>
                          {u.monthly_income ? `$${u.monthly_income.toLocaleString()}/mo` : "—"}
                        </td>
                        <td style={{ padding: "0.9rem 1.25rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {u.is_active ? (
                              <button onClick={() => handleBan(u.id)} style={dangerBtn}>Ban</button>
                            ) : (
                              <button onClick={() => handleUnban(u.id)} style={successBtn}>Unban</button>
                            )}
                            {!u.is_admin && (
                              <button onClick={() => handleDelete(u.id, u.email)} style={outlineBtnSm}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div style={loadingStyle}>No users found</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem", marginTop: "1.25rem" }}>
      {children}
    </div>
  );
}

function SidebarItem({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.6rem 0.75rem",
        borderRadius: 8,
        fontSize: "0.875rem",
        color: active ? "var(--accent)" : "var(--muted)",
        background: active ? "rgba(124,92,252,0.12)" : "transparent",
        cursor: "pointer",
        marginBottom: "0.15rem",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  const colorMap: Record<string, string> = { accent: "var(--accent)", green: "var(--accent2)", warning: "var(--warning)" };
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem" }}>
      <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500, marginBottom: "0.5rem" }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: colorMap[color] }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

// ── Styles ──
const loadingStyle: React.CSSProperties = { color: "var(--muted)", fontSize: "0.875rem", padding: "2rem", textAlign: "center" };

const primaryBtn: React.CSSProperties = {
  background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
  padding: "0.6rem 1.4rem", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit",
};

const outlineBtn: React.CSSProperties = {
  background: "transparent", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "0.5rem 1rem", fontWeight: 500, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
};

const outlineBtnSm: React.CSSProperties = { ...outlineBtn, padding: "0.35rem 0.75rem", fontSize: "0.78rem" };

const dangerBtn: React.CSSProperties = {
  background: "rgba(255,77,109,0.15)", color: "var(--danger)", border: "1px solid rgba(255,77,109,0.3)",
  borderRadius: 6, padding: "0.35rem 0.75rem", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
};

const successBtn: React.CSSProperties = {
  background: "rgba(0,229,160,0.12)", color: "var(--accent2)", border: "1px solid rgba(0,229,160,0.2)",
  borderRadius: 6, padding: "0.35rem 0.75rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
};

const activeBadge: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", padding: "0.2rem 0.6rem", borderRadius: 100,
  fontSize: "0.72rem", fontWeight: 600, background: "rgba(0,229,160,0.12)", color: "var(--accent2)",
};

const bannedBadge: React.CSSProperties = {
  ...activeBadge, background: "rgba(255,77,109,0.12)", color: "var(--danger)",
};

const verifiedBadge: React.CSSProperties = {
  ...activeBadge, background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.2)",
};