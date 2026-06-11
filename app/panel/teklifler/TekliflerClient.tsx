"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type Quote = {
  id: string;
  quote_number: string | null;
  customer_name: string;
  grand_total: string | null;
  currency: string;
  status: string;
  valid_until: string | null;
  created_at?: string;
};

type Item = { description: string; quantity: string; unitPrice: string; vatRate: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Taslak", cls: "gray" },
  sent: { label: "Gönderildi", cls: "amber" },
  accepted: { label: "Kabul edildi", cls: "green" },
  rejected: { label: "Reddedildi", cls: "red" },
  invoiced: { label: "Faturalandı", cls: "green" },
};
const STATUS_OPTS = Object.entries(STATUS).map(([id, v]) => ({ id, label: v.label }));

const emptyItem = (): Item => ({ description: "", quantity: "1", unitPrice: "", vatRate: "20" });
const num = (s: string) => Number(s.replace(",", ".")) || 0;

export default function TekliflerClient({
  profileId,
  currency,
  quotes: initial,
  nextNumber,
}: {
  profileId: string;
  currency: string;
  quotes: Quote[];
  nextNumber: number;
}) {
  const supabase = createClient();
  const [list, setList] = useState<Quote[]>(initial);
  const [counter, setCounter] = useState(nextNumber);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  const subtotal = items.reduce((s, it) => s + num(it.quantity) * num(it.unitPrice), 0);
  const vatTotal = items.reduce(
    (s, it) => s + (num(it.quantity) * num(it.unitPrice) * num(it.vatRate)) / 100,
    0
  );
  const grand = subtotal + vatTotal;

  function openNew() {
    setCustomer("");
    setPhone("");
    setEmail("");
    setValidUntil("");
    setNote("");
    setItems([emptyItem()]);
    setError(null);
    setOpen(true);
  }

  function setItem(i: number, key: keyof Item, val: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer.trim()) {
      setError("Müşteri adı gerekli.");
      return;
    }
    const valid = items.filter((it) => it.description.trim() && num(it.unitPrice) > 0);
    if (valid.length === 0) {
      setError("En az bir geçerli kalem ekle (açıklama + fiyat).");
      return;
    }

    const number = `TEK${String(counter).padStart(4, "0")}`;
    setSaving(true);
    try {
      const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .insert({
          user_id: profileId,
          quote_number: number,
          customer_name: customer.trim(),
          customer_phone: phone.trim() || null,
          customer_email: email.trim() || null,
          subtotal,
          vat_total: vatTotal,
          grand_total: grand,
          currency,
          status: "draft",
          valid_until: validUntil || null,
          note: note.trim() || null,
        })
        .select("id, quote_number, customer_name, grand_total, currency, status, valid_until")
        .single();
      if (qErr) throw qErr;

      const rows = valid.map((it) => {
        const q = num(it.quantity) || 1;
        const p = num(it.unitPrice);
        const v = num(it.vatRate);
        return {
          quote_id: (quote as Quote).id,
          description: it.description.trim(),
          quantity: q,
          unit: "adet",
          unit_price: p,
          vat_rate: v,
          total: q * p * (1 + v / 100),
        };
      });
      const { error: iErr } = await supabase.from("quote_items").insert(rows);
      if (iErr) throw iErr;

      setList((prev) => [quote as Quote, ...prev]);
      setCounter((c) => c + 1);
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(q: Quote, status: string) {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", q.id);
    if (error) return;
    setList((prev) => prev.map((x) => (x.id === q.id ? { ...x, status } : x)));
  }

  async function handleDelete(q: Quote) {
    if (!confirm(`${q.quote_number ?? "Teklif"} silinsin mi?`)) return;
    const { error } = await supabase.from("quotes").delete().eq("id", q.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== q.id));
  }

  const acceptedTotal = list
    .filter((q) => q.status === "accepted")
    .reduce((s, q) => s + (Number(q.grand_total) || 0), 0);

  return (
    <>
      <PageHead
        title="Teklifler"
        sub="Müşteri teklif ve proformaları"
        action={
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            + Teklif Oluştur
          </button>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Toplam Teklif</div>
            <div className="t-value">{list.length}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Kabul Edilen Tutar</div>
            <div className="t-value">{formatCurrency(acceptedTotal, currency)}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz teklif yok. Sağ üstten oluştur.</div>
      ) : (
        <div className="tx-list">
          {list.map((q) => {
            const st = STATUS[q.status] ?? { label: q.status, cls: "gray" };
            return (
              <div key={q.id} className="tx-row">
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: "var(--teal)" }} />
                  <div className="tx-left">
                    <span className="tx-title">{q.customer_name}</span>
                    <span className="tx-meta">
                      {[
                        q.quote_number,
                        q.valid_until ? `Geçerlilik: ${formatDate(q.valid_until)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  <span className="tx-amount">
                    {formatCurrency(Number(q.grand_total) || 0, q.currency || currency)}
                  </span>
                  <select
                    value={q.status}
                    onChange={(e) => changeStatus(q, e.target.value)}
                    aria-label="Durum"
                    style={{ width: "auto", padding: "6px 8px", fontSize: 12 }}
                  >
                    {STATUS_OPTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button className="tx-delete" onClick={() => handleDelete(q)} aria-label="Sil">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title="Teklif Oluştur" onClose={() => setOpen(false)} busy={saving}>
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <Field label="Müşteri">
                <input
                  type="text"
                  placeholder="ör. ABC Ltd."
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Telefon (ops.)">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>

            <div className="form-row">
              <Field label="E-posta (ops.)">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Geçerlilik Tarihi (ops.)">
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </Field>
            </div>

            <div className="qi-head">Kalemler</div>
            <div className="qi-list">
              {items.map((it, i) => (
                <div key={i} className="qi-row">
                  <input
                    className="qi-desc"
                    type="text"
                    placeholder="Açıklama"
                    value={it.description}
                    onChange={(e) => setItem(i, "description", e.target.value)}
                  />
                  <input
                    className="qi-qty"
                    type="text"
                    inputMode="decimal"
                    placeholder="Adet"
                    value={it.quantity}
                    onChange={(e) => setItem(i, "quantity", e.target.value)}
                  />
                  <input
                    className="qi-price"
                    type="text"
                    inputMode="decimal"
                    placeholder="Birim ₺"
                    value={it.unitPrice}
                    onChange={(e) => setItem(i, "unitPrice", e.target.value)}
                  />
                  <input
                    className="qi-vat"
                    type="text"
                    inputMode="decimal"
                    placeholder="KDV%"
                    value={it.vatRate}
                    onChange={(e) => setItem(i, "vatRate", e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-btn danger qi-del"
                    onClick={() => removeItem(i)}
                    aria-label="Kalemi sil"
                    disabled={items.length === 1}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm qi-add" onClick={addItem}>
              + Kalem Ekle
            </button>

            <div className="qi-totals">
              <div className="qi-tline">
                <span>Ara Toplam</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="qi-tline">
                <span>KDV</span>
                <span>{formatCurrency(vatTotal, currency)}</span>
              </div>
              <div className="qi-tline qi-grand">
                <span>Genel Toplam</span>
                <span>{formatCurrency(grand, currency)}</span>
              </div>
            </div>

            <Field label="Not (ops.)">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={saving}
              style={{ marginTop: 4 }}
            >
              {saving ? "Kaydediliyor…" : "Teklifi Kaydet"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
