"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kayıt sırasında bir hata oluştu.");
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", { redirect: false, email, password });
      setLoading(false);
      if (signInRes?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Hesap Oluştur</h1>
        <p className="auth-sub">Kendi kayıtlarınızı takip etmeye başlayın</p>
        {error && <div className="form-error">{error}</div>}
        <label>
          Ad Soyad
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          E-posta
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Şifre
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          Şifre (Tekrar)
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Kayıt oluşturuluyor…" : "Kayıt Ol"}
        </button>
        <p className="auth-alt">
          Zaten hesabınız var mı? <Link href="/login">Giriş yapın</Link>
        </p>
      </form>
    </div>
  );
}
