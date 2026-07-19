import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "./supabase/server";

/* Oturumdaki kullanıcı — İSTEK BAŞINA BİR KEZ.
   ⚠️ 2026-07-19 ölçümü (Supabase disk IO uyarısı): tek bir admin sayfası açılışında
   `auth.getUser()` DÖRT kez çağrılıyordu (layout guard + layout e-posta + sayfa guard +
   sayfa e-posta). Her getUser GoTrue'da 4 sorgu demek (users + sessions + identities +
   mfa_factors) → sayfa başına ~16 auth sorgusu. pg_stat_statements'ta bu dördü ~21.600'er
   çağrıyla ilk sıralardaydı.
   React `cache()` aynı istek içinde sonucu paylaştırır → 4 çağrı 1'e iner.
   (Farklı isteklerde paylaşılmaz; oturum sızması riski YOK.) */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type StaffRole = "admin" | "agent";

/* İç ekip rolü — user_roles'tan. admin > agent önceliği.
   admin: tam yetki (müşteri yönetimi + destek). agent: yalnız destek.
   Staff değilse null → admin paneline giremez. */
/* Rol sorgusunun SONUCU — "rol yok" ile "sorgu patladı" AYRI şeyler.
   ⚠️ 2026-07-19 CANLI OLAY: burada `error` hiç okunmuyordu. PostgREST "Could not query the
   database for the schema cache" hatası verince `data` null geliyor, kod bunu "bu kişinin
   rolü yok" sanıyor, layout da yöneticiyi app.paraner.com'a (müşteri paneli) ATIYORDU.
   Yani GEÇİCİ bir DB hatası, yöneticiyi kendi panelinden çıkarıyordu. Mehmet yaşadı.
   Kural: yetki sorgusu başarısızsa yetki VERME ama "yetkisi yok" da DEME — durumu söyle. */
export type StaffRoleResult = { role: StaffRole | null; error: string | null };

/* ⚠️ Bu da `cache()`li: layout guard + sayfa guard aynı istekte İKİ KEZ çağırıyordu,
   yani user_roles sorgusu da iki kez gidiyordu. Artık istek başına bir kez. */
export const getStaffRoleResult = cache(async (): Promise<StaffRoleResult> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return { role: null, error: null }; // gerçekten oturum yok

  /* Şema önbelleği hatası GEÇİCİDİR (şema değişikliğinden sonra PostgREST kendini
     tazelerken olur) → bir kez daha dene. Kalıcıysa hatayı yukarı taşı. */
  for (let deneme = 0; deneme < 2; deneme++) {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!error) {
      const roles = (data ?? []).map((r) => (r as { role: string }).role);
      if (roles.includes("admin")) return { role: "admin", error: null };
      if (roles.includes("agent")) return { role: "agent", error: null };
      return { role: null, error: null };
    }
    if (deneme === 0) {
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }
    console.error("[getStaffRole] rol sorgusu başarısız:", error.message);
    return { role: null, error: error.message };
  }
  return { role: null, error: "bilinmeyen" };
});

export async function getStaffRole(): Promise<StaffRole | null> {
  return (await getStaffRoleResult()).role;
}

/* Yalnız-yönetici SAYFA guard'ı — müşteri verisi açan her sayfanın İLK satırı bu olmalı.
   ⚠️ Layout'taki guard YETMEZ: o sadece "staff mi" diye bakıyor, agent de geçiyor. Sidebar'da
   linki gizlemek de yetmez — agent URL'yi elle yazabilir. Müşteri sayfaları service_role ile
   veri çektiği için (RLS bypass) burada durdurulmazsa destek personeli TÜM müşterilerin
   e-postasını/planını/işlem sayısını görürdü. (Aksiyonlar ayrıca lib/adminActions.requireAdmin
   ile korunuyor; bu okuma tarafının karşılığı.)
   notFound(): "yetkin yok" demektense sayfanın varlığını bile sızdırma. */
export async function requireAdminPage(): Promise<void> {
  const { role, error } = await getStaffRoleResult();
  /* ⚠️ Sorgu hatasında notFound() ATMA (2026-07-19 olayı): "sayfa yok" demek yanlış
     teşhise yol açıyor. Hata fırlat → app/admin/error.tsx "yenile" ekranını gösterir. */
  if (error) throw new Error(`Yetki doğrulanamadı: ${error}`);
  if (role !== "admin") notFound();
}

/* Staff (admin VEYA agent) SAYFA guard'ı — hem rolü döndürür hem kapıyı tutar.
   ⚠️ Neden layout guard'ı yetmez (denetim 2026-07-18 / Y1): Next 16'da layout
   istemci-taraflı gezinmede YENİDEN ÇALIŞMAZ (Partial Rendering) — Next'in kendi
   auth rehberi bu deseni açıkça önermiyor. Rolü geri alınan kişi kabukta gezmeye
   devam eder (staleTimes.dynamic:30 bunu +30sn uzatır). service_role ile veri açan
   HER sayfa kendi guard'ını çağırmalı; layout guard'ı yalnız UX (erken yönlendirme). */
export async function requireStaffPage(): Promise<StaffRole> {
  const { role, error } = await getStaffRoleResult();
  if (error) throw new Error(`Yetki doğrulanamadı: ${error}`);
  if (!role) notFound();
  return role;
}
