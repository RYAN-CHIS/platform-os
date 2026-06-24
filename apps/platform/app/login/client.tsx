"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      return;
    }

    if (result?.ok) {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        padding: "40px 32px",
        borderRadius: 12,
        background: "#fafaf9",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: "0.15em",
            color: "#292524",
            marginBottom: 4,
          }}>
            允物
          </div>
          <div style={{
            fontSize: 12,
            color: "#78716c",
            letterSpacing: "0.1em",
          }}>
            Platform OS
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              color: "#78716c",
              marginBottom: 6,
            }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yunwuorigin.com"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d6d3d1",
                borderRadius: 6,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              color: "#78716c",
              marginBottom: 6,
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d6d3d1",
                borderRadius: 6,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "8px 12px",
              marginBottom: 16,
              borderRadius: 6,
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              background: loading ? "#a8a29e" : "#292524",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: "center",
          fontSize: 11,
          color: "#a8a29e",
          marginTop: 24,
        }}>
          Yunwu Platform OS v1.0
        </p>
      </div>
    </div>
  );
}
