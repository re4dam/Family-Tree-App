'use client';

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import styles from "./page.module.css";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<string>("dark");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // Determine active theme on load
    const activeTheme = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(activeTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  // Render a placeholder button during server rendering to prevent layout shift
  if (!mounted) {
    return (
      <button className={styles.themeToggleBtn} aria-label="Toggle theme" disabled>
        <div style={{ width: 16, height: 16 }} />
      </button>
    );
  }

  return (
    <button
      className={styles.themeToggleBtn}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
    </button>
  );
}
