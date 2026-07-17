import { requireAdminPage } from "../../../lib/adminGuard";
import { hasAdminKey } from "../../../lib/supabase/admin";
import { getLiveSnapshot } from "../../../lib/adminLive";
import AdminKeyNotice from "../AdminKeyNotice";
import CanliClient from "./CanliClient";

export const metadata = { title: "Canlı Görünüm", robots: { index: false, follow: false } };

/* Sayfa canlı: kabuktaki LiveRefresh (30 sn, sekme görünürken) sunucu verisini tazeliyor.
   Kalp atışı zaten 5 dk'da bir vurduğu için daha sık tazelemek yeni veri getirmez. */
export default async function CanliPage() {
  await requireAdminPage(); // müşteri e-postaları listeleniyor → agent göremez
  if (!hasAdminKey()) return <AdminKeyNotice />;

  const snap = await getLiveSnapshot();
  // Zaman SUNUCUDAN: "2 dk önce" etiketleri SSR ile hydrate arasında ayrışmasın.
  return <CanliClient snap={snap} now={Date.now()} />;
}
