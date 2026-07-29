"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms", content: `By downloading, installing, or using FinBudget AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the app. We may update these terms at any time, and your continued use constitutes acceptance.` },
  { id: "service", title: "Description of Service", content: `FinBudget AI provides AI-powered personal finance analysis, including financial scoring, scenario simulation, peer benchmarking, and budgeting tools. The service is for informational and educational purposes only and does not constitute financial, investment, legal, or tax advice.` },
  { id: "not-advice", title: "Not Financial Advice", highlight: true, content: `FinBudget AI is not a registered investment advisor, broker-dealer, or financial planner. All content, analysis, scores, projections, and recommendations provided by the app — including any paid features — are for informational and educational purposes only. Projections and simulations are estimates based on the data you provide and on general assumptions; they are not guarantees of future results, and actual outcomes will differ. Nothing in the app should be relied upon as a basis for financial, investment, tax, or legal decisions. You should consult a qualified, licensed professional before making any financial decision.` },
  { id: "billing", title: "Subscriptions & Billing", content: `FinBudget AI offers auto-renewing subscriptions that unlock additional features, including unlimited AI simulations. Payment is charged to your Apple ID or Google account at confirmation of purchase. Subscriptions automatically renew for the same period at the same price unless auto-renew is turned off at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours prior to the end of the current period. The price and billing interval are shown in the app before you purchase and may vary by region.` },
  { id: "cancel", title: "Managing & Cancelling Your Subscription", content: `You can manage or cancel your subscription at any time through your Apple ID or Google account settings, not within the app itself. To cancel, go to your device's account settings, select Subscriptions, choose FinBudget AI, and cancel. Cancellation takes effect at the end of the current billing period; you retain access to paid features until then. Deleting the app does not cancel your subscription.` },
  { id: "refunds", title: "Refunds", content: `All purchases are processed by Apple (App Store) or Google (Play Store), and refunds are handled according to their policies, not directly by FinBudget AI. To request a refund, contact Apple or Google through their support channels. Except where required by law, subscription fees are non-refundable, and partial-period refunds are not provided.` },
  { id: "free-tier", title: "Free Tier & Usage Limits", content: `FinBudget AI provides a limited number of free AI simulations each calendar month. Once the free allowance is used, additional simulations require an active subscription. Free allowances reset at the start of each calendar month. We may change the size of the free allowance or the features included in any tier, with notice where required.` },
  { id: "accounts", title: "User Accounts", content: `You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must be at least 18 years old to use FinBudget AI. You may not transfer your account to another person.` },
  { id: "acceptable-use", title: "Acceptable Use", content: `You agree not to use FinBudget AI to violate any laws, infringe on intellectual property, transmit malware, attempt unauthorized access, scrape or harvest data, or use the service in any way that could harm other users or the platform. We reserve the right to terminate accounts that violate these terms.` },
  { id: "ip", title: "Intellectual Property", content: `All content, features, and functionality of FinBudget AI — including but not limited to AI models, algorithms, designs, and text — are owned by Integriit LLC and protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the service.` },
  { id: "warranties", title: "Disclaimer of Warranties", content: `FinBudget AI is provided "as is" and "as available" without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or completely secure. Financial analysis and scores are based on data you provide and may not reflect your complete financial picture.` },
  { id: "liability", title: "Limitation of Liability", content: `To the maximum extent permitted by law, Integriit LLC and FinBudget AI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including any financial decisions made based on information provided by the app.` },
  { id: "termination", title: "Termination", content: `You may delete your account at any time from within the app. We may suspend or terminate your account if you violate these terms. Upon termination, your right to use the service ceases and we will delete your data in accordance with our Privacy Policy. Terminating your account does not automatically cancel an active App Store or Play Store subscription — cancel that separately through your device settings.` },
  { id: "governing-law", title: "Governing Law", content: `These Terms are governed by the laws of the State of New Mexico, without regard to its conflict of law principles. Any disputes arising from these terms shall be resolved through binding arbitration.` },
  { id: "contact", title: "Contact", content: `For questions about these Terms, contact us at support@finbudgetai.com.` },
];

export default function TermsPage() {
  const [active, setActive] = useState(sections[0].id);
  useEffect(() => {
    const handler = () => {
      const y = window.scrollY + 140;
      let cur = sections[0].id;
      for (const s of sections) { const el = document.getElementById(s.id); if (el && el.offsetTop <= y) cur = s.id; }
      setActive(cur);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <Navbar />
      <header style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border)", background: "radial-gradient(120% 140% at 50% -20%, rgba(37,99,235,0.10) 0%, rgba(22,163,74,0.04) 40%, transparent 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 2rem 3.5rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1.25rem" }}>Legal</div>
          <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: "1rem", background: "linear-gradient(120deg, #111827 20%, #2563EB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Terms of Service</h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 560, lineHeight: 1.7 }}>A legally binding agreement between you and Integriit LLC, the operator of FinBudget AI. Please read these terms carefully before using the app.</p>
          <div style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.85rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent2)" }} />
            Last updated July 28, 2026
          </div>
        </div>
      </header>

      <main className="legal-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "3.5rem 2rem 6rem", display: "grid", gap: "3rem" }}>
        <nav className="legal-toc" aria-label="Sections">
          <div style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.75rem", paddingLeft: "0.75rem" }}>On this page</div>
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} style={{ fontSize: "0.82rem", lineHeight: 1.4, padding: "0.4rem 0.75rem", borderRadius: 8, textDecoration: "none", color: active === s.id ? "var(--text)" : "var(--muted)", background: active === s.id ? "var(--surface2)" : "transparent", borderLeft: active === s.id ? "2px solid var(--accent)" : "2px solid transparent", transition: "all 0.15s ease", display: "flex", gap: "0.6rem" }}>
                <span style={{ color: active === s.id ? "var(--accent)" : "var(--border)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} style={{ scrollMarginTop: 100, background: s.highlight ? "linear-gradient(180deg, #EFF6FF, var(--surface))" : "var(--surface)", border: s.highlight ? "1px solid #BFDBFE" : "1px solid var(--border)", borderRadius: 16, padding: "1.75rem 1.9rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: "0.85rem", color: "var(--text)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums", background: "#DBEAFE", border: "1px solid #BFDBFE", borderRadius: 8, minWidth: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.95rem", paddingLeft: "2.35rem" }}>{s.content}</p>
            </section>
          ))}
        </div>
      </main>

      <Footer />
      <style>{`.legal-grid { grid-template-columns: 260px minmax(0, 1fr); } @media (max-width: 900px) { .legal-grid { grid-template-columns: minmax(0, 1fr) !important; } .legal-toc { display: none; } }`}</style>
    </>
  );
}