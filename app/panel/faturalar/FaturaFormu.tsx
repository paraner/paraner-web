"use client";

/* FATURA FORMU — TEK KOPYA
 * Aynı bileşeni iki yer açar: Faturalar sayfası ve üst bardaki hızlı ekleme adası (+).
 * Ada açtığında kullanıcı bulunduğu sayfada KALIR.
 * Ayrıntılı gerekçe: `app/panel/HizliEkle.tsx` dosya başı notu.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { todayStr } from "../../../lib/date";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import SaveButton from "../../../components/SaveButton";

export type Invoice = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  customer_tax_number: string | null;
  customer_address: string | null;
  note: string | null;
  subtotal: string | null;
  vat_rate: number | null;
  vat_amount: string | null;
  amount: string | null;
  currency: string | null;
  payment_status: string | null;
  status: string | null;
  paid_amount: string | null;
  type: string | null;
  invoice_date: string | null;
  due_date: string | null;
  created_at: string | null;
};

export const INVOICE_COLS =
  "id, invoice_number, customer_name, subtotal, vat_rate, vat_amount, amount, currency, payment_status, status, paid_amount, type, invoice_date, due_date, created_at";

export default function FaturaFormu({
  profileId,
  currency,
  invoicePrefix,
  varsayilanTur = "income",
  onKapat,
  onKaydedildi,
}: {
  profileId: string;
  currency: string;
  invoicePrefix: string;
  /** Sayfadaki tür filtresine göre önceden seçili gelsin (satış / alış). */
  varsayilanTur?: "income" | "expense";
  onKapat: () => void;
  onKaydedildi?: (kayit: Invoice) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const submitLock = useSubmitLock();

  const [type, setType] = useState<"income" | "expense">(varsayilanTur);
  const [customer, setCustomer] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [paid, setPaid] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sub = Number(subtotal.replace(",", ".")) || 0;
    if (!customer.trim()) {
      setError(type === "expense" ? "Tedarikçi/firma adı gerekli." : "Müşteri/firma adı gerekli.");
      return;
    }
    if (sub <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    const rate = Number(vatRate.replace(",", ".")) || 0;
    const vat = (sub * rate) / 100;
    const total = sub + vat;

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      // Numara: mobil ile AYNI atomik RPC → format `PREFIX-000006` + mükerrer numara riski yok.
      const { data: nextNum, error: rpcErr } = await supabase.rpc(
        "get_next_invoice_number",
        { p_profile_id: profileId }
      );
      if (rpcErr) throw rpcErr;
      const number = `${invoicePrefix}-${String(nextNum).padStart(6, "0")}`;
      const title = `${number} - ${customer.trim()}`;
      // Vade: web'de alan yok → fatura tarihi + 30g (invStatus türetmesiyle tutarlı, UTC-güvenli)
      const due = new Date(invoiceDate + "T00:00:00Z");
      due.setUTCDate(due.getUTCDate() + 30);
      const dueDate = due.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: profileId,
          invoice_number: number,
          title,
          customer_name: customer.trim(),
          subtotal: sub,
          vat_rate: rate,
          vat_amount: vat,
          amount: total,
          currency,
          type,
          status: isDraft ? "draft" : "sent",
          payment_status: paid ? "paid" : "unpaid",
          paid_amount: paid ? total : 0,
          invoice_date: invoiceDate,
          due_date: dueDate,
        })
        .select(INVOICE_COLS)
        .single();
      if (error) throw error;

      // Kalem: web basit fatura (kalem editörü yok) → mobil PDF'i boş görmesin diye tek
      // özet kalem yaz (net tutar = subtotal). Non-fatal: patlarsa fatura yine durur.
      await supabase.from("invoice_items").insert({
        invoice_id: (data as Invoice).id,
        description: customer.trim() || "Fatura",
        quantity: 1,
        unit: "adet",
        unit_price: sub,
        vat_rate: rate,
        total: sub,
      });

      // transactions senkronu (mobil ile parite) → ciro/kâr KPI'ları web faturasını görsün.
      // Taslak gerçek gelir değil → yalnız kesinleşmiş (draft olmayan) faturada yaz.
      if (!isDraft) {
        await supabase.from("transactions").insert({
          user_id: profileId,
          invoice_id: (data as Invoice).id,
          title,
          amount: total,
          type,
          category: "Fatura",
          date: invoiceDate,
          currency,
          source: "web",
        });
      }

      onKaydedildi?.(data as Invoice);
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
    <Modal title="Fatura Oluştur" onClose={onKapat} busy={saving}>
      <form onSubmit={handleSave}>
        <div className="type-toggle">
          <button
            type="button"
            className={type === "income" ? "on-income" : ""}
            onClick={() => setType("income")}
          >
            Satış (Kesilen)
          </button>
          <button
            type="button"
            className={type === "expense" ? "on-expense" : ""}
            onClick={() => setType("expense")}
          >
            Alış (Gelen)
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <Field label={type === "expense" ? "Tedarikçi / Firma" : "Müşteri / Firma"}>
          <input
            type="text"
            placeholder="ör. ABC Ltd. Şti."
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="form-row">
          <Field label="Tutar (KDV hariç)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
            />
          </Field>
          <Field label="KDV %">
            <input
              type="text"
              inputMode="decimal"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />
          </Field>
        </div>

        <div className="form-row">
          <Field label="Fatura Tarihi">
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </Field>
          <Field label="Ödeme Durumu">
            <select
              value={paid ? "paid" : "unpaid"}
              onChange={(e) => setPaid(e.target.value === "paid")}
            >
              <option value="unpaid">Ödenmedi</option>
              <option value="paid">Ödendi</option>
            </select>
          </Field>
        </div>

        <label className="inv-draft">
          <input
            type="checkbox"
            checked={isDraft}
            onChange={(e) => setIsDraft(e.target.checked)}
          />
          Taslak olarak kaydet (henüz gönderilmedi)
        </label>

        <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
          {saving ? "Kaydediliyor…" : "Faturayı Kaydet"}
        </SaveButton>
      </form>
    </Modal>
  );
}
