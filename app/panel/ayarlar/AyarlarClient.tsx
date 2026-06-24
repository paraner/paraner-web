"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import LogoutButton from "../LogoutButton";
import ConfirmDialog from "../../components/ConfirmDialog";

export type Profile = {
  id: string;
  profile_name: string | null;
  profile_type: string | null;
  currency: string | null;
  is_active: boolean;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
};

export type DeviceRow = {
  id: string;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  last_city: string | null;
  first_seen: string;
  last_seen: string;
};

export default function AyarlarClient({
  email,
  profiles,
  devices,
}: {
  email: string;
  profiles: Profile[];
  devices: DeviceRow[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const active = profiles.find((p) => p.is_active) ?? profiles[0];
  const isBusiness = active?.profile_type === "business";

  const [name, setName] = useState(active?.profile_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [switching, setSwitching] = useState(false);

  const typeLabel = (t: string | null) =>
    t === "business" ? "İşletme" : "Bireysel";

  async function saveName() {
    if (!active || !name.trim() || name.trim() === active.profile_name) return;
    setSavingName(true);
    await supabase
      .from("profiles")
      .update({ profile_name: name.trim() })
      .eq("id", active.id);
    setSavingName(false);
    router.refresh();
  }

  async function switchTo(p: Profile) {
    if (p.is_active || switching) return;
    setSwitching(true);
    const ids = profiles.map((x) => x.id);
    // Önce hepsini pasifle, sonra seçileni aktifle
    await supabase.from("profiles").update({ is_active: false }).in("id", ids);
    await supabase.from("profiles").update({ is_active: true }).eq("id", p.id);
    // Tüm panel aktif profile göre değişir → tam yenile
    router.push("/panel");
    router.refresh();
  }

  return (
    <>
      <h1 className="panel-h1">Ayarlar</h1>
      <p className="panel-sub">Profil, hesap ve işletme ayarların</p>

      <div className="settings-block">
        <h3>Profil Bilgileri</h3>
        <div className="tx-list">
          <div className="info-row">
            <span className="k">E-posta</span>
            <span className="v">{email}</span>
          </div>
          <div className="info-row">
            <span className="k">Profil tipi</span>
            <span className="v">{typeLabel(active?.profile_type ?? null)}</span>
          </div>
          <div className="info-row">
            <span className="k">Para birimi</span>
            <span className="v">{active?.currency ?? "TRY"}</span>
          </div>
        </div>
      </div>

      <div className="settings-block">
        <h3>Profil Adı</h3>
        <div className="inline-edit">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profil adı"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={saveName}
            disabled={savingName || !name.trim() || name.trim() === active?.profile_name}
          >
            {savingName ? "…" : "Kaydet"}
          </button>
        </div>
      </div>

      {isBusiness && active && (
        <InvoiceNumbering
          profileId={active.id}
          initialPrefix={active.invoice_prefix ?? "MGZR"}
          initialNext={active.invoice_next_number ?? 1}
        />
      )}

      {active && (
        <NotificationPrefs profileId={active.id} isBusiness={isBusiness} />
      )}

      {isBusiness && active && (
        <BackupExport profileId={active.id} profileName={active.profile_name} />
      )}

      {isBusiness && <RolesSoon />}

      {profiles.length > 1 && (
        <div className="settings-block">
          <h3>Profil Değiştir</h3>
          <div className="tx-list">
            {profiles.map((p) => (
              <div
                key={p.id}
                className={`profile-row${p.is_active ? " active" : ""}`}
                onClick={() => switchTo(p)}
              >
                <div>
                  <div className="p-name">{p.profile_name ?? "Profil"}</div>
                  <div className="p-type">{typeLabel(p.profile_type)}</div>
                </div>
                {p.is_active ? (
                  <span className="badge green">Aktif</span>
                ) : (
                  <span className="badge gray">Geç</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <DevicesSection devices={devices} />

      <div className="settings-block">
        <h3>Oturum</h3>
        <LogoutButton />
      </div>
    </>
  );
}

/* ── Giriş Yapılan Cihazlar (güvenlik) ── */
function DevicesSection({ devices }: { devices: DeviceRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [thisId, setThisId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    import("../../../lib/loginAlert").then((m) => setThisId(m.getWebDeviceId())).catch(() => {});
  }, []);

  const copyDeviceId = async () => {
    if (!thisId) return;
    try {
      await navigator.clipboard.writeText(thisId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // sessiz
    }
  };

  const hasOthers = devices.some((d) => d.device_id !== thisId);

  const fmt = (s?: string) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("tr-TR", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const [confirmOthers, setConfirmOthers] = useState(false);

  const signOutOthers = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut({ scope: "others" });
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && thisId) {
        await supabase.from("user_devices").delete().eq("user_id", user.id).neq("device_id", thisId);
      }
      router.refresh();
    } catch {
      // sessiz
    } finally {
      setBusy(false);
      setConfirmOthers(false);
    }
  };

  return (
    <div className="settings-block">
      <h3>Giriş Yapılan Cihazlar</h3>
      {devices.length === 0 ? (
        <p className="panel-sub" style={{ marginTop: 4 }}>Henüz kayıtlı cihaz yok.</p>
      ) : (
        <div className="tx-list">
          {devices.map((d) => (
            <div key={d.id} className="info-row" style={{ alignItems: "flex-start" }}>
              <span className="k">
                {d.device_name || "Bilinmeyen cihaz"}
                {d.device_id === thisId ? " · Bu cihaz" : ""}
              </span>
              <span className="v" style={{ textAlign: "right", fontSize: 12, opacity: 0.85 }}>
                {d.last_city ? `${d.last_city} · ` : ""}{fmt(d.last_seen)}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasOthers && (
        <button className="btn btn-sm" onClick={() => setConfirmOthers(true)} disabled={busy} style={{ marginTop: 12, color: "#E24B4A" }}>
          {busy ? "…" : "Diğer Tüm Cihazlardan Çıkış Yap"}
        </button>
      )}

      <ConfirmDialog
        open={confirmOthers}
        title="Diğer Cihazlardan Çıkış"
        message="Bu cihaz hariç tüm cihazlardan çıkış yapılacak. Tanımadığın bir giriş varsa bu işlem onu sonlandırır."
        confirmLabel="Çıkış Yap"
        cancelLabel="Vazgeç"
        danger
        busy={busy}
        onConfirm={signOutOthers}
        onCancel={() => setConfirmOthers(false)}
      />

      {/* Güvenli cihaz kimliği — bu tarayıcının kimliği (destek/güvenlik için, kopyalanabilir) */}
      {thisId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            marginTop: 16,
            padding: "12px 16px",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="panel-sub" style={{ margin: 0 }}>Güvenli cihaz kimliği</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                wordBreak: "break-all",
                marginTop: 4,
              }}
            >
              {thisId}
            </div>
          </div>
          <button className="btn btn-sm" onClick={copyDeviceId} style={{ flexShrink: 0 }}>
            {copied ? "Kopyalandı ✓" : "Kopyala"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Fatura Numaralama ── (mobil invoice-numbering.tsx ile aynı mantık) */
function InvoiceNumbering({
  profileId,
  initialPrefix,
  initialNext,
}: {
  profileId: string;
  initialPrefix: string;
  initialNext: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [prefix, setPrefix] = useState(initialPrefix);
  const [next, setNext] = useState<number>(initialNext);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = prefix !== initialPrefix || next !== initialNext;
  const preview = `${prefix || "MGZR"}-${String(next).padStart(6, "0")}`;

  function onPrefix(v: string) {
    setPrefix(v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5));
    setSaved(false);
  }
  function onNext(v: string) {
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    setNext(!isNaN(n) && n > 0 ? n : 1);
    setSaved(false);
  }

  async function save() {
    if (!prefix.trim() || saving) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ invoice_prefix: prefix.trim(), invoice_next_number: next })
      .eq("id", profileId);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="settings-block">
      <h3>Fatura Numaralama</h3>

      <div className="np-preview">
        <span className="np-preview-label">Sonraki fatura numarası</span>
        <span className="np-preview-num">{preview}</span>
      </div>

      <div className="set-field">
        <label>Fatura Öneki</label>
        <span className="set-hint">Maksimum 5 karakter, sadece harf ve rakam</span>
        <input
          className="set-input"
          value={prefix}
          onChange={(e) => onPrefix(e.target.value)}
          placeholder="MGZR"
        />
      </div>

      <div className="set-field">
        <label>Sonraki Numara</label>
        <span className="set-hint">Her fatura oluşturulduğunda otomatik artar</span>
        <input
          className="set-input"
          value={String(next)}
          onChange={(e) => onNext(e.target.value)}
          inputMode="numeric"
          placeholder="1"
        />
      </div>

      <div className="set-actions">
        <button
          className="btn btn-ghost btn-sm danger"
          onClick={() => {
            setNext(1);
            setSaved(false);
          }}
        >
          Numarayı Sıfırla
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={save}
          disabled={saving || !prefix.trim() || !dirty}
        >
          {saving ? "…" : saved ? "Kaydedildi ✓" : "Kaydet"}
        </button>
      </div>

      <p className="set-note">
        Fatura numarası &quot;ÖNEK-NUMARA&quot; formatındadır (örn. MGZR-000001).
        Yasal olarak numaralar sıralı ve benzersiz olmalıdır.
      </p>
    </div>
  );
}

/* ── Bildirim Tercihleri ── (profil bazlı, localStorage) */
type NotifPrefs = Record<string, boolean>;

const NOTIF_GENERAL: { key: string; label: string; desc: string }[] = [
  { key: "monthlySummary", label: "Aylık Özet", desc: "Her ay sonunda gelir-gider özetini al" },
  { key: "budgetAlert", label: "Bütçe Uyarıları", desc: "Kategori bütçesini aştığında uyar" },
  { key: "promo", label: "Kampanyalar", desc: "Yeni özellikler ve duyurulardan haberdar ol" },
];
const NOTIF_BUSINESS: { key: string; label: string; desc: string }[] = [
  { key: "invoiceDue", label: "Fatura Vadesi", desc: "Ödenmemiş faturaların vadesi yaklaşınca hatırlat" },
  { key: "recurringReminder", label: "Düzenli Ödemeler", desc: "Kira, abonelik, fatura ödeme günlerini hatırlat" },
];

function NotificationPrefs({
  profileId,
  isBusiness,
}: {
  profileId: string;
  isBusiness: boolean;
}) {
  const storageKey = `paraner_notif_${profileId}`;
  const items = isBusiness ? [...NOTIF_GENERAL, ...NOTIF_BUSINESS] : NOTIF_GENERAL;

  const [prefs, setPrefs] = useState<NotifPrefs>({});

  useEffect(() => {
    let stored: NotifPrefs = {};
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      stored = {};
    }
    // varsayılan: kampanya hariç açık
    const init: NotifPrefs = {};
    for (const it of items) {
      init[it.key] = stored[it.key] ?? it.key !== "promo";
    }
    setPrefs(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function toggle(key: string) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      /* fail-soft */
    }
  }

  return (
    <div className="settings-block">
      <h3>Bildirimler</h3>
      <div className="tx-list">
        {items.map((it) => (
          <div key={it.key} className="notif-row">
            <div className="notif-info">
              <div className="notif-label">{it.label}</div>
              <div className="notif-desc">{it.desc}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!prefs[it.key]}
              className={`switch${prefs[it.key] ? " on" : ""}`}
              onClick={() => toggle(it.key)}
            >
              <span className="switch-knob" />
            </button>
          </div>
        ))}
      </div>
      <p className="set-note">
        Tarayıcı bildirimleri yakında; şimdilik tercihlerin kaydediliyor.
        Mobil uygulamada bu bildirimler etkin.
      </p>
    </div>
  );
}

/* ── Yedekleme / Veri Dışa Aktarma ── */
function BackupExport({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string | null;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const slug = (profileName ?? "isletme").replace(/[^a-z0-9]/gi, "-").toLowerCase();

  function downloadCsv(name: string, rows: (string | number)[][]) {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportTransactions() {
    if (busy) return;
    setBusy("tx");
    const { data } = await supabase
      .from("transactions")
      .select("date, type, title, category, amount, currency")
      .eq("user_id", profileId)
      .order("date", { ascending: false });
    const rows: (string | number)[][] = [
      ["Tarih", "Tür", "Açıklama", "Kategori", "Tutar", "Para Birimi"],
      ...(data ?? []).map((t) => [
        t.date ?? "",
        t.type === "income" ? "Gelir" : "Gider",
        t.title ?? "",
        t.category ?? "",
        t.amount ?? 0,
        t.currency ?? "TRY",
      ]),
    ];
    downloadCsv(`${slug}-islemler-${today}.csv`, rows);
    setBusy(null);
  }

  async function exportInvoices() {
    if (busy) return;
    setBusy("inv");
    const { data } = await supabase
      .from("invoices")
      .select(
        "invoice_number, invoice_date, type, customer_name, amount, currency, payment_status"
      )
      .eq("user_id", profileId)
      .order("invoice_date", { ascending: false });
    const rows: (string | number)[][] = [
      ["Fatura No", "Tarih", "Tür", "Müşteri", "Tutar", "Para Birimi", "Durum"],
      ...(data ?? []).map((i) => [
        i.invoice_number ?? "",
        i.invoice_date ?? "",
        i.type === "income" ? "Satış" : "Alış",
        i.customer_name ?? "",
        i.amount ?? 0,
        i.currency ?? "TRY",
        i.payment_status === "paid" ? "Ödendi" : "Ödenmedi",
      ]),
    ];
    downloadCsv(`${slug}-faturalar-${today}.csv`, rows);
    setBusy(null);
  }

  return (
    <div className="settings-block">
      <h3>Yedekleme &amp; Dışa Aktarma</h3>
      <div className="tx-list">
        <div className="notif-row">
          <div className="notif-info">
            <div className="notif-label">İşlemler (CSV)</div>
            <div className="notif-desc">Tüm gelir-gider kayıtlarını indir</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={exportTransactions}
            disabled={busy === "tx"}
          >
            {busy === "tx" ? "Hazırlanıyor…" : "İndir"}
          </button>
        </div>
        <div className="notif-row">
          <div className="notif-info">
            <div className="notif-label">Faturalar (CSV)</div>
            <div className="notif-desc">Satış ve alış faturalarını indir</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={exportInvoices}
            disabled={busy === "inv"}
          >
            {busy === "inv" ? "Hazırlanıyor…" : "İndir"}
          </button>
        </div>
      </div>
      <p className="set-note">
        Dosyalar Excel ve Google E-Tablolar ile açılır. Verilerin her zaman
        güvende ve dışa aktarılabilir.
      </p>
    </div>
  );
}

/* ── Roller (Yakında) ── çok-kullanıcılı yetkilendirme, şema gerektirir */
function RolesSoon() {
  return (
    <div className="settings-block">
      <h3>Roller &amp; Ekip Erişimi</h3>
      <div className="soon-card">
        <div className="soon-badge">Yakında</div>
        <p>
          Muhasebecini veya ekip arkadaşlarını işletmene davet et; her birine
          görüntüleme, düzenleme veya tam yetki ver. Bu özellik üzerinde
          çalışıyoruz.
        </p>
      </div>
    </div>
  );
}
