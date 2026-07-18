// Para ve tarih biçimlendirme — mobil uygulamayla birebir aynı görünüm.

// ₺1.234,56 (sembol başta, binlik nokta, ondalık virgül)
export function formatCurrency(amount: number, currency: string = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Kullanıcı girdisi tutarı sayıya çevir. Türkçe biçim: "1.234,56" (nokta binlik,
// virgül ondalık) DE desteklenir → 1234.56. Virgül yoksa İngilizce ondalık kabul
// edilir. Geçersizse NaN döner (çağıran genelde `|| 0` ile ele alır).
export function parseAmount(input: string): number {
  if (input == null) return NaN;
  let s = String(input).trim().replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // binlik nokta at, virgül→nokta
  return Number(s);
}

// "2026-06-10" → "10.06.2026" (GG.AA.YYYY). Timezone kaymasını önlemek için
// tarih string'i elle parçalanır (new Date(...) UTC'ye kayabiliyor).
export function formatDate(date: string): string {
  const [y, m, d] = date.split("T")[0].split("-");
  if (!y || !m || !d) return date;
  return `${d}.${m}.${y}`;
}

/* ── ZAMAN DAMGASI BİÇİMLENDİRME (2026-07-18) ──────────────────────────────
   ⚠️ SAAT DİLİMİ HER ZAMAN SABİT YAZILMALI. Yazılmazsa çalışan ortamın yereli
   kullanılır ve İKİ ayrı sorun çıkar:
     1) DOĞRULUK — sunucu (Vercel) UTC'de çalışıyor. `toLocaleString("tr-TR")`
        sunucuda 11:35, tarayıcıda 14:35 üretiyordu; SSR HTML'i UTC saatti, yani
        kullanıcıya 3 saat GERİ zaman gösteriliyordu (destek yazışması, denetim
        kaydı, işlem saati).
     2) HYDRATION — sunucu ile istemcinin metni uyuşmuyor → React #418; bileşen
        istemcide sessizce yeniden çiziliyor. /admin/destek + /admin/musteriler'de
        ölçülüp doğrulandı.
   Ürün TR odaklı, ekip ve müşteriler Türkiye'de → sabit Europe/Istanbul doğru davranış.
   Kullanıcının kendi saat dilimini göstermek istersek ayrı karar (o zaman tarih
   yalnız istemcide, `suppressHydrationWarning` ile üretilmeli). */
export const TZ = "Europe/Istanbul";

/** "18 Tem 2026" — liste/kart tarihleri. */
export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric", timeZone: TZ,
  });
}

/** "18 Tem 14:35" — son mesaj/hareket zamanı. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  });
}

/** "14:35" — yalnız saat. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}
