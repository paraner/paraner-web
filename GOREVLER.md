# GÖREVLER — paraner-web

> **Sadece AÇIK görevler.** Bir madde bitince buradan SİL (anlatısı `DAILY_LOG.md` + git'te),
> burada `[x]` biriktirme.

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

## 🚨 LANSMAN ÖNCESİ ZORUNLU (o güne bırakılmaz)
- [ ] 🔴 **VERİTABANI YEDEĞİ YOK** (27.07.2026, Supabase panelinde görüldü: "LAST BACKUP: No backups").
      Bu veritabanı web + mobilin TÜM müşteri verisi: işlemler, faturalar, cariler, hesaplar,
      çalışanlar, Parla sohbetleri. **Ücretsiz planda otomatik yedek YOK** (compute: NANO);
      günlük otomatik yedek Pro plandan itibaren geliyor → ücret kararı Mehmet'te.
      Bugün kritik değil (gerçek müşteri yok) ama **gerçek müşteri verisi girmeden ÖNCE** çözülmeli:
      yanlış bir `DELETE`, hatalı bir migration ya da kaza = geri dönüş yolu yok.
      Ara çözüm (ücretsiz): düzenli `pg_dump` ile elle yedek + güvenli bir yere kopya.
      ⚠️ Yedek varken bile GERİ YÜKLEME denenmeden "yedeğim var" denmez — bir kez test edilmeli.

## 💳 ÖDEME ENTEGRASYONU GELİNCE (tek yerde topla — çok yeri kırar)
- [ ] 🔴 **Trial cron ödeyeni de düşürür:** `trial-expire-cron.sql` satın alımda `trial_plan`
      temizlenmeli YA DA cron'a "aboneliği yok" koşulu. `lib/lifecycle.ts` "paid" ayrımı gerçek abonelikten okumalı.
- [ ] 🔴 **Abonelik alanlarını İSTEMCİ yazıyor** (web `AbonelikBolumu` + mobil `premium.tsx`, ikisi de
      `profiles` tablosuna doğrudan) → kullanıcı teoride kendine `is_premium: true` yazabilir. Bugün
      satılacak bir şey olmadığı için zararsız; **ödeme günü** `is_premium/subscription_tier/trial_*`
      alanları RLS ile kilitlenip YALNIZ sunucu/webhook tarafından yazılmalı.
- [ ] **Panel > Ayarlar > Abonelik'teki "Ödeme yakında" düğmeleri** gerçek ödemeye bağlanacak
      (denemesi olmayan planlar bugün satılamıyor). Sağlayıcı kararı da bu maddede: iyzico/PayTR/Stripe.
- [ ] ⚠️ **Web pazarlama sayfası Max planlarını GÖSTERMİYOR** (mobil ve panel > Abonelik gösteriyor).
      `app/page.tsx` PLANS + `app/layout.tsx` AggregateOffer yalnız Free/Pro/İşletme Pro içeriyor →
      müşteri telefonda ₺890 Max görüyor, sitede yok. Karar: ya siteye eklenir ya mobilden kaldırılır.
      *(Buradaki eski "Max planları ikisinde de yok" notu YANLIŞTI — mobil `app/premium.tsx`'te duruyor.)*
- [ ] **DMARC sıkılaştırma o gün TAKILI olmalı** — "faturanız/kartınız" taklidi ödeme gelince para
      kazandıran dolandırıcılığa döner; aşamalı geçiş haftalar sürer, o gün başlamak geç kalır (aşağı bak).
- [ ] İşletme hesabı eklemede **Stripe ödeme/trial kapısı** (şu an direkt açılıyor).
- [ ] **Abonelik sayfası yenilemesi — plan hazır: `docs/ABONELIK-SAYFASI-PLANI.md`** (28.07, onaylı
      değil; Mehmet "sonra devam" dedi). Kapsam: plan seçim popup'ı (abone değilse Abonelik sekmesinde
      oturumda bir kez) · ortak `PlanSecici` (sekme + popup tek bileşen) · Modal'a `xl` boyut ·
      "Planım" / "Ödeme Yöntemi" / "Faturalarım" blokları (Stripe'a kadar boş + "Yakında").
      ⚠️ `invoices` tablosu MÜŞTERİNİN kendi faturaları — abonelik makbuzu AYRI tablo (`billing_invoices`).
- [ ] **Yeni plan: İşletme Pro Yıllık (`business_pro_yearly`)** — Mehmet istedi (28.07). Öneri
      ₺4.900/yıl (₺408,33/ay, 2 ay bedava, ₺980 tasarruf); fiyat toplu güncellemede kesinleşecek.
      ⚠️ **5 yer birlikte:** mobil `stores/authStore.ts` SubscriptionTier → mobil `app/premium.tsx`
      (ASIL kaynak) → `lib/plans.ts` → `app/page.tsx` PLANS → `app/layout.tsx` AggregateOffer.
      `TRIAL_PLANS`'a EKLENMEZ (deneme yalnız aylık planlarda).
- [ ] 🔴 **CANLIDA YANLIŞ HUKUKİ METİN:** `app/gizlilik/page.tsx:25` "Ödeme bilgileri doğrudan
      RevenueCat tarafından işlenir" diyor — RevenueCat entegre DEĞİL, hiç ödeme alınmıyor. Mobilde de
      aynı (`paraner-app/app/privacy.tsx:24`) ve `terms.tsx:35` ("App Store üzerinden işlenir") bununla
      ÇELİŞİYOR. Ödeme gelmeden önce üçü birden gerçeğe uydurulmalı.
- [ ] **Pazarlamada sayı iddiası:** "N+ işletmenin tercihi" satırı ELLE yazılmayacak — kayıtlı işletme
      sayısı DB'den okunup eşik üstündeyse basılacak, altındaysa doğrulanabilir güven satırı çıkacak.
      Sebep: Ticari Reklam Yönetmeliği iddianın ispatlanabilir olmasını şart koşuyor (Reklam Kurulu
      cezası). Aynı cümle soğuk mailde de kullanılacak → risk katlanır.

## 🤖 AI ASİSTAN — TEK BEYİN (web + mobil ortak) · `~/Developer/Paraner/parla/PLAN.md`
> 🧪 **SONRAKİ OTURUMUN İLK İŞİ = UÇTAN UCA TEST** (Mehmet, 25.07 — "bir dahaki işe başlarken ilk bunu"):
>   ① kategori sorma (gelir/gider, yeni kategori, renkler)  ② **fiş fotoğrafı okuma — TELEFONDA HİÇ
>   DENENMEDİ**  ③ telefon↔web sohbet + kategori + işlem senkronu  ④ çoklu profil: yeni işletme hesabı
>   aç → sohbetler/işlemler AYRI mı (tek-aktif-profil garantisi de burada test edilir).
> Karar (2026-07-24): kurallar kodda değil **admin panelinde**; web kapsamı = mobil paritesi (fiş hariç).
- [x] **Faz 1 kodu yazıldı** — `ai_config_versions` tablosu (SQL hazır) + edge function "beyin modu"
      (`paraner-app/supabase/functions/ai-chat/brain/*`). Eski sözleşme bozulmadı → mobil kırılmaz.
- [x] ✅ **SQL çalıştırıldı** (`parla/sql/ai-config-versions.sql`) + **edge deploy edildi** (2026-07-24).
      Duman testi: fonksiyon ayakta, iki yol da 401 dönüyor (açılışta çökme yok).
- [x] **Parla web'de ÇALIŞIYOR** (canlı doğrulandı): sohbet + işlem ekleme + fiş okuma + gerçek akış
      (streaming) + sohbeti temizle. Sohbet geçmişi mobil ile ortak.
- [x] ✅ **Tüm Parla SQL'leri çalıştırıldı** (25.07 DOGRULAMA.sql ile teyit): kural v2, 90 gün saklama,
      `user_categories`, çift-aktif-profil düzeltmesi + tek-aktif garantisi, `transactions` realtime.
- [ ] **KARAR VERİLDİ (24.07):** tek sürekli sohbet (çoklu sohbet YOK) + 90 gün saklama.
      Çoklu sohbet ancak kullanıcılar uzun analiz oturumları yaparsa değerlenir; o zaman
      yeni tablo + mobil koordinasyonu gerekir.
- [ ] 🔜 **SIRADAKİ BÜYÜK İŞ — Faz 2:** admin panelde "AI Kuralları" sayfası (düzenle · kaydet=yeni
      sürüm · geri al · önizleme). Kuralları koda dokunmadan Mehmet düzenleyebilsin diye.
- [x] **Faz 3 (ekran):** web panelde Parla — çalışıyor (kategori sorma + yeni kategori + renkli tutar).
- [x] ✅ **Faz 4 TAMAM (24.07): telefon ortak beyne bağlandı.** `chatStore` sunucuya soruyor;
      `SUNUCU_BEYNI` anahtarı ile tek satırda geri dönülebilir. Eski dosyalar SİLİNMEDİ.
      ⏳ **Cihaz testi bekliyor** (native build şart — OTA yok).
- [x] **Beyin ortak klasöre taşındı:** `~/Developer/Paraner/parla/` (GitHub: paraner/parla, private).
- [ ] 🔴 **NİYET HATASI — ERTELENDİ (25.07, Mehmet: "AI'ı sonra yeniden şekillendiririz"):**
      `routeMessage` sırası ekleme→hedef→silme. "150 tl gider yazdığım şeyi iotal edeceksin"
      cümlesinde ekleme katmanı önce eşleşip **YENİ gider taslağı** açıyor; silme kelimeleri de
      harfi harfine aranıyor ("iotal" tuş hatası kaçıyor) → AI'ya düşüyor, AI'ın silme yetkisi
      olmadığı için kullanıcıya "son işlemi sil de" diyor (döngü).
      **Seçenekler:** (A) hızlı yama = ekleme katmanına "iptal/sil/yanlış yazdım" kilidi +
      silmeyi öne al + yazım toleransı. (B) asıl çözüm = AI'a araç (function calling) ver,
      niyeti AI belirlesin; her mesaj AI'ya gider (kota/ücret) ve silmede ONAY adımı ŞART.
- [ ] **Mobil parite (Parla, web'de var mobilde yok):** ① cevaplanmamış kategori sorusu
      düşmüyor, cevaptan sonra bir kez hatırlatılıyor ② çip rayı fareyle/tekerlekle kaydırma
      (mobilde zaten parmakla kayıyor — orada yalnız ① gerekli).
- [ ] **KARAR BEKLİYOR — "tümünü sil" açılsın mı?** Mobil `smartRouter.ts`te sıra hatası: "evet tümünü sil"
      cümlesi de "tümünü" içerdiği için onay dalına düşüyor → toplu silme **canlıda hiç çalışmamış**.
      Sunucuda aynı (güvenli) davranış korundu; açmak geri dönüşü olmayan silmeyi etkinleştirir.
- [x] ✅ **ÖZEL kategoriler ortak tabloda (24.07):** `user_categories`. Web + mobil + Parla aynı
      listeyi okuyor; cihazdaki eskiler ilk açılışta bir kez taşınıyor (bayraklı).
- [ ] **SABİT kategori kataloğu hâlâ üç kopya** (mobil + web + `brain/categories.ts`) — bu SALT
      TEMİZLİK, kullanıcıya görünen etkisi yok. Yeni kategori eklerken üçünü birden güncelle.
- [x] ✅ **Kategori sorma sistemi TAMAM (web + mobil):** belirsiz yazımda ("250 kahve") Parla soruyor,
      kaydetmeden çip gösteriyor; yeni kategori oluşturulabiliyor (ortak tabloya). Tutar renkli
      (gelir yeşil/gider kırmızı), onay metni türe göre ("giderin/gelirin kaydedildi").
- [x] ✅ **İşlem CANLI senkron (25.07):** `transactions` realtime → telefon↔web çift yönlü, yenilemesiz
      (~3 sn ilk bağlantı, sonrası hızlı). Maliyet notu: `parla/sql/islemler-realtime.sql` (sıcak tablo).
- [x] ✅ **Düzeltildi (Faz 4):** kalan-hak sayacı yanlış kimlikle okunuyordu (profil id ↔ auth id);
      + butonu seçilen görseli hiç göndermiyordu; günlük limit sabitleri (5/30) iki yerde kopyaydı;
      fiş tarama istemi mobilde ayrı kopyaydı → hepsi tek kaynağa bağlandı.

## 📧 E-POSTA KİMLİĞİ (DMARC) · `docs/DMARC-EPOSTA-KIMLIK.md`
> Durum sağlam (6/6 mail DKIM+SPF geçiyor, taklit yok). Eksik tek şey politika: `p=none` = kamera var, kilit yok.
- [x] ✅ **ÖN KOŞUL ÇÖZÜLDÜ (2026-07-24):** Supabase custom SMTP = Resend açık (`smtp.resend.com:465`,
      `noreply@paraner.com`). Auth mailleri Resend'den → DKIM hizalı → sıkılaştırma bu mailleri spam'e
      DÜŞÜRMEZ. Artık tek bekleyen: 2-3 haftalık DMARC rapor birikimi (aşağıdaki Aşama 1).
- [ ] **Gmail filtresi (Mehmet):** `noreply-dmarc-support@google.com` → "DMARC" etiketi. ⚠️ Raporları SİLME
      — karar bu birikime bakılarak verilecek.
- [ ] ⏳ **Aşama 1** (2-3 hafta rapor + Supabase cevabı sonrası): `p=quarantine; sp=quarantine`.
      **Aşama 2** (2-4 hafta sonra): `p=reject; sp=reject`. ⚠️ Ön koşul: raporlarda YALNIZ Resend + Google
      IP'leri görünmesi. ⚠️ `aspf=s` YAZMA (Resend hizalamasını kırar). Tam metinler dokümanda.

## 🛠️ ADMIN PANEL — açık maddeler
- [ ] **trial/abonelik analizi** (`/admin/musteriler` detay) — henüz yok.
- [ ] **Ölçek notu:** Dashboard "Toplam Müşteri" = distinct `auth_user_id` (PostgREST'te distinct count yok →
      kolon çekilip Set'leniyor, `.limit(10000)`). Binlerce profilde RPC gerekir → **DB şeması = önce sor**.
- [ ] ⚡ **`listPeople()` ölçek borcu:** `/admin/destek` + `/admin/musteriler` `auth.users`'ı seri sayfalayıp
      `profiles`+`user_devices` tam tablosunu çekiyor (60 sn cache var → bugün acıtmıyor). Ölçek gelince asıl
      çözüm: taleplerden gelen `user_id` setiyle `.in(...)` daraltma (serileştirir → küçük ölçekte kayıp).

## 🎫 DESTEK — açık maddeler
- [ ] **Hesap silme yaşam döngüsü — KARAR VERİLDİ (2026-07-24), kod ödeme/lansman fazında:** yumuşak
      silme (`deleted_at`) + **30 gün geri dönüş penceresi** + cron kalıcı silme. Kalıcı silmede talep
      kimliği kopar/içerik kalır (e-posta snapshot TUTULMAZ). Dokunacağı yerler: DB + web+mobil auth
      (silinmiş hesapta giriş→kurtarma) + cron + mail. Politika+kaynaklar: `docs/HESAP-SILME-VERI-SAKLAMA.md`.
- [ ] **Gerçek destek ekibi hesapları** `user_roles`'e (şu an yalnız admin@paraner.com). ⚠️ Yeni agent'a
      departman ataması ŞART (fail-closed RLS: departmansız agent hiç talep göremez). Test: `sql/destek/agent-yetki-TEST.sql`.
- [ ] **Mobil ek dosya paritesi** — mobilde seçici+sıkıştırma HAZIR, yalnız bağlanacak + balonda render.
      ⚠️ Mobil de YOL→`createSignedUrl` kuralına uymalı. ⚠️ `attachmentStore` profil geçişinde temizlenmiyor.
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

## 🔝 ÜST BAR (panel header) — 3 adımlık iş, sırayla (Mehmet, 26.07)
> Üst bar bugüne kadar neredeyse boştu (yalnız Parla + zil). Sıra bozulmasın diye tek tek.
- [x] ✅ **① Ayarlar > Abonelik sekmesi** (27.07) — plan/deneme durumu + planlar + deneme başlatma.
- [x] ✅ **② Panel geneli arama** (27.07) — üst barda kutu + ⌘K; sayfalar (eş anlamlılarla) +
      12 tabloda veri araması; tutar araması aralıklı ("2583" → 2.583,36'yı bulur).
      **Açık kalan (bilinçli):** ① sonuç **kaydı doğrudan açmıyor** — modül sayfasını açıyor;
      İşlemler/Faturalar/Müşteriler/Ürünler'de o modülün arama kutusu `?q=` ile doldurulup kayıt
      tek satıra iniyor, diğer 8 modülde arama kutusu YOK → düz sayfa açılıyor. Kaydı doğrudan
      açmak için her modüle "şu id'yi aç" bağlantısı gerekir (③ ile aynı altyapı).
      ② Bireysel hesapta veri araması 3 tabloda (işlem/hesap/varlık) — bireysel menüde diğer
      modüller zaten yok.
- [x] ✅ **③ Deneme/plan rozeti + hızlı ekleme adası** (27.07) — rozet üst barda ve
      KAPATILAMAZ (× kaldırıldı, Mehmet kararı); ada fareyle açılır/kapanır, dokunmatikte tıklamayla. Satırlar hedef
      modülü `?ekle=…` ile açıyor, modül KENDİ formunu açıyor (ikinci form kopyası yok).
      **Açık kalan:** ada listesi SABİT (mobilde kullanıcı 12 işlemden seçebiliyor —
      web'de özelleştirme yok). İstenirse profil tercihine bağlanır.

## 🎨 TASARIM / MARKA — açık maddeler
> ⚠️ Marka rengi DEĞİŞECEK (teal/yeşil kalmayacak) → teal'e tasarım yatırımı yapma. Aksiyon/UI öğeleri
> titanyum, anlam taşıyan renkler (gelir yeşili, danger, warning) kalır. Detay: CLAUDE.md renk kuralı.
- [ ] **Kategoriler ekranının YERİ değişecek (Mehmet, 25.07):** şu an `Ayarlar > Kategoriler`
      sekmesinde; "burada kalmayacak, ileride yerini değiştireceğiz". Bileşen hazır ve bağımsız
      (`app/panel/ayarlar/KategorilerBolumu.tsx`, tek prop `profileId`) → taşımak = bir satır.
- [ ] **Buton yenileme Adım 3** — nötr `btn-ghost` ikincil butonlar (duzenli-fatura "İlerlet", stok/veresiye
      "Hareket", duzenli-odemeler "Onayla", gelir-gider "CSV İndir"). Kalan teal `.btn-primary`'ler marka rengi netleşince toplu.
- [ ] Her sayfanın tek tek **tasarım/UX cilası** (sıradaki faz). Sıradakiler: ① Genel Bakış'ın
      kendi boş kutuları hâlâ eski dilde ② modüller arası liste satırı/kart kenarı ölçü farkları.
- [ ] LineChart'a Shopify gibi kesik "önceki dönem" karşılaştırma çizgisi.
- [ ] **Toast sistemini iyileştir** (Sonner-tarzı çalışıyor; Mehmet daha iyi görünüm/UX araştıracak).

## 🌐 SEO / PAZARLAMA (rakip denetimi 2026-07-13 · `docs/RAKIP-defteran.md`)
- [ ] **Google'da yeni title** — Search Console → URL Denetimi → "Dizine eklenmeyi iste" (`/`, `/destek`,
      `/isletme`, `/bireysel`). *(Mehmet'in kişisel Google hesabındaki mülk.)*
- [ ] **Genel mobil tarama:** ana sayfada telefonda taşma/bozulma tek tek bak (auth ekranları elden geçti, ana sayfa kaldı).
- [ ] **Panel tasarım turu** — Genel Bakış pilotu onaylandıysa diğer 33 modüle yay (İşlemler → Hesaplar → Faturalar).
- [ ] **Mega-menüdeki alt sayfalar** (`/isletme/faturalar` …) — şu an `#çapa`lara gidiyor; `navData.ts`'te
      href değiştirmek yeterli. **Google sitelinks'i bunlar doğurur.**
- [ ] **Ana sayfayı iki segmente çatalla** (Mehmet karar vermedi): hero altına "İşletmem var" / "Bireysel" kartları.
- [ ] **`llms.txt` + `llms-full.txt`** — ucuz AEO kazancı (Defteran'da var, bizde yok).
- [ ] **Ücretsiz hesaplayıcılar** — gecikme faizi/vade farkı, serbest meslek makbuzu+tevkifat, şahıs şirketi
      vergi yükü, ücretsiz fatura oluşturucu, kâr marjı (Defteran'ın girmediği nişler).
- [ ] **Sosyal kanıt** — sitede tek sayı yok; App Store puanı varsa hero'ya.

## 🧱 WEB↔MOBİL PARİTE — mobilde HAZIR, web'de yok (04.08.2026 ölçümü)
> Kaynak: `docs/PANEL-FIKIRLERI.md`. Yeni icat değil, **mobilde çalışan ekranı web'e getirmek.**
> ⚠️ `businessMenu.tsx:1`'deki *"mobil ile birebir tutarlı"* yorumu ARTIK YANLIŞ, güncellenmeli.

- [x] ~~Döviz & Altın~~ · ~~PDF Rapor~~ · ~~SGK & Bildirgeler~~ · ~~KDV Beyanname Özeti~~ → **04.08'de web'e taşındı**
- [ ] 🔴 **Fatura kalem editörü** — mobilde `invoice-create.tsx` (1256 satır) TAM: kalem, 9 birim,
      vade tarihi, ödeme hesabı, PDF, vergi no doğrulama. Web `FaturaFormu.tsx` **253 satır**, hiçbiri yok.
      Aşağıdaki "ÜRÜN" bölümünün ilk maddesiyle aynı iş — mobilden port en kısa yol.
- [ ] **Fiş / Makbuz Tara** — mobilde `receipt-scan.tsx` (619 satır) çalışıyor; web'de `href: null`.
      Web'de `lib/receipts.ts` altyapısı var, beyin `~/Developer/Paraner/parla/`.
- [ ] **Fatura Numaralama'yı menüye çıkar** — web'de KOD VAR (`AyarlarClient.tsx:222`) ama
      yalnız Ayarlar içinde; mobilde ayrı ekran (`invoice-numbering.tsx`).
- [ ] **İnce modülleri mobil seviyesine çıkar** (satır: web → mobil):
      kar-zarar 171→495 · kdv-raporu 149→413 · nakit-akisi 120→397 · vergi-takvimi 97→326 · vade 180→409.
- [ ] **Muhasebeci Erişimi** — mobilde `accountant-access.tsx` (134 satır, küçük); web'de `href: null`.
      Çoklu-kullanıcı şeması gerekiyor → "Ekip & Yetkiler" bölümüyle birlikte düşünülmeli.

## 🆕 YENİ BÖLÜM ÖNERİLERİ — Mehmet'le DETAYLI KONUŞULACAK (04.08.2026)
> Mehmet: *"yeni bölüm önerilerini not al, üzerinde detaylı konuşuruz seninle."*
> Gerekçeler ve ayrıntı: `docs/PANEL-FIKIRLERI.md` §"Yeni BÖLÜM önerileri".

- [ ] **📅 Takvim & Hatırlatmalar** — *en ucuzu, veri zaten bizde.* Bugün "bu hafta ne olacak?"
      cevabı 5 sayfaya dağılmış (vade · vergi-takvimi · duzenli-odemeler · duzenli-fatura · cek-senet).
      Rakip tek takvimde 8 katman + üst barda rozet gösteriyor. Yeni veri modeli ~gerektirmiyor.
- [ ] **👥 Ekip & Yetkiler** — Kullanıcılar · Roller · Muhasebeci Erişimi · Erişim kaydı.
      Bugün dağınık: roller `AyarlarClient.tsx:1897` "Yakında", muhasebeci ayrı ölü satır.
      ⚠️ DB şeması ister → mobil ekiple ortak karar. Mali müşavir = ücretsiz büyüme kanalı.
- [ ] **📈 İşletme Sağlığı (Analiz)** — Gün sonu/"patron raporu" · sağlık skoru · proaktif uyarılar ·
      "Parla'ya sor". **Rakipte AI HİÇ YOK** → kopyalanması en zor hamlemiz.
- [ ] **🧾 e-Dönüşüm** — e-Fatura/e-Arşiv/e-İrsaliye + kontör + entegratör ayarı.
      Bulgu: Bizim Hesap'ın KENDİ entegratörü yok (eLogo/QNB eSolutions/Trendyol/Uyumsoft'a köprü)
      → sıfırdan GİB entegrasyonu şart değil. ⚠️ Önce kalem editörü.
- [ ] **🏬 Depo & Lojistik** — depolar · transfer · **sayım** · irsaliye · ölü stok. ⚠️ Şema ister.
- [ ] **🏦 Banka & Tahsilat** — banka bağlama/ekstre · otomatik eşleştirme · ödeme linki.
      `paraner-app/banka-entegrasyonu/` klasörü mevcut. Büyük iş, "sonraki faz".
- [ ] ⛔ **🛒 e-Ticaret / pazaryeri — GİRMEME önerisi.** Rakibin ₺1.100+KDV'lik üst paketi tamamen bu
      (80+ entegrasyon, sürekli bakım). O emek kâr/mobil/AI tarafında daha çok getirir. Karar Mehmet'in.

## 🧩 ÜRÜN — eksik özellikler (Defteran'da var, bizde yok)
- [ ] **Fatura kalem editörü** — ⚠️ EN KRİTİK TEKNİK BORÇ. e-Fatura + teklif→fatura + stok düşümü ÜÇÜ
      birden buna kilitli (`FaturalarClient.tsx:216`). **Mobilde hazır** (yukarı bak) → port edilebilir.
- [ ] **Excel/CSV içe aktarım** — ⚠️ **KISMEN VAR:** `AyarlarClient.tsx:1616` müşteri/tedarikçi + ürün
      CSV aktarımı çalışıyor (kolon eşleştirme + TR başlık tahmini). Eksik: `.xlsx`, fatura/işlem
      aktarımı, ve GÖRÜNÜRLÜK (Ayarlar'a gömülü, göç silahı kimse görmüyor).
- [ ] **Mutabakatta güvenli paylaşım linki** — token'lı public route + onay (şu an tamamen içeri dönük).
- [ ] **Teklif → Fatura tek-tık dönüşümü** (`invoiced` durumu var, dönüştüren kod yok).
- [ ] **Fatura → Stok otomatik hareketi** (alış artır, satış azalt; şu an manuel).
- [x] ~~**PDF rapor**~~ → 04.08.2026'da eklendi (`/panel/pdf-rapor`, tarayıcıdan yazdır/PDF kaydet).
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
- [ ] 🔴 **SGK prim tahmini MOBİLDE BOZUK** (05.08.2026, web'de canlı testte yakalandı).
      `app/sgk-declarations.tsx` primi `employees.salary`'den hesaplıyor ama **o kolonu yazan
      hiçbir arayüz yok**: mobil `employee-expenses.tsx`'teki `Employee` arayüzünde `salary`
      alanı bile yok (yalnız ödemelerden türeyen `total_salary` var), web çalışan formunda da
      yok. Kolon her hesapta `0.00` → **prim tahmini herkeste kalıcı olarak ₺0,00.**
      Kanıt: test hesabında ₺122.258'lik gerçek maaş ödemesi varken ekran ₺0 gösteriyordu.
      **Web'de düzeltildi:** `salary_payments` tablosundan, SEÇİLİ AYA göre hesaplanıyor
      (`app/panel/sgk/`). Mobil de aynı şekilde düzeltilmeli — ya bu, ya çalışan formuna
      "Brüt Maaş" alanı eklenmeli. ⚠️ `employees.salary` şu an ÖLÜ KOLON.
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
- [ ] **Soğuk mail kampanyası** — işletmelere "14 gün ücretsiz" maili (10.000+). Plan hazır:
      `docs/SOGUK-MAIL-PLANI.md`. ⚠️ İKİ TUZAK: (1) paraner.com'dan GÖNDERİLMEZ — spam şikâyeti
      şifre sıfırlama maillerini de öldürür, ayrı alan adı şart. (2) Resend'den GÖNDERİLMEZ —
      sözleşmesi soğuk maili yasaklıyor, hesap askıya alınırsa tüm işlem mailleri durur.
      Ayrıca İYS kaydı zorunlu (tacir/esnafa onay gerekmiyor ama kayıt + ret kontrolü gerekiyor).
      Başlamadan önce ödeme sistemi + onboarding bitmiş olmalı.

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor; yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` filtre, ₺/tarih `lib/format`, kategori `lib/categories`.
- İş akışı + oturum özetleri: `DAILY_LOG.md`. Tamamlanan işlerin tarihçesi: git geçmişi.
