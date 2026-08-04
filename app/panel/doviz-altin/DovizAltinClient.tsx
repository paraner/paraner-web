"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowLeftRight } from "lucide-react";
import type { CurrencyRate, GoldPrice } from "../../../lib/market";
import { GOLD_IMAGES, GOLD_NAME_MAP } from "../../../lib/assets";
import PageHead from "../../../components/ui/PageHead";

// Truncgil adı → public/gold görseli (assets.ts eşlemesini ters çevirir)
const GOLD_IMG_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(GOLD_NAME_MAP).map(([id, name]) => [name, GOLD_IMAGES[id]])
);

const FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  CHF: "🇨🇭",
  SAR: "🇸🇦",
};

type Tab = "currency" | "gold";

// ₺ biçimi — piyasa kurları her zaman TL cinsindendir.
function tl(n: number, digits = 4) {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function ChangeBadge({ pct }: { pct: number }) {
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className="badge"
      style={{
        background: flat ? "transparent" : up ? "rgba(29,158,117,.14)" : "rgba(226,75,74,.14)",
        color: flat ? "var(--text-dim)" : up ? "var(--income)" : "var(--danger)",
        minWidth: 62,
        justifyContent: "center",
      }}
    >
      {up ? "▲" : flat ? "–" : "▼"} %{Math.abs(pct).toFixed(2)}
    </span>
  );
}

export default function DovizAltinClient({
  currencies,
  gold,
  isStale,
  timestamp,
}: {
  currencies: CurrencyRate[];
  gold: GoldPrice[];
  isStale: boolean;
  timestamp: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("currency");
  const [yenileniyor, basla] = useTransition();

  // ── Çevirici ──
  const [tutar, setTutar] = useState("100");
  const [birim, setBirim] = useState("USD");
  const [ters, setTers] = useState(false); // false: birim → TL, true: TL → birim

  const kur = useMemo(() => {
    const c = currencies.find((x) => x.code === birim);
    if (c) return c.buyRate;
    const g = gold.find((x) => x.name === birim);
    return g?.buyPrice ?? 0;
  }, [birim, currencies, gold]);

  const sonuc = useMemo(() => {
    const n = parseFloat(tutar.replace(",", ".")) || 0;
    if (!kur) return 0;
    return ters ? n / kur : n * kur;
  }, [tutar, kur, ters]);

  const guncelleme = new Date(timestamp).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  const bosVeri = currencies.length === 0 && gold.length === 0;

  return (
    <>
      <PageHead
        title="Döviz & Altın"
        sub={isStale ? "Fiyatlar şu an alınamadı" : `Güncelleme: ${guncelleme}`}
        action={
          <button
            className="btn-ghost"
            onClick={() => basla(() => router.refresh())}
            disabled={yenileniyor}
            title="Fiyatları yenile"
          >
            <RefreshCw size={16} className={yenileniyor ? "spin" : undefined} />
            {yenileniyor ? "Yenileniyor" : "Yenile"}
          </button>
        }
      />

      {bosVeri ? (
        <div className="panel-empty">
          Piyasa verisi şu an alınamıyor. Birazdan tekrar deneyin.
        </div>
      ) : (
        <>
          {/* ── Çevirici ── */}
          <div className="pl-card" style={{ marginBottom: 18 }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              Çevirici
            </div>
            <div className="dv-conv">
              <input
                className="dv-conv-input"
                inputMode="decimal"
                value={tutar}
                onChange={(e) => setTutar(e.target.value)}
                aria-label="Tutar"
              />
              <select
                className="dv-conv-sel"
                value={birim}
                onChange={(e) => setBirim(e.target.value)}
                aria-label="Birim"
              >
                <optgroup label="Döviz">
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Altın">
                  {gold.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                className="btn-ghost dv-conv-swap"
                onClick={() => setTers((v) => !v)}
                title="Yönü değiştir"
                aria-label="Yönü değiştir"
              >
                <ArrowLeftRight size={16} />
              </button>
            </div>
            <div className="dv-conv-out">
              {ters ? (
                <>
                  <span className="dv-conv-out-label">{tutar || 0} TL =</span>
                  <strong>
                    {tl(sonuc, 4)} {birim}
                  </strong>
                </>
              ) : (
                <>
                  <span className="dv-conv-out-label">
                    {tutar || 0} {birim} =
                  </span>
                  <strong>{tl(sonuc, 2)} TL</strong>
                </>
              )}
            </div>
          </div>

          {/* ── Sekmeler ── */}
          <div className="chip-seg" style={{ marginBottom: 16 }}>
            <button className={tab === "currency" ? "active" : ""} onClick={() => setTab("currency")}>
              Döviz
            </button>
            <button className={tab === "gold" ? "active" : ""} onClick={() => setTab("gold")}>
              Altın
            </button>
          </div>

          <div className="tx-list">
            {tab === "currency"
              ? currencies.map((c) => (
                  <div key={c.code} className="tx-row">
                    <div className="tx-main">
                      <span className="dv-ic" aria-hidden>
                        {FLAGS[c.code] ?? "💱"}
                      </span>
                      <div className="tx-left">
                        <span className="tx-title">{c.name}</span>
                        <span className="tx-meta">{c.code}/TRY</span>
                      </div>
                    </div>
                    <div className="tx-right">
                      <div className="dv-prices">
                        <span className="tx-amount">{tl(c.buyRate)}</span>
                        <span className="tx-meta">Satış {tl(c.sellRate)}</span>
                      </div>
                      <ChangeBadge pct={c.changePercent} />
                    </div>
                  </div>
                ))
              : gold.map((g) => (
                  <div key={g.name} className="tx-row">
                    <div className="tx-main">
                      {GOLD_IMG_BY_NAME[g.name] ? (
                        <Image
                          src={GOLD_IMG_BY_NAME[g.name]}
                          alt=""
                          width={30}
                          height={30}
                          className="dv-gold-img"
                        />
                      ) : (
                        <span className="dv-ic" aria-hidden>
                          🪙
                        </span>
                      )}
                      <div className="tx-left">
                        <span className="tx-title">{g.name}</span>
                        <span className="tx-meta">Alış fiyatı</span>
                      </div>
                    </div>
                    <div className="tx-right">
                      <div className="dv-prices">
                        <span className="tx-amount">{tl(g.buyPrice, 2)}</span>
                        <span className="tx-meta">Satış {tl(g.sellPrice, 2)}</span>
                      </div>
                      <ChangeBadge pct={g.changePercent} />
                    </div>
                  </div>
                ))}
          </div>

          <p className="kdv-note">
            Fiyatlar Truncgil üzerinden alınır, 5 dakikada bir tazelenir. Bilgilendirme amaçlıdır;
            işlem yapmadan önce bankanızın/kuyumcunuzun güncel kurunu teyit edin.
          </p>
        </>
      )}
    </>
  );
}
