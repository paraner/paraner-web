"use client";

/* TEKLİF FORMU — TEK KOPYA
 * Aynı bileşeni iki yer açar: Teklifler sayfası ve üst bardaki hızlı ekleme adası (+).
 * Ada açtığında kullanıcı bulunduğu sayfada KALIR.
 * Ayrıntılı gerekçe: `app/panel/HizliEkle.tsx` dosya başı notu.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { formatCurrency } from "../../../lib/format";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import SaveButton from "../../../components/SaveButton";
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

const emptyItem = (): Item => ({ description: "", quantity: "1", unitPrice: "", vatRate: "20" });
const num = (s: string) => Number(s.replace(",", ".")) || 0;

export default function TeklifFormu({
  profileId,
  currency,
  onKapat,
  onKaydedildi,
}: {
  profileId: string;
  currency: string;
  onKapat: () => void;
  onKaydedildi?: (kayit: Quote) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const submitLock = useSubmitLock();

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, it) => s + num(it.quantity) * num(it.unitPrice), 0);
  const vatTotal = items.reduce(
    (s, it) => s + (num(it.quantity) * num(it.unitPrice) * num(it.vatRate)) / 100,
    0
  );
  const grand = subtotal + vatTotal;

  function setItem(i: number, key: keyof Item, val: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  /* Teklif numarası KAYDETME ANINDA üretilir.
     ⚠️ Toplam SAYIdan değil, mevcut en BÜYÜK numaradan → teklif silinince mükerrer
     numara oluşmaz (sunucudaki eski hesapla aynı kural).
     ⚠️ Eskiden sayaç sayfa açılırken hesaplanıp prop olarak geliyordu; form artık üst
     bardan da açıldığı için (sayfa yokken) numarayı kendisi sorar. Yan faydası: sayfa
     uzun süre açık kaldığında bayat sayaçla mükerrer numara riski de kalkar. */
  async function sonrakiNumara(): Promise<string> {
    const { data } = await supabase
      .from("quotes")
      .select("quote_number")
      .eq("user_id", profileId);
    const enBuyuk = (data ?? []).reduce((m, r) => {
      const n = parseInt(String(r.quote_number ?? "").replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    return `TEK${String(enBuyuk + 1).padStart(4, "0")}`;
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

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      const number = await sonrakiNumara();
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
      if (iErr) {
        // Kalemler eklenemedi → kalemsiz (yetim) teklif DB'de kalmasın, geri al.
        await supabase.from("quotes").delete().eq("id", (quote as Quote).id);
        throw iErr;
      }

      onKaydedildi?.(quote as Quote);
      onKapat();
      router.refresh();
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  return (
    <Modal title="Teklif Oluştur" onClose={onKapat} busy={saving}>
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

        <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
          {saving ? "Kaydediliyor…" : "Teklifi Kaydet"}
        </SaveButton>
      </form>
    </Modal>
  );
}
