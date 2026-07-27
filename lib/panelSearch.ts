"use client";

/* PANEL GENELİ ARAMA — kullanıcının KENDİ verisinde arama (ikinci katman).
 *
 * Birinci katman (sayfa/menü araması) `PanelSearch.tsx` içinde, tamamen yerel ve bedava.
 * Burası veritabanına gider → pahalı. Bu yüzden çağıran taraf: en az 2 harf + gecikme (debounce).
 *
 * ⚠️ KOLON ADLARI TAHMİN EDİLMEDİ — panelin kendi modüllerinden okundu (27.07). En sinsi
 * tuzak: her tablo `user_id` ile aktif profile bağlıyken **`contacts` `profile_id` kullanıyor**.
 * Yeni tablo eklerken filtre kolonunu MUTLAKA o modülün sorgusundan doğrula.
 *
 * ⚠️ RLS zaten kullanıcının verisiyle sınırlıyor ama filtreyi yine de yazıyoruz: kullanıcının
 * BİRDEN FAZLA profili olabilir (bireysel + işletme) ve RLS ikisine de izin verir —
 * filtre olmazsa diğer hesabının kayıtları aramada çıkar.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { findCategory, type Category } from "./categories";
import { formatDate } from "./format";

export type VeriTipi =
  | "islem" | "fatura" | "teklif" | "cari" | "musteri" | "urun" | "calisan"
  | "hesap" | "duzenli" | "borc" | "cek" | "veresiye" | "varlik";

export type VeriSonuc = {
  id: string;
  tip: VeriTipi;
  baslik: string;
  alt: string;
  tutar?: number | null;
  paraBirimi?: string | null;
  href: string;
};

export const GRUP_ETIKET: Record<VeriTipi, string> = {
  islem: "İşlemler",
  fatura: "Faturalar",
  teklif: "Teklifler",
  cari: "Cari Hesaplar",
  musteri: "Müşteri / Tedarikçi",
  urun: "Ürünler",
  calisan: "Çalışanlar",
  hesap: "Hesaplar",
  duzenli: "Düzenli Ödemeler",
  borc: "Borç / Alacak",
  cek: "Çek / Senet",
  veresiye: "Veresiye",
  varlik: "Cüzdanım",
};

/* Sonuç sırası: en çok aranan en üstte. */
export const GRUP_SIRA: VeriTipi[] = [
  "islem", "fatura", "teklif", "musteri", "cari", "urun",
  "calisan", "hesap", "duzenli", "borc", "cek", "veresiye", "varlik",
];

/** Kendi arama kutusu OLAN modüller — sonuca tıklayınca kutusu doldurulmuş gelir (`?q=`).
    Diğerleri için düz sayfa açılır (o modüllerde arama kutusu yok). */
const Q_DESTEKLI = new Set(["/panel/islemler", "/panel/faturalar", "/panel/musteriler", "/panel/urunler"]);

const hedef = (yol: string, terim?: string | null) =>
  terim && Q_DESTEKLI.has(yol) ? `${yol}?q=${encodeURIComponent(terim)}` : yol;

/* PostgREST `or()` filtresi virgülle ayrılır → terimdeki virgül/parantez sorguyu bozar.
   `*` ise ilike joker'i; kullanıcının yazdığı `*` aramayı beklenmedik şekilde genişletir. */
const temizle = (s: string) => s.replace(/[,()*\\]/g, " ").trim();

/** "2.583,36" / "2583,36" / "2583" → { deger, tam } · sayı değilse null.
    `tam` = kullanıcı kuruş yazmadı (ondalık ayırıcı yok) → ARALIK araması yapılır. */
function sayiya(terim: string): { deger: number; tam: boolean } | null {
  const t = terim.replace(/\s/g, "");
  if (!/^[\d.,]+$/.test(t)) return null;
  // TR yazım: nokta binlik, virgül ondalık
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return { deger: n, tam: !t.includes(",") };
}

/* Tutar filtresi. ⚠️ TAM EŞLEŞME YETMEZ: kullanıcı "2583" yazar, kayıt 2.583,36'dır —
   `amount.eq.2583` hiçbir şey bulmaz (ölçüldü). Kuruş yazılmadıysa [n, n+1) aralığı
   aranır ("2583" → 2583,00–2583,99 arası her şey). PostgREST `or()` içinde `and()` destekler.
   Sayısal kolonda kısmi metin araması (ilike) mümkün DEĞİL → DB fonksiyonu gerekirdi. */
function tutarFiltresi(kolon: string, s: ReturnType<typeof sayiya>): string[] {
  if (!s) return [];
  return s.tam
    ? [`and(${kolon}.gte.${s.deger},${kolon}.lt.${s.deger + 1})`]
    : [`${kolon}.eq.${s.deger}`];
}

const LIMIT = 5; // grup başına — liste uzayınca arama kutusu "sonuç çöplüğüne" dönüyor

export async function veriAra(
  supabase: SupabaseClient,
  profilId: string,
  isletmeMi: boolean,
  ham: string,
  /* Özel kategoriler — ham kimlik ("kira_geliri", "custom_1753…") ekrana BASILMAZ.
     Panelin geri kalanı da böyle yapıyor (bkz. DAILY_LOG 25.07 "ham kategori kimliği"). */
  ozelKategoriler: readonly Category[] = []
): Promise<VeriSonuc[]> {
  const terim = temizle(ham);
  if (terim.length < 2) return [];
  const like = `%${terim}%`;
  const tutar = sayiya(terim);
  const sonuc: VeriSonuc[] = [];
  const katAdi = (id: unknown) =>
    id ? findCategory(String(id), ozelKategoriler).label : "";

  const islemFiltre = [`title.ilike.${like}`, `category.ilike.${like}`]
    .concat(tutarFiltresi("amount", tutar))
    .join(",");

  const q = supabase;
  const ortak = <T>(p: PromiseLike<{ data: T[] | null }>) => p;

  // Herkeste olan tablolar
  const istekler: PromiseLike<unknown>[] = [
    ortak(
      q.from("transactions")
        .select("id, title, amount, type, category, date, currency")
        .eq("user_id", profilId)
        .or(islemFiltre)
        .order("date", { ascending: false })
        .limit(LIMIT)
    ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
      for (const t of data ?? [])
        sonuc.push({
          id: String(t.id),
          tip: "islem",
          baslik: (t.title as string) || katAdi(t.category) || "İşlem",
          alt: [katAdi(t.category), t.date ? formatDate(String(t.date)) : ""]
            .filter(Boolean)
            .join(" · "),
          tutar: (t.type === "income" ? 1 : -1) * Number(t.amount ?? 0),
          paraBirimi: t.currency as string,
          href: hedef("/panel/islemler", (t.title as string) || null),
        });
    }),
    ortak(
      q.from("bank_accounts")
        .select("id, name, bank_name, iban, currency, balance")
        .eq("user_id", profilId)
        .or(`name.ilike.${like},bank_name.ilike.${like},iban.ilike.${like}`)
        .limit(LIMIT)
    ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
      for (const h of data ?? [])
        sonuc.push({
          id: String(h.id),
          tip: "hesap",
          baslik: (h.name as string) || "Hesap",
          alt: (h.bank_name as string) || "",
          tutar: Number(h.balance ?? 0),
          paraBirimi: h.currency as string,
          href: "/panel/hesaplar",
        });
    }),
  ];

  if (!isletmeMi) {
    // Bireysel: Cüzdanım varlıkları (işletmede bu sayfa menüde yok)
    istekler.push(
      ortak(
        q.from("savings_assets")
          .select("id, asset_type, amount, avg_cost")
          .eq("user_id", profilId)
          .ilike("asset_type", like)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const v of data ?? [])
          sonuc.push({
            id: String(v.id),
            tip: "varlik",
            baslik: (v.asset_type as string) || "Varlık",
            alt: "Cüzdanım",
            href: "/panel/cuzdanim",
          });
      })
    );
  } else {
    istekler.push(
      ortak(
        q.from("invoices")
          .select("id, invoice_number, customer_name, amount, currency, type, invoice_date")
          .eq("user_id", profilId)
          .or(
            [`invoice_number.ilike.${like}`, `customer_name.ilike.${like}`]
              .concat(tutarFiltresi("amount", tutar))
              .join(",")
          )
          .order("invoice_date", { ascending: false })
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const f of data ?? [])
          sonuc.push({
            id: String(f.id),
            tip: "fatura",
            baslik: (f.invoice_number as string) || (f.customer_name as string) || "Fatura",
            alt: [f.customer_name as string, f.type === "income" ? "Satış" : "Alış"]
              .filter(Boolean)
              .join(" · "),
            tutar: Number(f.amount ?? 0),
            paraBirimi: f.currency as string,
            href: hedef("/panel/faturalar", (f.invoice_number as string) || (f.customer_name as string)),
          });
      }),
      ortak(
        q.from("quotes")
          .select("id, quote_number, customer_name, grand_total, currency, status")
          .eq("user_id", profilId)
          .or(`quote_number.ilike.${like},customer_name.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const t of data ?? [])
          sonuc.push({
            id: String(t.id),
            tip: "teklif",
            baslik: (t.quote_number as string) || "Teklif",
            alt: (t.customer_name as string) || "",
            tutar: Number(t.grand_total ?? 0),
            paraBirimi: t.currency as string,
            href: "/panel/teklifler",
          });
      }),
      // ⚠️ contacts TEK İSTİSNA: profile_id ile bağlı (diğer hepsi user_id).
      ortak(
        q.from("contacts")
          .select("id, name, company_name, phone, type")
          .eq("profile_id", profilId)
          .or(`name.ilike.${like},company_name.ilike.${like},phone.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const c of data ?? [])
          sonuc.push({
            id: String(c.id),
            tip: "musteri",
            baslik: (c.name as string) || (c.company_name as string) || "Kişi",
            alt: [c.company_name as string, c.type === "supplier" ? "Tedarikçi" : "Müşteri"]
              .filter(Boolean)
              .join(" · "),
            href: hedef("/panel/musteriler", (c.name as string) || null),
          });
      }),
      ortak(
        q.from("current_accounts")
          .select("id, name, type, balance")
          .eq("user_id", profilId)
          .ilike("name", like)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const c of data ?? [])
          sonuc.push({
            id: String(c.id),
            tip: "cari",
            baslik: (c.name as string) || "Cari",
            alt: c.type === "supplier" ? "Tedarikçi" : "Müşteri",
            tutar: Number(c.balance ?? 0),
            href: "/panel/cariler",
          });
      }),
      ortak(
        q.from("products")
          .select("id, name, code, type, sell_price")
          .eq("user_id", profilId)
          .or(`name.ilike.${like},code.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const u of data ?? [])
          sonuc.push({
            id: String(u.id),
            tip: "urun",
            baslik: (u.name as string) || "Ürün",
            alt: u.type === "service" ? "Hizmet" : "Ürün",
            tutar: Number(u.sell_price ?? 0),
            href: hedef("/panel/urunler", (u.name as string) || null),
          });
      }),
      ortak(
        q.from("employees")
          .select("id, name, position, phone")
          .eq("user_id", profilId)
          .or(`name.ilike.${like},position.ilike.${like},phone.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const c of data ?? [])
          sonuc.push({
            id: String(c.id),
            tip: "calisan",
            baslik: (c.name as string) || "Çalışan",
            alt: (c.position as string) || "Çalışan",
            href: "/panel/calisanlar",
          });
      }),
      ortak(
        q.from("recurring_payments")
          .select("id, title, amount, currency, period, category")
          .eq("user_id", profilId)
          .or(`title.ilike.${like},category.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const d of data ?? [])
          sonuc.push({
            id: String(d.id),
            tip: "duzenli",
            baslik: (d.title as string) || "Düzenli ödeme",
            alt: (d.period as string) || "",
            tutar: Number(d.amount ?? 0),
            paraBirimi: d.currency as string,
            href: "/panel/duzenli-odemeler",
          });
      }),
      ortak(
        q.from("debts")
          .select("id, person_name, amount, type, is_paid")
          .eq("user_id", profilId)
          .ilike("person_name", like)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const b of data ?? [])
          sonuc.push({
            id: String(b.id),
            tip: "borc",
            baslik: (b.person_name as string) || "Kayıt",
            alt: b.type === "receivable" ? "Alacak" : "Borç",
            tutar: Number(b.amount ?? 0),
            href: "/panel/borc-alacak",
          });
      }),
      ortak(
        q.from("checks_notes")
          .select("id, person_name, check_number, amount, currency, type, bank_name")
          .eq("user_id", profilId)
          .or(`person_name.ilike.${like},check_number.ilike.${like},bank_name.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const c of data ?? [])
          sonuc.push({
            id: String(c.id),
            tip: "cek",
            baslik: (c.person_name as string) || (c.check_number as string) || "Çek/Senet",
            alt: [c.check_number as string, c.type === "note" ? "Senet" : "Çek"]
              .filter(Boolean)
              .join(" · "),
            tutar: Number(c.amount ?? 0),
            paraBirimi: c.currency as string,
            href: "/panel/cek-senet",
          });
      }),
      ortak(
        q.from("credit_book")
          .select("id, customer_name, phone, total_debt")
          .eq("user_id", profilId)
          .or(`customer_name.ilike.${like},phone.ilike.${like}`)
          .limit(LIMIT)
      ).then(({ data }: { data: Record<string, unknown>[] | null }) => {
        for (const v of data ?? [])
          sonuc.push({
            id: String(v.id),
            tip: "veresiye",
            baslik: (v.customer_name as string) || "Müşteri",
            alt: (v.phone as string) || "Veresiye",
            tutar: Number(v.total_debt ?? 0),
            href: "/panel/veresiye",
          });
      })
    );
  }

  // Bir tablo patlarsa (kolon/izin) arama TAMAMEN ölmesin — o grup boş kalsın yeter.
  await Promise.allSettled(istekler);
  return sonuc;
}
