"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { Search } from "lucide-react";

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

const UNITS = ["adet", "kg", "lt", "m", "m²", "saat", "paket"];

function isLow(p: Product) {
  return (
    p.type !== "service" &&
    p.stock_quantity != null &&
    p.min_stock_alert != null &&
    Number(p.min_stock_alert) > 0 &&
    Number(p.stock_quantity) <= Number(p.min_stock_alert)
  );
}

export default function UrunlerClient({
  profileId,
  currency,
  products: initial,
}: {
  profileId: string;
  currency: string;
  products: Product[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Product[]>(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState<"product" | "service">("product");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("adet");
  const [category, setCategory] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [stockQty, setStockQty] = useState("");
  const [minStock, setMinStock] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [list, query]);

  const productCount = list.filter((p) => p.type !== "service").length;
  const serviceCount = list.filter((p) => p.type === "service").length;
  const lowCount = list.filter(isLow).length;

  function openNew() {
    setEditing(null);
    setName("");
    setType("product");
    setCode("");
    setUnit("adet");
    setCategory("");
    setBuyPrice("");
    setSellPrice("");
    setVatRate("20");
    setStockQty("");
    setMinStock("");
    setError(null);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name);
    setType(p.type === "service" ? "service" : "product");
    setCode(p.code ?? "");
    setUnit(p.unit ?? "adet");
    setCategory(p.category ?? "");
    setBuyPrice(p.buy_price != null ? String(p.buy_price) : "");
    setSellPrice(p.sell_price != null ? String(p.sell_price) : "");
    setVatRate(p.vat_rate != null ? String(p.vat_rate) : "20");
    setStockQty(p.stock_quantity != null ? String(p.stock_quantity) : "");
    setMinStock(p.min_stock_alert != null ? String(p.min_stock_alert) : "");
    setError(null);
    setOpen(true);
  }

  const num = (s: string) => Number(s.replace(",", ".")) || 0;

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
    const cols =
      "id, name, type, code, unit, buy_price, sell_price, vat_rate, stock_quantity, min_stock_alert, category, is_active";

    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Product) : x)));
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, user_id: profileId, is_active: true })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as Product, ...prev]);
      }
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!(await confirmDialog({ message: `"${p.name}" katalogdan kaldırılsın mı?`, danger: true }))) return;
    // Soft delete (mobil ile aynı): is_active = false
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", p.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <>
      <PageHead
        title="Ürün / Hizmet Kataloğu"
        sub="Sattığın ürün ve hizmetler"
        action={
          <AddButton onClick={openNew}>Ürün / Hizmet</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Ürün</div>
            <div className="t-value">{productCount}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Hizmet</div>
            <div className="t-value">{serviceCount}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Düşük Stok</div>
            <div className="t-value" style={{ color: lowCount ? "var(--warning)" : undefined }}>
              {lowCount}
            </div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">
          Henüz ürün/hizmet yok. Sağ üstten ilkini ekle.
        </div>
      ) : (
        <>
          <div className="filter-row">
            <div className="chip-search">
              <Search />
              <input
                type="text"
                placeholder="Ürün, kod veya kategori ara…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel-empty">Eşleşen ürün yok.</div>
          ) : (
            <div className="card-grid">
              {filtered.map((p) => {
                const isService = p.type === "service";
                return (
                  <div key={p.id} className="acct-card" onClick={() => openEdit(p)}>
                    <div className="acct-actions">
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        aria-label="Düzenle"
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        aria-label="Sil"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <div className="acct-top">
                      <span className="acct-name">{p.name}</span>
                      <span className="acct-badge">{isService ? "Hizmet" : "Ürün"}</span>
                    </div>
                    <div className="acct-balance">
                      {formatCurrency(Number(p.sell_price) || 0, currency)}
                    </div>
                    <div className="acct-sub">
                      {[
                        p.code,
                        p.category,
                        !isService
                          ? `Stok: ${Number(p.stock_quantity) || 0} ${p.unit ?? ""}`.trim()
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || currency}
                      {isLow(p) && <span className="badge amber low-badge">Düşük stok</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {open && (
        <Modal
          title={editing ? "Ürün / Hizmet Düzenle" : "Ürün / Hizmet Ekle"}
          onClose={() => setOpen(false)}
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
                <Field label={editing ? "Stok Miktarı" : "Başlangıç Stoğu"}>
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
      )}
    </>
  );
}
