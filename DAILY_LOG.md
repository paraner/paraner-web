# DAILY LOG — paraner-web

## 2026-06-10 — Performans + Stripe-tarzı redesign + sidebar/logo

**Hedef:** Panel geçişlerini hızlandır, paneli Stripe dashboard diline (koyu+teal koruyarak) taşı, profil/işletme logosu + açılır-kapanır sidebar.

### Performans (geçişler yavaştı → hızlandı)
- `app/panel/loading.tsx`: tüm panel sayfaları için anında iskelet (shimmer) → "tak" hissi.
- Aktif profil React `cache()` ile tek sorgu: `lib/supabase/profile.ts` (`getProfiles` → `getActiveProfile` türetildi); layout + sayfalar aynı render'da paylaşır.
- Layout'tan gereksiz ikinci `getUser()` kaldırıldı (proxy zaten koruyor) → her geçişte 1 ağ turu az.

### Tasarım sistemi (zemin)
- `globals.css` token katmanı: anlamsal renkler (`--danger`, `--danger-soft`, `--warning`, `--success`, `--surface-modal`), boşluk/tipografi/gölge skalaları. Elle yazılı `#E24B4A` vb. değişkene bağlandı.
- Ortak bileşenler (kopya-yapıştır → tek kaynak): `components/ui/` (Modal, PageHead, Field, Avatar, Sparkline) + `components/icons.tsx` + `lib/date.ts`.

### Stripe-tarzı redesign (koyu + teal)
- **Genel Bakış**: metrik düzeni (etiket+▾ / kocaman rakam / geçen aya göre değişim) + bağımlılıksız SVG **sparkline** (günlük birikimli seri) + geçen ay karşılaştırması.
- **Sidebar**: üstte profil değiştirici (avatar+ad+▾, tıkla-değiştir), gruplu menü (Genel / İŞLETME), **daralt/genişlet** (en altta toggle, localStorage'da hatırlanır). Üst bara avatar.
- **İşlemler**: filtre çipleri (arama + Tümü/Gelir/Gider + kategori), anında client-side.
- **Hesaplar/Cariler**: özet şeridi metrik diline, kartlar ferah, rozetler pill.
- **Faturalar**: özet şeridi (Satış/Alış/Ödenmemiş) + pill durum rozetleri.

### Profil/işletme logosu
- `profiles.avatar_url` (bireysel foto) + `profiles.company_logo_url` (işletme logosu) — şemaya dokunmadan, mevcut kolonlar. `profileAvatarUrl()` tipe göre seçer (`lib/supabase/profileShared.ts`, client-güvenli).
- Sidebar + üst bar avatarı; foto yüklenemezse baş harfe düşer.

### Marka logosu (wordmark)
- `public/paraner-wordmark.png` mobil projeden alındı. Açık → tam **PARANER** wordmark; daraltılmış → wordmark'tan kırpılmış temiz **P** (`paraner-p.png`). (Klip yöntemi P/A bitişikliği yüzünden kırılgandı; ayrı temiz P'ye geçildi.)

### Temizlik + düzeltmeler
- Hydration uyarısı: `<body suppressHydrationWarning>` (tarayıcı eklentisi kaynaklı).
- 5 kullanılmayan starter SVG silindi (file/globe/next/vercel/window). `next lint` + tsc + build temiz.

### Durum
- TypeScript + production build temiz. Bekleyenler: GOREVLER.md.

---

## 2026-06-10 — Panel altyapısı + tüm modüller (sıfırdan)

**Hedef:** Giriş sonrası web paneli; mobil ile aynı Supabase backend, entegre çalışsın.

### Altyapı (auth + domain)
- `@supabase/ssr` + `@supabase/supabase-js` kuruldu. `.env.local` = mobil ile aynı proje (`oqhonmmbcqrkcaoijgnb`), `NEXT_PUBLIC_` önekli. Vercel'e de eklendi (Production+Preview+Dev).
- `lib/supabase/`: `client.ts` (browser), `server.ts` (SSR), `cookieDomain.ts` (`.paraner.com` çapraz-subdomain cookie).
- `proxy.ts` (Next 16: middleware→proxy): host `app.paraner.com` → panel; giriş yoksa `paraner.com/giris`'e redirect; `/giris` `/kayit` muaf; pazarlama hostuna dokunmaz.
- `app/giris`: gerçek `signInWithPassword` + TR hata + başarı→`app.paraner.com`.
- DNS: hosting.com.tr'de `app` CNAME → `…vercel-dns-017.com`. Vercel SSL. Canlı test OK (paraner.com/giris → app.paraner.com panel).

### Panel (sol menü + içerik, koyu tema #00BFA6)
- `app/panel/layout.tsx` (shell: Sidebar + üst bar profil/çıkış, auth guard, noindex), `Sidebar.tsx` (aktif vurgu, profile_type'a göre menü), `LogoutButton.tsx`.
- `lib/format.ts` (₺1.234,56 + GG.AA.YYYY), `lib/categories.ts` (mobil ile birebir + findCategory).
- **Genel Bakış** (`panel/page.tsx`): bu ay gelir/gider/net KPI + son işlemler.
- **İşlemler** (`islemler/`): liste (son 100) + ekle/sil modal, hesap bakiyesi senkronu.
- **Hesaplar** (`hesaplar/`): kartlar + para birimi bazında toplam + ekle/düzenle/sil.
- **Cariler** (`cariler/`): müşteri/tedarikçi + alacak/borç + ekle/sil.
- **Faturalar** (`faturalar/`): liste + oluştur (KDV otomatik, `invoice_next_number` sayacı, ödeme durumu) + sil.
- **Cüzdanım** (`cuzdanim/`, bireysel): salt-okunur varlık listesi (piyasa fiyatı mobilde).
- **Ayarlar** (`ayarlar/`): profil bilgisi + ad düzenle + profil değiştir (`is_active`) + çıkış.

### Durum
- Production build geçti, TypeScript temiz. main'e push → Vercel deploy → canlı (`app.paraner.com`).
- Bekleyenler: GOREVLER.md (kayıt akışı, şifremi unuttum, Cüzdanım market entegrasyonu, tasarım revizyonu).
