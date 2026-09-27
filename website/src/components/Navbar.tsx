"use client";

import Link from "next/link";
import { useState } from "react";
import { RiMenuLine, RiCloseLine, RiAppleLine } from "react-icons/ri";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(245,247,250,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>
            FinBudget <span style={{ color: "var(--accent)" }}>AI</span>
          </span>
        </Link>

        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }} className="hidden-mobile">
          <Link href="/#features" style={linkStyle}>Features</Link>
          <Link href="/support" style={linkStyle}>Support</Link>
          <Link href="/privacy" style={linkStyle}>Privacy</Link>
          <Link href="/terms" style={linkStyle}>Terms</Link>
          <a href="#download" style={{ background: "var(--accent)", color: "#fff", padding: "0.55rem 1.3rem", borderRadius: 10, fontWeight: 600, fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", boxShadow: "0 1px 2px var(--shadow)" }}>
            <RiAppleLine size={16} /> Download
          </a>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", display: "none", padding: 4 }} className="show-mobile">
          {menuOpen ? <RiCloseLine size={24} /> : <RiMenuLine size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "1rem 2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/#features" style={linkStyle} onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/support" style={linkStyle} onClick={() => setMenuOpen(false)}>Support</Link>
          <Link href="/privacy" style={linkStyle} onClick={() => setMenuOpen(false)}>Privacy</Link>
          <Link href="/terms" style={linkStyle} onClick={() => setMenuOpen(false)}>Terms</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--muted)",
  textDecoration: "none",
  fontSize: "0.9rem",
  fontWeight: 500,
};