"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { getStaffRole } from "./adminGuard";
import {
  FREE_TIER,
  TIER_LABELS,
  defaultPaidTier,
  isValidTier,
  type SubscriptionTier,
} from "./plans";

/* İç ekip aksiyonları (server action).
   ⚠️ GÜVENLİK: Server action'lar TARAYICIDAN çağrılabilen public endpoint'lerdir — app/admin/
   layout'undaki rol guard'ı bunları KORUMAZ (o yalnız sayfa render'ını korur). Bu yüzden her
   aksiyon kendi içinde requireAdmin()'den geçer. Aksi halde staff olmayan biri isteği elle
   kurup kullanıcı silebilirdi.
   Aksiyonlar service_role ile çalışır (RLS bypass) → guard ATLANAMAZ olmalı. */

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

type Actor = { id: string; email: string };

/** Çağıranın gerçekten admin olduğunu doğrular. Değilse aksiyon çalışmaz. */
async function requireAdmin(): Promise<Actor | null> {
  const role = await getStaffRole();
  if (role !== "admin") return null; // agent (destek) müşteri yönetemez — yalnız admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "—" };
}

/** Audit log kaydı. Tablo yoksa/hata olursa aksiyonu DÜŞÜRMEZ (log ikincil), sunucuya yazar. */
async function logAction(
  actor: Actor,
  action: string,
  target: { userId?: string; email?: string },
  detail?: Record<string, unknown>,
) {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target_user_id: target.userId ?? null,
    target_email: target.email ?? null,
    detail: detail ?? {},
  });
  if (error) console.error("[admin_audit_log] yazılamadı:", error.message, { action });
}

/* --- Müşteri aksiyonları --- */

/** Şifre sıfırlama maili gönder (Supabase Auth üzerinden). */
export async function sendPasswordReset(userId: string, email: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: "https://paraner.com/sifre-sifirla",
  });
  if (error) return { ok: false, message: `Mail gönderilemedi: ${error.message}` };

  await logAction(actor, "password_reset_sent", { userId, email });
  return { ok: true, message: `Şifre sıfırlama maili ${email} adresine gönderildi.` };
}

/** Profilin planını değiştir. Mevcut kolonlar — şema DEĞİŞMEZ.
    ⚠️ subscription_tier'a UYDURMA DEĞER YAZMA: DB'de CHECK yok, "premium" gibi bir string
    sessizce kaydolur ama mobil onu tanımaz (etiketsiz görünür). Geçerli sözlük: lib/plans.ts.
    Free'ye düşerken mobil `expireTrial` ile aynı davranış: is_premium=false + individual_free
    (işletme profili de buna düşer — sistemde tek "free" tier'ı bu).
    `trial_notified_day7` BİLEREK yazılmaz: mobil "denemen bitti" modalını göstersin. */
export async function setProfilePlan(
  profileId: string,
  isPremium: boolean,
  targetEmail: string,
  tier?: SubscriptionTier,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  let nextTier: SubscriptionTier;
  if (isPremium) {
    if (tier && !isValidTier(tier)) return { ok: false, message: "Geçersiz plan." };
    if (tier) nextTier = tier;
    else {
      // Tür bilinmeden makul plan seçilemez → profili oku.
      const { data: prof } = await admin
        .from("profiles")
        .select("profile_type")
        .eq("id", profileId)
        .maybeSingle();
      nextTier = defaultPaidTier((prof as { profile_type: string | null } | null)?.profile_type ?? null);
    }
  } else {
    nextTier = FREE_TIER;
  }

  /* ⚠️ DENEME ALANLARI DA TEMİZLENMELİ — yoksa aksiyon kendi kendini sabote eder:
     lib/lifecycle.ts "trial alanları dolu + süre geçmiş + is_premium" gördüğünde ZOMBİ der.
     Sadece is_premium yazsaydık: ödeme alıp "Premium yap" dediğin müşteri panelde kırmızı
     "⚠️ Deneme X gün önce bitti" rozetiyle zombi segmentine düşerdi → ekip onu "bozuk kayıt"
     sanıp tekrar free'ye düşürebilirdi. Free'ye düşerken de temizliyoruz: yoksa rozet hâlâ
     "Deneme · 5 gün kaldı" der, aksiyon işe yaramamış görünür.
     Deneme geçmişi zaten `admin_audit_log`'da ve mobil yeni deneme başlatırken bu alanları
     kendisi yazıyor (lib/trial.ts startTrial) → veri kaybı yok. */
  const { error } = await admin
    .from("profiles")
    .update({
      is_premium: isPremium,
      subscription_tier: nextTier,
      trial_plan: null,
      trial_start_date: null,
    })
    .eq("id", profileId);
  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };

  /* ⚠️ target_user_id de YAZILMALI (denetim 2026-07-18 / O9): eskiden yalnız istemciden gelen
     e-posta yazılıyordu → admin_audit_log.target_user_id NULL kalıyor, admin-audit-log.sql'deki
     target_idx bu aksiyonlarda işe yaramıyor ve kişi e-postasını değiştirince iz KAYBOLUYORDU.
     Profil → auth_user_id sunucuda çözülüyor (istemcinin dediğine güvenmiyoruz). */
  const { data: owner } = await admin
    .from("profiles")
    .select("auth_user_id")
    .eq("id", profileId)
    .maybeSingle();
  await logAction(
    actor,
    isPremium ? "plan_premium" : "plan_free",
    {
      userId: (owner as { auth_user_id: string | null } | null)?.auth_user_id ?? undefined,
      email: targetEmail,
    },
    { profileId, tier: nextTier },
  );
  revalidatePath("/admin/musteriler");
  return {
    ok: true,
    message: isPremium
      ? `Plan güncellendi: ${TIER_LABELS[nextTier]}.`
      : "Profil ücretsiz plana düşürüldü.",
  };
}

/** Hesabı askıya al / aç. Supabase'in yerleşik ban'i — veri silinmez, geri alınabilir. */
export async function setUserBanned(
  userId: string,
  banned: boolean,
  email: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  if (userId === actor.id) return { ok: false, message: "Kendi hesabını askıya alamazsın." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  // "876000h" = 100 yıl (süresiz askı). "none" bani kaldırır.
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) return { ok: false, message: `İşlem başarısız: ${error.message}` };

  await logAction(actor, banned ? "user_banned" : "user_unbanned", { userId, email });
  revalidatePath("/admin/musteriler");
  return {
    ok: true,
    message: banned ? "Hesap askıya alındı — giriş yapamaz." : "Askı kaldırıldı, hesap tekrar aktif.",
  };
}

/** Hesabı KALICI sil. auth.users DELETE trigger'ı veda mailini gönderir. */
export async function deleteUserAccount(userId: string, email: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  if (userId === actor.id) return { ok: false, message: "Kendi hesabını buradan silemezsin." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  // Log SİLMEDEN ÖNCE yazılır: silme sonrası kullanıcı yok, kaydın kime ait olduğu kaybolur.
  await logAction(actor, "user_deleted", { userId, email });

  const { error } = await admin.auth.admin.deleteUser(userId);
  /* ⚠️ TELAFİ KAYDI (denetim 2026-07-18 / O10): log silmeden ÖNCE yazılıyor (yukarıdaki sebep
     doğru), ama silme düşerse denetim ekranında kırmızı "Hesap KALICI silindi" satırı KALIYORDU
     — üstelik user_deleted satırlarına detay linki verilmediği için kayıt "silinmiş" sanılıyordu.
     Satırı geri alamayız (tablo append-only, bilinçli) → başarısızlığı AYRI kayıtla belgele. */
  if (error) {
    await logAction(actor, "user_delete_failed", { userId, email }, { reason: error.message });
    return { ok: false, message: `Silinemedi: ${error.message}` };
  }

  revalidatePath("/admin/musteriler");
  return { ok: true, message: `${email} kalıcı olarak silindi.` };
}

/* --- Ekip aksiyonları --- */

/** Rol ver (admin/agent) — kullanıcı zaten kayıtlıysa. */
export async function grantRole(email: string, role: "admin" | "agent"): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const target = email.trim().toLowerCase();
  const { users } = await (await import("./adminUsers")).listAuthUsers();
  const user = users.find((u) => (u.email ?? "").toLowerCase() === target);
  if (!user) {
    return {
      ok: false,
      message: "Bu e-postayla kayıtlı kullanıcı yok. Önce 'Davet Et' ile hesap oluştur.",
    };
  }

  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: user.id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (error) return { ok: false, message: `Rol verilemedi: ${error.message}` };

  await logAction(actor, "role_granted", { userId: user.id, email: target }, { role });
  revalidatePath("/admin/ekip");
  return { ok: true, message: `${target} → ${role === "admin" ? "Yönetici" : "Destek"} yapıldı.` };
}

/** Rolü geri al. */
export async function revokeRole(
  userId: string,
  role: "admin" | "agent",
  email: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  if (userId === actor.id && role === "admin") {
    return { ok: false, message: "Kendi yönetici rolünü kaldıramazsın (panele kilitlenirsin)." };
  }
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const { error } = await admin.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  if (error) return { ok: false, message: `Kaldırılamadı: ${error.message}` };

  await logAction(actor, "role_revoked", { userId, email }, { role });
  revalidatePath("/admin/ekip");
  return { ok: true, message: "Rol kaldırıldı." };
}

/** Yeni personeli e-posta ile davet et + rolünü ver. */
export async function inviteStaff(email: string, role: "admin" | "agent"): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const target = email.trim().toLowerCase();
  /* ⚠️ redirectTo ŞİFRE BELİRLEME sayfası olmalı — /giris DEĞİL. Davet edilen kişinin şifresi
     YOK; admin host'unun /giris'i (AdminLogin) e-posta+şifre formu gösteriyor ve davet
     token'ını işlemiyor → kişi maildeki linke tıklar, giremez, çıkmaz sokak.
     /sifre-sifirla token'ı işleyip şifre kurduruyor (ResetPasswordClient); sonra
     admin.paraner.com'a girer. ⚠️ Bu URL Supabase → Auth → URL Configuration →
     Redirect URLs listesinde OLMALI, yoksa link reddedilir. */
  const { data, error } = await admin.auth.admin.inviteUserByEmail(target, {
    redirectTo: "https://paraner.com/sifre-sifirla",
  });
  if (error) return { ok: false, message: `Davet gönderilemedi: ${error.message}` };

  const newUserId = data?.user?.id;
  /* ⚠️ Rol yazımının HATASI KONTROL EDİLMELİ (denetim 2026-07-18 / Y5): eskiden dönüş atılıyordu
     → upsert düşse bile "davet edildi" deniyordu. Sonuç: mail gitmiş, denetim kaydına düşmüş,
     ama kişi Ekip listesinde GÖRÜNMÜYOR (o liste user_roles'tan besleniyor) ve şifresini kurup
     girince /panel'e atılıyor. Yönetici sebebini göremiyordu. */
  const roleErr = newUserId
    ? (
        await admin
          .from("user_roles")
          .upsert(
            { user_id: newUserId, role },
            { onConflict: "user_id,role", ignoreDuplicates: true }
          )
      ).error
    : null;

  await logAction(
    actor,
    "staff_invited",
    { userId: newUserId, email: target },
    { role, roleGranted: !roleErr }
  );
  revalidatePath("/admin/ekip");
  if (!newUserId)
    return {
      ok: false,
      message: `${target} için davet gönderildi ama kullanıcı kimliği alınamadı — rol verilemedi. Ekip listesinden "Rol ver" ile tamamla.`,
    };
  if (roleErr)
    return {
      ok: false,
      message: `Davet gitti ama rol verilemedi: ${roleErr.message} — kişi giriş yapamaz. Ekip listesinden "Rol ver" ile tekrar dene.`,
    };
  return { ok: true, message: `${target} davet edildi — kurulum maili gönderildi.` };
}
