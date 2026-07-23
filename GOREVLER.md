# GÖREVLER — paraner-web

> **Sadece AÇIK görevler.** Tamamlananların anlatısı `DAILY_LOG.md` + git geçmişinde.
> Bir madde bitince buradan SİL (DAILY_LOG'a yaz), burada `[x]` biriktirme.
> 2026-07-23'te temizlendi: 74 tamamlanmış madde çıkarıldı, tarihçe git'te duruyor.

## ⚠️ KALICI TUZAKLAR — kod/SQL'e dokunmadan ÖNCE oku
> Bunlar "yapılacak" değil, "yanlış yaparsan sessizce kırılır" uyarıları. Tamamlanmış işlerden
> arta kalan, ileriye dönük mayınlar.

- **Deneme süresi tek yerde DEĞİL:** değişirse DÖRDÜ birlikte — DB `get_trial_status` RPC'si
  (asıl karar burada) + `paraner-app/lib/trial.ts TRIAL_DAYS` + `paraner-app/.../ai-chat/index.ts
  TRIAL_DAYS` + `paraner-web/lib/plans.ts` (yalnız gösterim). Mobil `checkTrialStatusServer` RPC'yi okur.
- **Fiyat tek doğru kaynağı: mobil `app/premium.tsx`.** Web ana sayfa + `layout.tsx` AggregateOffer
  (Google'a yayınlanıyor) oradan türer. AI birim fiyatı `lib/aiPricing.ts`'te ELLE (Google fiyat API'si yok).
- **⛔️ `paraner-app/supabase/ai-usage-rpc-fix.sql` GEÇERSİZ** — tekrar çalıştırılırsa denetim K2'yi
  sessizce geri alır. Çalıştırma.
- **Edge davranışı `supabase/config.toml`'da yaşamalı, komut satırı bayrağında DEĞİL** — `--no-verify-jwt`
  bayrakla tutulursa bir sonraki deploy sessizce sıfırlar (`support-reply-notify` dersi). Yeni edge fonksiyonu = config kaydını da yaz.
- **Aynı DB fonksiyonunu N ayrı SQL dosyası `CREATE OR REPLACE` ediyorsa**, yeni dosyayı **en son
  çalıştırılanın gövdesinden** türet — repodaki en eski kopya canlıdaki gerçek gövde değildir.
- **Repoda SQL olması "çalıştırıldı" demek DEĞİL** — şüphelenince `pg_policies`/`pg_constraint`'i canlıdan oku.
- **DB'de CHECK yok** (profile_type, currency, subscription_tier, department) → uydurma değer SESSİZCE
  kaydolur. Sözlük dışı değer yazma; sözlükler tek kaynakta (`lib/plans.ts`, `lib/currencies.ts`, `supportShared.ts`).
- **Prefetch DEV'de kapalı** → panel hızını yalnız prod build'de ölçebilirsin.
- **DB şemasına dokunma** — mobil aynı şemayı kullanıyor; yeni kolon/tablo gerekiyorsa ÖNCE Mehmet'e sor.
- Destek e-posta mimarisi (referans): `notify_on_agent_reply` trigger → `pg_net.http_post` → edge; secret
  Vault (`support_webhook_secret`) + Edge Secrets (`SUPPORT_WEBHOOK_SECRET`), ikisi aynı değer.

---

## 💳 ÖDEME ENTEGRASYONU GELİNCE (tek yerde topla — çok yeri kırar)
- [ ] 🔴 **Trial cron ödeyeni de düşürür:** `trial-expire-cron.sql` satın alımda `trial_plan`
      temizlenmeli YA DA cron'a "aboneliği yok" koşulu. `lib/lifecycle.ts` "paid" ayrımı gerçek abonelikten okumalı.
- [ ] **Max planları** web'e mobil ile BİRLİKTE geri eklenir (şu an ikisinde de yok, mobil paritesi).
- [ ] **DMARC sıkılaştırma o gün TAKILI olmalı** — "faturanız/kartınız" taklidi ödeme gelince para
      kazandıran dolandırıcılığa döner; aşamalı geçiş haftalar sürer, o gün başlamak geç kalır (aşağı bak).
- [ ] İşletme hesabı eklemede **Stripe ödeme/trial kapısı** (şu an direkt açılıyor).

## 📧 E-POSTA KİMLİĞİ (DMARC) · `docs/DMARC-EPOSTA-KIMLIK.md`
> Durum sağlam (6/6 mail DKIM+SPF geçiyor, taklit yok). Eksik tek şey politika: `p=none` = kamera var, kilit yok.
- [ ] 🔴 **ÖN KOŞUL — Mehmet, 1 ekran görüntüsü:** Supabase → Authentication → Emails/SMTP'de özel SMTP
      (Resend) tanımlı mı? `signInWithOtp`/`resetPasswordForEmail`/`inviteUserByEmail` mailleri bu ayardan
      çıkıyor, repoda kaydı YOK. Supabase sunucusundan çıkıyorsa, politika sıkılaşınca kayıt OTP'si + şifre
      sıfırlama sessizce spam'e düşer ("kayıt olamıyorum" şikâyeti).
- [ ] **Gmail filtresi (Mehmet):** `noreply-dmarc-support@google.com` → "DMARC" etiketi. ⚠️ Raporları SİLME
      — karar bu birikime bakılarak verilecek.
- [ ] ⏳ **Aşama 1** (2-3 hafta rapor + Supabase cevabı sonrası): `p=quarantine; sp=quarantine`.
      **Aşama 2** (2-4 hafta sonra): `p=reject; sp=reject`. ⚠️ Ön koşul: raporlarda YALNIZ Resend + Google
      IP'leri görünmesi. ⚠️ `aspf=s` YAZMA (Resend hizalamasını kırar). Tam metinler dokümanda.

## 🛠️ ADMIN PANEL — açık maddeler
- [ ] **trial/abonelik analizi** (`/admin/musteriler` detay) — henüz yok. Destek talepleri kısmı 07-23'te bitti.
- [ ] **Denetim O6 — birim çelişkisi:** pano PROFİL sayıyor, segmentler KİŞİ sayıyor; "Premium profil"
      kartı seg=paid ile uyuşmuyor. Ya birim etiketi ekle ya kişi-bazlı hesaba geç (karar gerek).
- [ ] 🟢 **UX cila — KALAN** (07-23'te kapananlar: satır klavye erişimi, boş seçili-segment çipi,
      AI ay seçici pending, admin not-found kabuk içinde, **terminoloji birliği = "Müşteri"** Mehmet
      kararı). Kalanlar: PageHead deseni (21 yerde kopya başlık) · boş durum 3 ayrı sınıf birleştirme ·
      `/admin/destek` filtre/arama/sayfalama · ekip formu label/aria · "son admin" koruması (düz yönetici modeli).
- [ ] **Ölçek notu:** Dashboard "Toplam Üye" = distinct `auth_user_id` (PostgREST'te distinct count yok →
      kolon çekilip Set'leniyor, `.limit(10000)`). Binlerce profilde RPC gerekir → **DB şeması = önce sor**.
- [ ] ⚡ **`listPeople()` ölçek borcu:** `/admin/destek` + `/admin/musteriler` `auth.users`'ı seri sayfalayıp
      `profiles`+`user_devices` tam tablosunu çekiyor. 07-23'te 60 sn `unstable_cache` eklendi (rahatladı) ama
      ölçek gelince asıl çözüm: taleplerden gelen `user_id` setiyle `.in(...)` daraltma. (Daraltma serileştirir
      → küçük ölçekte kayıp, ölçek gelince yapılır.)

## 🎫 DESTEK — açık maddeler
- [ ] ❓ **AÇIK KARAR (Mehmet):** silinen kişinin **e-posta snapshot'ı** talepte tutulsun mu? Şu an kimlik
      tamamen kopuyor (KVKK uyumlu taraf); anlaşmazlıkta "kimdi bu" cevapsız. Sonradan kolon eklemek kolay,
      sızmış veriyi geri almak zor → bilinçli EKLENMEDİ. `docs/HESAP-SILME-VERI-SAKLAMA.md`.
- [ ] **Gerçek destek ekibi hesapları** `user_roles`'e (şu an yalnız admin@paraner.com). ⚠️ Yeni agent'a
      departman ataması ŞART (fail-closed RLS: departmansız agent hiç talep göremez). Test: `sql/destek/agent-yetki-TEST.sql`.
- [ ] **Mobil ek dosya paritesi** — web bitti; mobilde seçici+sıkıştırma HAZIR, yalnız bağlanacak + balonda
      render. ⚠️ Mobil de YOL→`createSignedUrl` kuralına uymalı. ⚠️ `attachmentStore` profil geçişinde temizlenmiyor.
- [ ] **İleride:** talebe not/atama (`assignee_id` kolonu duruyor, kullanılmıyor).
- [ ] **Faz 1 — mobil push:** `withNoPushEntitlement` yüzünden remote push KAPALI → ücretli Apple hesabı + APNs (Mehmet kararı).
- [ ] **Faz 2 (opsiyonel):** kullanıcı yeni mesajında agent'a bildirim · agent atama/öncelik/filtre · çanda "tümünü okundu".

## ⚡ PERFORMANS / PANEL — açık maddeler
- [ ] **ESLint yapılandırması yok** — `npm run lint` çalışmıyor; kullanılmayan değişken / eksik hook
      bağımlılığı / erişilebilirlik yakalanmıyor (kod denetimi tsc + build'e kalmış).
- [ ] **Genel Bakış `transactions` limitsiz** — 6 ayın tüm işlemleri çekiliyor (panelin en yavaş sayfası
      ~614 ms). Yoğun hesapta payload şişer; özet için RPC gerekir → **DB şeması = önce sor**.
- [ ] **Vercel Hobby soğuk başlangıç** — prefetch maskeliyor ama ilk istek soğuk. Pro + Fluid Compute
      değerlendirilebilir (ücret kararı Mehmet'te). Donma düzeltmesinden sonra kalan gecikmenin şüphelisi bu.
- [ ] **Favoriler eşiği:** favori 8-10'u geçerse daraltılmış ray uzar → "Favoriler" düğmesi + TIKLAMAYLA
      açılan liste (hover DEĞİL, sebep DAILY_LOG 19.07). Şu an ikon olarak rayda, sorun yok.
- [ ] **Sayfa-özel iskeletler** — tek `loading.tsx` 29 sayfada. KARAR = şimdilik YAPMA (bekleme nadir/kısa).
      Bir sayfa düzenli 1 sn'yi geçerse o sayfaya özel iskelet yazılır.

## 🐞 AUTH / HESAP — açık maddeler
- [ ] **Apple "e-postamı gizle" (`@privaterelay.appleid.com`) + şifreyle giriş** — giriş formuna hangi
      adresi yazacak? O adrese mail gitmiyor. Web akışı provider-bağımsız (Apple kullanıcısı da "Şifre Belirle"
      görüyor) ama gizli-mail girişi doğrulanacak. Web + mobil ortak soru.
- [ ] Web kayıt akışı: ek onboarding adımları gözden geçirilecek (OTP + OnboardingModal var).

## 🎨 TASARIM / MARKA — açık maddeler
> ⚠️ Marka rengi DEĞİŞECEK (teal/yeşil kalmayacak) → teal'e tasarım yatırımı yapma. Aksiyon/UI öğeleri
> titanyum, anlam taşıyan renkler (gelir yeşili, danger, warning) kalır. Detay: CLAUDE.md renk kuralı.
- [ ] **Buton yenileme Adım 3** — nötr `btn-ghost` ikincil butonlar (duzenli-fatura "İlerlet", stok/veresiye
      "Hareket", duzenli-odemeler "Onayla", gelir-gider "CSV İndir"). Kalan teal `.btn-primary`'ler marka rengi netleşince toplu.
- [ ] Her sayfanın tek tek **tasarım/UX cilası** (sıradaki faz).
- [ ] Sidebar aç/kapa fade; native `confirm()` yerine özel onay diyaloğu + başarı toast; gerçek mobil menü (drawer).
- [ ] LineChart'a Shopify gibi kesik "önceki dönem" karşılaştırma çizgisi.
- [ ] **Toast sistemini iyileştir** (Sonner-tarzı çalışıyor; Mehmet daha iyi görünüm/UX araştıracak).

## 🌐 SEO / PAZARLAMA (rakip denetimi 2026-07-13 · `docs/RAKIP-defteran.md`)
- [ ] **Google'da yeni title** — Search Console → URL Denetimi → "Dizine eklenmeyi iste" (`/`, `/destek`,
      `/isletme`, `/bireysel`). *(Mehmet'in kişisel Google hesabındaki mülk.)*
- [ ] **Genel mobil tarama:** ana sayfa + auth ekranlarında telefonda taşma/bozulma tek tek bak (auth+rozetler bitti, ana sayfa kaldı).
- [ ] **Panel tasarım turu** — Genel Bakış pilotu onaylandıysa diğer 33 modüle yay (İşlemler → Hesaplar → Faturalar).
- [ ] **Mega-menüdeki alt sayfalar** (`/isletme/faturalar` …) — şu an `#çapa`lara gidiyor; `navData.ts`'te
      href değiştirmek yeterli. **Google sitelinks'i bunlar doğurur.**
- [ ] **Ana sayfayı iki segmente çatalla** (Mehmet karar vermedi): hero altına "İşletmem var" / "Bireysel" kartları.
- [ ] **`llms.txt` + `llms-full.txt`** — ucuz AEO kazancı (Defteran'da var, bizde yok).
- [ ] **Ücretsiz hesaplayıcılar** — gecikme faizi/vade farkı, serbest meslek makbuzu+tevkifat, şahıs şirketi
      vergi yükü, ücretsiz fatura oluşturucu, kâr marjı (Defteran'ın girmediği nişler).
- [ ] **Sosyal kanıt** — sitede tek sayı yok; App Store puanı varsa hero'ya.

## 🧩 ÜRÜN — eksik özellikler (Defteran'da var, bizde yok)
- [ ] **Fatura kalem editörü** — ⚠️ EN KRİTİK TEKNİK BORÇ. e-Fatura + teklif→fatura + stok düşümü ÜÇÜ
      birden buna kilitli (`FaturalarClient.tsx:216`).
- [ ] **Excel/CSV içe aktarım** (fatura + cari) — bizde sadece export var. Rakipten göç silahı.
- [ ] **Mutabakatta güvenli paylaşım linki** — token'lı public route + onay (şu an tamamen içeri dönük).
- [ ] **Teklif → Fatura tek-tık dönüşümü** (`invoiced` durumu var, dönüştüren kod yok).
- [ ] **Fatura → Stok otomatik hareketi** (alış artır, satış azalt; şu an manuel).
- [ ] **PDF rapor** (menüde `href: null`).
- [ ] **Puantaj** (çalışan/maaş/izin var, devam-mesai yok).

## 🧹 ESKİ VERİ / TEMİZLİK
- [ ] **Eski test verisi:** aktif 3 deneme `business_max_monthly` planında (artık sunulmayan plan). Bozuk değil, temizlenebilir.
- [ ] **Test cihazı kaydı (Mehmet'e soru):** `user_devices`'ta "Yalıkavak" kaydı (14-17.07 kullanılmış,
      tek seferlik değil) — senin başka bir tarayıcın mı, yoksa silinsin mi? (Bodrum kaydı = güncel tarayıcın, duruyor.)

## 🔒 DENETİMDEN — karar/mobil-koordine bekleyen (2026-07-01/02)
- [ ] **Maaş & düzenli-ödeme "Ödendi" → `transactions` oluşturmuyor** → Genel Bakış KPI + Bütçe bu çıkışları
      görmüyor. Mobil aynı işi transaction yazarak mı yapıyor? (Çift-kayıt olmasın → mobil parite teyidi sonrası.)
- [ ] **Defense-in-depth:** update/delete sorgularına `user_id`/`profile_id` filtresi (~11 modül). RLS zaten
      gate ediyor; istenirse eklenir.
- [ ] **Budget "harcanan" kategori eşleşmesi:** `transactions.category` gerçekten kategori-id mi? (muhtemelen id, veri teyidi).
- [ ] **Mobil tarafı (koordine):** mobil KDV raporu tüm para birimlerini topluyor (web düzeltildi); ai-chat
      client-kontrollü systemPrompt server'da sabitlensin; mobil token AsyncStorage→expo-secure-store; aktif profil ortak DB alanı.

## 📱 MOBİL CLAUDE'A İLETİLECEK
- [ ] **Faturalar web'de tek "akıllı hub" oldu** — mobil de aynı tek-ekran hub'a getirilebilir (Tür sekmeleri
      + durum çipleri + arama + tarih + CSV + detay çekmecesi). Web `due_date` okuyor, `transactions`'a senkronluyor, atomik RPC numara.
- [ ] `businessMenu.ts`: "Çalışan Listesi" + "Harcama Kayıtları" ikisi de `/employee-expenses` → ayrıştır.
- [ ] **Özel kategoriler cihaz-yerel** (mobil AsyncStorage, web localStorage) → cihazlar arası senkron YOK.
      İstenirse ortak DB tablosuna (şema için sor).

## 📲 APP STORE / GİZLİLİK
- [ ] **Privacy Nutrition Labels** — App Store Connect anketi (panel işi, kod değil).
- [ ] Mobil gizlilik metnini değiştirirse `/gizlilik` ile eşitle.
- [ ] Reviewer demo hesabı `admin@paraner.com` App Store Connect'e girilecek.

## ✅ CANLI GÖZ KONTROLÜ (kod doğrulandı, cihaz teyidi bekliyor)
**Cüzdanım:**
- [ ] Truncgil fiyatları geliyor mu (Toplam Değer / K-Z / Bugün)? Web↔mobil varlık senkronu? İkinci alış →
      ağırlıklı ortalama maliyet? Kısmi/tam satış? `savings_asset_movements` mobil uyumu?

**Dashboard + kartlar + kategoriler:**
- [ ] KPI'lar doğru mu? Hesap ekleme (kart tema + önizleme + para birimine göre IBAN/routing)? Web↔mobil hesap
      senkronu (card_theme/routing_no/account_no)? Kategori ikonları mobil ile aynı mı? Özel kategori → işlem/liste/donut?
      İşlem detayı açılınca liste sola kayıyor mu?

**Sidebar:**
- [ ] Çoklu para birimi çipi: birden fazla para birimli hesapta çıkıyor mu, filtre süzüyor mu, tekte gizli mi?

## 🚀 SONRAKİ FAZ (lansman sonrası / v2 — şimdi DEĞİL)
> Önce: arayüzler + Stripe ödeme + app/web temel işler.
- [ ] **E-Fatura / GİB** — entegratör API (öneri Nilvera, REST/OAuth2). Fatura → UBL-TR XML + mali mühür → GİB.
      Gerekli: entegratör anlaşması + müşteri mali mührü + kontör. → işletme planı ~699 ₺/ay olabilir.
- [ ] **SEO / AEO (AI görünürlüğü)** — ChatGPT/AI önerilerinde Paraner. İçerik + schema + landing (ayrı plan).
- [ ] **Hesap silme v2:** admin/dashboard silmede FARKLI mail (kullanıcı kendi silince "Görüşmek üzere" var;
      biz silersek ayrı). Trigger'a silme kaynağı ayrımı.
- [ ] Dış-entegrasyon "Yakında": Fiş Tara (OCR), Döviz & Altın (API), PDF Rapor, SGK, e-Defter, Muhasebeci.

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor; yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` filtre, ₺/tarih `lib/format`, kategori `lib/categories`.
- İş akışı + oturum özetleri: `DAILY_LOG.md`. Tamamlanan işlerin tarihçesi: git geçmişi.
