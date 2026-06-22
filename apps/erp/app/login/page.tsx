"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("邮箱或密码错误，请重试");
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f8f4ef 0%, #ede4d5 100%)" }}>
      <div className="w-full max-w-md mx-4">
        {/* 品牌标识 */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}>
            <span className="text-2xl font-bold text-white font-[var(--font-serif-zh)]">允</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--ink)", fontFamily: "var(--font-serif-zh), serif" }}>
            允物
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-light)" }}>
            品牌经营系统
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8">
          <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--ink)" }}>
            登录管理后台
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yunwu.com"
                required
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: "#faf8f5",
                  color: "var(--ink)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#b45309"; e.target.style.outline = "none"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: "#faf8f5",
                  color: "var(--ink)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#b45309"; e.target.style.outline = "none"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}
            >
              {loading ? "登录中…" : "登录"}
            </button>

            <div className="text-right mt-2">
              <a
                href="/forgot-password"
                className="text-xs hover:underline"
                style={{ color: "var(--ink-light)" }}
              >
                忘记密码？
              </a>
            </div>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "var(--ink-light)" }}>
          让物归物，让心归心
        </p>
      </div>
    </div>
  );
}
