"use client";

/* MÜŞTERİ / TEDARİKÇİ KARTI FORMU — TEK KOPYA
 *
 * ⚠️ Bu form iki ayrı yerden açılıyor, ikisi de AYNI bileşeni kullanır:
 *   ① Müşteriler sayfası (ekle / düzenle)
 *   ② Üst bardaki hızlı ekleme adası (+) — kullanıcı hangi sayfadaysa ORADA açılır,
 *      Müşteriler sayfasına GİTMEZ (Mehmet, 28.07: "ilgili sayfaya gitmesin, geç açılıyor").
 * Bu yüzden forma ikinci bir kopya YAZMA; alan eklenecekse burada eklenir, iki yer de alır.
 *
 * ⚠️ Bileşen her açılışta yeniden mount edilir (`{acik && <MusteriFormu …>}`) → alanlar
 * `useState(başlangıç)` ile tohumlanır, ayrıca "formu sıfırla" fonksiyonu gerekmez.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import SaveButton from "../../../components/SaveButton";

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

const COLS =
  "id, type, name, company_name, phone, email, address, tax_number, tax_office, note";

export default function MusteriFormu({
  profileId,
  duzenlenen = null,
  varsayilanTur = "customer",
  onKapat,
  onKaydedildi,
}: {
  profileId: string;
  /** Doluysa düzenleme, boşsa yeni kayıt. */
  duzenlenen?: Contact | null;
  /** Yeni kayıtta hangi tür seçili gelsin (sayfadaki filtreye göre). */
  varsayilanTur?: string;
  onKapat: () => void;
  /** Sayfa listesini güncellemek için — hızlı ekleme adasında boş geçilebilir. */
  onKaydedildi?: (kayit: Contact, yeniMi: boolean) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const submitLock = useSubmitLock();

  const [type, setType] = useState(duzenlenen?.type ?? varsayilanTur);
  const [name, setName] = useState(duzenlenen?.name ?? "");
  const [company, setCompany] = useState(duzenlenen?.company_name ?? "");
  const [phone, setPhone] = useState(duzenlenen?.phone ?? "");
  const [email, setEmail] = useState(duzenlenen?.email ?? "");
  const [taxNumber, setTaxNumber] = useState(duzenlenen?.tax_number ?? "");
  const [taxOffice, setTaxOffice] = useState(duzenlenen?.tax_office ?? "");
  const [address, setAddress] = useState(duzenlenen?.address ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      note: duzenlenen?.note ?? null,
    };

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (duzenlenen) {
        const { data, error } = await supabase
          .from("contacts")
          .update(payload)
          .eq("id", duzenlenen.id)
          .select(COLS)
          .single();
        if (error) throw error;
        onKaydedildi?.(data as Contact, false);
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert({ ...payload, profile_id: profileId })
          .select(COLS)
          .single();
        if (error) throw error;
        onKaydedildi?.(data as Contact, true);
      }
      onKapat();
      /* Sunucu verisini + istemci önbelleğini tazele. ⚠️ Hızlı ekleme adasından
         açıldığında `onKaydedildi` boş olur — o durumda listenin güncellenmesini
         SADECE bu refresh sağlar (sayfalar `initial` prop'unu izliyor). */
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
      title={duzenlenen ? "Kartı Düzenle" : "Kart Ekle"}
      onClose={onKapat}
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
            <input type="text" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
          </Field>
          <Field label="Vergi Dairesi (ops.)">
            <input type="text" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
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
  );
}
