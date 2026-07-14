"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, parseAmount } from "../../../lib/format";
import { CATEGORIES, findCategory } from "../../../lib/categories";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";

export type Budget = {
  id: string;
  category: string;
  monthly_limit: string | null;
};

export default function ButcelerClient({
  profileId,
  currency,
  budgets: initial,
  spent,
}: {
  profileId: string;
  currency: string;
  budgets: Budget[];
  spent: Record<string, number>;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<Budget[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");

  const used = new Set(list.map((b) => b.category));
  const available = CATEGORIES.filter((c) => !used.has(c.id));

  const totalLimit = list.reduce((s, b) => s + (Number(b.monthly_limit) || 0), 0);
  const totalSpent = list.reduce((s, b) => s + (spent[b.category] || 0), 0);

  function openNew() {
    setEditing(null);
    setCategory(available[0]?.id ?? "");
    setLimit("");
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setCategory(b.category);
    setLimit(b.monthly_limit != null ? String(b.monthly_limit) : "");
    setError(null);
    setOpen(true);
  }

  const submitLock = useSubmitLock();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category) {
      setError("Kategori seç.");
      return;
    }
    const lim = parseAmount(limit) || 0;
    if (lim <= 0) {
      setError("Geçerli bir limit gir.");
      return;
    }
    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("category_budgets")
          .update({ monthly_limit: lim })
          .eq("id", editing.id)
          .select("id, category, monthly_limit")
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Budget) : x)));
      } else {
        const { data, error } = await supabase
          .from("category_budgets")
          .insert({ user_id: profileId, category, monthly_limit: lim })
          .select("id, category, monthly_limit")
          .single();
        if (error) throw error;
        setList((prev) => [...prev, data as Budget]);
      }
      setOpen(false);
      // Sunucu verisini + istemci önbelleğini tazele → başka sayfaya gidip dönünce bayat veri görünmez.
      router.refresh();
    } catch {
      setError("Kaydedilemedi. Bu kategori için bütçe zaten olabilir.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  async function handleDelete(b: Budget) {
    if (!(await confirmDialog({ message: `${findCategory(b.category).label} bütçesi silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("category_budgets").delete().eq("id", b.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== b.id));
    router.refresh();
  }

  return (
    <>
      <PageHead
        title="Kategori Bütçeleri"
        sub="Bu ayki harcamalarını kategori limitleriyle takip et"
        action={
          <AddButton onClick={openNew} disabled={available.length === 0}>Bütçe Ekle</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Toplam Limit</div>
            <div className="t-value">{formatCurrency(totalLimit, currency)}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Harcanan</div>
            <div className="t-value" style={{ color: totalSpent > totalLimit ? "var(--danger)" : undefined }}>
              {formatCurrency(totalSpent, currency)}
            </div>
          </div>
          <div className="t-item">
            <div className="t-label">Kalan</div>
            <div className="t-value">{formatCurrency(Math.max(0, totalLimit - totalSpent), currency)}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz bütçe yok. Sağ üstten kategori bütçesi ekle.</div>
      ) : (
        <div className="budget-list">
          {list.map((b) => {
            const cat = findCategory(b.category);
            const lim = Number(b.monthly_limit) || 0;
            const sp = spent[b.category] || 0;
            const pct = lim > 0 ? Math.min(100, (sp / lim) * 100) : 0;
            const over = sp > lim;
            return (
              <div key={b.id} className="budget-card">
                <div className="budget-top">
                  <span className="budget-cat">
                    <span className="budget-dot" style={{ background: cat.color }} />
                    {cat.label}
                  </span>
                  <span className="budget-actions">
                    <button className="icon-btn" onClick={() => openEdit(b)} aria-label="Düzenle">
                      <EditIcon />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(b)}
                      aria-label="Sil"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className="budget-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: over ? "var(--danger)" : cat.color,
                    }}
                  />
                </div>
                <div className="budget-nums">
                  <span style={{ color: over ? "var(--danger)" : "var(--text)" }}>
                    {formatCurrency(sp, currency)}
                  </span>
                  <span className="budget-limit">/ {formatCurrency(lim, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal
          title={editing ? "Bütçeyi Düzenle" : "Bütçe Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <Field label="Kategori">
              {editing ? (
                <input type="text" value={findCategory(category).label} disabled />
              ) : (
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Aylık Limit">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                autoFocus
              />
            </Field>

            <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
