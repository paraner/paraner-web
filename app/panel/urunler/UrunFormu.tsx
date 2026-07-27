"use client";

/* ÜRÜN / HİZMET FORMU — TEK KOPYA
 * Aynı bileşeni iki yer açar: Ürünler sayfası (ekle/düzenle) ve üst bardaki hızlı
 * ekleme adası (+). Ada açtığında kullanıcı bulunduğu sayfada KALIR.
 * Ayrıntılı gerekçe: `app/panel/HizliEkle.tsx` dosya başı notu.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import SaveButton from "../../../components/SaveButton";

export type Product = {
  id: string;
  name: string;
  type: string | null; // product / service
  code: string | null;
  unit: string | null;
  buy_price: string | null;
  sell_price: string | null;
  vat_rate: string | null;
  stock_quantity: string | null;
  min_stock_alert: string | null;
  category: string | null;
  is_active: boolean;
};

export const UNITS = ["adet", "kg", "lt", "m", "m²", "saat", "paket"];

const COLS =
  "id, name, type, code, unit, buy_price, sell_price, vat_rate, stock_quantity, min_stock_alert, category, is_active";

const num = (s: string) => Number(s.replace(",", ".")) || 0;
const str = (v: unknown, varsayilan = "") => (v != null ? String(v) : varsayilan);

export default function UrunFormu({
  profileId,
  duzenlenen = null,
  onKapat,
  onKaydedildi,
}: {
  profileId: string;
  duzenlenen?: Product | null;
  onKapat: () => void;
  onKaydedildi?: (kayit: Product, yeniMi: boolean) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const submitLock = useSubmitLock();

  const [name, setName] = useState(duzenlenen?.name ?? "");
  const [type, setType] = useState<"product" | "service">(
    duzenlenen?.type === "service" ? "service" : "product"
  );
  const [code, setCode] = useState(duzenlenen?.code ?? "");
  const [unit, setUnit] = useState(duzenlenen?.unit ?? "adet");
  const [category, setCategory] = useState(duzenlenen?.category ?? "");
  const [buyPrice, setBuyPrice] = useState(str(duzenlenen?.buy_price));
  const [sellPrice, setSellPrice] = useState(str(duzenlenen?.sell_price));
  const [vatRate, setVatRate] = useState(str(duzenlenen?.vat_rate, "20"));
  const [stockQty, setStockQty] = useState(str(duzenlenen?.stock_quantity));
  const [minStock, setMinStock] = useState(str(duzenlenen?.min_stock_alert));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Ürün/hizmet adı gerekli.");
      return;
    }
    const isProduct = type === "product";
    const payload = {
      name: name.trim(),
      type,
      code: code.trim() || null,
      unit: isProduct ? unit : null,
      category: category.trim() || null,
      buy_price: num(buyPrice),
      sell_price: num(sellPrice),
      vat_rate: num(vatRate),
      stock_quantity: isProduct ? num(stockQty) : 0,
      min_stock_alert: isProduct ? num(minStock) : 0,
    };

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (duzenlenen) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", duzenlenen.id)
          .select(COLS)
          .single();
        if (error) throw error;
        onKaydedildi?.(data as Product, false);
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, user_id: profileId, is_active: true })
          .select(COLS)
          .single();
        if (error) throw error;
        onKaydedildi?.(data as Product, true);
      }
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
    <Modal
      title={duzenlenen ? "Ürün / Hizmet Düzenle" : "Ürün / Hizmet Ekle"}
      onClose={onKapat}
      busy={saving}
    >
      <form onSubmit={handleSave}>
        <div className="type-toggle">
          <button
            type="button"
            className={type === "product" ? "on-income" : ""}
            onClick={() => setType("product")}
          >
            Ürün
          </button>
          <button
            type="button"
            className={type === "service" ? "on-income" : ""}
            onClick={() => setType("service")}
          >
            Hizmet
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <Field label="Ad">
          <input
            type="text"
            placeholder={type === "service" ? "ör. Danışmanlık" : "ör. A4 Kağıt"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="form-row">
          <Field label="Kod / Barkod (ops.)">
            <input
              type="text"
              placeholder="ör. URN-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Kategori (ops.)">
            <input
              type="text"
              placeholder="ör. Kırtasiye"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
        </div>

        <div className="form-row">
          <Field label="Alış Fiyatı">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
            />
          </Field>
          <Field label="Satış Fiyatı">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
            />
          </Field>
        </div>

        <div className="form-row">
          <Field label="KDV %">
            <input
              type="text"
              inputMode="decimal"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />
          </Field>
          {type === "product" && (
            <Field label="Birim">
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {type === "product" && (
          <div className="form-row">
            <Field label={duzenlenen ? "Stok Miktarı" : "Başlangıç Stoğu"}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
            </Field>
            <Field label="Kritik Stok Uyarısı">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </Field>
          </div>
        )}

        <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </SaveButton>
      </form>
    </Modal>
  );
}
