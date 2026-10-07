"use client";

import { useState, useEffect } from "react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import {
  RiBrainLine,
  RiLineChartLine,
  RiGroupLine,
  RiLockLine,
  RiFlashlightLine,
  RiEarthLine,
  RiAppleLine,
} from "react-icons/ri";

const features = [
  { icon: <RiBrainLine size={22} />, title: "Financial Score", desc: "A single number that synthesizes your income, debt, savings, and behavior into an actionable score you can actually move." },
  { icon: <RiLineChartLine size={22} />, title: "Scenario Simulator", desc: 'Run "what if" on any financial decision before you make it. New job, big purchase, paying off debt — see the ripple effect.' },
  { icon: <RiGroupLine size={22} />, title: "Peer Benchmarking", desc: "See how your finances stack up against real peers in your city, age group, and income bracket. Real data, no noise." },
  { icon: <RiLockLine size={22} />, title: "Commitment Lock", desc: "Set a financial goal, lock it in, and let the AI hold you accountable with behavioral nudges that actually work." },
  { icon: <RiFlashlightLine size={22} />, title: "Shock Resilience", desc: "Find out how long you'd survive a job loss, medical expense, or market crash. Know before you need to know." },
  { icon: <RiEarthLine size={22} />, title: "Global Impact", desc: "See how your financial decisions ripple outward — ESG scoring, community impact, and long-term wealth trajectory." },
];

const stats = [
  { value: "10+", label: "AI financial engines" },
  { value: "∞", label: "Scenarios you can simulate" },
  { value: "Real", label: "Peer benchmarks" },
  { value: "0", label: "Generic advice" },
];

const flow = [
  "/screenshots/Login.PNG",
  "/screenshots/IncomeScreen.PNG",
  "/screenshots/FinancialProfileScreen.PNG",
  "/screenshots/MainScreen.PNG",
  "/screenshots/TopSignalreading.PNG",
  "/screenshots/MainScreenwithCarCategoryTapped.PNG",
  "/screenshots/Setabudget.PNG",
  "/screenshots/createyourowncategory.PNG",
  "/screenshots/AddTransaction.PNG",
  "/screenshots/calendarOCT26.PNG",
];

function CyclingPhone() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % flow.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
      <div style={{ background: "#0F172A", borderRadius: 40, padding: "0.6rem", maxWidth: 300, width: "100%", boxShadow: "0 30px 60px rgba(17,24,39,0.22), 0 0 0 1px rgba(37,99,235,0.08)" }}>
        <div style={{ borderRadius: 32, overflow: "hidden", background: "#000", aspectRatio: "9 / 19.5", position: "relative" }}>
          {flow.map((srcUrl, idx) => (
            <Image
              key={srcUrl}
              src={srcUrl}
              alt="FinBudget AI screen"
              fill
              priority={idx === 0}
              sizes="(max-width: 768px) 80vw, 300px"
              style={{ objectFit: "cover", opacity: idx === i ? 1 : 0, transition: "opacity 0.6s ease" }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {flow.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={"Screen " + (idx + 1)}
            style={{ width: idx === i ? 20 : 8, height: 8, borderRadius: 100, border: "none", cursor: "pointer", padding: 0, background: idx === i ? "var(--accent)" : "var(--border)", transition: "width 0.3s, background 0.3s" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />

      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "5rem 2rem 4rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }} className="hero-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "var(--accent-soft)", border: "1px solid #BFDBFE", borderRadius: 100, padding: "0.35rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", marginBottom: "1.5rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            ✦ AI-Powered Finance
          </div>
          <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "1.5rem", color: "var(--text)" }}>
            Your money,{" "}
            <span style={{ background: "linear-gradient(120deg, var(--accent), #1D4ED8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              finally smart.
            </span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: 480 }}>
            FinBudget AI analyzes your financial life and gives you a personalized roadmap — not generic tips. See your financial score, simulate decisions before you make them, and benchmark against your peers.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <a href="#download" style={{ background: "var(--accent)", color: "#fff", padding: "0.85rem 2rem", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}>
              Get the App
            </a>
            <a href="#download" style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1.4rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: "0.875rem", fontWeight: 500, color: "var(--text)", textDecoration: "none", boxShadow: "0 1px 3px var(--shadow)" }}>
              <RiAppleLine size={18} /> App Store
            </a>
          </div>
        </div>

        {/* CYCLING_PHONE */}
        <CyclingPhone />

        <style>{`@media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr !important; padding: 3rem 1.5rem 2rem !important; } }`}</style>
      </section>

      {/* STATS */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 2rem", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2rem", textAlign: "center" }} className="stats-grid">
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <style>{`@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 1.5rem !important; } }`}</style>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1rem" }}>Features</div>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "1rem", color: "var(--text)" }}>Built different, on purpose.</h2>
        <p style={{ color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 520, marginBottom: "3rem" }}>
          Most finance apps tell you what you spent. FinBudget AI tells you what it means — and what to do about it.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }} className="features-grid">
          {features.map((f) => (
            <div key={f.title}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem", transition: "border-color 0.2s, box-shadow 0.2s", cursor: "default", boxShadow: "0 1px 3px var(--shadow)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.10)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "0 1px 3px var(--shadow)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: "1rem" }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem", color: "var(--text)" }}>{f.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <style>{`@media (max-width: 768px) { .features-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* PRIVACY */}
      <section style={{ borderTop: "1px solid var(--border)", maxWidth: 1200, margin: "0 auto", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1rem" }}>Privacy</div>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "1rem", color: "var(--text)" }}>Your data. Your rules.</h2>
        <p style={{ color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 520, marginBottom: "1.5rem" }}>
          FinBudget AI never sells your data. Your financial information is encrypted in transit, stored securely, and you can delete your account and all associated data at any time.
        </p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ color: "var(--accent)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500 }}>Privacy Policy →</Link>
          <Link href="/terms" style={{ color: "var(--accent)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500 }}>Terms of Service →</Link>
          <Link href="/support" style={{ color: "var(--accent)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500 }}>Data Deletion Request →</Link>
        </div>
      </section>

      {/* DOWNLOAD */}
      <section id="download" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "5rem 2rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "1rem", color: "var(--text)" }}>Ready to get started?</h2>
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", marginBottom: "2rem" }}>Download FinBudget AI on iOS and start knowing your money.</p>
          <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", background: "var(--accent)", borderRadius: 12, padding: "0.9rem 1.75rem", textDecoration: "none", color: "#fff", fontWeight: 600, fontSize: "0.95rem", boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}>
            <RiAppleLine size={20} /> Download on the App Store
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}