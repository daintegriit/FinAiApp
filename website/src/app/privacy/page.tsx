"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";

const sections = [
  { id: "collect", title: "Information We Collect", content: `We collect information you provide directly to us when you create an account, including your email address, username, and financial profile data such as income, expenses, savings, and debt. We also collect transaction data you enter manually or import, and usage data about how you interact with the app.` },
  { id: "use", title: "How We Use Your Information", content: `We use your financial data solely to provide you with personalized financial analysis, scores, simulations, and peer benchmarks. We do not use your data for advertising. We use aggregate, anonymized data to improve our models and the accuracy of benchmarks.` },
  { id: "ai", title: "AI Processing", highlight: true, content: `To generate written insights and analysis, portions of the financial information you provide are sent to our third-party AI provider, Anthropic (the maker of Claude), which processes the data to return an analysis to us. This processing is used only to produce your results within the app. We do not permit this data to be used to train third-party AI models. We send only the information needed to generate your analysis, and we do not send it for advertising or resale.` },
  { id: "payment", title: "Payment Information", content: `Subscriptions are purchased and processed through the Apple App Store or Google Play Store. We do not collect or store your payment card details — those are handled directly by Apple or Google. We receive only the subscription status needed to unlock paid features in your account.` },
  { id: "sharing", title: "Data Sharing", content: `We do not sell, rent, or share your personal financial information with third parties for their marketing purposes. We may share anonymized, aggregated data for research or benchmarking purposes. We share data with service providers who help us operate the platform — cloud hosting (Google Cloud), email delivery, and AI processing (Anthropic) — under confidentiality obligations and only as needed to provide the service.` },
  { id: "security", title: "Data Security", content: `Your data is encrypted in transit using industry-standard TLS, and stored in secure, access-controlled cloud infrastructure. Access to your account requires authentication, and each account can only access its own data. However, no system is 100% secure and we cannot guarantee absolute security.` },
  { id: "retention", title: "Data Retention", content: `We retain your data for as long as your account is active. You can request deletion of your account and all associated data at any time from within the app. Upon a verified deletion request, we remove your account and associated data from our active systems.` },
  { id: "rights", title: "Your Rights", content: `You have the right to access, correct, or delete your personal data at any time. You can delete your account and data from within the app. If you are a California resident, you have additional rights under the CCPA. If you are in the EU/EEA or UK, you have rights under GDPR/UK GDPR, including data portability and the right to lodge a complaint with a supervisory authority.` },
  { id: "age", title: "Age Requirement", content: `FinBudget AI is intended for users aged 18 and older and is not directed at children. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected information from someone under 18, we will delete it.` },
  { id: "changes", title: "Changes to This Policy", content: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Your continued use of the app after changes take effect constitutes acceptance of the updated policy.` },
  { id: "contact", title: "Contact Us", content: `This app is operated by Integriit LLC. If you have questions about this Privacy Policy or our data practices, contact us at support@finbudgetai.com or through the Support page.` },
];

export default function PrivacyPage() {
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
          <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: "1rem", background: "linear-gradient(120deg, #111827 20%, #2563EB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Privacy Policy</h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 560, lineHeight: 1.7 }}>FinBudget AI, operated by Integriit LLC, is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>
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