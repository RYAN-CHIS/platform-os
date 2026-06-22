"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("无效的重置链接，请重新申请");
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (newPassword.length < 6) {
      setStatus("error");
      setMessage("密码长度不能少于6位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("两次输入的密码不一致");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        // 3秒后跳转到登录页
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "重置失败，请重试");
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
            重置密码
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8">
          {status === "success" ? (
            <div>
              <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                ✅ {message}
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>
                即将跳转到登录页面…
              </p>
              <Link
                href="/login"
                className="block w-full text-center py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}
              >
                立即登录
              </Link>
            </div>
          ) : status === "error" && (!token || !email) ? (
            <div>
              <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                {message}
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}
              >
                重新申请重置链接
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>
                设置新密码
              </h2>
              <p className="text-sm mb-2" style={{ color: "var(--ink-light)" }}>
                为 <strong>{email}</strong> 重置密码
              </p>

              {status === "error" && (
                <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>
                    新密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="至少6位字符"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors pr-10"
                      style={{
                        borderColor: "var(--border)",
                        background: "#faf8f5",
                        color: "var(--ink)",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#b45309"; e.target.style.outline = "none"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: "var(--ink-light)" }}
                    >
                      {showPassword ? "隐藏" : "显示"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink)" }}>
                    确认密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
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
                  {status === "loading" ? "重置中…" : "重置密码"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f8f4ef 0%, #ede4d5 100%)" }}>
        <p style={{ color: "var(--ink-light)" }}>加载中…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
