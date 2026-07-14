"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { Search } from "lucide-react";

export type Contact = {
  id: string;
  type: string; // customer / supplier
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  tax_office: string | null;
  note: string | null;
};

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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("customer");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

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

  function openNew() {
    setEditing(null);
    setType(filter === "supplier" ? "supplier" : "customer");
    setName("");
    setCompany("");
    setPhone("");
    setEmail("");
    setTaxNumber("");
    setTaxOffice("");
    setAddress("");
    setNote("");
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setType(c.type);
    setName(c.name);
    setCompany(c.company_name ?? "");
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setTaxNumber(c.tax_number ?? "");
    setTaxOffice(c.tax_office ?? "");
    setAddress(c.address ?? "");
    setNote(c.note ?? "");
    setError(null);
    setOpen(true);
  }

  const submitLock = useSubmitLock();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Ad gerekli.");
      return;
    }
    const payload = {
      type,
      name: name.trim(),
      company_name: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      tax_number: taxNumber.trim() || null,
      tax_office: taxOffice.trim() || null,
      address: address.trim() || null,
      note: note.trim() || null,
    };
    const cols =
      "id, type, name, company_name, phone, email, address, tax_number, tax_office, note";

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("contacts")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Contact) : x)));
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert({ ...payload, profile_id: profileId })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as Contact, ...prev]);
      }
      setOpen(false);
      // Sunucu verisini + istemci önbelleğini tazele → başka sayfaya gidip dönünce bayat veri görünmez.
      router.refresh();
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
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
        <div className="panel-empty">Henüz kart yok. Sağ üstten müşteri/tedarikçi ekle.</div>
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
        <Modal
          title={editing ? "Kartı Düzenle" : "Kart Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            <div className="type-toggle">
              <button
                type="button"
                className={type === "customer" ? "on-income" : ""}
                onClick={() => setType("customer")}
              >
                Müşteri
              </button>
              <button
                type="button"
                className={type === "supplier" ? "on-expense" : ""}
                onClick={() => setType("supplier")}
              >
                Tedarikçi
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <Field label="Ad / Yetkili">
                <input
                  type="text"
                  placeholder="ör. Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Firma (ops.)">
                <input
                  type="text"
                  placeholder="ör. ABC Ltd."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Telefon (ops.)">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="E-posta (ops.)">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Vergi No (ops.)">
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                />
              </Field>
              <Field label="Vergi Dairesi (ops.)">
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Adres (ops.)">
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
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
