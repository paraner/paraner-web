"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { getStaffRole } from "./adminGuard";

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

/** Profilin premium/plan durumunu değiştir. profiles kolonları — şema DEĞİŞMEZ. */
export async function setProfilePlan(
  profileId: string,
  isPremium: boolean,
  targetEmail: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const { error } = await admin
    .from("profiles")
    .update({ is_premium: isPremium, subscription_tier: isPremium ? "premium" : null })
    .eq("id", profileId);
  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };

  await logAction(actor, isPremium ? "plan_premium" : "plan_free", { email: targetEmail }, { profileId });
  revalidatePath("/admin/musteriler");
  return { ok: true, message: isPremium ? "Profil premium yapıldı." : "Profil free'ye düşürüldü." };
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
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };

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
  const { data, error } = await admin.auth.admin.inviteUserByEmail(target, {
    redirectTo: "https://admin.paraner.com/giris",
  });
  if (error) return { ok: false, message: `Davet gönderilemedi: ${error.message}` };

  const newUserId = data?.user?.id;
  if (newUserId) {
    await admin
      .from("user_roles")
      .upsert({ user_id: newUserId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  }

  await logAction(actor, "staff_invited", { userId: newUserId, email: target }, { role });
  revalidatePath("/admin/ekip");
  return { ok: true, message: `${target} davet edildi — kurulum maili gönderildi.` };
}
