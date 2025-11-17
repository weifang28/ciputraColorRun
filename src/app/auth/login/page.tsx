"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accessCode.trim()) {
      setError("Access code is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessCode: accessCode.trim() }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || body?.message || res.statusText || "Login failed");
      }

      // successful login -> go to profile page
      router.push("/profilePage");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Login with Access Code</h1>
        <p className="text-sm mb-4 text-gray-600">
          Enter your registration access code (sent to your email) to view your profile and purchases.
        </p>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Access Code</span>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md"
              placeholder="e.g. test_user or code from email"
              autoFocus
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-md shadow"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/registration")}
              className="px-4 py-2 border rounded-md"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}