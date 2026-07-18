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
import { DEPARTMENTS, departmentLabel, type Department } from "./supportShared";
import { sendInviteEmail, hasMailKey } from "./staffInvite";

/* Personel davet/kurtarma linkinin gideceği sayfa — şifre kurulumu buradan yapılır.
   ⚠️ ADMIN HOST'U: iç ekip pazarlama sitesine (paraner.com) hiç uğramamalı — davet edilen
   kişi baştan çalışacağı adresi görsün. `/sifre-sifirla` proxy'de tüm host'larda PUBLIC
   (proxy.ts PUBLIC_PATHS) → admin.paraner.com'da da açılır, ayrı sayfa gerekmiyor.
   ⚠️ ROTA `/sifre-olustur` — `/sifre-sifirla` DEĞİL: davet edilen kişi şifresini sıfırlamıyor,
   İLK KEZ oluşturuyor (Mehmet, 2026-07-18). Ayrı rota hem doğru metni gösteriyor hem de
   Supabase'e yazılacak adres anlamlı oluyor.
   ⚠️ ÖN KOŞUL: Supabase → Auth → URL Configuration → Redirect URLs listesinde
   `https://admin.paraner.com/sifre-olustur` OLMALI. Yoksa link reddedilir ve kişi giremez
   (paraner.com/sifre-sifirla ekli olması YETMEZ — tam URL eşleşmesi aranır).
   MÜŞTERİ şifre sıfırlaması bundan AYRI ve paraner.com/sifre-sifirla'da kalır (sendPasswordReset). */
const INVITE_REDIRECT = "https://admin.paraner.com/sifre-olustur";

/** Gelen departman listesini SÖZLÜKTEN doğrula (uydurma değer DB CHECK'ine çarpmasın). */
function temizDepartmanlar(list: string[] | undefined): Department[] {
  const gecerli = new Set(DEPARTMENTS.map((d) => d.id as string));
  return [...new Set((list ?? []).filter((d) => gecerli.has(d)))] as Department[];
}

/* Personelin departmanlarını TOPLUCA ayarla (sil + yaz).
   ⚠️ staff_departments'ta INSERT/UPDATE politikası YOK (destek-departman.sql:57) —
   yazma yalnız service_role ile, yani buradan. Bu bilinçliydi: departman ataması
   yetki kararıdır, personelin kendi kendine yapabileceği bir şey değil. */
async function departmanlariYaz(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  departmanlar: Department[],
): Promise<string | null> {
  const { error: delErr } = await admin.from("staff_departments").delete().eq("user_id", userId);
  if (delErr) return delErr.message;
  if (departmanlar.length === 0) return null;
  const { error: insErr } = await admin
    .from("staff_departments")
    .insert(departmanlar.map((d) => ({ user_id: userId, department: d })));
  return insErr?.message ?? null;
}

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
export async function grantRole(
  email: string,
  role: "admin" | "agent",
  departments?: string[],
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const target = email.trim().toLowerCase();
  // Davetteki ile AYNI kural: departmansız destekçi hiçbir talep göremez (fail-closed RLS).
  const deps = role === "agent" ? temizDepartmanlar(departments) : [];
  if (role === "agent" && deps.length === 0) {
    return {
      ok: false,
      message: "Destek personeli için en az bir departman seç — departmansız kişi hiçbir talep göremez.",
    };
  }
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

  const depErr = deps.length > 0 ? await departmanlariYaz(admin, user.id, deps) : null;

  await logAction(actor, "role_granted", { userId: user.id, email: target }, { role, departments: deps });
  revalidatePath("/admin/ekip");
  if (depErr)
    return {
      ok: false,
      message: `Rol verildi ama departman atanamadı: ${depErr} — kişi hiçbir talep göremez.`,
    };
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

/** Yeni personeli e-posta ile davet et + rolünü (ve destekçiyse departmanlarını) ver. */
export async function inviteStaff(
  email: string,
  role: "admin" | "agent",
  departments?: string[],
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const target = email.trim().toLowerCase();
  /* Yönetici zaten HER departmanı görür (staff_sees_department admin'e her zaman true) →
     ona departman yazmak anlamsız veri olurdu. Destekçide ise ZORUNLU: departmansız agent
     RLS gereği HİÇBİR talep göremez (destek-departman-rls.sql fail-closed) — davetten
     sonra fark edilmesi zor, sessiz bir çıkmaz sokak olurdu. Burada baştan engelliyoruz. */
  const deps = role === "agent" ? temizDepartmanlar(departments) : [];
  if (role === "agent" && deps.length === 0) {
    return {
      ok: false,
      message: "Destek personeli için en az bir departman seç — departmansız kişi hiçbir talep göremez.",
    };
  }

  /* ⚠️ redirectTo ŞİFRE BELİRLEME sayfası olmalı — /giris DEĞİL. Davet edilen kişinin şifresi
     YOK; admin host'unun /giris'i (AdminLogin) e-posta+şifre formu gösteriyor ve davet
     token'ını işlemiyor → kişi maildeki linke tıklar, giremez, çıkmaz sokak.
     /sifre-sifirla token'ı işleyip şifre kurduruyor (ResetPasswordClient); sonra
     admin.paraner.com'a girer. ⚠️ Bu URL Supabase → Auth → URL Configuration →
     Redirect URLs listesinde OLMALI, yoksa link reddedilir. (2026-07-18: ekli olduğu teyit edildi.) */

  /* MAİL YOLU — anahtarın varlığına göre ÖNCEDEN seçilir, sonradan değil:
     (a) RESEND VARSA: generateLink kullanıcıyı oluşturur + linki DÖNDÜRÜR (mail ATMAZ) →
         kendi markalı şablonumuzu yollarız; rol + departman mailin İÇİNDE yazar.
     (b) RESEND YOKSA: inviteUserByEmail — Supabase kendi sade davet mailini atar.
     ⚠️ Neden önceden seçiyoruz: generateLink kullanıcıyı ZATEN oluşturur. Sonra Resend
        düşerse inviteUserByEmail'i aynı adrese çağıramayız ("already registered") →
        kişi HİÇ mail almaz, sessizce yarım hesap kalırdı. O yüzden (a) yolunda Resend
        başarısız olursa TELAFİ olarak şifre-sıfırlama maili atılır (kişi yine girebilir)
        ve yöneticiye durum AÇIKÇA söylenir. */
  const markali = hasMailKey();
  let newUserId: string | undefined;
  let mailNotu = "";

  if (markali) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: target,
      options: { redirectTo: INVITE_REDIRECT },
    });
    if (error) return { ok: false, message: `Davet oluşturulamadı: ${error.message}` };
    newUserId = data?.user?.id;
    const link = data?.properties?.action_link ?? "";
    const mailErr = link
      ? await sendInviteEmail(target, role, deps.map(departmentLabel), link, actor.email)
      : "davet bağlantısı üretilemedi";
    if (mailErr) {
      /* ⚠️ ESKİDEN BURADA resetPasswordForEmail ÇAĞRILIYORDU — KALDIRILDI (2026-07-18).
         O, MÜŞTERİ şablonlu "Şifreni sıfırla" mailini paraner.com linkiyle gönderiyordu:
         personele yanlış metin + yanlış alan adı. "Hiç mail gitmemesi" bundan İYİDİR,
         çünkü kişi listede "Davet bekliyor" olarak duruyor ve "Daveti yenile" bir tık. */
      mailNotu = ` ⚠️ MAİL GİTMEDİ (${mailErr}) — satırdaki "Daveti yenile" ile tekrar gönder.`;
      console.error("[inviteStaff] davet maili hatası:", mailErr);
    }
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(target, {
      redirectTo: INVITE_REDIRECT,
    });
    if (error) return { ok: false, message: `Davet gönderilemedi: ${error.message}` };
    newUserId = data?.user?.id;
    mailNotu = " (sade Supabase şablonu — markalı mail için RESEND_API_KEY ekle)";
  }

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

  // Departman ataması da aynı titizlikle: sessizce düşerse kişi boş kutu görür.
  const depErr = newUserId && deps.length > 0 ? await departmanlariYaz(admin, newUserId, deps) : null;

  await logAction(
    actor,
    "staff_invited",
    { userId: newUserId, email: target },
    { role, departments: deps, roleGranted: !roleErr, departmentsGranted: !depErr }
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
  if (depErr)
    return {
      ok: false,
      message: `Davet + rol tamam ama departman atanamadı: ${depErr} — kişi hiçbir talep göremez. Listeden departmanlarını seç.`,
    };
  return { ok: true, message: `${target} davet edildi — kurulum maili gönderildi.${mailNotu}` };
}

/** Mevcut personelin departmanlarını güncelle (liste satırından). */
export async function setStaffDepartments(
  userId: string,
  email: string,
  departments: string[],
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const deps = temizDepartmanlar(departments);
  const err = await departmanlariYaz(admin, userId, deps);
  if (err) return { ok: false, message: `Departman güncellenemedi: ${err}` };

  await logAction(actor, "staff_departments_set", { userId, email }, { departments: deps });
  revalidatePath("/admin/ekip");
  return {
    ok: true,
    message:
      deps.length === 0
        ? `${email} → tüm departmanlar kaldırıldı; artık hiçbir talep göremez.`
        : `${email} → ${deps.map(departmentLabel).join(", ")}.`,
  };
}

/* Ekip satırındaki "Düzenle": rolü VE departmanları tek işlemde ayarlar.
   Rol tekil hale getiriliyor — bir kişi hem Yönetici hem Destek olarak listelenince
   "bu adam neyi görüyor?" sorusu karışıyordu (yönetici zaten her şeyi görür). */
export async function updateStaff(
  userId: string,
  email: string,
  role: "admin" | "agent",
  departments?: string[],
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  /* ⚠️ KENDİNİ KİLİTLEME KORUMASI: kendi yöneticiliğini Destek'e düşürürsen bu sayfa
     (requireAdminPage) sana kapanır ve geri alacak kimse olmayabilir. revokeRole'daki
     aynı korumanın buradaki karşılığı. */
  if (userId === actor.id && role !== "admin") {
    return { ok: false, message: "Kendi yöneticiliğini kaldıramazsın (panele kilitlenirsin)." };
  }

  const deps = role === "agent" ? temizDepartmanlar(departments) : [];
  if (role === "agent" && deps.length === 0) {
    return {
      ok: false,
      message: "Destek personeli için en az bir departman seç — departmansız kişi hiçbir talep göremez.",
    };
  }

  // Rolü tekilleştir: önce diğer rolü sil, sonra istenen rolü yaz.
  const digeri = role === "admin" ? "agent" : "admin";
  const { error: delErr } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", digeri);
  if (delErr) return { ok: false, message: `Rol güncellenemedi: ${delErr.message}` };

  const { error: upErr } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (upErr) return { ok: false, message: `Rol verilemedi: ${upErr.message}` };

  const depErr = await departmanlariYaz(admin, userId, deps);
  if (depErr) return { ok: false, message: `Rol tamam ama departman atanamadı: ${depErr}` };

  await logAction(actor, "staff_updated", { userId, email }, { role, departments: deps });
  revalidatePath("/admin/ekip");
  return {
    ok: true,
    message:
      role === "admin"
        ? `${email} → Yönetici (tüm yetkiler).`
        : `${email} → Destek · ${deps.map(departmentLabel).join(", ")}.`,
  };
}

/* Ekip satırındaki "Sil": kişiyi EKİPTEN çıkarır — HESABI SİLMEZ.
   ⚠️ Ayrım önemli: rolleri ve departmanları kaldırılır, auth hesabı ve müşteri verisi
   durur. Hesabı tamamen silmek Müşteriler ekranındaki "Kalıcı sil" işidir. */
export async function removeFromTeam(userId: string, email: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  if (userId === actor.id) {
    return { ok: false, message: "Kendini ekipten çıkaramazsın (panele kilitlenirsin)." };
  }

  const { error: depErr } = await admin.from("staff_departments").delete().eq("user_id", userId);
  if (depErr) return { ok: false, message: `Departmanlar kaldırılamadı: ${depErr.message}` };

  const { error } = await admin.from("user_roles").delete().eq("user_id", userId);
  if (error) return { ok: false, message: `Ekipten çıkarılamadı: ${error.message}` };

  await logAction(actor, "staff_removed", { userId, email });
  revalidatePath("/admin/ekip");
  return { ok: true, message: `${email} ekipten çıkarıldı. (Hesabı silinmedi.)` };
}

/** Daveti yeniden gönder (mail kaybolduysa / süresi dolduysa). */
export async function resendInvite(email: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const target = email.trim().toLowerCase();
  /* Kullanıcı ARTIK VAR → 'invite' tipi kullanılamaz ("already registered").
     'recovery' linki aynı sayfaya (/sifre-sifirla) düşer ve şifre kurdurur. */
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: target,
    options: { redirectTo: INVITE_REDIRECT },
  });
  if (error) return { ok: false, message: `Bağlantı üretilemedi: ${error.message}` };

  const link = data?.properties?.action_link ?? "";
  const roles = await admin.from("user_roles").select("role").eq("user_id", data?.user?.id ?? "");
  const rol = (roles.data ?? []).some((r) => (r as { role: string }).role === "admin")
    ? "admin"
    : "agent";
  const deps = await admin
    .from("staff_departments")
    .select("department")
    .eq("user_id", data?.user?.id ?? "");
  const depLabels = (deps.data ?? []).map((d) => departmentLabel((d as { department: string }).department));

  const mailErr = link
    ? await sendInviteEmail(target, rol as "admin" | "agent", depLabels, link, actor.email)
    : "bağlantı üretilemedi";
  /* Yedek yol YOK (bilinçli): müşteri şablonlu "Şifreni sıfırla" maili personele gitmemeli.
     Gönderemiyorsak açıkça söyleriz; kişi listede "Davet bekliyor" olarak durmaya devam eder. */
  if (mailErr) {
    console.error("[resendInvite] davet maili hatası:", mailErr);
    return { ok: false, message: `Mail gönderilemedi: ${mailErr}` };
  }

  await logAction(actor, "staff_invite_resent", { email: target }, { role: rol });
  revalidatePath("/admin/ekip");
  return { ok: true, message: `${target} → davet yeniden gönderildi.` };
}
