'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { GitBranch, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import styles from "../../auth.module.css";

export default function ShareGatewayPage() {
  const params = useParams();
  const token = params?.token as string;
  const { loginWithShareToken } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No share token provided.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function validateAndAccess() {
      try {
        const { targetPersonId, viewMode } = await loginWithShareToken(token);
        if (isMounted) {
          router.push(`/dashboard?focal=${targetPersonId}&viewMode=${viewMode}`);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error accessing share link:", err);
          setError(err.message || "This share link has expired or is invalid.");
          setLoading(false);
        }
      }
    }

    validateAndAccess();

    return () => {
      isMounted = false;
    };
  }, [token, loginWithShareToken, router]);

  return (
    <div className={styles.authContainer}>
      {/* Background elements */}
      <div className={styles.gridOverlay}></div>
      <div className={`${styles.glowBlob} ${styles.glowBlobLeft}`}></div>
      <div className={`${styles.glowBlob} ${styles.glowBlobRight}`}></div>

      {/* Brand logo header */}
      <Link href="/" className={styles.logoLink}>
        <GitBranch className={styles.logoIcon} />
        <span className={styles.logoText}>FamilyTree</span>
      </Link>

      {/* Glass card */}
      <div className={styles.card} style={{ textAlign: "center", padding: "40px" }}>
        {loading ? (
          <>
            <h1 className={styles.title}>Validating Access Link</h1>
            <p className={styles.subtitle}>Please wait while we confirm your security token...</p>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
              <Loader2 className="animate-spin" size={40} style={{ color: "var(--primary-color)" }} />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <AlertCircle size={48} style={{ color: "#ef4444" }} />
            </div>
            <h1 className={styles.title}>Access Link Expired</h1>
            <p className={styles.subtitle} style={{ marginBottom: "30px" }}>
              {error || "This share link is invalid or has expired."}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Link href="/" className={styles.button} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", width: "auto", padding: "0 24px", height: "40px" }}>
                Go to Homepage
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
