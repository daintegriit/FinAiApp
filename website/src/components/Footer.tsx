import Link from "next/link";
import { RiMailLine, RiTwitterXLine, RiGithubLine } from "react-icons/ri";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "2.5rem 2rem", marginTop: "auto", background: "var(--surface)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "var(--text)", marginBottom: "0.25rem" }}>
            FinBudget <span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            © {new Date().getFullYear()} Integriit LLC. All rights reserved.
          </div>
        </div>

        <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/privacy" style={footerLink}>Privacy Policy</Link>
          <Link href="/terms" style={footerLink}>Terms of Service</Link>
          <Link href="/support" style={footerLink}>Support</Link>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <a href="mailto:support@finbudgetai.com" style={{ color: "var(--muted)", display: "flex" }} aria-label="Email">
              <RiMailLine size={18} />
            </a>
            <a href="https://twitter.com/finbudgetai" style={{ color: "var(--muted)", display: "flex" }} aria-label="Twitter">
              <RiTwitterXLine size={18} />
            </a>
            <a href="https://github.com/finbudgetai" style={{ color: "var(--muted)", display: "flex" }} aria-label="GitHub">
              <RiGithubLine size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const footerLink: React.CSSProperties = {
  color: "var(--muted)",
  textDecoration: "none",
  fontSize: "0.85rem",
};