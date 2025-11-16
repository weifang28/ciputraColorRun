"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ensure Set-Cookie from server is stored
        body: JSON.stringify({ username, password }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || body?.message || res.statusText || "Login failed");
      }

      // success -> redirect to LO Dashboard
      router.push("/lo-dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f1724] p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#0b1220] p-6 rounded shadow">
        <h1 className="text-xl font-bold text-[#91DCAC] mb-4">Admin Login</h1>

        {error && <div className="mb-3 text-sm text-red-400 bg-red-900/20 p-2 rounded">{error}</div>}

        <label className="block mb-2 text-xs text-[#cbd5e1]">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mb-3 px-3 py-2 rounded bg-[#0b1228] border border-[#1f2937] text-[#e6eef3]" />

        <label className="block mb-2 text-xs text-[#cbd5e1]">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-4 px-3 py-2 rounded bg-[#0b1228] border border-[#1f2937] text-[#e6eef3]" />

        <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-[#91DCAC] text-black font-semibold rounded">
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-3 text-xs text-[#94a3b8]">This page is intentionally unlinked. Keep credentials safe.</p>
      </form>
    </main>
  );
}