"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, MessageSquare, ScanLine, Coins, Search } from "lucide-react";
import {
  tokenCostUsd,
  formatUsd,
  GEMINI_FLASH_PRICING,
  PRICING_CHECKED_AT,
  PRICING_SOURCE,
} from "../../../lib/aiPricing";

export type AiRow = {
  profil_id: string;
  profil_adi: string;
  email: string;
  message_count: number;
  vision_count: number;
  prompt_tokens: number;
  completion_tokens: number;
};

const ayEtiket = (iso: string) => {
  try {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
};

const nf = (n: number) => n.toLocaleString("tr-TR");

export default function AiClient({
  rows,
  months,
  selected,
}: {
  rows: AiRow[];
  months: string[];
  selected: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  // Ay değişimi sunucuya gidiyor → geri bildirim (denetim cila): seçici kilitlenir + tablo soluklaşır,
  // yoksa yeni ay seçilmiş ama tablo eski ayda kalıyor gibi görünüyordu.
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    if (!query) return rows;
    return rows.filter((r) =>
      `${r.email} ${r.profil_adi}`.toLocaleLowerCase("tr").includes(query),
    );
  }, [rows, q]);

  const toplam = useMemo(() => {
    const t = rows.reduce(
      (a, r) => ({
        prompt: a.prompt + Number(r.prompt_tokens),
        completion: a.completion + Number(r.completion_tokens),
        mesaj: a.mesaj + Number(r.message_count),
        fis: a.fis + Number(r.vision_count),
      }),
      { prompt: 0, completion: 0, mesaj: 0, fis: 0 },
    );
    return { ...t, usd: tokenCostUsd(t.prompt, t.completion) };
  }, [rows]);

  const maxUsd = Math.max(
    0.0000001,
    ...rows.map((r) => tokenCostUsd(Number(r.prompt_tokens), Number(r.completion_tokens))),
  );

  const kpis = [
    { label: "Aylık AI maliyeti", value: formatUsd(toplam.usd), sub: "tahmini · Gemini 2.5 Flash", icon: Coins },
    { label: "Toplam token", value: nf(toplam.prompt + toplam.completion), sub: `${nf(toplam.prompt)} giriş · ${nf(toplam.completion)} çıkış`, icon: Sparkles },
    { label: "Sohbet mesajı", value: nf(toplam.mesaj), sub: "bu ay", icon: MessageSquare },
    { label: "Fiş tarama", value: nf(toplam.fis), sub: "bu ay", icon: ScanLine },
  ];

  return (
    <div>
      <h1 className="admin-h1">AI Kullanımı</h1>
      <p className="admin-sub">
        Hangi hesap ne kadar AI harcadı. Token sayıları Gemini&apos;den <b>birebir</b> geliyor;
        maliyet bu token&apos;ların {PRICING_SOURCE} fiyatlarıyla çarpımıdır (giriş
        ${GEMINI_FLASH_PRICING.inputPerMillionUsd}/1M · çıkış ${GEMINI_FLASH_PRICING.outputPerMillionUsd}/1M,
        {" "}{PRICING_CHECKED_AT} tarihinde doğrulandı). Google fiyat değiştirirse{" "}
        <code>lib/aiPricing.ts</code> güncellenmeli.
      </p>

      <div className="admin-filters">
        <select
          className="admin-select"
          value={selected}
          onChange={(e) => {
            const ay = e.target.value;
            startTransition(() => router.push(`/admin/ai?ay=${ay}`));
          }}
          disabled={pending}
          aria-label="Ay seç"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {ayEtiket(m)}
            </option>
          ))}
        </select>
        <label className="admin-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="E-posta veya isim…" />
        </label>
      </div>

      {/* Ay değişirken veri alanı soluklaşır → "güncelleniyor" görünür (aria-busy erişilebilir) */}
      <div
        aria-busy={pending}
        style={{ opacity: pending ? 0.45 : 1, transition: "opacity 0.15s", pointerEvents: pending ? "none" : undefined }}
      >
      <div className="admin-kpi-grid">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="admin-kpi">
              <span className="admin-kpi-ic">
                <Icon size={18} />
              </span>
              <div className="admin-kpi-label">{k.label}</div>
              <div className="admin-kpi-value">{k.value}</div>
              <div className="admin-kpi-sub">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="admin-panel" style={{ marginTop: 20, padding: 0 }}>
        <div className="admin-panel-head" style={{ padding: "18px 20px 0" }}>
          En çok harcayanlar — {ayEtiket(selected)}
        </div>

        {rows.length === 0 ? (
          <p className="live-empty" style={{ padding: "12px 20px 18px" }}>
            Bu ay AI kullanımı yok.
            <span>
              Token kaydı 17.07.2026&apos;dan itibaren tutuluyor — daha eski kullanımın token
              verisi hiç kaydedilmemişti, geriye dönük hesaplanamıyor.
            </span>
          </p>
        ) : filtered.length === 0 ? (
          <p className="live-empty" style={{ padding: "12px 20px 18px" }}>Eşleşen hesap yok.</p>
        ) : (
          <div className="admin-table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hesap</th>
                  <th>Sohbet</th>
                  <th>Fiş</th>
                  <th>Token (giriş / çıkış)</th>
                  <th>Maliyet</th>
                  <th style={{ width: "22%" }}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const usd = tokenCostUsd(Number(r.prompt_tokens), Number(r.completion_tokens));
                  return (
                    <tr key={r.profil_id}>
                      <td className="admin-td-name">
                        {r.email}
                        <div className="admin-ticket-meta">{r.profil_adi}</div>
                      </td>
                      <td>{nf(Number(r.message_count))}</td>
                      <td>{nf(Number(r.vision_count))}</td>
                      <td className="admin-td-dim">
                        {nf(Number(r.prompt_tokens))} / {nf(Number(r.completion_tokens))}
                      </td>
                      <td>
                        <b>{formatUsd(usd)}</b>
                      </td>
                      <td>
                        <span className="live-bar-track">
                          <span
                            className="live-bar-fill"
                            style={{ width: `${Math.round((usd / maxUsd) * 100)}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
