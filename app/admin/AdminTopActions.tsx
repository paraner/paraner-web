import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import { getOnlineCount } from "../../lib/adminLive";
import { createClient } from "../../lib/supabase/server";
import type { StaffRole } from "../../lib/adminGuard";

/* Kabuktaki sağ üst aksiyon kümesi — sayfa başlığıyla aynı hizada, HER admin sayfasında.
   Amaç (Mehmet, 2026-07-18): panele girer girmez "bekleyen talep var mı?" sorusunun cevabı
   görünsün — dashboard'a gitmeye gerek kalmasın. Bildirim çanı mantığı: ikon + sayı rozeti.

   Rol ayrımı:
   · Talep ikonu → admin VE agent (destek zaten agent'ın asıl işi).
   · Canlı sayaç → yalnız admin (tıklayınca açılan sayfa müşteri e-postalarını listeliyor).

   Konumlandırma: layout {children}'ı render ediyor ve h1 children'ın İÇİNDE → aynı satıra
   flex ile koyulamaz. Bu yüzden .admin-main'e göre absolute; top değeri .admin-content'in
   üst dolgusuyla eşleşiyor → h1 ile aynı hizaya oturuyor. */
export default async function AdminTopActions({ role }: { role: StaffRole }) {
  const supabase = await createClient();

  /* İş bekleyen talepler = open + answered (dashboard kartıyla AYNI kural — iki yerde farklı
     sayı çıkmasın). RLS agent/admin'e hepsini açıyor → service_role gerekmiyor.
     head:true + count:exact → satır taşınmıyor, yalnız sayı geliyor. */
  const [ticketR, online] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "answered"]),
    role === "admin" ? getOnlineCount() : Promise.resolve(0),
  ]);

  /* ⚠️ Hata YUTULMUYOR: sorgu patlarsa `count` null gelir ve "0 bekleyen talep" demek
     tehlikeli olur (talepler yanıtsız kalır, kimse fark etmez — denetim 2026-07-18 / Y4'ün
     aynısı). Bilinmiyorsa rozet "!" gösterip uyarı rengine geçiyor. */
  const bilinmiyor = ticketR.error != null;
  const bekleyen = ticketR.count ?? 0;

  return (
    <div className="admin-top-actions">
      {/* Bildirim çanı — 2026-07-20'ye kadar admin kabuğunda HİÇ YOKTU: personel yeni talebi
          ancak sayfayı yenileyince görüyordu. Müşteri panelindekiyle AYNI bileşen; nereye
          gideceğini bildirimin kendi `link` alanı söylüyor (personele /admin/destek/<id>,
          müşteriye /panel/destek/<id> — trigger ikisini de doğru yazıyor).
          Yukarıdaki talep sayacı SUNUCUDA hesaplanıyor (sayfa yenilenince tazelenir);
          çan ise realtime → ikisi birbirini tamamlıyor. */}
      <NotificationBell />

      <Link
        href="/admin/destek"
        className={`admin-ic-btn${bilinmiyor ? " warn" : bekleyen > 0 ? " on" : ""}`}
        aria-label={
          bilinmiyor
            ? "Bekleyen talep sayısı okunamadı"
            : bekleyen > 0
            ? `${bekleyen} talep yanıt bekliyor`
            : "Bekleyen talep yok"
        }
        title={
          bilinmiyor
            ? `Talep sayısı okunamadı: ${ticketR.error?.message ?? "bilinmeyen hata"}`
            : bekleyen > 0
            ? `${bekleyen} talep yanıt bekliyor`
            : "Bekleyen talep yok"
        }
      >
        <LifeBuoy size={17} />
        {(bilinmiyor || bekleyen > 0) && (
          <span className="admin-ic-badge">{bilinmiyor ? "!" : bekleyen > 99 ? "99+" : bekleyen}</span>
        )}
      </Link>

      {role === "admin" && (
        <Link
          href="/admin/canli"
          className={`admin-live-btn${online > 0 ? " on" : ""}`}
          title="Canlı Görünüm — şu an uygulamayı kullananlar"
        >
          <span className="admin-live-btn-dot" />
          Canlı müşteriler
          <span className="admin-live-btn-count">{online}</span>
        </Link>
      )}
    </div>
  );
}
