import { hasAdminKey } from "../../../lib/supabase/admin";
import { requireAdminPage } from "../../../lib/adminGuard";
import { listPeople } from "../../../lib/adminUsers";
import AdminKeyNotice from "../AdminKeyNotice";
import MusterilerClient from "./MusterilerClient";
import LiveRefresh from "../LiveRefresh";

export default async function AdminMusterilerPage() {
  await requireAdminPage(); // agent müşteri verisi göremez (layout guard'ı yalnız "staff mi" der)
  if (!hasAdminKey()) return <AdminKeyNotice />;

  // Müşteri = KİŞİ (auth.users), profiller onun altında. E-posta profiles'ta yok → auth'tan gelir.
  const { people, truncated, error } = await listPeople();

  // Hata varsa BOŞ LİSTE ÇİZME — "müşteri yok" yalanı yerine gerçeği söyle.
  if (error) {
    return (
      <div>
        <h1 className="admin-h1">Müşteriler</h1>
        <p className="admin-sub">Liste yüklenemedi: {error}</p>
      </div>
    );
  }

  // Zaman damgası SUNUCUDA alınır → durum rozetleri ilk boyamada dolu gelir ve
  // sunucu/istemci aynı anı hesapladığı için hydration ayrışması olmaz.
  return (
    <>
      {/* "Şu an aktif" yeşil noktaları bayat kalmasın — görünürken 60 sn'de bir tazeler */}
      <LiveRefresh />
      <MusterilerClient people={people} truncated={truncated} now={Date.now()} />
    </>
  );
}
