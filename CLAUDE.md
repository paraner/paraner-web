<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> ⚠️ Next 16: `middleware` → **`proxy`** olarak yeniden adlandırıldı (`proxy.ts`, fonksiyon adı `proxy`).

# ⚠️ KODA BAŞLAMADAN ÖNCE: ETKİ HARİTASI ÇIKAR (2026-07-17)

Paraner tek kod tabanı DEĞİL: **paraner-web + paraner-app (`~/Developer/Paraner/paraner-app`) + ORTAK Supabase**.
Bir yeri değiştirip diğerini atlamak = kullanıcının gördüğü tutarsızlık. Değişiklik/ekleme isteği gelince
**önce şu katmanları tek tek tara, etkilenenleri çıkar, yol haritasını Mehmet'e sun; sonra kodla:**

1. **web kodu** · 2. **mobil kodu** (aynı iş orada da var mı?) · 3. **DB**: şema/RPC/trigger
   (⚠️ asıl karar sıklıkla BURADA — ör. deneme süresini `get_trial_status` RPC'si belirliyor, koddaki sabit değil)
4. **edge function'lar** (kod yetmez → `supabase functions deploy X`) · 5. **kullanıcıya görünen metinler** (tüm sayfalar)
6. **SEO şeması** (`app/layout.tsx` AggregateOffer → Google'a yayınlanıyor; fiyat değişince BURASI da değişir)
7. **pazarlama sayfaları + onboarding** · 8. **ileriye dönük:** "ödeme entegrasyonu gelince burası kırılır" notunu kod/SQL'e + GOREVLER'e yaz.

**Gerçeği kaynaktan doğrula, varsayma** (Mehmet'in verdiği bilgi de yanlış olabilir — "trial 14 gün" dedi, kaynak 7'ydi).
**Tek doğru kaynak:** sabit/sözlük tek dosyada (`lib/plans.ts`, `lib/supportShared.ts` `TICKET_COLS`, mobil `TRIAL_DAYS`) — kopyalama yok.
İş kararı (fiyat/plan/süre) Mehmet'in; ben seçenek sunarım. Fiyat/plan tek doğru kaynağı: **mobil `app/premium.tsx`**.

# Proje Yapısı

İki domain, tek Next.js projesi (Vercel):
- **paraner.com** → pazarlama (`app/page.tsx`, public, SEO).
- **app.paraner.com** → panel (`app/panel/`, noindex). Yönlendirme `proxy.ts` ile (host'a göre).

**Backend:** Mobil uygulamayla AYNI Supabase (proje `oqhonmmbcqrkcaoijgnb`). `@supabase/ssr`, cookie domain `.paraner.com` (çapraz-subdomain oturum). Env: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **DB şemasına dokunma** — mobil aynı şemayı kullanır; kolon/tablo gerekiyorsa önce sor.

```
app/
  page.tsx, giris/, kayit/   — pazarlama + auth (giris/kayit = ince sarmalayıcı → components/AuthForm)
  components/                — AuthForm (birleşik giriş/kayıt: sürüklenebilir switcher, in-place mod + URL;
                               üstte dönen 3B titanyum P = AuthLogo3D) · SocialAuth (Google GIS + Apple) ·
                               OtpVerify · AuthLogo3D (Three.js P). (Masaüstü sol panel = auth-bg.webp görsel)
  panel/                     — app.paraner.com (sol menü + içerik)
    layout.tsx               — shell (Sidebar + üst bar, auth guard, noindex)
    Sidebar.tsx, LogoutButton.tsx
    page.tsx                 — Genel Bakış (bu ay KPI + son işlemler)
    islemler/ hesaplar/ cariler/ faturalar/ ayarlar/ cuzdanim/
                             — her modül: page.tsx (server, veri çeker) + XClient.tsx (client, ekle/sil)
proxy.ts                     — host bazlı yönlendirme + oturum tazeleme
lib/
  supabase/ client.ts server.ts cookieDomain.ts
  format.ts                  — ₺1.234,56 + GG.AA.YYYY
  categories.ts              — mobil ile birebir kategori kataloğu + findCategory
```

**Kurallar:** Aktif profil = `profiles.is_active`; veri sorguları `user_id = aktif profil id` ile filtreli (RLS `user_profile_ids()`). Yeni modül = mevcut desen (server page + client component), `lib/format` + `lib/categories` kullan. Dil TR. Koyu tema.

### 🎨 RENK KURALI — teal'e YATIRIM YAPMA (2026-07-18)
**Marka rengi DEĞİŞECEK** (Mehmet: "yeşil olmayacak zaten"). Bu yüzden:
- **Aksiyon/UI öğeleri (buton, seçili sekme, aktif menü, çip, avatar) markaya bağlı OLMAZ** →
  titanyum kullan: `linear-gradient(180deg, #eef0f2 0%, #c4c8ce 55%, #a9afb6 100%)`, metin `#0a0b0d`.
  Referans: `.btn-primary` · `.add-btn` (AddButton) · `.sb` (SaveButton) · `.panel-nav-item.active`.
- **ANLAM taşıyan renkler markaya bağlı değildir, kalır:** gelir/pozitif yeşili (`on-income`,
  net akış, stok var), `--danger` kırmızısı, `--warning`. Bunları nötrleme.
- ⚠️ **"Renk tek değişkenden değişir" YANLIŞ:** `var(--teal)` dışında elle yazılmış
  ~47 `rgba(0,191,166,…)` + 5 `#00BFA6` + 2 `#00d4b8` var. Yeni kod bunlardan üretme.

Eski hâli "tek primary renk #00BFA6" diyordu; bu kural o talimatla çelişip yeni ekranların
sürekli yeşil çıkmasına sebep oluyordu (Mehmet 18.07'de yakaladı).

### ⚠️ Yeni panel modülü eklerken ZORUNLU (panel hızı — 2026-07-14)
1. **Her mutasyondan sonra `router.refresh()`** (insert/update/delete/upsert/rpc; yalnız BAŞARI yolunda, handler sonunda bir kez).
   Sebep: `next.config.ts`'te istemci önbelleği AÇIK (`staleTimes.dynamic: 30`). Sunucu verisi Client'a `initialX` prop'u olarak geçip `useState`'e tohumlandığı için, refresh çağrılmazsa kullanıcı sayfadan çıkıp 30sn içinde dönünce **BAYAT veri** görür ("eklediğim kayıt kayboldu", "bakiye güncellenmedi"). Next 16'da tek `refresh()` TÜM segment önbelleğini düşürür → çapraz sayfa etkisi de çözülür.
2. **Server page'de sorgular `Promise.all` ile PARALEL.** Ardışık `await` = fazladan ağ turu. (Profil id'ye gerçekten bağımlı olan sorgu zorunlu istisnadır.)
3. **Listelere `.limit()`** koy; `select("*")` yok, kolon listesi yaz.

> İş akışı (işe başla / işi bitir) + bekleyenler: `GOREVLER.md`, `DAILY_LOG.md`.
