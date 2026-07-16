'use client';

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, User, Search, Share2, Shield, Layers, Play, Database, BookOpen, LogOut } from "lucide-react";
import styles from "./page.module.css";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleCtaClick = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className={styles.container}>
      {/* Background decoration */}
      <div className={styles.gridOverlay}></div>
      <div className={styles.glowBlob1}></div>
      <div className={styles.glowBlob2}></div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <GitBranch className={styles.logoIcon} />
          <span className={styles.logoText}>FamilyTree</span>
        </div>
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#stack" className={styles.navLink}>Tech Stack</a>
          <a href="/graphql" target="_blank" className={styles.navLink}>GraphQL Playground</a>
          
          {!loading && user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "14px", color: "var(--text-color)", fontWeight: 500 }}>
                {user.username} ({user.role})
              </span>
              <button 
                onClick={logout} 
                className={styles.themeToggleBtn} 
                style={{ width: "auto", padding: "0 12px", display: "flex", gap: "6px" }}
                aria-label="Logout"
              >
                <LogOut size={14} />
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>Login</Link>
              <Link href="/register" className={styles.navLink}>Register</Link>
            </>
          )}
          
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Interactive Web App & API</span>
          <h1 className={styles.title}>
            Discover and Map Your <span className={styles.gradientText}>Family Lineage</span>
          </h1>
          <p className={styles.subtitle}>
            A premium, high-performance family tree application powered by Next.js, 
            React Flow, .NET 10, HotChocolate GraphQL, and PostgreSQL.
          </p>
          <div className={styles.ctaGroup}>
            <button className={styles.primaryButton} onClick={handleCtaClick}>
              <Play size={18} fill="currentColor" />
              <span>
                {!loading && user ? "Go to Dashboard" : "Sign In to Launch"}
              </span>
            </button>
            <a 
              href="https://github.com/dotnet/efcore" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.secondaryButton}
            >
              <BookOpen size={18} />
              <span>Explore Schema</span>
            </a>
          </div>
        </div>

        {/* Visual Mockup - Dynamic Graph Box */}
        <div className={styles.mockupContainer}>
          <div className={styles.mockupHeader}>
            <div className={styles.mockupDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className={styles.mockupAddress}>app.familytree.local</div>
          </div>
          <div className={styles.mockupBody}>
            {/* Minimal SVG family tree mockup */}
            <svg className={styles.familySvg} viewBox="0 0 400 240">
              {/* Edges */}
              <path d="M100,60 L200,60 M200,60 L200,120 M200,120 L100,180 M200,120 L300,180" className={styles.svgLine} />
              
              {/* Nodes */}
              <g transform="translate(60, 40)">
                <rect width="80" height="40" rx="6" className={`${styles.nodeRect} ${styles.maleNode}`} />
                <text x="40" y="24" className={styles.nodeText}>John (Grandpa)</text>
              </g>
              <g transform="translate(260, 40)">
                <rect width="80" height="40" rx="6" className={`${styles.nodeRect} ${styles.femaleNode}`} />
                <text x="40" y="24" className={styles.nodeText}>Mary (Grandma)</text>
              </g>
              <g transform="translate(60, 160)">
                <rect width="80" height="40" rx="6" className={`${styles.nodeRect} ${styles.maleNode} ${styles.activeNode}`} />
                <text x="40" y="24" className={styles.nodeText}>David (Father)</text>
              </g>
              <g transform="translate(260, 160)">
                <rect width="80" height="40" rx="6" className={`${styles.nodeRect} ${styles.femaleNode}`} />
                <text x="40" y="24" className={styles.nodeText}>Sarah (Aunt)</text>
              </g>

              {/* Subtitle / click simulation indicator */}
              <circle cx="100" cy="180" r="15" className={styles.clickPulse} />
            </svg>
            <div className={styles.mockupDrawer}>
              <div className={styles.drawerAvatar}>D</div>
              <div className={styles.drawerTitle}>David Smith</div>
              <div className={styles.drawerDetails}>
                <span>Born: 1978 (Estimated)</span>
                <span>Children: 2</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Key Features Configured</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <GitBranch className={styles.featureIcon} />
            <h3>Graph Visualization</h3>
            <p>Render ancestors, descendants, and multi-partner timelines dynamically using React Flow with zoom, pan, and collapsible branches.</p>
          </div>
          <div className={styles.featureCard}>
            <Search className={styles.featureIcon} />
            <h3>Fuzzy Attribute Search</h3>
            <p>Find records by partial names, birth dates, or location ranges instantly with recursive ancestor/descendant lineage paths.</p>
          </div>
          <div className={styles.featureCard}>
            <Shield className={styles.featureIcon} />
            <h3>Role-Based Access</h3>
            <p>Flexible permissions model securing operations across Viewer, Admin, and Super Admin roles using ASP.NET Core Identity & JWT.</p>
          </div>
          <div className={styles.featureCard}>
            <Share2 className={styles.featureIcon} />
            <h3>Shareable Links</h3>
            <p>Generate secure, time-expiring links that provide read-only access to specific branches without requiring full account signup.</p>
          </div>
        </div>
      </section>

      {/* Tech Stack Layer */}
      <section id="stack" className={styles.stackSection}>
        <h2 className={styles.sectionTitle}>Built on Recommended Tech Stack</h2>
        <div className={styles.stackLayers}>
          <div className={styles.stackItem}>
            <Layers className={styles.stackLayerIcon} />
            <div className={styles.stackDetails}>
              <h4>Frontend Surface</h4>
              <p>Next.js 16 (React 19) + TypeScript + React Flow for reactive graph panning, lazy-loading, and UI drawer components.</p>
            </div>
          </div>
          <div className={styles.stackItem}>
            <Database className={styles.stackLayerIcon} />
            <div className={styles.stackDetails}>
              <h4>GraphQL Backend API</h4>
              <p>.NET 10 Web API + HotChocolate GraphQL, utilizing EF Core pooled factories for high concurrency and PostgreSQL for recursive SQL path queries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Family Tree App. Ready for implementation phase.</p>
      </footer>
    </div>
  );
}
