"use client";
import AddButton from "../../../components/AddButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";

export type Employee = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
};

export default function CalisanlarClient({
  profileId,
  employees: initial,
}: {
  profileId: string;
  employees: Employee[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Employee[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function openNew() {
    setEditing(null);
    setName("");
    setPosition("");
    setPhone("");
    setEmail("");
    setError(null);
    setOpen(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setName(e.name);
    setPosition(e.position ?? "");
    setPhone(e.phone ?? "");
    setEmail(e.email ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Çalışan adı gerekli.");
      return;
    }
    const payload = {
      name: name.trim(),
      position: position.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
    };
    const cols = "id, name, phone, email, position";

    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Employee) : x)));
      } else {
        const { data, error } = await supabase
          .from("employees")
          .insert({ ...payload, user_id: profileId })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as Employee, ...prev]);
      }
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!(await confirmDialog({ message: `"${emp.name}" silinsin mi? Maaş/harcama/izin kayıtları da silinir.`, danger: true }))) return;
    const { error } = await supabase.from("employees").delete().eq("id", emp.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== emp.id));
  }

  return (
    <>
      <PageHead
        title="Çalışanlar"
        sub="Ekibin ve pozisyonları"
        action={
          <AddButton onClick={openNew}>Çalışan Ekle</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Toplam Çalışan</div>
            <div className="t-value">{list.length}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz çalışan yok. Sağ üstten ilk çalışanı ekle.</div>
      ) : (
        <div className="tx-list">
          {list.map((emp) => (
            <div key={emp.id} className="tx-row">
              <div className="tx-main">
                <span className="avatar-chip">{emp.name.charAt(0).toUpperCase()}</span>
                <div className="tx-left">
                  <span className="tx-title">{emp.name}</span>
                  <span className="tx-meta">
                    {[emp.position, emp.phone, emp.email].filter(Boolean).join(" · ") || "—"}
                  </span>
                </div>
              </div>
              <div className="tx-right">
                <button className="icon-btn" onClick={() => openEdit(emp)} aria-label="Düzenle">
                  <EditIcon />
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => handleDelete(emp)}
                  aria-label="Sil"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title={editing ? "Çalışanı Düzenle" : "Çalışan Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <Field label="Ad Soyad">
              <input
                type="text"
                placeholder="ör. Ahmet Yılmaz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Pozisyon (ops.)">
              <input
                type="text"
                placeholder="ör. Satış Sorumlusu"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </Field>

            <div className="form-row">
              <Field label="Telefon (ops.)">
                <input
                  type="tel"
                  placeholder="05.."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="E-posta (ops.)">
                <input
                  type="email"
                  placeholder="ad@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={saving}
              style={{ marginTop: 4 }}
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
