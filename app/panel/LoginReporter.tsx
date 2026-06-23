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
      sessionStorage.setItem("login_reported", "1");
    } catch {
      // sessionStorage erişilemezse yine de bir kez dene
    }
    reportLogin();
  }, []);
  return null;
}
