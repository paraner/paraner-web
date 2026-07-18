import { requireStaffPage } from "../../../lib/adminGuard";
import { createClient } from "../../../lib/supabase/server";
import { listPeople } from "../../../lib/adminUsers";
import { TICKET_COLS, type Ticket } from "../../../lib/supportShared";
import { personLifecycle, lifecycleLabel, LIFECYCLE_META, displayName } from "../../../lib/lifecycle";
import DestekListClient, { type TicketRow } from "./DestekListClient";

export const metadata = { title: "Destek Talepleri", robots: { index: false, follow: false } };

/* Destek gelen kutusu — agent'ın asıl çalışma ekranı.
   ⚠️ Talep TEK BAŞINA yetmiyordu (Mehmet, 2026-07-18): "kim yazmış, ne zaman üye olmuş,
   ödüyor mu, kaç profili var" bilgisi olmadan agent her talepte Müşteriler ekranına gidip
   aramak zorundaydı. Talep satırı artık müşteri bağlamını da taşıyor.

   Veri İKİ KAYNAKTAN geliyor, JS'te birleşiyor:
   · Talepler → kullanıcı oturumu + RLS (staff hepsini görür, service_role gerekmez)
   · Müşteri bağlamı → listPeople() (service_role; auth.users + profiles)
   ⚠️ support_tickets.user_id = auth.users.id (KİŞİ), profil id DEĞİL. */
export default async function AdminDestekPage() {
  await requireStaffPage(); // sayfa kendi guard'ını çağırır (denetim Y1) — layout'a güvenme

  const supabase = await createClient();
  const [ticketR, peopleR] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(TICKET_COLS)
      .order("last_message_at", { ascending: false })
      .limit(200),
    listPeople(),
  ]);

  if (ticketR.error) {
    return (
      <div>
        <h1 className="admin-h1">Destek Talepleri</h1>
        <p className="admin-sub">Talepler yüklenemedi: {ticketR.error.message}</p>
      </div>
    );
  }

  const tickets = (ticketR.data as Ticket[]) ?? [];
  const now = Date.now();
  const byUser = new Map(peopleR.people.map((p) => [p.id, p]));

  const rows: TicketRow[] = tickets.map((t) => {
    const person = byUser.get(t.user_id);
    if (!person) {
      return {
        ticket: t, email: null, ad: null, uyelik: null,
        durum: null, durumBadge: null, profilSayisi: 0, sonAktiflik: null,
      };
    }
    const l = personLifecycle(person, now);
    return {
      ticket: t,
      email: person.email,
      ad: displayName(person),
      uyelik: person.created_at,
      durum: lifecycleLabel(l),
      durumBadge: LIFECYCLE_META[l.kind].badge,
      profilSayisi: person.profiles.length,
      sonAktiflik: person.last_seen_at ?? person.last_sign_in_at,
    };
  });

  /* Müşteri bağlamı okunamazsa talepler YİNE gösterilir (destek işi durmasın) ama sebebi
     ekranda yazar — sessizce "bilgi yok" göstermek denetimdeki Y6'nın aynısı olurdu. */
  const uyari = peopleR.error
    ? `Müşteri bilgileri okunamadı (${peopleR.error}) — talepler listeleniyor ama kimin yazdığı görünmüyor.`
    : peopleR.truncated
    ? "Müşteri listesi 10.000'de kırpıldı — bazı taleplerde müşteri bilgisi boş görünebilir."
    : null;

  return (
    <DestekListClient
      rows={rows}
      now={now}
      uyari={uyari}
      /* 200 sınırı SESSİZ kalmasın (CLAUDE.md: listeye limit koy + kırpmayı söyle). */
      kirpildi={tickets.length >= 200}
    />
  );
}
