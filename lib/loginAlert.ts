import { createClient } from "./supabase/client";

// Web giriş güvenliği bildirimi — mobil app ile AYNI login-alert edge function'ını çağırır.
// Yeni cihaz/tarayıcı veya şehir değişiminde kullanıcıya güvenlik maili + cihaz listesine kayıt.
// Tamamen fail-soft.

const DEVICE_ID_KEY = "paraner_device_id";

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

export async function reportLogin(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url) return;

    await fetch(`${url}/functions/v1/login-alert`, {
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
  } catch {
    // fail-soft
  }
}
