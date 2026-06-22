"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email, password, redirect: false,
    });
    if (result?.error) {
      setError("邮箱或密码错误");
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--yun-bg, #FAFAF9)" }}>
      <div className="w-full max-w-sm p-8 bg-white border" style={{ borderColor: "var(--yun-line, #E8E5DF)" }}>
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-[0.2em]" style={{ color: "var(--yun-text, #2C2C2A)" }}>允物 Brand OS</h1>
          <p className="text-xs mt-2" style={{ color: "var(--yun-subtext, #888780)" }}>品牌操作系统</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--yun-text, #2C2C2A)" }}>邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required className="w-full px-3 py-2 border text-sm bg-white"
              style={{ borderColor: "var(--yun-line, #E8E5DF)", color: "var(--yun-text, #2C2C2A)" }}
              placeholder="admin@yunwuorigin.com" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--yun-text, #2C2C2A)" }}>密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required className="w-full px-3 py-2 border text-sm bg-white"
              style={{ borderColor: "var(--yun-line, #E8E5DF)", color: "var(--yun-text, #2C2C2A)" }} />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-2 text-sm text-white tracking-wider disabled:opacity-50"
            style={{ background: "var(--yun-accent, #A16207)" }}>
            {loading ? "登录中..." : "进入后台"}
          </button>
        </form>
      </div>
    </div>
  );
}
