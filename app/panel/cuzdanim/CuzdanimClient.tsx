"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, TZ } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import {
  ASSET_TYPES,
  GOLD_IMAGES,
  getAssetDef,
  getTLValue,
  getUnitPrice,
  getChangePct,
} from "../../../lib/assets";
import { getCurrencyRate, type MarketData } from "../../../lib/market";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { Plus, TrendingDown, RefreshCw, ChevronDown, Check } from "lucide-react";

export type Asset = {
  id: string;
  asset_type: string;
  amount: number;
  avg_cost: number | null;
  purchase_date: string | null;
};

// Dağılım donut'u için renk paleti
const DONUT_COLORS = [
  "#00BFA6", "#4F8DFD", "#F5A623", "#E24B4A", "#9B6DFF",
  "#2ECC71", "#FF7A59", "#00C2D1", "#C0CA33",
];

// Varlık ikonu — altın için gerçek görsel (mobil ile aynı), diğerleri emoji bayrak.
function AssetIcon({ type, size = 22 }: { type: string; size?: number }) {
  const img = GOLD_IMAGES[type];
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={img}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "contain", display: "block" }}
      />
    );
  }
  return <span style={{ fontSize: size - 2, lineHeight: 1 }}>{getAssetDef(type).icon}</span>;
}

// "1.234,56" / "1234.56" / "12,5" → sayı. Virgül varsa ondalık, nokta binlik.
function parseAmount(str: string): number {
  if (!str) return 0;
  const s = str.trim();
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

// Miktarı birime göre biçimle (adet → tam sayı, diğer → 2 ondalık serbest)
function fmtAmount(amount: number, unit: string): string {
  if (unit === "adet") return String(Math.round(amount));
  // Gereksiz sıfırları kırp (12,00 → 12 ; 12,50 → 12,5)
  return amount.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
}

export default function CuzdanimClient({
  profileId,
  currency,
  assets: initial,
  market,
}: {
  profileId: string;
  currency: string;
  assets: Asset[];
  market: MarketData;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<Asset[]>(initial);

  // ── Değerleme ──
  const tlValue = (a: Asset) => getTLValue(a.asset_type, a.amount, market);
  const sorted = useMemo(
    () => [...list].sort((a, b) => tlValue(b) - tlValue(a)),
    [list, market]
  );
  const totalTL = list.reduce((s, a) => s + tlValue(a), 0);

  // Kullanıcı para birimine çevir (TRY değilse Truncgil kuruyla)
  const userRate =
    currency !== "TRY" ? getCurrencyRate(market.currencies, currency) : 0;
  const totalUser =
    currency === "TRY" ? totalTL : userRate > 0 ? totalTL / userRate : 0;

  // Kâr/Zarar (yalnızca maliyeti girilmiş döviz/altın)
  const costed = list.filter((a) => a.avg_cost != null && a.avg_cost > 0);
  const totalCost = costed.reduce((s, a) => s + (a.avg_cost as number) * a.amount, 0);
  const costedNow = costed.reduce((s, a) => s + tlValue(a), 0);
  const totalPL = costedNow - totalCost;
  const totalPLpct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const hasPL = totalCost > 0;

  // Günlük değişim (yaklaşık: cur - cur/(1+pct/100))
  const todayChangeTL = list.reduce((s, a) => {
    const pct = getChangePct(a.asset_type, market);
    if (pct === 0) return s;
    const cur = tlValue(a);
    return s + (cur - cur / (1 + pct / 100));
  }, 0);
  const prevTotal = totalTL - todayChangeTL;
  const todayPct = prevTotal > 0 ? (todayChangeTL / prevTotal) * 100 : 0;
  const hasToday = Math.abs(todayChangeTL) > 0.005;

  // Donut segmentleri
  const segments = useMemo(() => {
    if (totalTL <= 0) return [];
    return sorted
      .map((a, i) => ({
        id: a.id,
        name: getAssetDef(a.asset_type).name,
        value: tlValue(a),
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }))
      .filter((s) => s.value > 0);
  }, [sorted, totalTL, market]);

  // ── Modal durumu ──
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [selling, setSelling] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ekle/Düzenle formu
  const [fType, setFType] = useState("TRY");
  const [typeOpen, setTypeOpen] = useState(false); // varlık türü seçici açık mı
  const [fAmount, setFAmount] = useState("");
  const [fCost, setFCost] = useState("");
  const [fDate, setFDate] = useState("");

  // Satış formu
  const [sAmount, setSAmount] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sDate, setSDate] = useState(todayStr());

  const fDef = getAssetDef(fType);
  const needsCost = fDef.group !== "cash";
  const unitHint = getUnitPrice(fType, market);

  function openAdd() {
    setEditing(null);
    setFType("TRY");
    setTypeOpen(false);
    setFAmount("");
    setFCost("");
    setFDate("");
    setError(null);
    setOpen(true);
  }

  function openEdit(a: Asset) {
    setEditing(a);
    setFType(a.asset_type);
    setFAmount(fmtAmount(a.amount, getAssetDef(a.asset_type).unit));
    setFCost(a.avg_cost != null ? String(a.avg_cost).replace(".", ",") : "");
    setFDate(a.purchase_date ?? "");
    setError(null);
    setOpen(true);
  }

  function openSell(a: Asset) {
    setSelling(a);
    setSAmount("");
    setSPrice(
      getUnitPrice(a.asset_type, market) > 0
        ? String(Math.round(getUnitPrice(a.asset_type, market) * 100) / 100).replace(".", ",")
        : ""
    );
    setSDate(todayStr());
    setError(null);
  }

  // Hareket geçmişi kaydı (best-effort, mobil ile aynı tablo)
  async function recordMovement(m: {
    asset_type: string;
    type: "buy" | "sell";
    amount: number;
    unit_price: number | null;
    date: string;
  }) {
    try {
      await supabase.from("savings_asset_movements").insert({ user_id: profileId, ...m });
    } catch {
      // kritik değil — varlık zaten güncellendi
    }
  }

  const submitLock = useSubmitLock();

  // ── Ekle / Düzenle ──
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const def = getAssetDef(fType);
    const num = def.unit === "adet" ? Math.round(parseAmount(fAmount)) : parseAmount(fAmount);
    if (!num || num <= 0) {
      setError("Geçerli bir miktar gir.");
      return;
    }
    const costNum = needsCost ? parseAmount(fCost) : 0;
    const avgCost = needsCost && costNum > 0 ? costNum : null;
    const purchase = needsCost && fDate ? fDate : null;

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (editing) {
        // Düzenleme: doğrudan ata
        const upd = { amount: num, avg_cost: avgCost, purchase_date: purchase };
        const { error: err } = await supabase
          .from("savings_assets")
          .update(upd)
          .eq("id", editing.id);
        if (err) throw err;
        setList((s) => s.map((a) => (a.id === editing.id ? { ...a, ...upd } : a)));
      } else {
        // Aynı türde varlık varsa ağırlıklı ortalama maliyetle birleştir (mobil mantığı)
        const existing = list.find((a) => a.asset_type === fType);
        if (existing) {
          const newAmount = existing.amount + num;
          let newAvg: number | null = existing.avg_cost ?? null;
          if (avgCost != null) {
            newAvg =
              existing.avg_cost != null && existing.amount > 0
                ? (existing.amount * existing.avg_cost + num * avgCost) / newAmount
                : avgCost;
          }
          const upd: Record<string, unknown> = { amount: newAmount, avg_cost: newAvg };
          if (purchase != null) upd.purchase_date = purchase;
          const { error: err } = await supabase
            .from("savings_assets")
            .update(upd)
            .eq("id", existing.id);
          if (err) throw err;
          setList((s) =>
            s.map((a) =>
              a.id === existing.id
                ? { ...a, amount: newAmount, avg_cost: newAvg, purchase_date: purchase ?? a.purchase_date }
                : a
            )
          );
        } else {
          const row = {
            user_id: profileId,
            asset_type: fType,
            amount: num,
            avg_cost: avgCost,
            purchase_date: purchase,
          };
          const { data, error: err } = await supabase
            .from("savings_assets")
            .insert(row)
            .select("id, asset_type, amount, avg_cost, purchase_date")
            .single();
          if (err) throw err;
          if (data)
            setList((s) => [
              ...s,
              {
                id: data.id,
                asset_type: data.asset_type,
                amount: Number(data.amount),
                avg_cost: data.avg_cost != null ? Number(data.avg_cost) : null,
                purchase_date: data.purchase_date ?? null,
              },
            ]);
        }
        await recordMovement({
          asset_type: fType,
          type: "buy",
          amount: num,
          unit_price: avgCost,
          date: purchase || todayStr(),
        });
      }
      setOpen(false);
      // Sunucu verisini + istemci önbelleğini tazele → başka sayfaya gidip dönünce bayat veri görünmez.
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  // ── Satış ──
  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!selling) return;
    setError(null);
    const def = getAssetDef(selling.asset_type);
    const num = def.unit === "adet" ? Math.round(parseAmount(sAmount)) : parseAmount(sAmount);
    if (!num || num <= 0) {
      setError("Geçerli bir miktar gir.");
      return;
    }
    if (num > selling.amount + 1e-9) {
      setError("Satış miktarı elindeki miktardan fazla olamaz.");
      return;
    }
    const price = parseAmount(sPrice) || null;
    const remaining = selling.amount - num;

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (remaining <= 1e-9) {
        // Tamamen satıldı → varlık kalkar
        const { error: err } = await supabase
          .from("savings_assets")
          .delete()
          .eq("id", selling.id);
        if (err) throw err;
        setList((s) => s.filter((a) => a.id !== selling.id));
      } else {
        // Kısmi satış → miktar düşer, ortalama maliyet aynı kalır
        const { error: err } = await supabase
          .from("savings_assets")
          .update({ amount: remaining })
          .eq("id", selling.id);
        if (err) throw err;
        setList((s) =>
          s.map((a) => (a.id === selling.id ? { ...a, amount: remaining } : a))
        );
      }
      await recordMovement({
        asset_type: selling.asset_type,
        type: "sell",
        amount: num,
        unit_price: price,
        date: sDate,
      });
      setSelling(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Satış kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  // ── Sil ──
  async function handleDelete(a: Asset) {
    if (!(await confirmDialog({ message: `${getAssetDef(a.asset_type).name} varlığı silinsin mi?`, danger: true }))) return;
    const prev = list;
    setList((s) => s.filter((x) => x.id !== a.id));
    const { error: err } = await supabase.from("savings_assets").delete().eq("id", a.id);
    if (err) setList(prev); // geri al
    else router.refresh();
  }

  return (
    <>
      <PageHead
        title="Cüzdanım"
        sub="Birikim ve yatırım varlıkların — canlı piyasa fiyatıyla"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="refresh-btn"
              onClick={() => router.refresh()}
              title="Fiyatları yenile"
            >
              <RefreshCw size={14} />
              <span className="refresh-time" suppressHydrationWarning>
                {new Date(market.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}
              </span>
            </button>
            <AddButton onClick={openAdd}>Varlık Ekle</AddButton>
          </div>
        }
      />

      {market.isStale && (
        <div className="auth-soon" style={{ marginTop: 0, marginBottom: 16, textAlign: "left" }}>
          ⚠️ Güncel piyasa fiyatı alınamadı. Değerler eksik olabilir.
        </div>
      )}

      {/* Portföy özeti */}
      <div className="metric-row" style={{ marginBottom: 22 }}>
        <div className="metric">
          <div className="metric-label">Toplam Değer</div>
          <div className="metric-value">{formatCurrency(totalTL, "TRY")}</div>
          <div className="metric-delta">
            {currency !== "TRY" && totalUser > 0
              ? `≈ ${formatCurrency(totalUser, currency)}`
              : `${list.length} varlık`}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Kâr / Zarar</div>
          <div className={`metric-value ${totalPL >= 0 ? "pos" : "neg"}`}>
            {hasPL ? formatCurrency(totalPL, "TRY") : "—"}
          </div>
          <div className="metric-delta">
            {hasPL ? (
              <span className={totalPL >= 0 ? "up" : "down"}>
                {totalPL >= 0 ? "+" : ""}
                {totalPLpct.toFixed(2)}%
              </span>
            ) : (
              "maliyet girilmemiş"
            )}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Bugün</div>
          <div className={`metric-value ${todayChangeTL >= 0 ? "pos" : "neg"}`}>
            {hasToday
              ? `${todayChangeTL >= 0 ? "+" : ""}${formatCurrency(todayChangeTL, "TRY")}`
              : "—"}
          </div>
          <div className="metric-delta">
            {hasToday ? (
              <span className={todayChangeTL >= 0 ? "up" : "down"}>
                {todayChangeTL >= 0 ? "+" : ""}
                {todayPct.toFixed(2)}%
              </span>
            ) : (
              "değişim yok"
            )}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">
          Henüz varlık yok. <strong>Varlık Ekle</strong> ile başla.
        </div>
      ) : (
        <div className="wallet-layout">
          {/* Dağılım donut'u */}
          {segments.length > 0 && (
            <div className="wallet-donut-card">
              <Donut segments={segments} total={totalTL} />
              <div className="wallet-legend">
                {segments.map((s) => (
                  <div key={s.id} className="wallet-legend-row">
                    <span className="wallet-dot" style={{ background: s.color }} />
                    <span className="wallet-legend-name">{s.name}</span>
                    <span className="wallet-legend-pct">
                      %{((s.value / totalTL) * 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Varlık listesi */}
          <div className="tx-list" style={{ flex: 1 }}>
            {sorted.map((a) => {
              const def = getAssetDef(a.asset_type);
              const val = tlValue(a);
              const pct = getChangePct(a.asset_type, market);
              const pl =
                a.avg_cost != null && a.avg_cost > 0
                  ? val - a.avg_cost * a.amount
                  : null;
              return (
                <div key={a.id} className="tx-row">
                  <div className="tx-main">
                    <span className="wallet-icon">
                      <AssetIcon type={a.asset_type} />
                    </span>
                    <div className="tx-left">
                      <span className="tx-title">{def.name}</span>
                      <span className="tx-meta">
                        {fmtAmount(a.amount, def.unit)} {def.unit}
                        {a.avg_cost != null && a.avg_cost > 0
                          ? ` · ort. ${formatCurrency(a.avg_cost, "TRY")}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="tx-right">
                    <div className="wallet-val">
                      <span className="tx-amount">{formatCurrency(val, "TRY")}</span>
                      <span className="wallet-sub">
                        {pct !== 0 && (
                          <span className={pct >= 0 ? "up" : "down"}>
                            {pct >= 0 ? "▲" : "▼"} %{Math.abs(pct).toFixed(2)}
                          </span>
                        )}
                        {pl != null && (
                          <span className={pl >= 0 ? "up" : "down"}>
                            {pl >= 0 ? " +" : " "}
                            {formatCurrency(pl, "TRY")}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="tx-actions">
                      {def.group !== "cash" && (
                        <button
                          className="tx-edit"
                          onClick={() => openSell(a)}
                          title="Sat"
                        >
                          <TrendingDown size={16} />
                        </button>
                      )}
                      <button className="tx-edit" onClick={() => openEdit(a)} title="Düzenle">
                        <EditIcon />
                      </button>
                      <button
                        className="tx-delete"
                        onClick={() => handleDelete(a)}
                        title="Sil"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ekle / Düzenle modalı */}
      {open && (
        <Modal
          title={editing ? `${getAssetDef(fType).name} Düzenle` : "Varlık Ekle"}
          onClose={() => !saving && setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {!editing && (
              <Field label="Varlık Türü">
                <div className="wallet-type-select">
                  <button
                    type="button"
                    className="wallet-type-trigger"
                    onClick={() => setTypeOpen((o) => !o)}
                    aria-expanded={typeOpen}
                  >
                    <AssetIcon type={fType} size={20} />
                    <span className="wallet-type-trigger-name">{fDef.name}</span>
                    <ChevronDown className={`wallet-type-chev${typeOpen ? " open" : ""}`} />
                  </button>
                  {typeOpen && (
                    <div className="wallet-type-menu">
                      {ASSET_TYPES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`wallet-type-opt${fType === t.id ? " on" : ""}`}
                          onClick={() => {
                            setFType(t.id);
                            setTypeOpen(false);
                            setFAmount("");
                            setFCost("");
                            setFDate("");
                          }}
                        >
                          <AssetIcon type={t.id} size={20} />
                          <span className="wallet-type-opt-name">{t.name}</span>
                          {fType === t.id && <Check className="wallet-type-check" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            )}

            <Field label={`Miktar (${fDef.unit})`}>
              <input
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                autoFocus
              />
            </Field>

            {needsCost && (
              <>
                <Field label="Alış Fiyatı (birim, ₺) · opsiyonel">
                  <input
                    value={fCost}
                    onChange={(e) => setFCost(e.target.value)}
                    inputMode="decimal"
                    placeholder={unitHint > 0 ? formatCurrency(unitHint, "TRY") : "0"}
                  />
                </Field>
                {unitHint > 0 && (
                  <button
                    type="button"
                    className="wallet-hint-btn"
                    onClick={() =>
                      setFCost(String(Math.round(unitHint * 100) / 100).replace(".", ","))
                    }
                  >
                    Güncel birim: <strong>{formatCurrency(unitHint, "TRY")}</strong> · Kullan
                  </button>
                )}
                <Field label="Alış Tarihi · opsiyonel">
                  <input
                    type="date"
                    value={fDate}
                    max={todayStr()}
                    onChange={(e) => setFDate(e.target.value)}
                  />
                </Field>
              </>
            )}

            {error && <p className="form-error">{error}</p>}
            <SaveButton busy={saving} disabled={saving}>
              {saving ? "Kaydediliyor…" : editing ? "Güncelle" : "Ekle"}
            </SaveButton>
          </form>
        </Modal>
      )}

      {/* Satış modalı */}
      {selling && (
        <Modal
          title={`${getAssetDef(selling.asset_type).name} Sat`}
          onClose={() => !saving && setSelling(null)}
          busy={saving}
        >
          <form onSubmit={handleSell}>
            <p className="wallet-modal-info">
              Elindeki:{" "}
              <strong>
                {fmtAmount(selling.amount, getAssetDef(selling.asset_type).unit)}{" "}
                {getAssetDef(selling.asset_type).unit}
              </strong>
            </p>
            <Field label={`Satış Miktarı (${getAssetDef(selling.asset_type).unit})`}>
              <input
                value={sAmount}
                onChange={(e) => setSAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                autoFocus
              />
            </Field>
            <Field label="Satış Fiyatı (birim, ₺) · opsiyonel">
              <input
                value={sPrice}
                onChange={(e) => setSPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
            </Field>
            <Field label="Satış Tarihi">
              <input
                type="date"
                value={sDate}
                max={todayStr()}
                onChange={(e) => setSDate(e.target.value)}
              />
            </Field>
            {error && <p className="form-error">{error}</p>}
            <SaveButton busy={saving} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Satışı Kaydet"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}

// Saf SVG donut (harici kütüphane yok)
function Donut({
  segments,
  total,
}: {
  segments: { id: string; color: string; value: number }[];
  total: number;
}) {
  const size = 132;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="wallet-donut">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s) => {
          const frac = s.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={s.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </g>
    </svg>
  );
}
