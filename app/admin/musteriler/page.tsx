import { hasAdminKey } from "../../../lib/supabase/admin";
import { listPeople } from "../../../lib/adminUsers";
import AdminKeyNotice from "../AdminKeyNotice";
import MusterilerClient from "./MusterilerClient";

export default async function AdminMusterilerPage() {
  if (!hasAdminKey()) return <AdminKeyNotice />;

  // Müşteri = KİŞİ (auth.users), profiller onun altında. E-posta profiles'ta yok → auth'tan gelir.
  const { people, truncated } = await listPeople();

  // Zaman damgası SUNUCUDA alınır → durum rozetleri ilk boyamada dolu gelir ve
  // sunucu/istemci aynı anı hesapladığı için hydration ayrışması olmaz.
  return <MusterilerClient people={people} truncated={truncated} now={Date.now()} />;
}
