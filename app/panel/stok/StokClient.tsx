"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";

export type StokProduct = {
  id: string;
  name: string;
  unit: string | null;
  buy_price: string | null;
  sell_price: string | null;
  stock_quantity: string | null;
  min_stock_alert: string | null;
  code: string | null;
  category: string | null;
};

export type Movement = {
  id: string;
  product_id: string;
  type: string; // in / out / adjustment
  quantity: string | null;
  unit_price: string | null;
  note: string | null;
  date: string | null;
  products: { name: string | null; unit: string | null } | null;
};

type MovType = "in" | "out" | "adjustment";

const MOV_LABEL: Record<string, string> = {
  in: "Giriş",
  out: "Çıkış",
  adjustment: "Düzeltme",
};

function isLow(p: StokProduct) {
  return (
    p.stock_quantity != null &&
    p.min_stock_alert != null &&
    Number(p.min_stock_alert) > 0 &&
    Number(p.stock_quantity) <= Number(p.min_stock_alert)
  );
}

export default function StokClient({
  profileId,
  currency,
  products: initialProducts,
  movements: initialMovements,
}: {
  profileId: string;
  currency: string;
  products: StokProduct[];
  movements: Movement[];
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<StokProduct[]>(initialProducts);
  const [movements, setMovements] = useState<Movement[]>(initialMovements);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<StokProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [movType, setMovType] = useState<MovType>("in");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  const lowCount = products.filter(isLow).length;
  const stockValue = products.reduce(
    (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.buy_price) || 0),
    0
  );

  function openMove(p: StokProduct) {
    setTarget(p);
    setMovType("in");
    setQty("");
    setUnitPrice(p.buy_price != null ? String(p.buy_price) : "");
    setNote("");
    setDate(todayStr());
    setError(null);
    setOpen(true);
  }

  const num = (s: string) => Number(s.replace(",", ".")) || 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError(null);

    const amount = num(qty);
    if (amount <= 0 && movType !== "adjustment") {
      setError("Geçerli bir miktar gir.");
      return;
    }
    const current = Number(target.stock_quantity) || 0;
    let newQty = current;
    if (movType === "in") newQty = current + amount;
    else if (movType === "out") {
      if (amount > current) {
        setError(`Stok yetersiz. Mevcut: ${current} ${target.unit ?? ""}`.trim());
        return;
      }
      newQty = current - amount;
    } else {
      newQty = amount; // düzeltme: yeni stok miktarı
    }

    setSaving(true);
    try {
      const { data: mov, error: movErr } = await supabase
        .from("stock_movements")
        .insert({
          product_id: target.id,
          user_id: profileId,
          type: movType,
          quantity: amount,
          unit_price: unitPrice.trim() ? num(unitPrice) : null,
          note: note.trim() || null,
          date,
        })
        .select("id, product_id, type, quantity, unit_price, note, date")
        .single();
      if (movErr) throw movErr;

      const { error: updErr } = await supabase
        .from("products")
        .update({ stock_quantity: newQty })
        .eq("id", target.id);
      if (updErr) throw updErr;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === target.id ? { ...p, stock_quantity: String(newQty) } : p
        )
      );
      setMovements((prev) => [
        {
          ...(mov as Omit<Movement, "products">),
          products: { name: target.name, unit: target.unit },
        },
        ...prev,
      ]);
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead title="Stok Takibi" sub="Ürün stokları ve hareketleri" />

      {products.length === 0 ? (
        <div className="panel-empty">
          Stoklu ürün yok. Önce Ürün Kataloğu&apos;ndan ürün ekle.
        </div>
      ) : (
        <>
          <div className="total-banner">
            <div className="t-item">
              <div className="t-label">Ürün Çeşidi</div>
              <div className="t-value">{products.length}</div>
            </div>
            <div className="t-item">
              <div className="t-label">Stok Değeri (alış)</div>
              <div className="t-value">{formatCurrency(stockValue, currency)}</div>
            </div>
            <div className="t-item">
              <div className="t-label">Düşük Stok</div>
              <div className="t-value" style={{ color: lowCount ? "var(--warning)" : undefined }}>
                {lowCount}
              </div>
            </div>
          </div>

          <div className="tx-list">
            {products.map((p) => (
              <div key={p.id} className="tx-row">
                <div className="tx-main">
                  <span
                    className="tx-dot"
                    style={{ background: isLow(p) ? "var(--warning)" : "var(--teal)" }}
                  />
                  <div className="tx-left">
                    <span className="tx-title">{p.name}</span>
                    <span className="tx-meta">
                      {[p.code, p.category].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  {isLow(p) && <span className="badge amber">Düşük</span>}
                  <span className="tx-amount" style={{ color: "var(--text)" }}>
                    {Number(p.stock_quantity) || 0} {p.unit ?? ""}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => openMove(p)}>
                    Hareket
                  </button>
                </div>
              </div>
            ))}
          </div>

          {movements.length > 0 && (
            <>
              <div className="section-title">Son Hareketler</div>
              <div className="tx-list">
                {movements.map((m) => {
                  const isIn = m.type === "in";
                  const isAdj = m.type === "adjustment";
                  const sign = isAdj ? "" : isIn ? "+" : "−";
                  return (
                    <div key={m.id} className="tx-row">
                      <div className="tx-main">
                        <span
                          className="tx-dot"
                          style={{
                            background: isAdj
                              ? "var(--text-dim)"
                              : isIn
                              ? "var(--teal)"
                              : "var(--danger)",
                          }}
                        />
                        <div className="tx-left">
                          <span className="tx-title">{m.products?.name ?? "—"}</span>
                          <span className="tx-meta">
                            {[
                              MOV_LABEL[m.type] ?? m.type,
                              m.date ? formatDate(m.date) : null,
                              m.note,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      </div>
                      <div className="tx-right">
                        <span
                          className="tx-amount"
                          style={{
                            color: isAdj
                              ? "var(--text)"
                              : isIn
                              ? "var(--teal)"
                              : "var(--danger)",
                          }}
                        >
                          {sign}
                          {Number(m.quantity) || 0} {m.products?.unit ?? ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {open && target && (
        <Modal title={`Stok Hareketi · ${target.name}`} onClose={() => setOpen(false)} busy={saving}>
          <form onSubmit={handleSave}>
            <div className="chip-seg" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className={movType === "in" ? "active on-income" : ""}
                onClick={() => setMovType("in")}
              >
                Giriş
              </button>
              <button
                type="button"
                className={movType === "out" ? "active on-expense" : ""}
                onClick={() => setMovType("out")}
              >
                Çıkış
              </button>
              <button
                type="button"
                className={movType === "adjustment" ? "active" : ""}
                onClick={() => setMovType("adjustment")}
              >
                Düzeltme
              </button>
            </div>

            <div className="form-hint">
              Mevcut stok: <strong>{Number(target.stock_quantity) || 0} {target.unit ?? ""}</strong>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <Field label={movType === "adjustment" ? "Yeni Stok Miktarı" : "Miktar"}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Birim Fiyat (ops.)">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Tarih">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Not (ops.)">
                <input
                  type="text"
                  placeholder="ör. Tedarikçi alımı"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={saving}
              style={{ marginTop: 4 }}
            >
              {saving ? "Kaydediliyor…" : "Hareketi Kaydet"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
