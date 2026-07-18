import "server-only";

/* İÇ EKİP DAVET MAİLİ — markalı şablon, `staff-invite-notify` edge function'ı üzerinden.
   ⚠️ Bu dosya server-only: service_role anahtarı ASLA istemciye sızmamalı.

   NEDEN EDGE FUNCTION (Vercel'den doğrudan Resend DEĞİL):
   RESEND_API_KEY Supabase Edge Secrets'ta duruyor ve panelden GERİ OKUNAMIYOR (yalnız özet
   gösterilir) → Vercel'e koymak için Resend'de YENİ anahtar üretmek gerekirdi. Oysa mevcut
   sistem mailleri (welcome/farewell/support) zaten edge function'lardan gidiyor. Daveti de
   oraya taşıyınca YENİ ENV GEREKMİYOR: elimizdeki SUPABASE_SERVICE_ROLE_KEY hem çağrı
   yetkisi hem kimlik doğrulaması olarak iş görüyor.

   Anahtar yoksa/çağrı düşerse çağıran taraf Supabase'in sade davet mailine DÜŞER
   (adminActions.inviteStaff) — yani sistem her hâlükârda çalışır. */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Markalı mail yolu kullanılabilir mi (anahtarlar yerinde mi)? */
export function hasMailKey(): boolean {
  return SUPABASE_URL.length > 0 && SERVICE_ROLE_KEY.length > 0;
}

/** Daveti gönderir. Başarısızsa hata METNİ döner (çağıran yedek yola geçer). */
export async function sendInviteEmail(
  to: string,
  role: "admin" | "agent",
  departmanlar: string[],
  link: string,
  davetEden: string,
): Promise<string | null> {
  if (!hasMailKey()) return "sunucu anahtarı yok";
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/staff-invite-notify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: to,
        role,
        departments: departmanlar,
        link,
        invitedBy: davetEden,
      }),
    });
    if (!res.ok) return `davet servisi ${res.status}: ${await res.text()}`;
    return null;
  } catch (e) {
    return (e as Error)?.message ?? "bilinmeyen hata";
  }
}
