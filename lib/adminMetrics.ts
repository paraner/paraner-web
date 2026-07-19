import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/* Genel Bakış (aksiyon panosu) metrikleri.

   RPC'ler: sql/admin/admin-panel-rpc.sql (Mehmet çalıştırır). SQL çalıştırılmadıysa panel BOZULMASIN
   diye ucuz olanların JS yedeği var; modül benimsemenin yedeği YOK (22 ayrı sorgu gerekir)
   → o panel "SQL çalıştırılmadı" der. Yedekler mevcut ölçekte doğru sonuç verir ama
   binlerce kayıtta RPC şart (tüm user_id kolonunu çekiyorlar).

   ⚠️ RPC'ler KULLANICININ OTURUMUYLA çağrılır (createClient), service_role ile DEĞİL:
   guard'lar `auth.uid()`e bakıyor, service_role'ün kullanıcı kimliği YOKTUR → her çağrı
   "Yetkisiz işlem" alırdı. (Aynı tuzak get_trial_status'ta yaşandı: service_role ile
   çağırınca reddediyor.) Fonksiyonlar SECURITY DEFINER olduğu için kullanıcı oturumuyla
   çağrılsa da RLS'i aşıp tüm veriyi okuyabiliyorlar — service_role gerekmiyor.
   JS yedekleri ise service_role ister (RLS'i aşmak için). */

export type ActiveCounts = { dau: number; wau: number; mau: number };
export type ModuleAdoption = { modul: string; kullanici: number; kayit: number };

const DAY = 86400000;

export async function getActiveCounts(): Promise<ActiveCounts> {
  const admin = createAdminClient();
  if (!admin) return { dau: 0, wau: 0, mau: 0 };

  const supabase = await createClient(); // kullanıcı oturumu → auth.uid() dolu → guard geçer
  const { data, error } = await supabase.rpc("admin_active_counts");
  if (!error && Array.isArray(data) && data[0]) {
    const r = data[0] as { dau: number; wau: number; mau: number };
    return { dau: Number(r.dau), wau: Number(r.wau), mau: Number(r.mau) };
  }

  // Yedek: RPC yoksa last_seen kolonunu çekip JS'te say.
  const { data: rows } = await admin.from("user_devices").select("user_id, last_seen").limit(10000);
  const now = Date.now();
  const uniq = (gun: number) =>
    new Set(
      ((rows ?? []) as { user_id: string; last_seen: string | null }[])
        .filter((d) => d.last_seen && now - new Date(d.last_seen).getTime() <= gun * DAY)
        .map((d) => d.user_id),
    ).size;
  return { dau: uniq(1), wau: uniq(7), mau: uniq(30) };
}

/** Kayıt olmuş ama HİÇ işlem girmemiş profil sayısı — ürünü hiç kullanmayanlar. */
export async function getDeadProfileCount(): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;

  const supabase = await createClient();
  /* SAYIYI DB'de say (denetim 2026-07-18 / O4): eskiden admin_dead_profiles() TÜM ölü
     profilleri döndürüp burada `data.length` sayılıyordu — LIMIT'siz. Sayı için MB'larca
     satırı ağdan geçirmek 100k kayıtta timeout demekti. Liste RPC'si duruyor (ileride
     "ölü kayıt listesi" ekranı için), sayaç artık ayrı ve ucuz RPC'den okuyor. */
  const { data, error } = await supabase.rpc("admin_dead_profile_count");
  if (!error && typeof data === "number") return data;

  // Eski RPC'ye düş (sql/admin/admin-denetim-fix-olcek.sql henüz çalıştırılmadıysa).
  const legacy = await supabase.rpc("admin_dead_profiles");
  if (!legacy.error && Array.isArray(legacy.data)) return legacy.data.length;

  /* Son yedek: transactions'ın PROFİL id'lerini çek, profiles'tan farkını al.
     ⚠️ Bu yedek YANILTABİLİR (aynı denetim / O8-yedek notu): .limit(100000) aşılırsa
     distinct küme eksik çıkar → "ölü kayıt" ŞİŞER. Silinmiş profile ait işlem satırı
     varsa da sonuç düşer. O yüzden RPC'ler tercih ediliyor; bu yalnız SQL hiç
     çalıştırılmamışsa devreye giren kaba tahmindir. */
  const [{ data: tx }, { count: profileCount }] = await Promise.all([
    admin.from("transactions").select("user_id").limit(100000),
    admin.from("profiles").select("*", { count: "exact", head: true }),
  ]);
  const kullanan = new Set(((tx ?? []) as { user_id: string }[]).map((t) => t.user_id)).size;
  return Math.max(0, (profileCount ?? 0) - kullanan);
}

/** Hangi modülü kaç profil kullanıyor. RPC YOKSA null → çağıran "SQL çalıştırılmadı" der
    (22 tabloya ayrı sorgu atmak yerine dürüstçe boş bırakıyoruz). */
export async function getModuleAdoption(): Promise<ModuleAdoption[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_module_adoption");
  if (error || !Array.isArray(data)) return null;

  return (data as { modul: string; kullanici_sayisi: number; kayit_sayisi: number }[])
    .map((r) => ({ modul: r.modul, kullanici: Number(r.kullanici_sayisi), kayit: Number(r.kayit_sayisi) }))
    .sort((a, b) => b.kullanici - a.kullanici);
}
