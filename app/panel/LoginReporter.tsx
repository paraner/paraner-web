"use client";

import { useEffect } from "react";
import { reportLogin } from "../../lib/loginAlert";

// Panel'e girince oturum başına BİR KEZ login-alert'i çağırır (her giriş yöntemi /panel'e düşer:
// Google / e-posta OTP / şifre). Yeni cihaz/konumda kullanıcıya güvenlik maili + cihaz listesine kayıt.
// sessionStorage guard → aynı tarayıcı oturumunda tekrar tekrar çağırmaz.
export default function LoginReporter() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("login_reported")) return;
    } catch {
      // sessionStorage erişilemezse yine de dene
    }
    // Guard'ı SADECE rapor başarılı olursa set et → CORS/ağ hatasında oturum kilitlenmez, tekrar denenir.
    reportLogin().then((ok) => {
      if (ok) {
        try { sessionStorage.setItem("login_reported", "1"); } catch { /* yoksay */ }
      }
    });
  }, []);
  return null;
}
