"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setResetUrl("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
      } else {
        setStatus("error");
        setMessage(data.error || "请求失败，请重试");
      }
    } catch {
      setStatus("error");
      setMessage("网络错误，请稍后重试");
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
            找回密码
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8">
          {status === "success" ? (
            <div>
              <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                {message}
              </div>

              {resetUrl && (
                <div className="mb-4 p-4 rounded-lg border border-[var(--border)]" style={{ background: "#faf8f5" }}>
                  <p className="text-xs mb-2" style={{ color: "var(--ink-light)" }}>
                    开发环境下重置链接：
                  </p>
                  <a
                    href={resetUrl}
                    className="text-sm break-all hover:underline"
                    style={{ color: "#b45309" }}
                  >
                    {resetUrl}
                  </a>
                  <p className="text-xs mt-2" style={{ color: "var(--ink-light)" }}>
                    点击上方链接即可重置密码，链接有效期为 1 小时。
                  </p>
                </div>
              )}

              <Link
                href="/login"
                className="block w-full text-center py-2.5 rounded-lg text-sm font-medium text-white transition-all mt-4"
                style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}
              >
                返回登录
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>
                找回密码
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-light)" }}>
                输入您的注册邮箱，我们将发送密码重置链接
              </p>

              {status === "error" && (
                <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入注册邮箱"
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
                  disabled={status === "loading"}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}
                >
                  {status === "loading" ? "发送中…" : "发送重置链接"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="text-sm hover:underline"
                  style={{ color: "#b45309" }}
                >
                  ← 返回登录
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "var(--ink-light)" }}>
          让物归物，让心归心
        </p>
      </div>
    </div>
  );
}
