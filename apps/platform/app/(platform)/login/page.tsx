"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Unified Login Page
 *
 * Single entry point for ERP + Brand OS + Platform
 * After login, user is redirected based on their role/permissions.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("邮箱或密码错误");
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push("/platform");
      router.refresh();
    } catch {
      setError("登录失败，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f1eb]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-sm border border-stone-200 flex items-center justify-center">
            <span className="text-2xl">允</span>
          </div>
          <h1 className="text-xl font-semibold tracking-[0.15em] text-stone-800">
            允物 Platform OS
          </h1>
          <p className="text-sm text-stone-400 mt-2 tracking-wider">
            统一管理后台
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-600 mb-1.5">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition"
              placeholder="admin@yunwu.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-600 mb-1.5">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium tracking-wider hover:bg-stone-700 transition disabled:opacity-50"
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>

        <p className="text-center text-xs text-stone-400 mt-6">
          © 2026 允物 Platform OS
        </p>
      </div>
    </div>
  );
}
