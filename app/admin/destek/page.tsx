import { requireStaffPage } from "../../../lib/adminGuard";
import { createClient } from "../../../lib/supabase/server";
import { listPeopleCached } from "../../../lib/adminUsers";
import { TICKET_COLS, type Ticket } from "../../../lib/supportShared";
import { personLifecycle, lifecycleLabel, LIFECYCLE_META, displayName } from "../../../lib/lifecycle";
import DestekListClient, { type TicketRow } from "./DestekListClient";
import TicketsLive from "./TicketsLive";

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
  /* Rol DÖNÜYOR: talep silme yalnız admin'e açık (Mehmet, 2026-07-21). Buradaki rol
     UI'ı ayarlar; asıl kapı sunucuda `deleteTickets` → `requireAdmin()`. */
  const role = await requireStaffPage(); // sayfa kendi guard'ını çağırır (denetim Y1) — layout'a güvenme

  const supabase = await createClient();
  const [ticketR, peopleR, auditR] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(TICKET_COLS)
      .order("last_message_at", { ascending: false })
      .limit(200),
    listPeopleCached(),
    /* Silinmiş müşterinin talebinde "kim, neden sildi" gösterebilmek için.
       ⚠️ Talep ↔ silinen kişi arasında join edecek anahtar YOK: user_id silinince NULL'a
       düşüyor (ON DELETE SET NULL). Bağı `detail.ticket_ids` kuruyor — deleteUserAccount
       silmeden ÖNCE o kişinin talep id'lerini denetim kaydına yazıyor.
       KULLANICI OTURUMUYLA okunuyor (service_role değil): admin_audit_log'un SELECT
       politikası admin-only → agent 0 satır alır ve bu bilgiyi görmez. Bilinçli. */
    supabase
      .from("admin_audit_log")
      .select("actor_email, detail, created_at")
      .eq("action", "user_deleted")
      .order("created_at", { ascending: false })
      .limit(200),
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

  /* talep id → o talebi kapsayan silme kaydı. Aynı talep tek bir silmede geçer
     (kişi bir kez silinir), o yüzden düz Map yeterli. */
  const silmeByTicket = new Map<string, { kim: string; sebep: string; not: string | null; ne_zaman: string }>();
  for (const kayit of auditR.data ?? []) {
    const d = (kayit.detail ?? {}) as Record<string, unknown>;
    const ids = Array.isArray(d.ticket_ids) ? (d.ticket_ids as string[]) : [];
    for (const tid of ids) {
      if (silmeByTicket.has(tid)) continue; // en yeni kayıt önce geliyor (order desc)
      silmeByTicket.set(tid, {
        kim: kayit.actor_email as string,
        sebep: typeof d.reason_label === "string" ? d.reason_label : "belirtilmemiş",
        not: typeof d.note === "string" ? d.note : null,
        ne_zaman: kayit.created_at as string,
      });
    }
  }

  const rows: TicketRow[] = tickets.map((t) => {
    // t.user_id null = müşteri silinmiş (FK SET NULL).
    const person = t.user_id ? byUser.get(t.user_id) : undefined;
    if (!person) {
      return {
        ticket: t, email: null, ad: null, uyelik: null,
        durum: null, durumBadge: null, profilSayisi: 0, sonAktiflik: null,
        // Denetim kaydından eşleşen silme varsa "kim, neden" göster; yoksa null → eski metin.
        silme: silmeByTicket.get(t.id) ?? null,
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
      silme: null, // müşteri duruyor
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
    <>
      {/* Yeni talep/yeni mesaj gelince listeyi anlık tazeler (realtime → router.refresh) */}
      <TicketsLive />
      <DestekListClient
        rows={rows}
        now={now}
        uyari={uyari}
        silebilir={role === "admin"}
        /* 200 sınırı SESSİZ kalmasın (CLAUDE.md: listeye limit koy + kırpmayı söyle). */
        kirpildi={tickets.length >= 200}
      />
    </>
  );
}
