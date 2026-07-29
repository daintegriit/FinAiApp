"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RiMailLine, RiShieldLine } from "react-icons/ri";

const faqs = [
  { q: "How do I cancel my subscription?", a: "Subscriptions are managed through your Apple ID or Google account, not inside the app. On iPhone: open Settings → tap your name → Subscriptions → FinBudget AI → Cancel. On Android: open the Play Store → Menu → Subscriptions → FinBudget AI → Cancel. Your access continues until the end of the current billing period. Deleting the app does not cancel your subscription." },
  { q: "How do I get a refund?", a: "Refunds for subscriptions are handled by Apple or Google, not by us. To request one, contact Apple through reportaproblem.apple.com or Google through the Play Store. We're happy to help point you in the right direction — just email us." },
  { q: "How do I delete my account?", a: "Go to Settings → Account → Delete Account in the app. This permanently deletes your account and associated data. Note that deleting your account does not cancel an active subscription — cancel that separately through your device settings." },
  { q: "Is my financial data secure?", a: "Your data is encrypted in transit, stored in access-controlled cloud infrastructure, and each account can only access its own data. We never sell your data or share it with advertisers." },
  { q: "How is my financial score calculated?", a: "Your score is calculated using multiple engines that analyze income, expenses, savings rate, debt load, emergency fund coverage, investment behavior, and peer benchmarks. The score ranges from 0–100. It is for informational purposes only and is not financial advice." },
  { q: "What is the Scenario Simulator?", a: 'The Scenario Simulator lets you model "what if" financial decisions — like taking a new job, paying off debt, or making a large purchase — and see the projected impact on your financial score. Projections are estimates based on the information you provide, not guarantees.' },
  { q: "How does peer benchmarking work?", a: "We compare your financial metrics against anonymized peers in similar demographics (age, income range, region). No individual data is ever shared — only aggregate benchmarks are used." },
  { q: "The app isn't loading — what do I do?", a: "Try force-closing the app and reopening it. If the issue persists, check your internet connection, then try deleting and reinstalling the app. Contact support if the problem continues." },
  { q: "How do I reset my password?", a: 'On the login screen, tap "Forgot Password" and enter your email. You\'ll receive a reset link within a few minutes. Check your spam folder if it doesn\'t arrive.' },
];

const cardBase: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", textDecoration: "none", color: "var(--text)", display: "block" };

export default function SupportPage() {
  return (
    <>
      <Navbar />
      <header style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border)", background: "radial-gradient(120% 140% at 50% -20%, rgba(37,99,235,0.10) 0%, rgba(22,163,74,0.04) 40%, transparent 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 2rem 3.5rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1.25rem" }}>Help Center</div>
          <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: "1rem", background: "linear-gradient(120deg, #111827 20%, #2563EB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Support</h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 560, lineHeight: 1.7 }}>Have a question? Check the FAQs below or reach out directly — we respond within 24 hours.</p>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "3.5rem 2rem 6rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "3.5rem" }}>
          <a href="mailto:support@finbudgetai.com" style={cardBase}>
            <div style={{ color: "var(--accent)", marginBottom: "0.85rem" }}><RiMailLine size={26} /></div>
            <div style={{ fontWeight: 700, marginBottom: "0.4rem", fontSize: "1rem" }}>Email Support</div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>support@finbudgetai.com<br />We respond within 24 hours.</div>
          </a>
          <a href="mailto:support@finbudgetai.com" style={cardBase}>
            <div style={{ color: "var(--accent2)", marginBottom: "0.85rem" }}><RiShieldLine size={26} /></div>
            <div style={{ fontWeight: 700, marginBottom: "0.4rem", fontSize: "1rem" }}>Data & Privacy</div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>Account deletion, data export, and GDPR requests.</div>
          </a>
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Frequently Asked Questions</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>Everything you need to know about accounts, billing, and how FinBudget AI works.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.4rem 1.6rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.6rem", fontSize: "0.98rem", display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                <span style={{ color: "var(--accent)", fontSize: "0.8rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                {faq.q}
              </div>
              <div style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.9rem", paddingLeft: "1.85rem" }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}