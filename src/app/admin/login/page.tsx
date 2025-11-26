"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRemainingAttempts(null);
    
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const body = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        // Check if account is locked
        if (res.status === 429) {
          setIsLocked(true);
          setError(body?.error || "Too many failed attempts. Please try again later.");
        } else {
          setError(body?.error || body?.message || res.statusText || "Login failed");
          
          // Show remaining attempts if available
          if (body?.remainingAttempts !== undefined) {
            setRemainingAttempts(body.remainingAttempts);
          }
        }
        
        // Clear password field on error
        setPassword("");
        return;
      }

      // Success - redirect to dashboard
      router.push("/lo-dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f1724] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#0b1220] p-6 rounded shadow"
        autoComplete="off"
      >
        <h1 className="text-xl font-bold text-[#91DCAC] mb-4">Admin Login</h1>

        {error && (
          <div className={`mb-3 text-sm p-3 rounded ${
            isLocked 
              ? 'text-red-300 bg-red-900/30 border border-red-500/50' 
              : 'text-red-400 bg-red-900/20'
          }`}>
            <p className="font-semibold mb-1">{error}</p>
            {remainingAttempts !== null && remainingAttempts > 0 && !isLocked && (
              <p className="text-xs mt-2 text-red-300">
                ⚠️ {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before 24-hour lockout
              </p>
            )}
          </div>
        )}

        {isLocked && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/50 rounded text-yellow-300 text-xs">
            <p className="font-semibold mb-1">🔒 Security Notice</p>
            <p>Your account has been temporarily locked due to multiple failed login attempts. Please wait for the lockout period to expire.</p>
          </div>
        )}

        <label className="block mb-2 text-xs text-[#cbd5e1]">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-[#0b1228] border border-[#1f2937] text-[#e6eef3] disabled:opacity-50 disabled:cursor-not-allowed"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          disabled={isLocked}
          required
        />

        <label className="block mb-2 text-xs text-[#cbd5e1]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-[#0b1228] border border-[#1f2937] text-[#e6eef3] disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="new-password"
          disabled={isLocked}
          required
        />

        <button
          type="submit"
          disabled={loading || isLocked}
          className="w-full px-4 py-2 bg-[#91DCAC] text-black font-semibold rounded hover:bg-[#7dc99a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : isLocked ? "Account Locked" : "Sign in"}
        </button>

        <p className="mt-3 text-xs text-[#94a3b8]">
          This page is intentionally unlinked. Keep credentials safe.
        </p>
        
        <p className="mt-2 text-xs text-[#6b7280]">
          ℹ️ Maximum 3 failed attempts per 24 hours
        </p>
      </form>
    </main>
  );
}