"use client";

import { useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { reportLogin } from "../../lib/loginAlert";

// Panel'e girince oturum başına BİR KEZ login-alert'i çağırır (her giriş yöntemi /panel'e düşer:
// Google / e-posta OTP / şifre). Yeni cihaz/konumda kullanıcıya güvenlik maili + cihaz listesine kayıt.
//
// Sağlamlık (kritik): rapor SADECE bir kez başarıyla gittiğinde guard set edilir (sessionStorage).
//  - SIGNED_OUT → guard'ı temizle: uzaktan çıkış / normal çıkış sonrası AYNI tarayıcıda yeniden
//    giriş yapılınca cihaz user_devices'a TEKRAR yazılsın (yoksa guard bayat kalıp raporu engelliyor,
//    cihaz listede görünmüyordu).
//  - SIGNED_IN → tekrar dene: ilk mount'ta oturum henüz hazır değilse (OAuth dönüşü gecikmesi)
//    rapor kaçmasın.
//  - In-flight kilidi (04.07): mount + SIGNED_IN aynı sayfa açılışında ikisi de tetikleniyor;
//    guard rapor DÖNENE kadar boş kaldığından iki paralel istek gidiyor → edge function ikisini
//    de alarm sayıp çift mail atıyordu. Rapor havadayken ikinci çağrı atlanır (başarısızsa kilit
//    açılır, sonraki SIGNED_IN/mount yine dener).

let reportInFlight = false;

export default function LoginReporter() {
  useEffect(() => {
    const supabase = createClient();

    const tryReport = () => {
      try {
        if (sessionStorage.getItem("login_reported")) return;
      } catch {
        // sessionStorage erişilemezse yine de dene
      }
      if (reportInFlight) return;
      reportInFlight = true;
      // Guard'ı SADECE rapor başarılı olursa set et → CORS/ağ/oturum-gecikmesi hatasında tekrar denenir.
      reportLogin()
        .then((ok) => {
          if (ok) {
            try { sessionStorage.setItem("login_reported", "1"); } catch { /* yoksay */ }
          }
        })
        .finally(() => {
          reportInFlight = false;
        });
    };

    tryReport();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try { sessionStorage.removeItem("login_reported"); } catch { /* yoksay */ }
      } else if (event === "SIGNED_IN") {
        tryReport();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
