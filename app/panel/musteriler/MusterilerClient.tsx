"use client";
import AddButton from "../../../components/AddButton";
import EmptyState from "../../../components/ui/EmptyState";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import PageHead from "../../../components/ui/PageHead";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { Search, Users } from "lucide-react";
import { useAramaTohumu } from "../../../lib/useAramaTohumu";
import { useEkleTohumu } from "../../../lib/useEkleTohumu";
import MusteriFormu, { type Contact } from "./MusteriFormu";

/* ⚠️ Form BURADA DEĞİL: `MusteriFormu` bileşeninde. Sebep: aynı formu üst bardaki hızlı
   ekleme adası (+) da açıyor — kullanıcı hangi sayfadaysa orada. İki kopya olmasın. */
export type { Contact };

export default function MusterilerClient({
  profileId,
  contacts: initial,
}: {
  profileId: string;
  contacts: Contact[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<Contact[]>(initial);
  const [filter, setFilter] = useState<"all" | "customer" | "supplier">("all");
  const [query, setQuery] = useState("");
  // Panel geneli aramadan gelindiyse (?q=) kutuyu doldur
  useAramaTohumu(setQuery);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  /* ⚠️ Sunucu verisi değişince listeyi TAZELE. Liste `useState(initial)` ile bir kez
     tohumlanıyor; üst bardaki hızlı ekleme adasından (+) başka bir sayfadayken kart
     eklenirse `router.refresh()` sunucu verisini yeniler ama `useState` onu görmez →
     kullanıcı bu sayfaya gelince "eklediğim kart yok" derdi. */
  useEffect(() => setList(initial), [initial]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (filter !== "all" && c.type !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    });
  }, [list, filter, query]);

  const customerCount = list.filter((c) => c.type === "customer").length;
  const supplierCount = list.filter((c) => c.type === "supplier").length;

  // Üst bardaki hızlı ekleme adasından gelindiyse formu aç (?ekle=…)
  useEkleTohumu(() => openNew());

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setOpen(true);
  }

  async function handleDelete(c: Contact) {
    if (!(await confirmDialog({ message: `"${c.name}" silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("contacts").delete().eq("id", c.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== c.id));
    router.refresh();
  }

  return (
    <>
      <PageHead
        title="Müşteri / Tedarikçi Kartları"
        sub="Müşteri ve tedarikçi bilgileri"
        action={
          <AddButton onClick={openNew}>Kart Ekle</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Müşteri</div>
            <div className="t-value">{customerCount}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Tedarikçi</div>
            <div className="t-value">{supplierCount}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Henüz müşteri/tedarikçi kartın yok"
          hint="Kartı bir kez oluştur; fatura keserken, tahsilat girerken ve raporlarda hazır gelsin."
          action={<AddButton onClick={openNew}>İlk Kartı Ekle</AddButton>}
        />
      ) : (
        <>
          <div className="filter-row">
            <div className="chip-search">
              <Search />
              <input
                type="text"
                placeholder="Ad, firma veya telefon ara…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="chip-seg">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
                Tümü
              </button>
              <button
                className={filter === "customer" ? "active on-income" : ""}
                onClick={() => setFilter("customer")}
              >
                Müşteri
              </button>
              <button
                className={filter === "supplier" ? "active on-expense" : ""}
                onClick={() => setFilter("supplier")}
              >
                Tedarikçi
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel-empty">Eşleşen kart yok.</div>
          ) : (
            <div className="tx-list">
              {filtered.map((c) => (
                <div key={c.id} className="tx-row">
                  <div className="tx-main">
                    <span className="avatar-chip">{c.name.charAt(0).toUpperCase()}</span>
                    <div className="tx-left">
                      <span className="tx-title">{c.name}</span>
                      <span className="tx-meta">
                        {[c.company_name, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="tx-right">
                    <span className={`badge ${c.type === "supplier" ? "amber" : "green"}`}>
                      {c.type === "supplier" ? "Tedarikçi" : "Müşteri"}
                    </span>
                    <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Düzenle">
                      <EditIcon />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(c)}
                      aria-label="Sil"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {open && (
        <MusteriFormu
          profileId={profileId}
          duzenlenen={editing}
          varsayilanTur={filter === "supplier" ? "supplier" : "customer"}
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
