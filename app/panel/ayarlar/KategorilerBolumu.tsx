"use client";

/* AYARLAR → KATEGORİLER
 *
 * ⚠️ NEDEN VAR (Mehmet, 25.07): kendi oluşturduğu kategoriyi SİLECEK YER BULAMADI.
 * Silme/düzenleme yalnızca "İşlem Ekle" modalındaki kategori seçicisinin içinde vardı —
 * yani kategori yönetimi bir işlem eklemeye başlamadan erişilemiyordu. Burası tek durak:
 * kategorileri gör, ekle, düzenle, sil.
 *
 * Kategoriler ORTAK tabloda (`user_categories`) → burada silinen telefonda da silinir.
 * Hazır (sabit) kategoriler kod kataloğundan gelir; silinemez, yalnız listelenir.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { CATEGORIES, INCOME_CATEGORIES } from "../../../lib/categories";
import {
  createCustomCategory,
  type CustomCategory,
  deleteCustomCategory,
  fetchCustomCategories,
  uniqueCustomId,
  updateCustomCategory,
} from "../../../lib/customCategories";
import { AVAILABLE_ICONS, CategoryIcon } from "../../../lib/categoryIcons";
import { confirmDialog } from "../../components/confirm";
import { showToast } from "../../components/toast";

// Renk paleti — CategoryPicker + mobil AVAILABLE_COLORS ile birebir
const COLORS = [
  "#E24B4A", "#D85A30", "#EF9F27", "#BA7517", "#1D9E75", "#00BFA6", "#0EA5E9", "#378ADD",
  "#1A6BFA", "#6366F1", "#8B5CF6", "#7F77DD", "#D4537E", "#EC4899", "#888780", "#64748B",
];

type Tur = "expense" | "income";

export default function KategorilerBolumu({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [ozel, setOzel] = useState<CustomCategory[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Form: kapalı (null) · yeni ("yeni") · düzenleme (kategori id'si)
  const [formda, setFormda] = useState<string | null>(null);
  const [ad, setAd] = useState("");
  const [ikon, setIkon] = useState(AVAILABLE_ICONS[2]);
  const [renk, setRenk] = useState(COLORS[5]);
  const [tur, setTur] = useState<Tur>("expense");

  useEffect(() => {
    let alive = true;
    fetchCustomCategories(profileId)
      .then((l) => { if (alive) setOzel(l); })
      .finally(() => { if (alive) setYukleniyor(false); });
    return () => { alive = false; };
  }, [profileId]);

  function formuKapat() {
    setFormda(null);
    setAd("");
    setIkon(AVAILABLE_ICONS[2]);
    setRenk(COLORS[5]);
    setTur("expense");
  }

  function yeniAc() {
    formuKapat();
    setFormda("yeni");
  }

  function duzenleAc(c: CustomCategory) {
    setFormda(c.id);
    setAd(c.label);
    setIkon(c.icon || AVAILABLE_ICONS[2]);
    setRenk(c.color);
    setTur(c.type);
  }

  async function kaydet() {
    const label = ad.trim();
    if (!label || !formda) return;

    if (formda === "yeni") {
      const id = uniqueCustomId(label, ozel);
      const yeni: CustomCategory = { id, label, color: renk, icon: ikon, type: tur };
      const ok = await createCustomCategory(profileId, yeni);
      if (!ok) { showToast({ title: "Kategori eklenemedi", message: "Tekrar dener misin?", variant: "error" }); return; }
      setOzel((o) => [...o, yeni]);
      showToast({ title: "Kategori eklendi", variant: "success" });
    } else {
      const ok = await updateCustomCategory(profileId, formda, { label, color: renk, icon: ikon });
      if (!ok) { showToast({ title: "Kategori güncellenemedi", message: "Tekrar dener misin?", variant: "error" }); return; }
      setOzel((o) => o.map((c) => (c.id === formda ? { ...c, label, color: renk, icon: ikon } : c)));
      showToast({ title: "Kategori güncellendi", variant: "success" });
    }
    formuKapat();
    router.refresh(); // panel kuralı: mutasyondan sonra sunucu verisi tazelensin
  }

  async function sil(c: CustomCategory) {
    /* ⚠️ İşlemler SİLİNMEZ, kategorisiz kalır → onay metninde açıkça söylüyoruz
       (kullanıcı "işlemlerim de gidecek mi?" diye tereddüt etmesin). */
    const ok = await confirmDialog({
      title: `"${c.label}" silinsin mi?`,
      message:
        "Kategori telefondan da silinir. Bu kategoriye kayıtlı gelir/giderlerin SİLİNMEZ; " +
        'listelerde "Diğer" olarak görünür.',
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;

    const oncesi = ozel;
    setOzel((o) => o.filter((x) => x.id !== c.id));
    const basarili = await deleteCustomCategory(profileId, c.id);
    if (!basarili) {
      setOzel(oncesi); // geri al ve söyle (sessiz "silindi" yalanı yok)
      showToast({ title: "Kategori silinemedi", message: "Tekrar dener misin?", variant: "error" });
      return;
    }
    if (formda === c.id) formuKapat();
    showToast({ title: "Kategori silindi", variant: "success" });
    router.refresh();
  }

  const hazir = [
    ...CATEGORIES.map((c) => ({ ...c, type: "expense" as const })),
    ...INCOME_CATEGORIES.map((c) => ({ ...c, type: "income" as const })),
  ];

  return (
    <div className="settings-block">
      <h3>Kategoriler</h3>
      <p className="panel-sub" style={{ marginTop: 4 }}>
        Kendi kategorilerini buradan yönet. Telefon ve web aynı listeyi kullanır.
      </p>

      {/* ── Kendi kategorilerin ── */}
      {yukleniyor ? (
        <p className="panel-sub" style={{ marginTop: 12 }}>Yükleniyor…</p>
      ) : ozel.length === 0 ? (
        <p className="panel-sub" style={{ marginTop: 12 }}>
          Henüz kendi kategorin yok. Aşağıdan ekleyebilir ya da işlem eklerken oluşturabilirsin.
        </p>
      ) : (
        <div className="tx-list" style={{ marginTop: 12 }}>
          {ozel.map((c) => (
            <div key={c.id} className="kat-row">
              <span className="cat-ic" style={{ background: `${c.color}22` }}>
                <CategoryIcon name={c.icon} color={c.color} size={16} />
              </span>
              <span className="kat-row-name">{c.label}</span>
              <span className="kat-row-tur">{c.type === "income" ? "Gelir" : "Gider"}</span>
              <button
                type="button"
                className="cat-opt-act"
                onClick={() => duzenleAc(c)}
                aria-label={`${c.label} kategorisini düzenle`}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="cat-opt-act danger"
                onClick={() => sil(c)}
                aria-label={`${c.label} kategorisini sil`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Ekle / düzenle formu (görsel dil CategoryPicker ile aynı) ── */}
      {formda === null ? (
        <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} onClick={yeniAc}>
          <Plus size={15} /> Yeni Kategori
        </button>
      ) : (
        <div className="cat-create" style={{ marginTop: 12 }}>
          <div className="cat-create-head">
            <span>{formda === "yeni" ? "Yeni kategori" : "Kategoriyi düzenle"}</span>
            <button type="button" className="cat-create-x" onClick={formuKapat} aria-label="Vazgeç">
              <X size={15} />
            </button>
          </div>

          <input
            className="cat-create-input"
            placeholder="Kategori adı"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); kaydet(); } }}
            maxLength={24}
            autoFocus
          />

          {/* Tür yalnız YENİ kategoride seçilir: sonradan değiştirmek, o kategoriyle
              kaydedilmiş işlemlerin tarafını (gelir/gider) tutarsız hale getirir. */}
          {formda === "yeni" && (
            <>
              <div className="cat-create-label">Tür</div>
              <div className="set-subtabs" role="tablist" aria-label="Kategori türü">
                {(["expense", "income"] as Tur[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tur === t}
                    className={`set-subtab${tur === t ? " active" : ""}`}
                    onClick={() => setTur(t)}
                  >
                    {t === "expense" ? "Gider" : "Gelir"}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="cat-create-label">İkon</div>
          <div className="cat-icon-grid">
            {AVAILABLE_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`cat-icon-opt${ikon === ic ? " on" : ""}`}
                style={ikon === ic ? { borderColor: renk, color: renk } : undefined}
                onClick={() => setIkon(ic)}
                aria-label={ic}
              >
                <CategoryIcon name={ic} size={18} />
              </button>
            ))}
          </div>

          <div className="cat-create-label">Renk</div>
          <div className="cat-swatches">
            {COLORS.map((s) => (
              <button
                key={s}
                type="button"
                className={`cat-swatch${renk === s ? " on" : ""}`}
                style={{ background: s }}
                onClick={() => setRenk(s)}
                aria-label={`Renk ${s}`}
              />
            ))}
          </div>

          <button type="button" className="cat-create-save" disabled={!ad.trim()} onClick={kaydet}>
            <CategoryIcon name={ikon} size={16} color="#04130f" />
            {formda === "yeni" ? "Kategori Ekle" : "Kaydet"}
          </button>
        </div>
      )}

      {/* ── Hazır kategoriler (bilgi) ── */}
      <details className="kat-hazir">
        <summary>Hazır kategoriler ({hazir.length}) — silinemez</summary>
        <div className="kat-hazir-list">
          {hazir.map((c) => (
            <span key={`${c.type}-${c.id}`} className="kat-chip">
              <CategoryIcon name={c.icon} color={c.color} size={13} />
              {c.label}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
