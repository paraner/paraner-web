import "server-only";

/* İÇ EKİP DAVET MAİLİ — markalı (Resend), Supabase'in çıplak şablonu yerine.
   ⚠️ Bu dosya server-only: Resend anahtarı ASLA istemciye sızmamalı.

   Neden Resend'i BURADAN çağırıyoruz (edge function değil):
   diğer sistem mailleri (welcome/farewell/support) DB olayıyla tetikleniyor, o yüzden
   edge function olmak ZORUNDA. Davet ise bir server action'dan (yönetici tıklaması)
   tetikleniyor → araya edge function + paylaşılan secret koymak gereksiz halka olurdu.

   ⚠️ RESEND_API_KEY YOKSA SİSTEM BOZULMAZ: çağıran taraf Supabase'in kendi davet
   mailine düşer (bkz. adminActions.inviteStaff). Yani env eklenmeden de davet çalışır,
   sadece mail sade görünür. */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const MAIL_FROM = "Paraner <merhaba@paraner.com>";
const LOGO_URL = "https://paraner.com/paraner-wordmark-titan.png";
const ADMIN_URL = "https://admin.paraner.com";

export function hasMailKey(): boolean {
  return RESEND_API_KEY.length > 0;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Rol açıklaması maile giriyor: kişi ne yapabileceğini linke tıklamadan bilsin. */
const ROL_METNI = {
  admin: {
    baslik: "Yönetici",
    aciklama: "Müşteri yönetimi, ekip, abonelikler ve destek dâhil her şeye erişimin olacak.",
  },
  agent: {
    baslik: "Destek Ekibi",
    aciklama: "Sana atanan departmanların destek taleplerini görüp yanıtlayacaksın.",
  },
} as const;

export function inviteHtml(
  role: "admin" | "agent",
  departmanlar: string[],
  link: string,
  davetEden: string,
): string {
  const r = ROL_METNI[role];
  const depSatiri =
    role === "agent" && departmanlar.length > 0
      ? `<p style="margin:10px 0 0;font-size:14px;line-height:21px;color:#444;">
           <strong>Departmanların:</strong> ${esc(departmanlar.join(" · "))}
         </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f2f4f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8e7;">
        <tr><td style="padding:36px 32px 8px;text-align:center;">
          <img src="${LOGO_URL}" alt="Paraner" width="120" style="display:inline-block;max-width:120px;height:auto;" />
        </td></tr>
        <tr><td style="padding:16px 32px 0;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f0f0f;">Paraner ekibine davet edildin 👋</h1>
          <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:#666;">${esc(r.baslik)}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 0;">
          <p style="margin:0;font-size:15px;line-height:23px;color:#444;">
            <strong>${esc(davetEden)}</strong> seni Paraner yönetim paneline davet etti.
          </p>
          <p style="margin:10px 0 0;font-size:14px;line-height:21px;color:#444;">${esc(r.aciklama)}</p>
          ${depSatiri}
        </td></tr>
        <tr><td style="padding:24px 32px 8px;text-align:center;">
          <a href="${link}" style="display:inline-block;background-color:#0a0b0d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:12px;">Şifreni Belirle & Giriş Yap</a>
        </td></tr>
        <tr><td style="padding:14px 32px 0;">
          <p style="margin:0;font-size:12px;line-height:18px;color:#999;text-align:center;">
            Bağlantı güvenlik gereği <strong>24 saat</strong> geçerlidir. Süresi dolarsa
            seni davet eden kişiden yeniden göndermesini iste.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;border-top:1px solid #eee;">
          <p style="margin:16px 0 0;font-size:12px;line-height:18px;color:#999;text-align:center;">
            Bu daveti beklemiyorduysan bu e-postayı yok sayabilirsin — bağlantıya
            tıklamadığın sürece hesap etkinleşmez.<br/>
            <a href="${ADMIN_URL}" style="color:#999;text-decoration:underline;">admin.paraner.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Daveti gönderir. Başarısızsa hata METNİ döner (çağıran Supabase mailine düşer). */
export async function sendInviteEmail(
  to: string,
  role: "admin" | "agent",
  departmanlar: string[],
  link: string,
  davetEden: string,
): Promise<string | null> {
  if (!RESEND_API_KEY) return "RESEND_API_KEY yok";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject: "Paraner ekibine davet edildin",
        html: inviteHtml(role, departmanlar, link, davetEden),
      }),
    });
    if (!res.ok) return `Resend ${res.status}: ${await res.text()}`;
    return null;
  } catch (e) {
    return (e as Error)?.message ?? "bilinmeyen hata";
  }
}
