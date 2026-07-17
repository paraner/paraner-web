import Link from "next/link";
import { getOnlineCount } from "../../lib/adminLive";

/* Kabuktaki canlı sayaç — sayfa başlığıyla AYNI HİZADA, sağ üstte (her admin sayfasında).
   Tıkla → /admin/canli.

   Konumlandırma: layout {children}'ı render ediyor ve h1 children'ın İÇİNDE → aynı satıra
   flex ile koyulamaz. Bu yüzden .admin-main'e göre absolute; top değeri .admin-content'in
   üst dolgusuyla eşleşiyor → h1 ile aynı hizaya oturuyor.

   Yalnız YÖNETİCİ görür (layout'ta gate'li): sayfa müşteri e-postalarını listeliyor. */
export default async function LivePill() {
  const count = await getOnlineCount();

  return (
    <Link
      href="/admin/canli"
      className={`admin-live-btn${count > 0 ? " on" : ""}`}
      title="Canlı Görünüm — şu an uygulamayı kullananlar"
    >
      <span className="admin-live-btn-dot" />
      Canlı kullanıcılar
      <span className="admin-live-btn-count">{count}</span>
    </Link>
  );
}
