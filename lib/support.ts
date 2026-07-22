"use client";

// Destek/ticket veri katmanı (web) — mobil lib/support.ts ile AYNI tablolar ve sözleşme.
// Sahiplik auth.users.id (KİŞİ) — "her yerde profile.id" kuralının bilinçli istisnası:
// destek talebi kullanıcının HANGİ profilinde olursa olsun ortak görünür.
import { createClient } from "./supabase/client";

/* Tipler + sabitler `supportShared.ts`'te (istemci-DEĞİL modül) — sunucu sayfaları oradan
   okumalı, buradan DEĞİL: "use client" modülünden sunucuya import edilen sabit, değer değil
   istemci-referansı proxy'si olarak gelir ve kullanıldığı yerde patlar.
   Buradaki re-export yalnız İSTEMCİ bileşenlerinin tek yerden import edebilmesi için. */
export {
  TICKET_COLS,
  TICKET_STATUS_META,
  DEPARTMENTS,
  DEPARTMENT_META,
  departmentLabel,
  type TicketStatus,
  type Ticket,
  type TicketMessage,
  type Department,
} from "./supportShared";
import { DEPARTMENTS, type TicketStatus, type TicketMessage, type Department } from "./supportShared";
import { uploadTicketFile, uploadTicketFileTo, ticketFilePath } from "./ticketAttachments";

// Yeni talep = ticket + ilk kullanıcı mesajı. Thread'e gitmek için ticket id döner.
/* Talep aç. `department` 2026-07-18'de eklendi (sql/destek/destek-departman.sql):
   hangi ekibe düşeceğini müşteri seçiyor, trigger o ekibe + admin'lere bildirim atıyor.
   `priority` müşteriye SORULMUYOR — departmanın varsayılanından türetiliyor
   (herkes "yüksek" seçerse alan bilgi taşımaz olur; agent panelden değiştirir). */
export async function createTicket(
  subject: string,
  body: string,
  department: Department = "teknik",
  file?: File | null,
): Promise<string | null> {
  const supabase = createClient();
  /* ⚠️ getUser() DEĞİL getSession() (2026-07-22 hız ölçümü): getUser her çağrıda
     Supabase'e GİDİYOR ve ölçümde 164 ms yiyordu — üstelik talep açma zaten 4 ardışık
     turdan oluşuyordu. getSession yereldeki oturumu okur, ağ turu yok.
     Güvenlik kaybı YOK: buradaki id yalnız satıra yazılacak değer; gerçek kapı RLS'in
     `user_id = auth.uid()` koşulu ve o JWT'den okunuyor. Uydurma bir id yazılamaz. */
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const oncelik = DEPARTMENTS.find((d) => d.id === department)?.oncelik ?? "normal";
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: subject.trim(), department, priority: oncelik })
    .select("id")
    .single();
  if (error || !ticket) return null;

  /* Ek, talep OLUŞTUKTAN SONRA yükleniyor — yol `{ticket_id}/...` ve storage policy'si
     klasörden talebi bulup yetki soruyor, yani ticket id olmadan yükleme yapılamaz.
     ⚠️ Yükleme düşerse TALEP YİNE AÇILIR (ek olmadan): müşteri sorununu anlatan metni
     yazmış, dosya yüzünden bütün talebi kaybettirmek yanlış olur. Sessiz de kalmıyoruz —
     çağıran `null` dönen yolu görüp kullanıcıya "ek eklenemedi" diyebilir. */
  /* ⚠️ YÜKLEME İLE MESAJ YAZIMI PARALEL (2026-07-22). Eskiden sıralıydı ve ölçümde
     yükleme 669 ms, mesaj 341 ms sürüyordu — toplam 1 sn'yi tek başına bu ikili yiyordu.
     Yol yüklemeden ÖNCE üretilebildiği için (ticketFilePath) mesaj satırı yolu İÇİNDE
     taşıyarak hemen yazılabiliyor.
     ⚠️ Neden "önce mesajı yaz, sonra attachment_url'i UPDATE et" DEĞİL: realtime aboneliği
     yalnız INSERT dinliyor (subscribeMessages) → sonradan yapılan UPDATE karşı tarafa
     GİTMEZ, ek ancak sayfa yenilenince görünürdü. Yani o yol sessiz bir regresyondu.
     ⚠️ Bedeli: yükleme düşerse satırda ölü bir yol kalır → aşağıda temizleniyor. */
  const yol = file ? ticketFilePath(ticket.id as string, file) : null;
  const yukleme = file && yol ? uploadTicketFileTo(yol, file) : Promise.resolve(null);

  const mesaj = supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_type: "user",
      body: body.trim(),
      attachment_url: yol,
    })
    .select("id")
    .single();

  const [yuklendi, { data: mesajSatiri }] = await Promise.all([yukleme, mesaj]);

  /* Yükleme düştü ama mesaj yolu taşıyor → ek "açılamadı" diye görünürdü. Kolonu temizle:
     talep yine açılır (metin yazılmış, dosya yüzünden talebi kaybettirmek yanlış olur). */
  if (file && !yuklendi && mesajSatiri) {
    await supabase.from("ticket_messages").update({ attachment_url: null }).eq("id", mesajSatiri.id);
  }
  return ticket.id as string;
}

// Mesaj gönder. senderType çağıran tarafından belirlenir (kullanıcı kendi ticket'ında 'user',
// destek personeli başkasının ticket'ında 'agent').
/* ⚠️ EKLENEN SATIRI GERİ DÖNDÜRÜR (2026-07-20). Eskiden yalnız `boolean` dönüyordu ve
   ThreadClient mesajı listeye eklemeyip realtime echo'suna güveniyordu → echo gecikirse
   ya da düşerse gönderen kendi mesajını SAYFAYI YENİLEYENE KADAR göremiyordu (Mehmet
   canlıda yakaladı). Mobil bu hataya düşmüyor çünkü zaten `.select().single()` ile dönen
   satırı iyimser olarak ekliyor (paraner-app/lib/support.ts) — web ondan geri kalmıştı. */
export async function sendMessage(
  ticketId: string,
  body: string,
  senderType: "user" | "agent",
  file?: File | null,
): Promise<TicketMessage | null> {
  const supabase = createClient();
  // getSession = yerel okuma (createTicket'taki aynı gerekçe: RLS gerçek kapı).
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const attachment = file ? await uploadTicketFile(ticketId, file) : null;
  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_type: senderType,
      body: body.trim(),
      attachment_url: attachment,
    })
    .select("id, ticket_id, sender_id, sender_type, body, attachment_url, created_at")
    .single();
  if (error || !data) return null;
  return data as TicketMessage;
}

export async function resolveTicket(ticketId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "resolved" })
    .eq("id", ticketId);
  return !error;
}

// Thread realtime — mobil ile aynı desen (AccountStatusGuard kanonik): setAuth + postgres_changes INSERT.
export function subscribeMessages(
  ticketId: string,
  onInsert: (m: TicketMessage) => void
): () => void {
  const supabase = createClient();
  /* ⚠️ SIRA ÖNEMLİ: önce token, SONRA subscribe. Eskiden `getSession()` await EDİLMEDEN
     `.subscribe()` aynı tick'te çalışıyordu → kanal token'sız açılırsa RLS'te `auth.uid()`
     null olur, politika hiçbir satırı geçirmez ve olay HATA VERMEDEN düşer.
     Doğru sıra zaten repoda vardı (app/panel/NotificationBell.tsx:73-75); burası ondan sapmıştı. */
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let iptal = false;

  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (iptal) return; // bileşen abone olmadan söküldü
    if (session?.access_token) supabase.realtime.setAuth(session.access_token);
    channel = supabase
      .channel(`ticket_${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload) => onInsert(payload.new as TicketMessage)
      )
      .subscribe();
  })();

  return () => {
    iptal = true;
    if (channel) supabase.removeChannel(channel);
  };
}
