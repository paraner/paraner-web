"use server";

import { revalidatePath, updateTag } from "next/cache";
/* ⚠️ `listPeopleCached()` 60 sn SUNUCU önbellekli (lib/adminUsers.ts). `revalidatePath` bunu
   düşürmez — o rota önbelleğini hedefler, `unstable_cache` girdisini değil. Kişi/profil
   değiştiren her aksiyon etiketi ELLE düşürmeli, yoksa yönetici sildiği/askıya aldığı
   müşteriyi 60 sn daha listede görür.

   ⚠️ `revalidateTag` DEĞİL `updateTag` (Next 16): `revalidateTag(tag, "max")` bayat-içeriği
   servis edip arkada tazeliyor (stale-while-revalidate) — yani yönetici sildiği müşteriyi
   BİR KEZ DAHA listede görürdü, tam da kaçındığımız hata sınıfı. `updateTag` anında
   düşürüyor, sonraki istek taze veriyi BEKLİYOR (read-your-own-writes) ve yalnız server
   action'dan çağrılabiliyor — bu dosyanın tamamı zaten "use server".
   İkisi de aynı iç `revalidate()` çağrısına iniyor (next/dist/server/web/spec-extension/
   revalidate.js:40-63) → `unstable_cache` etiketleri de kapsam içinde. */
import { KISILER_TAG } from "./adminUsers";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { getStaffRole, getSessionUser } from "./adminGuard";
import {
  FREE_TIER,
  TIER_LABELS,
  defaultPaidTier,
  isValidTier,
  type SubscriptionTier,
} from "./plans";
import { DEPARTMENTS, departmentLabel, TICKET_DELETE_MAX, type Department } from "./supportShared";
import { CURRENCIES } from "./currencies";
import {
  isDeleteReason,
  deleteReasonLabel,
  NOTE_REQUIRED_FOR,
  DELETE_NOTE_MAX,
} from "./deleteReasons";
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
   ⚠️ staff_departments'ta INSERT/UPDATE politikası YOK (sql/destek/destek-departman.sql:57) —
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
  // Paylaşılan tek çağrı — ayrı getUser açmıyoruz (2026-07-19 auth yükü ölçümü).
  const user = await getSessionUser();
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

/* "En az bir yönetici" DEĞİŞMEZ KURALI (2026-07-23, denetim: düz yönetici modeli).
   Bu kişiyi yöneticilikten düşürmek/ekipten çıkarmak sistemdeki SON yöneticiyi mi siler?
   ⚠️ Her aksiyondaki `userId === actor.id` self-check'i KENDİNİ kilitlemeyi zaten engelliyor;
   bu kural onu tamamlar: (1) iki admin'in aynı anda birbirini düşürdüğü yarışta pencereyi
   daraltır, (2) self-check ileride bozulursa yine ≥1 admin kalır (defense-in-depth).
   ⚠️ Tam TOCTOU garantisi DEĞİL (iki eşzamanlı okuma da 2 görüp ikisi de geçebilir) — kesin
   garanti DB kısıtı/trigger ister (şema dokunuşu → önce Mehmet'e sor). Bir kişi hem admin hem
   agent satırına sahip olabildiği için "yönetici" = role='admin' satırı olan DISTINCT kişi. */
async function sonAdminMi(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  const adminlar = new Set((data ?? []).map((r) => r.user_id as string));
  return adminlar.has(userId) && adminlar.size <= 1;
}
const SON_ADMIN_MESAJI =
  "Sistemdeki son yöneticiyi düşüremezsin — önce başka birini Yönetici yap, sonra bunu değiştir.";

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

/* --- Müşteri VERİSİNİ düzeltme (2026-07-19) ---
   Mehmet: "müşteri hesabında bir sorun yaşadığında hemen girip hesabını bulup güncelleme
   yapması gerekiyor." Buraya kadar tüm müşteri aksiyonları HESAP seviyesindeydi (şifre maili,
   premium/free, askıya al, sil) — yanlış girilmiş veriyi düzeltmenin yolu yoktu.
   ⚠️ ŞEMAYA DOKUNULMUYOR: yalnızca mevcut satırlar güncelleniyor (CLAUDE.md kuralı).
   ⚠️ DB mobil ile ORTAK → burada yapılan düzeltme mobilde de anında görünür. */

/** `profiles.profile_type` sözlüğü — veriden doğrulandı (2026-07-19: individual / business). */
const PROFILE_TYPES = ["individual", "business"] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export async function updateProfileInfo(
  profileId: string,
  targetEmail: string,
  profileName: string,
  profileType: string,
  currency: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const ad = profileName.trim();
  if (!ad) return { ok: false, message: "Profil adı boş olamaz." };

  /* Sözlük DIŞI değer yazma: DB'de bu kolonlarda CHECK yok → uydurma değer SESSİZCE
     kaydolur, mobil onu tanımaz ve profil "türsüz/para birimsiz" görünür. */
  if (!PROFILE_TYPES.includes(profileType as ProfileType)) {
    return { ok: false, message: "Geçersiz profil türü." };
  }
  if (!CURRENCIES.some((c) => c.code === currency)) {
    return { ok: false, message: "Geçersiz para birimi." };
  }

  /* ⚠️ `profile_name` ve `name` AYRI kolonlar ve ikisi de kullanımda (liste `profile_name`,
     bazı ekranlar `name` okuyor) → ikisini birlikte yaz, yoksa ekranlar çelişir. */
  const { error } = await admin
    .from("profiles")
    .update({ profile_name: ad, name: ad, profile_type: profileType, currency })
    .eq("id", profileId);
  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };

  await logAction(
    actor,
    "profile_updated",
    { email: targetEmail },
    { profileId, profileName: ad, profileType, currency },
  );
  revalidatePath("/admin/musteriler");
  updateTag(KISILER_TAG); // kişi/profil değişti → önbellekli müşteri listesi düşsün
  return { ok: true, message: `Profil güncellendi: ${ad}.` };
}

/* Müşterinin GİRİŞ e-postasını değiştir (auth.users).
   ⚠️ Bu bir hesap-kimliği değişikliği: kişi artık ESKİ adresle giremez. Sık gelen destek
   talebi ("yanlış mail ile kayıt oldum") ama geri alması manuel → arayüzde onay isteniyor.
   ⚠️ `email_confirm: true`: doğrulama beklemeden geçerli olsun, yoksa müşteri arada
   hiçbir adresle giremez duruma düşebilir. */
export async function changeUserEmail(
  userId: string,
  oldEmail: string,
  newEmail: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const yeni = newEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(yeni)) {
    return { ok: false, message: "Geçerli bir e-posta yaz." };
  }
  if (yeni === oldEmail.trim().toLowerCase()) {
    return { ok: false, message: "E-posta zaten bu." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    email: yeni,
    email_confirm: true,
  });
  if (error) return { ok: false, message: `Değiştirilemedi: ${error.message}` };

  await logAction(actor, "email_changed", { userId, email: oldEmail }, { newEmail: yeni });
  revalidatePath("/admin/musteriler");
  updateTag(KISILER_TAG); // kişi/profil değişti → önbellekli müşteri listesi düşsün
  return {
    ok: true,
    message: `E-posta ${yeni} olarak değişti. Müşteri artık bu adresle giriyor.`,
  };
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
     e-posta yazılıyordu → admin_audit_log.target_user_id NULL kalıyor, sql/admin/admin-audit-log.sql'deki
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
  updateTag(KISILER_TAG); // kişi/profil değişti → önbellekli müşteri listesi düşsün
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
  updateTag(KISILER_TAG); // kişi/profil değişti → önbellekli müşteri listesi düşsün
  return {
    ok: true,
    message: banned ? "Hesap askıya alındı — giriş yapamaz." : "Askı kaldırıldı, hesap tekrar aktif.",
  };
}

/** Hesabı KALICI sil. auth.users DELETE trigger'ı veda mailini gönderir.
    `reason`+`note` (2026-07-20): geri alınamaz bir işlem, "kim, neden" sorusunun cevabı
    denetim kaydında durmalı — müşteri "hesabımı siz mi sildiniz" diye döndüğünde belge olsun. */
export async function deleteUserAccount(
  userId: string,
  email: string,
  reason: string,
  note: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok." };
  if (userId === actor.id) return { ok: false, message: "Kendi hesabını buradan silemezsin." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  /* ⚠️ Sebebi SUNUCUDA doğrula — istemciden gelen metne güvenme. Bu kayıt ileride kanıt
     olarak okunacak; uydurma bir sebep yazılabiliyorsa denetim değersizdir. */
  if (!isDeleteReason(reason)) return { ok: false, message: "Geçersiz silme sebebi." };
  const temizNot = note.trim().slice(0, DELETE_NOTE_MAX);
  if (NOTE_REQUIRED_FOR.includes(reason) && !temizNot) {
    return { ok: false, message: "Bu sebep için not zorunlu — ne olduğunu yaz." };
  }

  /* Bu kişinin destek talepleri, SİLMEDEN ÖNCE. Silinince `support_tickets.user_id` NULL'a
     düşüyor (ON DELETE SET NULL, 2026-07-20) → talep ile silen kişi arasında join edecek
     anahtar KALMIYOR. Id'leri denetim kaydına yazarak o bağı kuruyoruz: /admin/destek
     "silinmiş müşteri" satırında "kim, neden sildi" gösterilebiliyor.
     ⚠️ Kişisel veri EKLEMİYOR (e-posta/ad snapshot'ı DEĞİL) → dünkü KVKK duruşu korunuyor. */
  const { data: talepler } = await admin
    .from("support_tickets")
    .select("id")
    .eq("user_id", userId)
    .limit(200);
  const ticketIds = (talepler ?? []).map((t) => t.id as string);

  // Log SİLMEDEN ÖNCE yazılır: silme sonrası kullanıcı yok, kaydın kime ait olduğu kaybolur.
  await logAction(actor, "user_deleted", { userId, email }, {
    reason,
    reason_label: deleteReasonLabel(reason),
    ...(temizNot ? { note: temizNot } : {}),
    ...(ticketIds.length ? { ticket_ids: ticketIds } : {}),
  });

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
  updateTag(KISILER_TAG); // kişi/profil değişti → önbellekli müşteri listesi düşsün
  return { ok: true, message: `${email} kalıcı olarak silindi.` };
}

/* --- Destek talebi aksiyonları --- */

/* Destek taleplerini KALICI sil (admin-only; agent SİLEMEZ — `requireAdmin` reddeder).
   Mehmet, 2026-07-21: "adminler talebi silebilsin ama çalışanlar değil."

   ⚠️ RLS'e DELETE politikası BİLEREK EKLENMEDİ: politika yoksa hiçbir istemci (müşteri de,
   agent de) talep silemez — silme yalnız bu guard'lı, service_role'lü aksiyondan geçer.
   Politika eklemek yetki kapısını ikinci bir yere kopyalamak olurdu.

   Silinen üç şey ve NEDEN elle silindikleri:
   1. `ticket_messages` — ELLE SİLİNMİYOR, FK CASCADE hallediyor (destek-faz0.sql:27).
   2. **Ek dosyalar** — storage FK bilmez; `ticket-attachments/<talep_id>/…` altındaki
      nesneler yetim kalırdı (private bucket, kimse göremez ama yer kaplar + KVKK'da
      "sildim" dediğin veri diskte durur). Klasör listelenip siliniyor.
   3. **Bildirimler** — `notifications.data.ticket_id` jsonb, FK DEĞİL → cascade yok.
      Temizlenmezse çanda silinmiş talebe giden ölü bağlantı kalır (tıklayınca 404). */
export async function deleteTickets(ticketIds: string[]): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, message: "Yetkin yok — talep silmeyi yalnız yöneticiler yapabilir." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Sunucu anahtarı eksik." };

  const idler = [...new Set(ticketIds.filter((x) => typeof x === "string" && x.length > 0))];
  if (idler.length === 0) return { ok: false, message: "Silinecek talep seçilmedi." };
  if (idler.length > TICKET_DELETE_MAX) {
    return { ok: false, message: `Tek seferde en fazla ${TICKET_DELETE_MAX} talep silinebilir.` };
  }

  /* Denetim kaydı SİLMEDEN ÖNCE hazırlanır: silindikten sonra başlık/sahip bilgisi yok olur,
     kaydın neyi anlattığı kaybolurdu (hesap silmede öğrenilen ders — deleteUserAccount:351). */
  const { data: talepler, error: okuErr } = await admin
    .from("support_tickets")
    .select("id, subject, user_id, status, department")
    .in("id", idler);
  if (okuErr) return { ok: false, message: `Talepler okunamadı: ${okuErr.message}` };
  if (!talepler || talepler.length === 0) return { ok: false, message: "Talep bulunamadı (silinmiş olabilir)." };

  // 1) Ek dosyalar — her talebin klasörü ayrı listelenip siliniyor.
  for (const t of talepler) {
    const { data: dosyalar } = await admin.storage.from("ticket-attachments").list(t.id as string);
    const yollar = (dosyalar ?? []).map((d) => `${t.id}/${d.name}`);
    if (yollar.length) {
      const { error: stErr } = await admin.storage.from("ticket-attachments").remove(yollar);
      /* Ek silinemezse talebi YİNE de siliyoruz: yönetici "bu talep gitsin" dedi, storage
         hatası yüzünden kayıt ekranda kalırsa iş yapılmamış olur. Sessiz kalmıyoruz — denetim
         kaydına yazılıyor ki yetim dosya sonradan bulunabilsin. */
      if (stErr) console.error("[deleteTickets] ek silinemedi:", t.id, stErr.message);
    }
  }

  // 2) Bildirimler (jsonb eşleşmesi — FK olmadığı için tek yol bu).
  for (const t of talepler) {
    const { error: nErr } = await admin
      .from("notifications")
      .delete()
      .filter("data->>ticket_id", "eq", t.id as string);
    if (nErr) console.error("[deleteTickets] bildirim silinemedi:", t.id, nErr.message);
  }

  // 3) Denetim kaydı — talep başına bir satır (aranabilir olsun diye tek toplu satır değil).
  for (const t of talepler) {
    await logAction(actor, "ticket_deleted", { userId: (t.user_id as string) ?? undefined }, {
      ticket_id: t.id,
      subject: t.subject,
      status: t.status,
      department: t.department,
      ...(t.user_id ? {} : { orphan: true }), // sahibi zaten silinmiş talep
    });
  }

  // 4) Talepler (mesajlar CASCADE ile gider).
  const { error: silErr } = await admin.from("support_tickets").delete().in("id", idler);
  if (silErr) {
    await logAction(actor, "ticket_delete_failed", {}, { ticket_ids: idler, reason: silErr.message });
    return { ok: false, message: `Silinemedi: ${silErr.message}` };
  }

  revalidatePath("/admin/destek");
  revalidatePath("/admin");
  const n = talepler.length;
  return { ok: true, message: n === 1 ? "Talep kalıcı olarak silindi." : `${n} talep kalıcı olarak silindi.` };
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

  if (role === "admin" && (await sonAdminMi(admin, userId))) {
    return { ok: false, message: SON_ADMIN_MESAJI };
  }

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
     RLS gereği HİÇBİR talep göremez (sql/destek/destek-departman-rls.sql fail-closed) — davetten
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
  /* Davet YENİ bir auth kullanıcısı yaratabiliyor → müşteri listesinde de görünür.
     (Diğer /admin/ekip aksiyonları yalnız user_roles/staff_departments'a dokunuyor,
     listPeople onları okumuyor → orada etiket düşürmeye gerek yok.) */
  updateTag(KISILER_TAG);
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
  // Başka bir admin'i düşürüyor olsa bile: son yönetici kalmamalı (yukarıdaki değişmez kural).
  if (role !== "admin" && (await sonAdminMi(admin, userId))) {
    return { ok: false, message: SON_ADMIN_MESAJI };
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
  // Ekipten çıkarmak TÜM rollerini siler → son yönetici ise sistem yöneticisiz kalır.
  if (await sonAdminMi(admin, userId)) {
    return { ok: false, message: "Sistemdeki son yöneticiyi ekipten çıkaramazsın — önce başka birini Yönetici yap." };
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
