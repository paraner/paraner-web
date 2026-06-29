<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> ⚠️ Next 16: `middleware` → **`proxy`** olarak yeniden adlandırıldı (`proxy.ts`, fonksiyon adı `proxy`).

# Proje Yapısı

İki domain, tek Next.js projesi (Vercel):
- **paraner.com** → pazarlama (`app/page.tsx`, public, SEO).
- **app.paraner.com** → panel (`app/panel/`, noindex). Yönlendirme `proxy.ts` ile (host'a göre).

**Backend:** Mobil uygulamayla AYNI Supabase (proje `oqhonmmbcqrkcaoijgnb`). `@supabase/ssr`, cookie domain `.paraner.com` (çapraz-subdomain oturum). Env: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **DB şemasına dokunma** — mobil aynı şemayı kullanır; kolon/tablo gerekiyorsa önce sor.

```
app/
  page.tsx, giris/, kayit/   — pazarlama + auth (giris/kayit = ince sarmalayıcı → components/AuthForm)
  components/                — AuthForm (birleşik giriş/kayıt: wordmark + sürüklenebilir switcher,
                               in-place mod + URL) · AuthSideVideo (sol panel finans videosu) ·
                               SocialAuth (Google GIS + Apple) · OtpVerify. (AuthVisual = ÖLÜ, kullanılmıyor)
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

**Kurallar:** Aktif profil = `profiles.is_active`; veri sorguları `user_id = aktif profil id` ile filtreli (RLS `user_profile_ids()`). Yeni modül = mevcut desen (server page + client component), `lib/format` + `lib/categories` kullan. Dil TR. Tek primary renk #00BFA6, koyu tema.

> İş akışı (işe başla / işi bitir) + bekleyenler: `GOREVLER.md`, `DAILY_LOG.md`.
