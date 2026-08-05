# DAILY LOG — paraner-web

> Son arşivleme: 05.08.2026
>
> **Bu dosya SADECE son ~7 günün işini + kalıcı uyarıları tutar.** "İşe başla" denince
> yukarıdaki tarihe bak: üzerinden 7+ gün geçtiyse 7 günden eski girdileri
> `~/Developer/Paraner/daily-log/web/DAILY_LOG.md` arşivine taşı, buradan sil, tarihi bugüne çek.
> **Geçmişi okumak gerekince arşivden oku.** Bir hafta iş yapılmadıysa taşınacak bir şey yoktur.
> ⚠️ Aşağıdaki "Hâlâ geçerli uyarılar" bölümü ARŞİVLENMEZ, hep burada kalır.
> Tam ayrıntı git geçmişinde. (Aynı sistem `paraner-rn-referans` ve `paraner-app`'ta.)

---

## ⚠️ Hâlâ geçerli uyarılar / config / bekleyen testler

- **iOS mobil auth dersleri** (mobil auth'a tekrar dokunulursa, adım adım + Mehmet onayıyla): `background-attachment:fixed` iOS'ta BOZUK; sabit bg için `position:fixed` katman ama o da klavyeyle yatay kayma yapar; `dvh` klavyede değişken → `svh` daha stabil; input `font-size<16px` → odakta zoom; CSS `mask`+`filter` Safari'de görünmezlik (bilinen bug). Sağlam "fixed bg + scroll + klavye" muhtemelen `visualViewport` JS API gerektirir.
- **Supabase config (kod değil):** Şifre sıfırlama için Auth → URL Configuration → Redirect URLs'e `https://paraner.com/sifre-sifirla` (+ dev `http://localhost:3137/sifre-sifirla`) eklenmeli, yoksa link reddedilir.
- **`FAREWELL_HOOK_SECRET`** Supabase Secrets'ta + DB function gövdesinde; repo'da YOK (placeholder).
- **Canlı göz kontrolü bekleyenler:** yalnız mobil↔web ÇAPRAZ SENKRON (Cüzdanım, hesap kartları, işlemler, özel kategoriler); onboarding tam akış (panel-içi); Google One Tap (gerçek Gmail oturumuyla). Kod tarafı doğrulandı.
- **Eski/ölü asset'ler (temizlenebilir):** `public/paraner-auth-bg.mp4/.jpg`, `paraner-cube.mp4/.jpg` (artık referans yok). `public/auth-bg.webp` = resend.com/signup görseli (Mehmet verdi) → lansmanda telifsiz muadille değiştirilebilir.
- **PANEL TEST HESABI (kalıcı):** `admin@paraner.com` — canlıda oturum gerektiren doğrulama/ölçüm bu hesapla yapılır. **Şifre repoya YAZILMAZ** (bu repo herkese açık). ⚠️ Headless giriş her seferinde **yeni cihaz bildirimi maili** tetikler → puppeteer'da **kalıcı `userDataDir`** kullan. ⚠️ Supabase sızmış-şifre koruması açık. ⚠️ Şifre HER ZAMAN oturumdaki hesaba kurulur (modal hedef e-postayı yazıyor).
- **Panel hızı kuralları (yeni modülde ZORUNLU, CLAUDE.md'de de var):** her mutasyondan sonra `router.refresh()`; server page sorguları `Promise.all`; listelerde `.limit()`. ⚠️ Prefetch DEV'de kapalıdır → hız yalnız prod'da ölçülür.

---

## Bu hafta (2026-07-29 →)

### 05.08 (4) — Yapı günü: iş dosyaları repodan çıktı, repo GİZLENDİ

**Kod değişikliği yok.** Bu repoya düşen kısım:

**🔴 Repo gizlendi → Vercel kırıldı → geri açıldı.** 66 gündür herkese açıkmış. Özel bir sebebi yokmuş —
oluşturulurken varsayılan public seçilmiş. Kontroller:
- **538 commit'lik tüm geçmiş tarandı** → `.env` hiç commit edilmemiş; Supabase/Stripe/Resend/
  Google/GitHub anahtarı, service_role, düz metin şifre **hiçbiri yok**. ✅
- Ama GitHub trafiği: son 14 günde **0 sayfa görüntüleme, 682 klonlama / 362 farklı kaynak**
  → ayrım gözetmeyen botlar. Yani repo kopyalanmış durumda.
- O pencerede repoda duran iş dosyaları: `RAKIP-defteran` (17 gün) · `influencer-outreach`
  (17 gün) · `SOGUK-MAIL-PLANI` (8 gün) · `RAKIP-bizimhesap` (1 gün). Anahtar sızmadığı için
  güvenlik açığı yok; kayıp yalnız iş bilgisi.
- **Vercel etkilenmedi:** bağlantı GitHub App üzerinden (`app_slug: vercel`), görünürlükten
  bağımsız. Gizledikten sonra üç domen de canlı: paraner.com / app. / admin. → HTTP 200.
  Kodda `raw.githubusercontent` gibi açık-URL bağımlılığı yok (kontrol edildi).


**⚠️ GİZLEME GERİ ALINDI — Vercel Hobby engeli (aynı gün).** Repo private yapıldıktan sonraki
ilk push **deploy edilemedi**: Vercel Hobby planı **organizasyona ait ÖZEL** repolardan deploy
etmiyor. Vercel *"Failed deployment for paraner"* maili gönderdi. Repo tekrar public yapıldı,
deploy düzeldi. Kanıt (GitHub commit status): `ab4191b` = **failure** (gizliyken) ·
`96163a6` = **success** (açıkken). Kaçan tek deploy `ab4191b` idi ve içeriği yalnız yorum
satırıydı → **canlı sitede eksik yok.**
⚠️ **Ders:** "site HTTP 200 dönüyor" deploy'un çalıştığının kanıtı DEĞİL — eski deploy yayında
kalmaya devam ediyor. Doğrulama **commit status**'ünden yapılır. (İlk kontrolde bu hata yapıldı.)
Kalıcı çözüm GOREVLER → LANSMAN ÖNCESİ: repoyu kişisel hesaba taşı / Vercel Pro / elle deploy.

**Bu repodan çıkarılanlar** → `~/Developer/Paraner/` kök klasörüne (git dışı):
`docs/RAKIP-bizimhesap.md` + `docs/RAKIP-defteran.md` → `rakipler/` ·
`docs/SOGUK-MAIL-PLANI.md` + `docs/influencer-outreach.md` → `pazarlama/`.
`docs/` altında kalanlar bilinçli olarak web'in KENDİ teknik dokümanları.

**CLAUDE.md** başına "ne nerede" tablosu eklendi: taşınan dosyalar nereye gitti, bu repoya
bir daha ne konulmaz. **DAILY_LOG** 7 günlük arşivleme sistemine geçti (`Son arşivleme`
tarihi + kök arşiv); 25–28.07 girdileri arşive alındı, 728 → 391 satır.

**Yol atıfları güncellendi:** `paraner-app` (RN) → `paraner-rn-referans` · mobil Swift artık
`paraner-app` · şema/edge function `paraner-rn-referans/supabase/` → **`paraner-backend/`**.

### 04.08 (3) — Mobilde hazır 4 sayfa web'e taşındı
Mehmet: *"telefonda hazır olanı taşıyalım, sayfalar web'de de hazır olsun; düzenlemeleri sonra."*
Dördü de mevcut tabloları kullanıyor, **DB şemasına dokunulmadı.**
- **`/panel/doviz-altin`** (mobil `exchange.tsx`) — döviz + altın listesi, alış/satış, günlük
  değişim %, **çevirici** (iki yönlü). Altyapı zaten vardı: `lib/market.ts` + `lib/assets.ts`.
  Fiyat SUNUCUDA çekiliyor, Next fetch 5 dk cache. Altın görselleri `public/gold/`.
- **`/panel/kdv-beyanname`** (mobil `vat-declaration.tsx`) — ay ay, %1/%10/%20 kovalarına ayrılmış
  hesaplanan/indirilecek KDV + net + ödenecek, "Özeti Kopyala". Kova mantığı mobille birebir.
- **`/panel/sgk`** (mobil `sgk-declarations.tsx`) — çalışan sayısı + toplam maaştan prim tahmini
  (işçi %14, işveren %20,5) + 6 maddelik bildirge takvimi (SGK, muhtasar, Ba/Bs, geçici vergi).
- **`/panel/pdf-rapor`** (mobil `pdf-report.tsx`) — aylık özet: gelir/gider/net, gider dağılımı,
  faturalar, işlemler. Mobil expo-print kullanıyor; **web'de tarayıcıdan yazdır → PDF kaydet**
  (ek bağımlılık YOK). `@media print` kabuğu gizliyor, yalnız `.pr-sheet` basılıyor.
- Menü: `businessMenu.tsx`'te 3 pasif satır aktifleşti + **KDV Beyanname Özeti YENİ satır** olarak
  eklendi (web'de menüde hiç yoktu). "SGK Bildirgeleri" → "SGK & Bildirgeler".
- ⚠️ **CLAUDE.md kural 4 GÜNCEL DEĞİL:** `CORE_PREFETCH` listesi 23.07'de canlı ölçümle
  KALDIRILMIŞ (`Sidebar.tsx:43-58` — peşin ısıtma sayfayı 4× yavaşlatıyormuş). Artık tüm linkler
  `auto` + `unstable_dynamicOnHover`. Yeni sayfalar bunu otomatik miras alıyor, **eklenecek liste yok.**
  CLAUDE.md'deki madde düzeltilmeli (dokunmadım, karar Mehmet'in).
- ✅ `tsc --noEmit` temiz · `npm run build` başarılı, dört rota da çıktı.
- ✅ **CANLIDA GÖZLE DOĞRULANDI** (`c7e2942`, Chrome eklentisiyle, admin oturumu açık):
  dördü de açılıyor, **hiçbirinde 404 / boş ekran / konsol hatası YOK** (konsol izleme kendi
  sondajıyla sınandı → "hata yok" bulgusu aracın sessizliği değil).
  · **doviz-altin:** veri DOLU (USD 47,5439 · Gram altın 6.211,56), çevirici canlı — 100 → 4.754,39 TL,
    250 → 11.885,98 TL, kurla birebir tutarlı.
  · **kdv-beyanname:** ay okları çalışıyor (Ağustos→Temmuz), "28 Eylül — 55 gün kaldı" bandı doğru.
  · **sgk:** 6 bildirge, geri sayımlar 04.08'e göre doğru (Geçici Vergi 17 Ağustos → 13 gün).
  · **pdf-rapor:** DOLU veriyle sınandı; Temmuz'da 7 işlem, Net = Gelir − Gider birebir tutuyor,
    gider yüzdeleri %100'e tamamlanıyor. Çok para birimli ayda TRY/USD seçici beliriyor.
- ✅ **05.08 — üç eksik doğrulama da tamamlandı** (Mehmet: *"bunları dene, ne yapılması
  gerekiyorsa test et"*). Test verisi girildi, sınandı, **hepsi geri alındı**:
  · **KDV DOLU VERİYLE TUTTU:** 3 test faturası (1000@%20 satış, 1000@%10 satış, 500@%20 alış)
    → 11 değerin **hepsi** birebir: hesaplanan 300,00 · indirilecek 100,00 · **ödenecek 200,00** ·
    3 fatura. "Özeti Kopyala" çalıştı. Faturalar silindi, liste eski hâline döndü.
  · **YAZDIRMA ÇIKTISI TUTTU:** gerçek `@media print` kuralları uygulanıp ölçüldü — sol menü,
    üst bar ve para birimi seçici gizli; başlık/özet/tablolar tam; **kırpılma yok**
    (rapor 775px ≤ sayfa 1262px), son satır görünür.
  · **SGK GERÇEK MAAŞLA TUTTU** (düzeltmeden sonra): Temmuz'daki ₺122.258 ödeme üzerinden
    işçi ₺17.116,12 · işveren ₺25.062,89 · **toplam ₺42.179,01** — kuruş farkı yok.

### 05.08 — Canlı testte çıkan 4 hata düzeltildi (hepsi bu 4 sayfada, hepsi benim)
- 🔴 **DÜĞMELER ÇIPLAKTI** (Mehmet ekran görüntüsüyle bildirdi). Panelde düğme **iki sınıf**
  ister: `btn` (kutu biçimi: flex/padding/köşe/yazı) + `btn-primary`|`btn-ghost` (yalnız renk).
  `btn` yazılmayınca varsayılan tarayıcı düğmesi görünüyor. Dördü de düzeltildi;
  Döviz "Yenile" → Cüzdanım'daki `refresh-btn` ile aynı sınıfa alındı (aynı veriyi tazeliyorlar).
  **→ KALICI KURAL: yeni düğmede `className="btn btn-primary"` — `btn`'i ATLAMA.**
- 🔴 **SGK PRİMİ HERKESTE ₺0 GÖSTERİYORDU.** `employees.salary`'den hesaplıyordum ama o kolonu
  **yazan hiçbir arayüz yok** (ne web çalışan formu, ne mobil — mobilin `Employee` tipinde
  `salary` alanı bile yok). Kolon ölü → prim kalıcı 0. Test hesabında ₺122.258 gerçek ödeme
  varken ekran 0 diyordu. **Artık `salary_payments`'tan, SEÇİLİ AYA göre.** Ödeme yoksa
  açıklayıcı boş durum + Maaş Ödemeleri linki. ⚠️ **MOBİLDE AYNI HATA DURUYOR** → GOREVLER'e yazıldı.
- 🔴 **React #418 hydration hatası** (kdv-beyanname + sgk). "N gün kaldı" metnini hem sunucu
  hem istemci **kendi** `new Date()`'iyle hesaplıyordu → metinler uyuşmayınca React ağacı
  client'ta yeniden render ediliyordu. **Çözüm:** `lib/format.ts` → yeni **`bugunISO()`**;
  sunucu "bugün"ü prop olarak geçiyor, **client `new Date()` çağırmıyor**. Üç sayfada da uygulandı
  (pdf-rapor hata vermiyordu ama aynı latent risk vardı: gece yarısı / TZ farkı).
  **→ KALICI KURAL: tarihe bağlı metin üreten client bileşeninde `new Date()` YOK, sunucudan al.**
- 🔴 **Altın ikonları boş çıkıyordu** — `next/image` ile alan boş kaldı. Cüzdanım'daki
  `AssetIcon` zaten düz `<img>` kullanıyor → aynı desene geçildi.
- ✅ **Hepsi yeniden test edildi ve GEÇTİ:** üç sayfada **sıfır konsol mesajı** (izlemenin
  çalıştığı 3 ayrı sondajla kanıtlandı) · altın görselleri 5/5 yüklü (120×120), bayraklarla
  dikey merkezleri birebir çakışıyor · geri sayımlar 12/21/54 gün ve 05.08.2026 doğru ·
  dört sayfada taşma 0, sıfır boyutlu düğme 0.

### 05.08 (2) — TELEFON GENİŞLİĞİ testi (390px) + kalan iki bulgu
Mehmet'in *"mobil derken app mi, app.paraner.com'un telefon görünümü mü?"* sorusu bir boşluğu
açtı: yeni sayfalar yalnız geniş ekranda (2294px) test edilmişti. 390px'te tekrar bakıldı.
- ✅ **doviz-altin / kdv-beyanname / sgk → SORUNSUZ.** Üçünde de yatay kaydırma yok
  (`scrollW = 390`), taşan eleman 0. Çevirici satırı temiz şekilde 2 satıra düşüyor.
- ✅ **pdf-rapor tabloları TAŞMIYOR** (endişe edilen yerdi): Gider Dağılımı 296px,
  İşlemler 298px, hiçbir hücrede kırpılma yok. Sıkışık ama okunur.
- 🔴 **DÜZELTİLDİ — "Yazdır / PDF Kaydet" etiketi kesiliyordu:** düğme kutusu 135px, içerik
  155px → son harf kırpılıyordu ("…PDF Kayde"). Sebep `.btn`'deki `white-space: nowrap` +
  `overflow: hidden` — etiket sarmıyor, KESİLİYOR. ≤560px'te "/ PDF Kaydet" gizleniyor,
  düğme yalnız "Yazdır" oluyor (`.pr-print-uzun`).
  **→ KALICI DERS: `.btn` içindeki uzun etiket dar ekranda sarmaz, kesilir. Uzun etiketli
  başlık düğmesi yazarken dar ekran için kısa varyant düşün.**
  ✅ **Canlıda doğrulandı:** 390px → görünen metin "Yazdır", `85/85` (kesilmiyor), sağ kenar 348.
  1920px → "Yazdır / PDF Kaydet", `195/195`. Sınır 561px'te de tam etiket, kesilme yok.
  ⚠️ Yöntem notu: `resize_window` bu oturumda ETKİSİZ (başarılı döner, `innerWidth` 1920'de kalır)
  → telefon genişliği, sayfanın DOM+stilleri 390px'lik **aynı-origin iframe'e klonlanarak**
  ölçüldü (gerçek viewport 390 → `@media` kuralları gerçek telefon gibi değerlendi).
- 🔴 **AÇIK KALDI (benim işim değil, tüm paneli etkiliyor):** kaydırınca içerik `☰` ve `+`
  düğmelerinin altından geçiyor — ikisinin de arkası saydam, `.panel-topbar` sticky değil.
  GOREVLER'e yazıldı, Mehmet'in onayı bekleniyor.
- ⚠️ **Test yönteminin sınırı:** gerçek telefon değil, medya kuralları yeniden yazılarak
  390px simüle edildi. JS ile genişlik okuyan bileşenler hâlâ 1920 görüyor; dokunma hedefi
  boyutu, gerçek DPR ve mobil tarayıcı çubukları TEST EDİLMEDİ.

### 05.08 (3) — App tarafına devir
Mehmet SGK hatasını **kendi mobil oturumunda** düzeltecek; devir mesajı hazırlanıp verildi
(dosya/satır referanslarıyla: `sgk-declarations.tsx:68`, `employee-expenses.tsx handleAdd`,
`employees.salary` ölü kolon, web'in `salary_payments` çözümü). GOREVLER'deki mobil maddesi duruyor.
- ⚠️ **Test sırasında Mehmet'in sekmesi çalındı:** sekmeyi öne alma `osascript` döngüsü
  "app.paraner.com içeren HER sekme" diyordu → Mehmet'in kendi panel sekmesi de kapsama girdi,
  ekranı 2 saniyede bir zıpladı. **Bu testte döngüye zaten gerek yoktu** (gizli sekme yalnız
  animasyon ölçümünü bozar, DOM okumasını değil). Durduruldu, memory'ye ders yazıldı.
- Not: **Fatura Numaralama zaten web'de varmış** (`AyarlarClient.tsx:222`), yeniden yazılmadı.
  Fiş/Makbuz Tara taşınmadı (Parla beynine bağlı, ayrı iş).

### 04.08 (2) — Panel analizi + fikir listesi (`docs/PANEL-FIKIRLERI.md`)
Mehmet "genel olarak neler eklenebilir, gerekirse yeni bölüm de açalım" dedi. Kod değişmedi.
- 🔴 **BULGU: WEB, MOBİLİN GERİSİNDE.** `businessMenu.tsx` tepesindeki *"mobil ile birebir
  tutarlı"* yorumu **artık yanlış.** Web'de "Yakında" görünen 4 özellik mobilde ÇALIŞIYOR:
  `receipt-scan` (619 satır) · `exchange` (409) · `pdf-report` (295) · `sgk-declarations` (288).
  Web'de **menüde bile olmayan** 2 tanesi mobilde var: `vat-declaration` (316) ·
  `invoice-numbering` (195).
- 🔴 **Fatura formu:** web `FaturaFormu.tsx` **253 satır**, mobil `invoice-create.tsx` **1256**.
  Mobilde kalem editörü + 9 birim + vade tarihi + ödeme hesabı + PDF + vergi no doğrulama VAR,
  web'de hiçbiri yok.
- Web'in ince modülleri (mobil karşılığı ~3×): kar-zarar 171 · kdv-raporu 149 · nakit-akisi 120 ·
  vergi-takvimi 97. **Raporlar + Vergi bloğu web'de neredeyse taslak.**
- **Yeni bölüm önerileri:** 📅 Takvim & Hatırlatmalar (veri hazır, en ucuz) · 👥 Ekip & Yetkiler
  (DB kararı ister) · 📈 İşletme Sağlığı (Parla ile, rakipsiz) · 🧾 e-Dönüşüm · 🏬 Depo & Lojistik ·
  🏦 Banka & Tahsilat. **e-Ticaret'e girmeme önerisi** (rakibin ₺1.100'lük paketi tamamen o, devasa).
- ⚠️ Kendi taslağımı denetlerken `~/Developer/Paraner/rakipler/defteran.md`'nin 13.07 tablosundan devralınan 2 madde
  geçersiz çıktı: **CSV içe aktarım ZATEN VAR** (`parseCsv` + `AyarlarClient.tsx:1616`,
  müşteri+ürün, kolon eşleştirmeli) ve **döviz/altın altyapısı hazır** (`lib/market.ts` +
  `lib/assets.ts`). İkisi de kaynaktan düzeltildi, defteran dosyasındaki satır işaretlendi.
- Not: `businessMenu.tsx:1` yorumu ("mobil ile birebir") **güncellenmedi** — kod değişikliği
  istenmemişti; düzeltilecekse ayrı iş.

### 04.08 — Rakip analizi: Bizim Hesap (`~/Developer/Paraner/rakipler/bizimhesap.md`)
Mehmet yeni rakip buldu, 14 gün denemeye kayıt oldu. Kod değişikliği YOK, yalnız araştırma.
- **Profil:** 2015 kuruluşlu, 40-50 bin kullanıcı, **Finberg** (QNB Finansbank fintech kolu)
  yatırımlı. Tutar/tarih hiçbir yerde açıklanmamış — "büyük yatırım" iddiası **doğrulanamadı**.
- **Fiyat (ham HTML'den):** Temel ₺870+KDV/ay yıllık (₺10.440+KDV) · Tam ₺1.100+KDV/ay
  (₺13.200+KDV) · aylık ₺1.250/₺1.500. KDV dahil yıllık **₺12.528 / ₺15.840** = Paraşüt seviyesi.
  e-Fatura kontörü ayrı ve **açıkça yayınlanmış** (200→₺490 … 100.000→₺99.000).
- **Bizden fazlası 15 madde** — en ağırları: e-Fatura ailesi, **19 banka entegrasyonu**,
  80+ e-ticaret entegrasyonu, saha satış, üretim/reçete, çoklu depo+varyant, sınırsız
  kullanıcı+yetkilendirme, proje, şube, kredi takibi, POS, BA-BS, Excel import.
- 🔴 **En keskin açıkları KÂR-ZARAR RAPORU YOK** — 30+ raporları var, kâr-zarar yok; mağaza
  yorumlarında **5 yıldır** isteniyor, firma cevabı *"öyle bir özelliğimiz yok"*. **Bizde canlı.**
- **Mobil terk edilmiş:** iOS+Android ikisi de v1.0.168, iOS yayın tarihi 07.10.2024 → **~22 ay**.
  Play **3,22** (922 oy, 100 B+ indirme) · iOS **3,89** (257 oy).
- **Yorum analizi** (549 Play + 171 iOS, API'den çekildi): 1★ payı %17,5; yazılı yorum ortalaması
  3,96 ama genel puan 3,22 → **sessiz kitle daha kızgın**. 2025+ ortalaması **2,63**, yorum hacmi
  2017'de 112 → 2026'da 9. Şikâyet temaları: fiyat/zam %32 · destek %17 · donma %16 ·
  geliştirilmiyor %13 · oturum %10. Övgü: kapsam/fiyat oranı, basitlik, **web paneli** (mobil değil).
- **AI'ya kapalılar:** robots.txt'te ClaudeBot/GPTBot/Google-Extended hepsi `Disallow` +
  `ai-train=no`. Defteran'ın tam tersi → AI cevap motorlarında bedava boşluk bize kalıyor.
- **Düzeltilen eski kayıtlar:** `~/Developer/Paraner/rakipler/defteran.md` fiyat satırındaki "Bizim Hesap ~₺10.350"
  güncel değildi · `~/Developer/Paraner/rakipler/ozellik-arastirmasi.md`'deki "BizMu — ucuz, mikro işletme" satırı
  **yanlıştı** (ne ucuz ne mikro), ikisi de kaynaktan düzeltildi.
- ✅ **PANEL CANLI GEZİLDİ** (Mehmet'in deneme hesabıyla, salt-okunur). Chrome eklentisi 4 denemede
  de bağlanmadı (sebep: **eklentinin Claude hesabı** oturumunkinden farklı — memory'ye yazıldı).
  Çözüm: ayrı bir Chrome örneği + DevTools Protocol; Mehmet giriş yaptı, gezinmeyi ben yaptım.
  - **Sol menü tam ağacı** (53 satır + gerçek URL'ler) dokümana alındı.
  - 🔴 **KÂR-ZARAR YOK — kesin teyit:** 4 rapor sayfası da açıldı, **29 raporun** hiçbirinde
    "kâr/karlılık" yok. En yakını "GELİR GİDER DURUMU" (kâr hesaplamıyor). Ana ekranda da yok.
  - Doğrulananlar: varyant, çoklu depo, Excel'den ürün yükleme, çok kullanıcı, proje bazlı takip,
    e-Fatura entegratörleri (eLogo/QNB eSolutions/Trendyol e-Faturam/Uyumsoft), bizimmuhasebeci.com
    (müşavir e-postayla davet, banka hareketlerini de görüyor), bizimsiparis.com (müşteri SMS-OTP).
  - **8 katmanlı vade takvimi** (üst barda rozetli) — bizim `vade`+`vergi-takvimi`den zengin, ucuz kopya.
  - 🔴 **Teknoloji tabanı eski:** ASP.NET WebForms (`bhlogin.aspx`, `__VIEWSTATE`) +
    **jQuery 1.11.1 (2014)** + Bootstrap 3 + Modernizr 2.8.3, React/Vue yok. Footer `2014, 2025`.
    → "yavaş", "sistem kapanıyor", "sürekli login" şikâyetleri bununla birebir uyumlu; mobilin
    güncellenmemesi de muhtemelen tercih değil **maliyet**. Bizim zaman avantajımız burada.
  - `Ekran Kilidi` bilerek açılmadı (oturumu kilitlerdi); kontör göstergesi bulunamadı
    (hesap henüz e-Fatura mükellefi değil).

### 01.08 (3) — Parla paneli: 16 düzeltme, hepsi CANLI ÖLÇÜMLE bulundu
Aynı gün, `270b2dc`'den sonra Mehmet canlıda gözle bakıp tek tek bildirdi; her biri
Chrome eklentisiyle ölçülüp düzeltildi. **Son hâl:**
- **Kabuk GERİ ALINDI** (`40e65a3`): üst bar tam genişlik + `fixed` denendi, sol menüyü
  73px aşağı itip barın SOLUNU boş şerit bırakıyordu (logo/hesap değiştirici aşağı
  kayıyordu). Mehmet: "sol panel tam olsun eskisi gibi". Kabuk eskisi gibi; Shopify
  düzenine geçen TEK ŞEY sağdaki Parla paneli.
- **Panel geometrisi:** sağ+alt kenara yapışık değil → sol köşeler 22px yuvarlak, altta
  12px boşluk (sol menüyle aynı hizada), sağ kenar pencereyle birleşik ve köşesiz,
  çizgi üst+sol+altta %28 beyaz.
- **`--parla-nav-w` = menünün SAĞ KENARI + daraltma düğmesi** (`.sidebar-toggle`
  `right:-14px` ile 14px dışarı taşıyor). Genişletilmiş panel menüden 12px ayrık.
- **Yazı alanı `--parla-max-w` (600) ile sınırlı, ORTALI — `.genis`E BAĞLI DEĞİL.**
  Sınıfa bağlıyken daraltmada bir karede 600→1700 fırlıyordu. Mesaj sütunu da 600
  (genişte satır başına 239 karakter ölçülmüştü, okunmaz).
- **Alt boşluktaki sızıntı:** panel içeriğin üstüne bindiğinde (geniş mod / ≤1199)
  içerik itilmediği için sayfa panelin ARKASINDA kalıyor, 12px şeritten sızıyordu.
  `.parla-drawer::after` opak katman (`z-index:-1`, 12px aşağı/sola taşar) + katman
  `pointer-events: auto` (görsel kapalıydı ama TIKLAMA sızıyordu, ölçümle yakalandı).
- 🔴 **KAPANIŞ ANİMASYONU HİÇ OYNAMIYORMUŞ:** kutu `open || kapaniyor` ile çiziliyordu;
  `open` false olan RENDER'da `kapaniyor` hâlâ false → kutu bir kare SÖKÜLÜP kapalı
  konumda yeniden takılıyor, tarayıcıda "önceki konum" kalmıyordu. Artık bir kez
  açıldıktan sonra hiç sökülmez (`hicAcildi`), yalnız `kapali` sınıfıyla kayar.
- **Sol menüyle eşzamanlılık:** menü 0.26s'de daralırken panel kendi 0.25s geçişiyle
  HAREKETLİ HEDEFİ kovalıyordu. Menü oynarken panelin geçişi kapanıyor
  (`body.parla-nav-oynuyor`, son ölçümden 320ms sonra kalkar). Ölçülen sapma ≤0.5px.
- **Telefonda arkadaki sayfa kayıyordu:** `body{overflow:hidden}` işe yaramıyor, bu
  sayfada kaydıran öğe `html` → `html:has(body.parla-open)` eklendi.
- **Klavye:** odak panele girer, Tab içeride döner, kapanınca açan düğmeye döner.
  Sürüklerken Escape önce SÜRÜKLEMEYİ iptal eder (eskiden `parla-dragging` asılı kalıyordu).
- **Yazı alanı otomatik büyüme kodu HİÇ YAZILMAMIŞTI** (CSS'te niyet vardı) — eklendi.

### 01.08 (4) — Sohbet akışı ChatGPT'ye göre hizalandı (yazı alanı, solma, "en alta in")
Mehmet ChatGPT'yi referans aldı: **"onlar analiz etmiştir, yeni bir şey üretmemize gerek yok."**
- ⚠️ **AKIŞ SIRASINDA TAKİP YOK — DENENDİ, GERİ ALINDI** (`1689c57` → `8c3a8fe`).
  Kısa süre "cevap ekranı aşınca dibe hizala" eklenmişti. ChatGPT ölçüldü: **takip
  ETMİYOR** — `scrollTop` akış boyunca 0'da sabit kaldı, `scrollHeight` 823 → 11438.
  Yani ~10.500px ekran dışına aktı, hiç kaydırmadı. **Buraya takip EKLEME.**
- **Yazı alanı listenin ÜSTÜNDE yüzüyor** (`ceff7fa`): eskiden flex kardeşti, liste
  kutunun üstünde bitiyordu. Artık `position: absolute`, liste `padding-bottom:
  var(--parla-composer-h) + 10` alıyor → metin altına kayabiliyor.
  ⚠️ Yükseklik ResizeObserver'la ölçülüp yazılıyor (kutu 34→120px büyüyebiliyor).
- ⚠️ **ÜÇ KEZ ÜST ÜSTE YANLIŞ YAPILDI, üçü de Mehmet'in ekran görüntüsüyle çıktı:**
  ① kutunun zemini `--card-2` = **%6 saydam beyaz**du; metnin üstüne yüzdürülünce
     arkadaki cevap içinden okunmaya başladı → `#202020` (aynı tonun OPAK karşılığı).
  ② düzeltirken banda opak zemin verildi → **solma degradesini tamamen örttü**,
     "solma hiç olmamış" gibi göründü → bandın zemini kaldırıldı, solmayı `::after` yapar.
  ③ solma **kutunun ÜSTÜNE** konmuştu; ChatGPT'de katman kutunun TAM ÜSTÜNDEN başlayıp
     AŞAĞI opaklaşıyor → `inset: 10px 0 0 0` (10 = bandın `padding-top`u).
     Ölçüm: `inset: 0` iken kutu kenarında alfa 0.27, metin %73 parlaklığa düşüyordu.
- **"En alta in" düğmesi eklendi** (`8b64045`), ChatGPT ölçüleriyle: 32×32, tam yuvarlak,
  `rgba(32,32,32,0.65)`, 1px %15 beyaz kenarlık, `blur(2px)`, gölge YOK, alt kenarı yazı
  alanının **24px** üstünde, ortalı. ⚠️ **EŞİK 140px** — sürpriz çıktı: dipten ayrılır
  ayrılmaz DEĞİL (1/5/20/60px'te görünmüyor; 130 yok, 140 var). Görünürlük hem `scroll`
  hem `ResizeObserver`dan besleniyor: cevap yazılırken yükseklik değişir ama kaydırma
  olayı GELMEZ.
- **Snap kaydırması düzeltildi** (`10b4323`, ölçümle doğrulandı): boşluk DOM'a yansımadan
  kaydırılıyordu, tarayıcı hedefi kırpıyordu. Artık bağımlılıksız `useLayoutEffect`
  boşluk yerleştikten sonra kaydırıyor. Ölçüm: `scrollTop` 441 → 4177, mesaj tepeden 12px.
- ⚠️ **`mask-image` KULLANILMADI** (ChatGPT kullanıyor): maske+filtre Safari'de
  görünmezlik yapabiliyor (auth ekranında yaşandı) → aynı görüntü düz degradeyle kuruldu.
- ⚠️ **Koyu bant kaydırma çubuğunu örtüyordu** (`802080e`): bant panelin tamamını
  kaplıyordu, çubuk listenin sağ kenarında olduğu için alt kısmı bandın altında
  kalıyordu → `right: 10px` + `.parla-list { scrollbar-gutter: stable }` (oluk her zaman
  ayrılsın ki bandın bittiği yer çubuğun başladığı yerle tutsun).
- ⚠️ **Düğme 34px yukarıdaydı, 24 olmalıydı:** konum `--parla-composer-h` (BANDIN
  yüksekliği) üzerinden veriliyordu; bandın 10px üst dolgusu olduğu için kutunun tepesi
  banttan 10px içeride → `+24px` yerine `+14px`. ChatGPT: düğmenin ALT kenarı KUTUNUN
  üstünden 24px.
- 🟡 Bilinçli fark: kutunun altındaki şerit bizde **12px**, ChatGPT'de 24px (panel dar).
- **Ders (kalıcı):** solma işinde üst üste üç kez yanlış yapıldı ve üçünü de Mehmet
  ekran görüntüsüyle yakaladı. Ortak hata: ölçüm rakamı DOĞRU alınıp YANLIŞ YERE
  uygulandı. Ölçüm bunu yakalamıyor — çünkü ölçülen şey zaten kendi koyduğun yer.
  **Yeni bir katman/geometri kurarken "bu ölçü neyin neresinden?" sorusunu açıkça yaz**
  (bandın mı kutunun mu, üstünden mi altından mı) — buradaki hataların hepsi bu soruyu
  atlamaktan çıktı.

⚠️ **KAYDIRMA ÇUBUĞU TUZAĞI (kalıcı ders):** Chrome'da bir öğede `scrollbar-width` /
`scrollbar-color` tanımlıysa o öğenin **BÜTÜN `::-webkit-scrollbar` tarifi yok sayılır.**
`* { scrollbar-width: thin }` yüzünden 24.07'de yazılan ince çubuk tarifi **bir hafta
boyunca hiç çalışmamış**. Standart özellikler artık yalnız
`@supports not selector(::-webkit-scrollbar)` içinde (Shopify de aynı yöntemi kullanıyor).
Aynı tuzak `.cat-list` ve `.parla-kat-cipler`de de vardı. **Yeni yere `scrollbar-width`
yazarken bunu hatırla.** Çubuk şekli Shopify'dan: oluk 10px + thumb'a 3px şeffaf kenarlık
+ `background-clip: content-box` → görünen hap 4px, track kuralı yok.

✅ **PARLA BEYNİ (`~/Developer/Paraner/parla/`, commit `e1016b0`) — DÜZELTİLDİ + YAYINDA + CANLIDA DOĞRULANDI**
NEYDİ: "sil" komutları YENİ GİDER olarak ayrıştırılıyordu. `"1) 350 TL…"` → −1,00 ₺
taslak (liste işaretini tutar sanıyordu); `"Market isimli 350 TL'lik gideri sil"` →
−350,00 ₺ taslak. Tek çip dokunuşuyla kullanıcı istediğinin TERSİNİ kaydediyordu.
İKİ AYRI HATA vardı:
1. **Sıralama:** `routeMessage` katmanları `ekle → hedef → SİL → sorgu` sırasıyla
   deniyordu. Rakam taşıyan her silme isteği daha ilk katmanda yakalanıyor, silme
   katmanına sıra HİÇ gelmiyordu. Silme kodu zaten vardı ve çalışıyordu.
   → Artık açık silme niyeti varsa ÖNCE silme denenir; ekleme/hedef ATLANIR. Bulunamazsa
   AI'ya bırakılır, ekleme katmanına DÜŞÜRÜLMEZ. ⚠️ Niyet tespiti kelime sınırıyla
   (`includes("sil")` "silgi"/"silah"ı da yakalardı).
2. **İsme göre arama TERSTİ:** `title.includes(searchText)` — işlem ADININ kullanıcının
   cümlesinin TAMAMINI içermesi bekleniyordu → "dun kahve isimli gideri sil" hiç
   bulunamıyordu. Yön çevrildi: işlem adının KELİMELERİ cümlede geçiyor mu?
   ⚠️ Aynı derecede birden fazla eşleşme → SİLMEZ, listeler ve SORAR (silme geri alınamaz).
**Deploy:** `supabase functions deploy ai-chat --project-ref oqhonmmbcqrkcaoijgnb`
(sağlık kontrolü 401 döndü = doğru). **Canlı test PASS:** "Deneme kahvesi isimli 80 TL
lik gideri sil" → *"Silindi: Deneme kahvesi — −80,00 ₺"*, çip yok, taslak yok, yeni
kayıt oluşmadı, işlem sayısı testten önceki hâline döndü.
⚠️ Beyin MOBİLLE ORTAK — buradaki her deploy telefonu da etkiler.

🟡 **Parla beyninde KALAN (küçük, açık):** işlem adı "Dun kahve" (tarih kelimesi ada
sızıyor, üstelik ASCII "Dun"); kayıttan hemen sonra "−0,00 ₺" özeti (işlem temmuza
düştü, özet ağustos → başarısız gibi okunuyor).

✅ **KAYDIRMA HATASI (commit `10b4323`) — DÜZELTİLDİ, canlı ölçüm bekliyor.**
NEYDİ: uzun cevaptan sonra yeni mesaj görünüme kaydırılmıyordu (`scrollTop` 2061'de
takılı → kullanıcı Parla'nın cevap vermediğini sanıyordu).
SEBEP ZAMANLAMA: `snapUygula` boşluk yüksekliğini state ile güncelleyip HEMEN `rAF`
içinde kaydırıyordu — boşluk EKRANA YERLEŞMEDEN. Kaydırılabilir alan kısa kalıyor,
tarayıcı hedefi kırpıyor, liste yerinde kalıyordu; sonraki karede boşluk büyüyor ama
kaydırmayı tekrar tetikleyen yok (`kaydirildiRef` true). Kısa geçmişte hedef zaten
sınırın içinde olduğu için tekrarlamıyordu.
ÇÖZÜM: kaydırma işaretlenir (`kaydirBekliyorRef`), bağımlılıksız bir `useLayoutEffect`
boşluk DOM'a yansıdıktan SONRAKİ ilk render'da kaydırır.
🟡 Kalan küçük: kısa cevaptan sonra ~239px ölü kaydırma alanı (snap boşluğu tasarım
gereği duruyor — rahatsız ederse ayrıca bakılır).

✅ **TEST KAYITLARI TEMİZLENDİ:** `Market −₺350,00` (01.08) ve `Dun kahve −₺120,00`
(31.07) silindi; "Bu Ay Gider" ₺850 → ₺500. ⚠️ Aynı gün/aynı ad/aynı kategoride
**Mehmet'in kendi `Market −₺500,00`** kaydı vardı — ad+tutar+tarih birlikte doğrulanarak
korundu. (Silme her zaman böyle yapılmalı, ad tek başına yetmez.)

### 01.08 (2) — Kabuk + Parla paneli Shopify Sidekick düzenine geçirildi (commit 270b2dc)
Mehmet kararı (seçenek sunuldu, en büyüğünü seçti): **"kabuğun tamamı Shopify gibi olsun"**.
Shopify Sidekick **canlı ölçüldü** (Claude Chrome eklentisi, `admin.shopify.com/orders`).
- **Kabuk:** üst bar tam genişlik + `position: fixed` (z-index 40), sol menü kenara yapışık
  (margin/yuvarlak köşe/gölge kalktı). ⚠️ Telefon (≤760px) HARİÇ — orada menü çekmece,
  sayfa pencereyle kayıyor, sabit bar içeriği örterdi.
- **Parla:** iki katman (`.parla-drawer` konum / `.parla-panel` zemin), sağ+alt kenara sıfır
  boşluk, sadece üst iki köşe yuvarlak. Varsayılan 400px, sol kenardan **sürüklenebilir
  300–600** (kademe yok, canlı takip), **genişlet** düğmesi (100vw − sol menü), genişlik
  `localStorage: paraner-parla-panel`, kapanış sağa kayma (0.25s).
- **4 kademe:** ≥1200 iter · 1040–1199 kenara yapışık biner (**iki çubuk sorunu BURADA
  kapandı** — panel sayfa çubuğunu örtüyor) · 768–1039 356px yüzen kart · ≤767 tam ekran.
- ⚠️ **`--panel-topbar-h` 71 → 73px:** gerçek yükseklik 73 (16+40+16+1). Bar akıştayken
  zararsızdı; sabitlenince içeriğin üst 2px'i barın altında kalıyordu (ölçüldü).
  `.tx-drawer` bilerek 83px'te bırakıldı — detay çekmecesi oynamasın diye.
- ⚠️ **Seçicilerde `.panel-shell` ön eki ŞART:** blok dosyada temel tanımlardan ÖNCE
  geliyor, ön eksiz aynı özgüllükte kalıp SONRAKİ tanım tarafından eziliyor (denendi).
- **Eski "padding değil margin" dersi DÜZELTİLDİ:** Shopify'ın kendisi `padding-inline-end`
  kullanıyor; belirleyici olan **kaydıran kutunun daralması**. Bizde en dıştaki kutu
  kaydırdığı için `margin` doğru yol — ama yeni kabukta kural bu hâliyle uygulanmalı.
- **Değişmedi:** yazı alanı (Mehmet), İşlemler/Faturalar detay çekmecesi (408px, ayrı
  kurala alındı), admin kabuğu, DB/edge/SEO, mobil (orada Parla tam ekran sayfa).
- **Ölçüldü (yerel prod, 1400px):** üst bar 0–1400 · panel sağ kenarı = innerWidth ·
  içerik `margin-right: 404` · sürükleme max 600 / min 300 · 1100'de margin 0 + yapışık ·
  900'de 356px 4px boşluklu · 700'de tam ekran · yenilemeden sonra genişlik korundu.
- 🔴 **DOĞRULANMADI (bir sonraki turda):** sol menünün yeni hâli + "genişlet"in menü
  kenarına oturması — yerel oturumda profil yoktu, sol menü render edilmiyordu.
  Mehmet canlıda baktı, **"gözüme çarpan şeyler var"** dedi ama listeyi vermeden limiti
  doldu → **ilk iş onun gördüklerini sor.**
- ✅ **Chrome köprüsü ARTIK ÇALIŞIYOR** (dünkü "bağlanamadı" notu geçersiz): `claude --chrome`
  + Claude eklentisi. Kullanım: `cd /tmp && claude --chrome --allowedTools "mcp__claude-in-chrome" -p '…'`
  ⚠️ Bu VS Code oturumunda `/chrome` YOK; alt oturum açarak kullanılıyor.
  Mehmet eklentiyi **admin@paraner.com profiline de kurdu** → panel oturumlu ölçüm oradan.

### 01.08 — Sağdan çekmece açılınca KAYDIRMA ÇUBUĞU da sola geliyor
Mehmet: "Parla açılınca scroll çubukları karmaşık gözüküyor; sayfanın scroll'u sola
kayarak sağdan Parla çıksın" (+ Shopify Sidekick ekran görüntüleri).

**Sebep — kayma SAHTEYDİ:** `.panel-content`'e `padding-right: 408px` veriliyordu. Yazılar
sola kayıyor ama **kutu pencerenin sağ kenarında kalıyor**; kaydırma çubuğu her zaman
kutunun kenarına oturduğu için çubuk da orada kalıyordu. Canlıda ölçüldü (1600px):
sayfa çubuğu **x=1600**, Parla'nın kendi çubuğu **x=1587** → sağ kenarda **13px arayla iki
çubuk**, üstelik sayfa çubuğu kaydırdığı yazılardan 400px uzakta.

**Shopify ne yapıyor (ekran görüntülerinden):** chat yüzen kutu değil, **gerçek üçüncü
sütun**. Üst bar tam genişlikte kalıyor; altındaki alan sol menü · içerik · chat diye
bölünüyor. İçerik sütunu fiziksel olarak daraldığı için çubuğu da onunla sola geliyor;
sığmayan tablo sütunun İÇİNDE yatay kayıyor (chat açıkken sütunlar kırpılmış + tablonun
altında yatay çubuk çıkmış).

**Çözüm:** iç boşluk yerine **kutunun kendisi daralıyor** → `margin-right: 408px`
(= çekmece 384 + sağ boşluk 12 + ara boşluk 12). Tek CSS bloğu; hiçbir sayfanın kodu
değişmedi. İşlemler/Faturalar detay çekmecesi de aynı kurala `:has(.tx-area.shifted)` ile
bağlandı (o bileşenlere dokunulmadı). ⚠️ `.panel-content`'ten `width: 100%` KALKTI —
`width:100%` kap genişliğine kilitlenip margin'i yok sayıyor, kutu taşıyordu; dikey
flex'te `stretch` zaten tam genişlik veriyor.
- ⚠️ **Admin kabuğu ayrı bırakıldı:** orada kaydırma pencerenin kendisinde, çubuk
  taşınamaz → `.admin-content .tx-area.shifted` eski iç-boşluk yöntemini sürdürüyor
  (ölçülerek teyit edildi: açılınca hâlâ `padding-right: 408px`).
- **Ölçüm (yerel prod build, test hesabı):** 1600 ve 1280px'te içerik sağ kenarı çekmecenin
  tam **12px** solunda; iki çubuk arası 13px → **395px** (her biri kendi sütununda).
  **30 panel sayfası Parla açıkken tarandı: 30/30 yatay taşma 0px.**
- ⚠️ **≤1040px'te DEĞİŞMEDİ** (bilinçli, eski karar): yer olmadığı için çekmece içeriğin
  ÜSTÜNDE duruyor, sayfa kutusu daralmıyor → orada iki çubuk hâlâ 13px arayla. Düzeltmek
  istenirse o aralıkta çekmecenin tam genişliğe çıkması ya da sayfa kaydırmasının
  kilitlenmesi gerekir (davranış değişikliği, Mehmet kararı).
- **Ders (kalıcı):** sağdan panel açılınca içeriği kaydırmak için **kaydırma kutusunun
  kendisini daralt** (`margin`), içine boşluk koyma (`padding`) — yoksa çubuk içerikten
  kopar. Yeni bir sağ panel eklenirse aynı kural.
- ⚠️ Chrome 136+ **varsayılan profilde uzaktan hata ayıklamayı engelliyor** → çalışan
  Chrome'a bağlanıp Shopify'ı canlı incelemek mümkün olmadı (profil kopyalama da güvenlik
  filtresine takıldı, doğrusu bu). Shopify tarafı ekran görüntülerinden okundu.

