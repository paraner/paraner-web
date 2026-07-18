"use client";

import { useState, useEffect, useCallback } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// Şifre sıfırlama (recovery) sayfası. E-postadaki link buraya gelir (PKCE ?code veya
// token_hash+type=recovery). Oturum kurulunca yeni şifre formu açılır → updateUser →
// panele yönlendirir. Mobil reset-password ile aynı sonuç (web'de paraner.com'da).
type Phase = "verifying" | "form" | "done" | "invalid";

/* mode="invite" → /sifre-olustur (iç ekip daveti: şifre İLK KEZ oluşturuluyor)
   mode="reset"  → /sifre-sifirla (müşteri: "şifremi unuttum") */
export default function ResetPasswordClient({ mode = "reset" }: { mode?: "invite" | "reset" }) {
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Bu sayfaya İKİ ayrı akış düşüyor:
       · şifre sıfırlama (müşteri, "şifremi unuttum")
       · İÇ EKİP DAVETİ (admin /admin/ekip'ten davet etti — kişinin hiç şifresi yok)
     Metinler ve şifre kurulduktan SONRAKİ hedef bu ikisinde farklı olmalı. Aynı metni
     göstermek daveti "sıfırlama" gibi okutuyordu; hedefi ayırmamak ise personeli
     MÜŞTERİ paneline (app.paraner.com) atıyordu — oradan admin paneline yol yok. */
  const [davet, setDavet] = useState(mode === "invite");
  const [eposta, setEposta] = useState<string | null>(null);
  const [personel, setPersonel] = useState(false);

  const goPanel = useCallback(
    (staff: boolean) => {
      const { protocol, hostname } = window.location;
      if (hostname.endsWith("paraner.com")) {
        // Personel admin paneline, müşteri kendi paneline.
        window.location.assign(`${protocol}//${staff ? "admin" : "app"}.paraner.com/`);
      } else {
        window.location.assign(staff ? "/admin" : "/panel");
      }
    },
    [],
  );

  // Recovery oturumunu kur — manuel takas + detectSessionInUrl auto-takas yarışına dayanıklı.
  useEffect(() => {
    const supabase = createClient();
    let done = false;

    // Davet mi sıfırlama mı: link tipinden anla (token temizlenmeden ÖNCE oku).
    const ilkTip = new URL(window.location.href).searchParams.get("type");
    if (ilkTip === "invite") setDavet(true);

    const finish = async () => {
      if (done) return;
      done = true;
      // token URL'den temizlenir — bulunduğun rotada kal (davet /sifre-olustur'da)
      window.history.replaceState({}, "", window.location.pathname);
      setPhase("form");
      /* Oturum kuruldu → kimin şifresini kurduğumuzu EKRANDA göster.
         Mehmet'in isteği: "maili otomatik dolsun" — kişi hangi hesaba şifre koyduğunu
         görsün. (Aynı tuzağa müşteri tarafında düşülmüştü: yanlış hesaba şifre kuruldu.) */
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setEposta(u.email ?? null);
      /* Personel mi? user_roles'ta kendi satırını okuyabiliyor (roles_select politikası).
         Hata/boş dönerse müşteri varsayılır — yanlış tarafa göndermektense
         müşteri paneline göndermek daha az zarar (oradan çıkış yapabilir). */
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      setPersonel((roles ?? []).length > 0);
      /* ⚠️ Burada setDavet YAPMA: `personel` HEDEFİ belirler (admin paneli),
         `davet` ise METNİ. Personel gerçekten "şifremi unuttum" akışından geliyorsa
         ona "ekibe hoş geldin" demek yanlış olur. */
    };

    // Supabase recovery linkini işleyince PASSWORD_RECOVERY (veya SIGNED_IN) tetikler.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) void finish();
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) return finish();
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
          if (!error) return finish();
        }
        // Manuel takas başarısız / parametre yok → auto-takas (detectSessionInUrl) oturumu
        // kurmuş olabilir, kısa süre bekleyip kontrol et.
        await new Promise((r) => setTimeout(r, 1200));
        const { data } = await supabase.auth.getSession();
        if (data.session) finish();
        else if (!done) setPhase("invalid");
      } catch {
        if (!done) setPhase("invalid");
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı.");
    if (password !== confirm) return setError("Şifreler eşleşmiyor.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir, yeniden iste.");
        setLoading(false);
        return;
      }
      setPhase("done");
      setTimeout(() => goPanel(personel), 1500);
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
      setLoading(false);
    }
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        <a href="https://paraner.com" className="auth-wordmark" aria-label="Paraner — ana sayfaya git" />

        {phase === "verifying" && (
          <>
            <h1>Bağlantı doğrulanıyor…</h1>
            <div className="reset-state">Lütfen bekle.</div>
          </>
        )}

        {phase === "invalid" && (
          <>
            <h1>Bağlantı geçersiz</h1>
            <p>
              {davet
                ? "Davet bağlantısının süresi dolmuş ya da daha önce kullanılmış. Seni davet eden kişiden «Daveti yenile» ile tekrar göndermesini iste."
                : "Şifre sıfırlama bağlantısının süresi dolmuş ya da geçersiz. Giriş sayfasından yeniden iste."}
            </p>
            <a className="btn btn-primary btn-block btn-lg" href="/giris">Giriş sayfasına dön</a>
          </>
        )}

        {phase === "done" && (
          <>
            <h1>{davet ? "Hesabın hazır" : "Şifren güncellendi"}</h1>
            <p>
              {personel
                ? "Yönetim paneline yönlendiriliyorsun…"
                : "Yeni şifrenle oturum açıldı. Panele yönlendiriliyorsun…"}
            </p>
          </>
        )}

        {phase === "form" && (
          <>
            <h1>{davet ? "Paraner ekibine hoş geldin 👋" : "Yeni şifre belirle"}</h1>
            <p>
              {davet
                ? "Hesabını etkinleştirmek için bir şifre oluştur."
                : "Hesabın için yeni bir şifre oluştur."}
            </p>
            {/* Hangi hesaba şifre kurulduğu EKRANDA yazsın (Mehmet: "maili otomatik dolsun").
                Müşteri tarafında bu eksikti ve yanlış hesaba şifre kurulmasına yol açmıştı. */}
            {eposta && (
              <div className="reset-identity" aria-label="Şifre bu hesap için belirleniyor">
                {eposta}
              </div>
            )}
            {error && <div className="auth-msg error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <div className="input-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Yeni şifre"
                    aria-label="Yeni şifre"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button type="button" className="toggle-pw" onClick={() => setShowPw((s) => !s)}>
                    {showPw ? "Gizle" : "Göster"}
                  </button>
                </div>
              </div>
              <div className="field">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Yeni şifre (tekrar)"
                  aria-label="Yeni şifre tekrar"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? "Güncelleniyor…" : "Şifreyi Güncelle"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
