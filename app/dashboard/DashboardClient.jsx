"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { formatTRY, formatUSD, formatDateTR } from "@/lib/format";

// ---- tarih yardımcıları ----
function pad(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function getMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return startOfDay(x);
}
function parseISO(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const PRESETS = [
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" },
  { key: "lastMonth", label: "Geçen Ay" },
  { key: "year", label: "Bu Yıl" },
  { key: "custom", label: "Özel Aralık" },
];

function getRange(preset, customStart, customEnd) {
  const now = new Date();
  switch (preset) {
    case "today":
      return [startOfDay(now), endOfDay(now)];
    case "week": {
      const mon = getMonday(now);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      return [mon, endOfDay(sun)];
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [startOfDay(s), endOfDay(e)];
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return [startOfDay(s), endOfDay(e)];
    }
    case "year": {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear(), 11, 31);
      return [startOfDay(s), endOfDay(e)];
    }
    case "custom": {
      if (!customStart || !customEnd) return [null, null];
      return [startOfDay(parseISO(customStart)), endOfDay(parseISO(customEnd))];
    }
    default:
      return [null, null];
  }
}

const DEFAULT_USD_RATE = 0.031; // 1 TRY yaklaşık kaç USD (canlı kur alınamazsa kullanılır)

export default function DashboardClient({ userName }) {
  const [transactions, setTransactions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [preset, setPreset] = useState("month");
  const [customStart, setCustomStart] = useState(toISODate(new Date()));
  const [customEnd, setCustomEnd] = useState(toISODate(new Date()));

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState("yatirim");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(toISODate(new Date()));
  const [formNote, setFormNote] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [usdRate, setUsdRate] = useState(DEFAULT_USD_RATE);
  const firstFieldRef = useRef(null);

  // ---- işlemleri yükle ----
  const loadTransactions = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error("İstek başarısız");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (e) {
      setLoadError("Kayıtlar yüklenemedi. Sayfayı yenilemeyi deneyin.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ---- USD kurunu al (canlı, yoksa manuel/varsayılan) ----
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("usdRateOverride") : null;
    if (saved) {
      setUsdRate(parseFloat(saved));
      return;
    }
    (async () => {
      try {
        const res = await fetch("https://api.frankfurter.app/latest?from=TRY&to=USD");
        const data = await res.json();
        if (data?.rates?.USD) setUsdRate(data.rates.USD);
      } catch (e) {
        // canlı kur alınamadı, varsayılan kur kullanılmaya devam eder
      }
    })();
  }, []);

  function handleRateChange(e) {
    const val = e.target.value;
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setUsdRate(num);
      window.localStorage.setItem("usdRateOverride", String(num));
    } else if (val === "") {
      window.localStorage.removeItem("usdRateOverride");
    }
  }

  useEffect(() => {
    if (showForm && firstFieldRef.current) firstFieldRef.current.focus();
  }, [showForm]);

  const [rangeStart, rangeEnd] = useMemo(() => getRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (!rangeStart || !rangeEnd) return true;
        const d = parseISO(t.date);
        return d >= rangeStart && d <= rangeEnd;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
  }, [transactions, rangeStart, rangeEnd]);

  const summary = useMemo(() => {
    let toplamYatirim = 0, toplamCekim = 0;
    filtered.forEach((t) => {
      if (t.type === "yatirim") toplamYatirim += t.amount;
      else toplamCekim += t.amount;
    });
    return { toplamYatirim, toplamCekim, net: toplamYatirim - toplamCekim, adet: filtered.length };
  }, [filtered]);

  function openNewForm() {
    setEditingId(null);
    setFormType("yatirim");
    setFormAmount("");
    setFormDate(toISODate(new Date()));
    setFormNote("");
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(t) {
    setEditingId(t.id);
    setFormType(t.type);
    setFormAmount(String(t.amount));
    setFormDate(t.date);
    setFormNote(t.note || "");
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amountNum = parseFloat(String(formAmount).replace(",", "."));
    if (!formAmount || isNaN(amountNum) || amountNum <= 0) {
      setFormError("Lütfen 0'dan büyük geçerli bir tutar girin.");
      return;
    }
    if (!formDate) {
      setFormError("Lütfen bir tarih seçin.");
      return;
    }

    setSubmitting(true);
    setSaveError("");
    const payload = { type: formType, amount: amountNum, date: formDate, note: formNote.trim() };

    try {
      const res = editingId
        ? await fetch(`/api/transactions/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Kayıt işlenirken bir hata oluştu.");
        setSubmitting(false);
        return;
      }

      await loadTransactions();
      setSubmitting(false);
      setShowForm(false);
    } catch (e) {
      setFormError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.");
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setSaveError("Kayıt silinemedi. Lütfen tekrar deneyin.");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  const netPositive = summary.net >= 0;

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Hesap Takip</h1>
          <p className="dash-title-sub">Hoş geldin, {userName}</p>
        </div>
        <div className="dash-header-actions">
          <span className="rate-pill">
            1 ₺ = <input type="number" step="0.0001" value={usdRate} onChange={handleRateChange} /> $
          </span>
          <button className="btn-new" onClick={openNewForm}>+ Yeni Kayıt</button>
          <button className="btn-signout" onClick={() => signOut({ callbackUrl: "/login" })}>Çıkış Yap</button>
        </div>
      </div>

      <div className="tabs-row">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={"tab" + (preset === p.key ? " active" : "")}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="custom-range">
          <label>
            Başlangıç
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </label>
          <label>
            Bitiş
            <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} />
          </label>
        </div>
      )}

      {saveError && <div className="form-error">{saveError}</div>}

      <div className={"hero-box " + (netPositive ? "positive" : "negative")}>
        <div className="hero-left">
          <div className={"hero-icon " + (netPositive ? "positive" : "negative")}>{netPositive ? "↑" : "↓"}</div>
          <div>
            <div className="hero-label">
              <span className="info-dot" title="Seçili tarih aralığındaki toplam yatırım eksi toplam çekim">i</span>
              Genel Toplam
            </div>
            <div className={"hero-value " + (netPositive ? "positive" : "negative")}>{formatTRY(summary.net)}</div>
            <div className="hero-usd">{formatUSD(summary.net * usdRate)}</div>
          </div>
        </div>
        <div className="hero-count">
          İşlem Sayısı
          <b>{summary.adet}</b>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card yatirim">
          <div className="stat-icon">↑</div>
          <div className="stat-label">
            <span className="info-dot" title="Seçili tarih aralığındaki toplam yatırım">i</span>
            Yatırımlar
          </div>
          <div className="stat-amount">{formatTRY(summary.toplamYatirim)}</div>
          <div className="stat-usd">{formatUSD(summary.toplamYatirim * usdRate)}</div>
        </div>
        <div className="stat-card cekim">
          <div className="stat-icon">↓</div>
          <div className="stat-label">
            <span className="info-dot" title="Seçili tarih aralığındaki toplam çekim">i</span>
            Para Çekimleri
          </div>
          <div className="stat-amount">{formatTRY(summary.toplamCekim)}</div>
          <div className="stat-usd">{formatUSD(summary.toplamCekim * usdRate)}</div>
        </div>
      </div>

      <div className="list-panel">
        {!loaded ? (
          <div className="loading-state">Kayıtlar yükleniyor…</div>
        ) : loadError ? (
          <div className="error-state">{loadError}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="big">Bu aralıkta kayıt yok</p>
            <p>Seçili tarih aralığında henüz bir işlem bulunmuyor.</p>
            <p>Yeni bir yatırım ya da çekim eklemek için yukarıdaki butonu kullanın.</p>
          </div>
        ) : (
          <>
            <div className="list-header">
              <span>Tür</span>
              <span>Tutar</span>
              <span>Tarih</span>
              <span>Not</span>
              <span></span>
            </div>
            {filtered.map((t) => (
              <div className="row" key={t.id}>
                <span className={"type-badge " + t.type}>
                  <span className="type-dot"></span>
                  {t.type === "yatirim" ? "Yatırım" : "Çekim"}
                </span>
                <span
                  className="row-amount"
                  style={{ color: t.type === "yatirim" ? "var(--red)" : "var(--green)" }}
                >
                  {t.type === "yatirim" ? "+" : "−"}{formatTRY(t.amount)}
                </span>
                <span className="row-date">{formatDateTR(t.date)}</span>
                {confirmDeleteId === t.id ? (
                  <div className="confirm-row">
                    <span className="confirm-text">Silinsin mi?</span>
                    <button className="confirm-btn yes" onClick={() => handleDelete(t.id)}>Evet, sil</button>
                    <button className="confirm-btn no" onClick={() => setConfirmDeleteId(null)}>Vazgeç</button>
                  </div>
                ) : (
                  <>
                    <span className="row-note">{t.note || "—"}</span>
                    <div className="row-actions">
                      <button className="icon-btn" title="Düzenle" onClick={() => openEditForm(t)}>✎</button>
                      <button className="icon-btn danger" title="Sil" onClick={() => setConfirmDeleteId(t.id)}>🗑</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {showForm && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="modal">
            <h2 className="modal-title">{editingId ? "Kaydı Düzenle" : "Yeni Kayıt"}</h2>
            {formError && <div className="form-error">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>İşlem Türü</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={formType === "yatirim" ? "sel-yatirim" : ""}
                    onClick={() => setFormType("yatirim")}
                  >
                    Yatırım
                  </button>
                  <button
                    type="button"
                    className={formType === "cekim" ? "sel-cekim" : ""}
                    onClick={() => setFormType("cekim")}
                  >
                    Çekim
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="amount">Tutar (₺)</label>
                <input
                  ref={firstFieldRef}
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="date">Tarih</label>
                <input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="note">Not (isteğe bağlı)</label>
                <textarea
                  id="note"
                  rows={3}
                  placeholder="Örn: Aracı kurum transferi"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Kaydediliyor…" : editingId ? "Değişiklikleri Kaydet" : "Kaydı Ekle"}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Vazgeç</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
