"use client";
import AddButton from "../../../components/AddButton";
import { confirmDialog } from "../../components/confirm";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useServerSynced } from "../../../lib/useServerSynced";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";
import EmptyState from "../../../components/ui/EmptyState";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { Search, Package } from "lucide-react";
import { useAramaTohumu } from "../../../lib/useAramaTohumu";
import { useEkleTohumu } from "../../../lib/useEkleTohumu";
import UrunFormu, { type Product } from "./UrunFormu";

/* ⚠️ Form BURADA DEĞIL: `UrunFormu` bileşeninde — üst bardaki hızlı ekleme adası (+) da
   aynı formu açıyor (kullanıcı hangi sayfadaysa orada). İki kopya olmasın. */
export type { Product };

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
  const router = useRouter();
  /* Sunucu verisi değişince liste kendini tazeler — üst bardaki hızlı ekleme adasından (+)
     başka bir sayfadayken kayıt eklenirse `router.refresh()` sonrası burada da görünsün. */
  const [list, setList] = useServerSynced<Product[]>(initial);
  const [query, setQuery] = useState("");
  // Panel geneli aramadan gelindiyse (?q=) kutuyu doldur
  useAramaTohumu(setQuery);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);


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

  // Üst bardaki hızlı ekleme adasından gelindiyse formu aç (?ekle=…)
  useEkleTohumu(() => openNew());

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setOpen(true);
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
    router.refresh();
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
        <EmptyState
          icon={<Package />}
          title="Henüz ürün/hizmet yok"
          hint="Sattığın ürün ve hizmetleri bir kez tanımla; fatura keserken fiyat ve KDV'siyle hazır gelsin."
          action={<AddButton onClick={openNew}>İlk Ürünü Ekle</AddButton>}
        />
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
        <UrunFormu
          profileId={profileId}
          duzenlenen={editing}
          onKapat={() => setOpen(false)}
          onKaydedildi={(kayit, yeniMi) =>
            setList((prev) =>
              yeniMi ? [kayit, ...prev] : prev.map((x) => (x.id === kayit.id ? kayit : x))
            )
          }
        />
      )}
    </>
  );
}
