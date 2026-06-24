import { createClient } from "./supabase/client";

// Web giriş güvenliği bildirimi — mobil app ile AYNI login-alert edge function'ını çağırır.
// Yeni cihaz/tarayıcı veya şehir değişiminde kullanıcıya güvenlik maili + cihaz listesine kayıt.
// Tamamen fail-soft.

const DEVICE_ID_KEY = "paraner_device_id";
const DEVICE_REGISTERED_KEY = "paraner_device_registered";

// "Bu tarayıcı user_devices listesine kaydedildi" işareti. AccountStatusGuard'ın
// "kaydım uzaktan silindiyse çıkış yap" kontrolü yanlış-atma yapmasın diye (login-alert
// fail-soft) — sadece kayıt gerçekten varken kontrol etsin.
export function markWebDeviceRegistered(): void {
  try { localStorage.setItem(DEVICE_REGISTERED_KEY, "1"); } catch { /* sessiz */ }
}
export function isWebDeviceRegistered(): boolean {
  try { return localStorage.getItem(DEVICE_REGISTERED_KEY) === "1"; } catch { return false; }
}
export function clearWebDeviceRegistered(): void {
  try { localStorage.removeItem(DEVICE_REGISTERED_KEY); } catch { /* sessiz */ }
}

// Tarayıcı başına kalıcı kimlik (localStorage).
export function getWebDeviceId(): string {
  if (typeof window === "undefined") return "web-unknown";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id =
        (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "web-unknown";
  }
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Web tarayıcı";
  const ua = navigator.userAgent;
  let os = "Web";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let br = "Tarayıcı";
  if (/Edg\//i.test(ua)) br = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) br = "Opera";
  else if (/Chrome\//i.test(ua)) br = "Chrome";
  else if (/Firefox\//i.test(ua)) br = "Firefox";
  else if (/Safari\//i.test(ua)) br = "Safari";
  return `${br} · ${os}`;
}

// true → rapor başarıyla gitti (LoginReporter guard'ı SADECE bunda set eder → başarısız deneme
// oturumu kilitlemez). false → oturum yok / hata (bir sonraki mount'ta tekrar denenir).
export async function reportLogin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url) return false;

    const res = await fetch(`${url}/functions/v1/login-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anon,
      },
      body: JSON.stringify({
        device_id: getWebDeviceId(),
        device_name: deviceLabel(),
        platform: "web",
      }),
    });
    // 200 → bu tarayıcı user_devices'a yazıldı; "kaydım silindi → çıkış" kontrolü için işaretle.
    if (res.ok) markWebDeviceRegistered();
    return res.ok;
  } catch {
    return false; // fail-soft
  }
}
