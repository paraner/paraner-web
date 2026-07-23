# DAILY LOG — paraner-web

> Özet günlük. Eski tasarım iterasyonları (auth küp v1-v6, auth deneme turları, açılış-hızı denemeleri) tek bloklara indirildi. Güncel durum + hâlâ geçerli ⚠️ uyarılar/dersler korunur. Tam ayrıntı için git geçmişi.

---

## ⚠️ Hâlâ geçerli uyarılar / config / bekleyen testler

- **iOS mobil auth dersleri** (mobil auth'a tekrar dokunulursa, adım adım + Mehmet onayıyla): `background-attachment:fixed` iOS'ta BOZUK; sabit bg için `position:fixed` katman ama o da klavyeyle yatay kayma yapar; `dvh` klavyede değişken → `svh` daha stabil; input `font-size<16px` → odakta zoom; CSS `mask`+`filter` Safari'de görünmezlik (bilinen bug). Sağlam "fixed bg + scroll + klavye" muhtemelen `visualViewport` JS API gerektirir.
- **Supabase config (kod değil):** Şifre sıfırlama için Auth → URL Configuration → Redirect URLs'e `https://paraner.com/sifre-sifirla` (+ dev `http://localhost:3137/sifre-sifirla`) eklenmeli, yoksa link reddedilir.
- **`FAREWELL_HOOK_SECRET`** Supabase Secrets'ta + DB function gövdesinde; repo'da YOK (placeholder).
- **Canlı göz kontrolü bekleyenler:** yalnız mobil↔web ÇAPRAZ SENKRON (Cüzdanım, hesap kartları, işlemler, özel kategoriler); onboarding tam akış (panel-içi); Google One Tap (gerçek Gmail oturumuyla). Kod tarafı doğrulandı. *(Web/panel görsel teyitleri 2026-07-18'de tamamlandı ve listeden silindi.)*
- **Eski/ölü asset'ler (temizlenebilir):** `public/paraner-auth-bg.mp4/.jpg`, `paraner-cube.mp4/.jpg` (artık referans yok). `public/auth-bg.webp` = resend.com/signup görseli (Mehmet verdi) → lansmanda telifsiz muadille değiştirilebilir.
- **PANEL TEST HESABI (kalıcı):** `admin@paraner.com` — canlıda oturum gerektiren doğrulama/ölçüm bu hesapla yapılır. **Şifre repoya YAZILMAZ** (bu repo herkese açık); şifre Mehmet'te + Claude'un yerel hafızasında. ⚠️ Headless giriş her seferinde **yeni cihaz bildirimi maili** tetikler → puppeteer'da **kalıcı `userDataDir`** kullan. ⚠️ Supabase sızmış-şifre koruması açık (`1234567890` reddedilir). ⚠️ Şifre HER ZAMAN oturumdaki hesaba kurulur (Mehmet farkında olmadan başka hesabına şifre koydu → modal artık hedef e-postayı yazıyor).
- **Panel hızı kuralları (yeni modülde ZORUNLU, CLAUDE.md'ye de yazıldı):** her mutasyondan sonra `router.refresh()` (istemci önbelleği açık — yoksa bayat veri); server page sorguları `Promise.all`; listelerde `.limit()`. ⚠️ **Prefetch DEV'de kapalıdır** → hız yalnız prod'da ölçülür.

---

## 2026-07-23 (6) — terminoloji birliği: kişi = "Müşteri" (Mehmet kararı)

Admin paneli aynı şeye (kayıt olmuş kişi) üç ayrı isim veriyordu: Müşteri (menü + sayfa
başlığı) · Üye (pano "Toplam Üye", müşteriler alt yazısı) · Kullanıcı (Canlı Görünüm, üst bar
rozeti). Mehmet'e seçenekler önizlemeyle sunuldu → **"Müşteri"** seçildi (iç ekip/CRM diline en
yakın, en az değişiklik). Tüm GÖRÜNEN metinler müşteriye getirildi; **Profil** ayrı kavram olarak
korundu (1 kişi = çok profil). Değişenler: pano "Toplam Müşteri" + alt yazı + kırpma uyarısı ·
müşteriler "N müşteri" + boş durum · müşteri detay "Bu müşterinin profili yok" · üst bar rozeti
"Canlı müşteriler" · Canlı Görünüm açıklaması + boş durumlar · destek liste kırpma.
Dokunulmayanlar (bilinçli): **"Ekip Üyesi"** (gerçekten personel) · **kod yorumları** · paylaşılan
`ThreadClient`'taki "Silinmiş kullanıcı" (müşteri paneli de kullanıyor, karar admin kapsamındaydı).
Yan tutarlılık: destek listesindeki "Üye: {tarih}"/"Üyelik tarihi" → **"Kayıt: {tarih}"/"Kayıt
tarihi"** yapıldı (müşteri detay sayfası zaten "Kayıt {tarih}" diyor). Yerel prod'da doğrulandı:
pano/müşteriler/canlı/rozet hepsi "müşteri", profil ayrımı duruyor. tsc + build temiz.

## 2026-07-23 (5) — denetim UX cilası (bir grup) + ikon optimizasyonu "yapılmadı" (öncül bayat)

**İkon yükü maddesi kapatıldı — YAPMAYA DEĞMEZ (öncülü doğrulayarak).** Not "`categoryIcons.tsx`
86 lucide ikonunu barrel import ediyor → ~15 KB, tembel yükle" diyordu. Kaynaktan doğrulandı:
Next 16 `lucide-react`'i **otomatik** `optimizePackageImports`'a alıyor (config.js:988) → barrel
zaten tek tek ikon import'una çevriliyor, tüm kütüphane gelmiyor. 81 ikonun **hepsi** ICON_MAP'te
kullanılıyor (ölü import yok, tarandı) → import stili ne olursa hepsi gerekli. Tembel yükleme
yalnız işlem listesinde ikon "pop-in"i yaratır, karşılığında ~4-5 KB. Kötü takas → GOREVLER'den düşürüldü.

**Denetim UX cilasından bir grup kapandı (hepsi güvenli, kod-only, canlı doğrulandı):**
1. **Müşteri tablosu klavye erişimi** — satır detaya giden TEK yoldu ama `<tr onClick>` klavyeye
   kapalıydı (`/admin/canli` `<button>` ile çözüyor, tabloda satır buton olamaz). `tabIndex=0` +
   `role=button` + `aria-label` + Enter/Space handler + `:focus-visible` odak halkası. Doğrulandı:
   satır odaklanıyor, halka görünüyor, Enter detaya gidiyor.
2. **Boş seçili-segment çipi kaybolmuyor** — `MusterilerClient` boş segmenti gizliyordu; LiveRefresh
   30 sn'de aktif segmenti 0'a düşürünce çip kaybolup "müşteriler kayboldu" hissi veriyordu. Artık
   `seg !== s.id` koşuluyla seçili olan asla gizlenmiyor.
3. **AI ay seçici geri bildirimi** — `router.push` sunucuya gidiyordu ama tablo eski ayda kalıyor
   gibiydi. `useTransition` + seçici `disabled` + veri alanı `aria-busy` ile soluklaşma. Doğrulandı: aria-busy=true.
4. **Admin `not-found.tsx`** — `notFound()` (silinmiş kişi) kök global not-found'a düşüp admin
   kabuğunun DIŞINDA (sidebar'sız) açılıyordu. `app/admin/not-found.tsx` eklendi → kabuk içinde,
   "Müşterilere dön" linkiyle. Doğrulandı: sidebar+üst bar var.
**Kalan cila** (GOREVLER'de): terminoloji birliği (KARAR gerek), PageHead deseni, boş durum sınıf
birleştirme, /admin/destek filtre/sayfalama, ekip formu label/aria, "son admin" koruması.

## 2026-07-23 (4) — GOREVLER temizliği + yanlış şifre inline hatası

**GOREVLER.md temizlendi: 577 → 183 satır.** Dosyanın kendi kuralı ("sadece açık görevler")
uygulandı — 74 tamamlanmış `[x]` madde çıkarıldı (tarihçe git'te, anlatı DAILY_LOG'da). 66 açık
madde kaldı, tekrarlar birleştirildi. İleriye dönük TÜM ⚠️ tuzaklar tek "KALICI TUZAKLAR"
bölümünde toplandı (deneme süresi 4 yerde, fiyat kaynağı, geçersiz SQL, config.toml/edge, CHECK
yok, prefetch DEV'de kapalı, şema=önce sor).

**Yanlış şifreyle girişte inline hata (Mehmet 14.07 bulmuştu).** Şifreli giriş hataları toast'la
gösteriliyordu → birkaç saniyede kaybolduğu için kullanıcı neden giremediğini göremiyordu. Şifre
alanının altına KALICI inline hata eklendi (`pwError` state, mevcut `.auth-msg.error` kutusu —
danger rengi, marka-bağımsız). Kullanıcı e-posta/şifreyi düzeltmeye başlayınca temizleniyor; mod
değişiminde de temizleniyor. Yalnız şifreli giriş inline; OTP/reset/OAuth toast'ta kaldı.
Yerel prod'da doğrulandı (3/3): yanlış şifre → "E-posta veya şifre hatalı." · 4,5 sn sonra hâlâ
ekranda · şifreye dokununca temizlendi. ⚠️ Betik hatası: sayfada İKİ "Giriş Yap" var (sekme
switcher + submit) → ilk denemede switcher'a tıklamış, `.fancy-submit`'e yönlendirildi.

## 2026-07-23 (3) — müşteri detayına destek talepleri (salt okuma, DB'ye dokunmadan)

Mehmet: sıradaki iş. Agent bir müşteriye bakarken "bu kişi bize ne sormuş" bilgisi yoktu →
çıkıp `/admin/destek`'te e-postayla aratmak zorundaydı. `/admin/musteriler/[id]` sayfasına
"Destek Talepleri" bölümü eklendi (Profiller ⇄ Hesap işlemleri arasında): konu · talep no ·
son mesaj ("X gün önce") · departman + durum rozeti; tıklayınca `/admin/destek/[id]`.
**Yeni özellik ama en düşük riskli türden:** salt OKUMA, yeni yetki/aksiyon yok, **DB'ye
dokunulmadı** — indeks (`support_tickets_user_idx`, faz0.sql:22) zaten vardı, mobil etkilenmiyor
(panel web'e özel). Etiketler tek kaynaktan (`TICKET_STATUS_META`/`DEPARTMENT_META`), CSS
sınıfları destek listesinden yeniden kullanıldı (8'i de kaynaktan doğrulandı — uydurma yok).
`support_tickets.user_id` = KİŞİ id'si (profil değil) kaynaktan teyit edildi. Son 20 talep,
kırpılırsa ekranda söylüyor. Sayfanın iki sorgusu (kullanım + talepler) `Promise.all` ile paralel.
Yerel prod + CANLI Supabase'te ekran görüntüsüyle doğrulandı: test hesabının 3 talebi doğru
rozetlerle (Öneri/Açık · Teknik/Açık · Teknik/Çözüldü) çizildi.
⚠️ Bilinçli küçük eksik: talepten "geri" `/admin/destek`'e döner (müşteriye değil), `backHref` sabit.

## 2026-07-23 (2) — DONMA çözüldü: suçlu, donmayı çözmek için yazdığım ısıtmanın kendisiymiş

19.07'de bildirilen *"sekmeden çıkıp geri girince Destek'e basınca donuyor"* ilk kez **canlıda
gerçek tarayıcıyla ölçüldü** (o gün düzeltmeler push edilmemişti, bugün canlıdaydı).
Ölçüm: sekmeden dönüp 0,8 sn sonra tıkla → **5 859 ms**; dönüp 15 sn bekleyip tıkla → **17 ms**.
Aynı sayfa, aynı veri — tek fark tıklamanın ısıtma dalgasının içine mi düştüğü.

🔴 **Kök neden: 19.07'de bu donmayı çözmek için eklediğim `useRewarmPrefetch`.** Sekme öne
gelince 7 rotayı birden `kind:"full"` ısıtıyor, `LiveRefresh` de panoyu tazeliyordu → 10 istek
aynı anda. Arka uç fiilen **tek isteği seri işliyor**: aynı rota eşzamanlı 3-6 sn, tek başına
0,1-1,1 sn. Kullanıcının tıkladığı sayfa **kendi ısıtma isteğinin arkasında** kuyruğa giriyordu.
Yani mekanizma, hızlandırmak için yazıldığı senaryoyu 4× yavaşlatıyordu.
✅ Yan tespit: `NavPending` işini yapıyor (gösterge 8-10 ms) → *"hiçbir tepki yok"* kısmı zaten
19.07'de çözülmüştü; kalan şey beklemenin kendisiydi.

**Düzeltme (3 parça, iki paneli de kapsıyor):** ① toplu ısıtma kaldırıldı — hook silindi, menü
linkleri `prefetch={true}` (= tam rota + verisi) yerine `auto`; tam yük yalnız NİYETTE
(`unstable_dynamicOnHover`). ② `listPeopleCached()` = 60 sn `unstable_cache`, 6 aksiyon
`updateTag` ile anında düşürüyor. ③ `LiveRefresh` odak tazelemesi 1,2 sn gecikmeli.

⚠️ **19.07'nin gerekçesi iki ayaktan da çürüdü.** "Dokunmatikte hover yok → peşin ısıtma şart"
denmişti; Next'in Link'i **dokunmayı da niyet sayıyor** (`onTouchStart` → `onNavigationIntent`,
hover ile birebir aynı Full yükseltmesi — `next/dist/client/app-dir/link.js:340-354`). Belgeye
değil KAYNAĞA bakılarak doğrulandı.

**SONUÇ (prod, deploy sonrası aynı betik):** şikâyet senaryosu **5 859 → 1 042 ms**, gösterge
4-13 ms, ısıtma dalgasındaki 15 isteğin hepsi 108-326 ms. Niyet yolu ayrıca ölçüldü:
hover'sız 2 730 ms · hover'dan **400 ms** sonra tıkla **315 ms** · 1,5 sn sonra **21 ms**.
⚠️ **Dürüst kayıt:** hover'sız tıklama (dokunmatik) 1-2,7 sn'ye çıktı — eskiden dalga
tamamlanmışsa anındaydı, ama o dalga donmanın sebebiydi ve arkadaki sekmede zaten
tamamlanmıyordu. Kalanın şüphelisi soğuk lambda.

⚠️ **Kendi ölçüm hatalarım (ikisi de "seçici/varsayım uydurma" sınıfı):** ① içerik dedektörü
olarak `.admin-ticket-row` seçtim — o sınıf **Genel Bakış panosunda da var** (`page.tsx:242`),
tıklamadan önce DOM'daydı, "1 ms'de geldi" diye yalan ölçüyordu. ② "sıcak kontrol" adımı
`.admin-sidebar`'a hover ediyordu, oysa o artık **kaldırdığım** tetikleyiciydi; link'in
kendisine hover etmeden `unstable_dynamicOnHover` hiç çalışmıyor → "hover fayda etmiyor"
diye yanlış sonuç çıkaracaktım. İkisi de ayrı betikle düzeltildi.
Tam rapor: `docs/DONMA-TESHIS-2026-07-23.md`.

## 2026-07-23 — sahibe bildirim SQL'i canlıda · app.paraner.com/admin kapatıldı · DMARC teşhisi

**İki iş canlıya çıktı, bir teşhis yapıldı (DMARC — kod/DNS değişmedi, ön koşul bekliyor).**

**① `destek-sahibe-bildirim.sql` çalıştırıldı + uçtan uca ölçüldü.** Mehmet "çalıştırdım mı?" diye
sordu — cevap VERİDEN okunamadı (`notifications` tablosu 22.07 "Temizle" testinde boşaltılmıştı →
"bildirim yok" kanıt değil), yalnız fonksiyon gövdesinde. Doğrulama 2/2 ✅, sonra service_role ile
gerçek talep açıldı: sahibine `support_created` "Talebin alındı" düştü (link `/panel/...`), **tek
satır** — sahip admin olduğu hâlde ekip bildirimi gitmedi (çift bildirim yok). Test artığı silindi.
🔴 **Çalıştırmadan önce dosyada iki gerileme bulundu:** dosya fonksiyonu 20.07'deki canlı sürümden
değil daha eski kopyadan türetmişti → (1) `IS DISTINCT FROM` sertleştirmesini `<>`'ye geri alıyordu
(NULL'da ekibe hiç bildirim gitmeme riski), (2) tipi `support_new_ticket`→`support_new` yeniden
adlandırıyordu. İkisi de düzeltildi. **Ders:** aynı fonksiyonu N dosya `CREATE OR REPLACE` ediyorsa
yeni dosyayı EN SON çalıştırılanın gövdesinden türet.

**② `app.paraner.com/admin` kapatıldı (Mehmet kararı).** İki URL'den açılan admin panelini
tekilleştirme. Karar: cross-host köprü KURMA — app'ten admin'e otomatik yönlendirme yapma; admin'e
girecek `admin.paraner.com`'a kendisi bassın. proxy.ts'e mevcut `admin.*+/panel→app.*` kuralının
simetriği eklendi: `isApp && /admin → /panel`. Güvenlik zaten `requireStaffPage` guard'ındaydı;
bu yalnız adresi tekilleştirdi. İç link taraması temiz (`goPanel` köke atıyor, admin'e link yok).
Lokal prod'da 4 senaryo curl ile + **canlıda** doğrulandı: `app.paraner.com/admin → /panel` ✅,
`admin.paraner.com` etkilenmedi. tsc+build temiz.

**③ DMARC raporları incelendi — "bu mailler ne?" sorusu (Mehmet, gün içi).** Her gün gelen
`noreply-dmarc-support@google.com` zip'i **hata bildirimi değil**, Google'ın günlük DMARC toplu
raporu. Açıldı: 22 Tem'de Gmail'e ulaşan **6 mailin 6'sı da DKIM+SPF geçmiş** (hepsi SES/Resend =
bizim destek/davet maillerimiz), taklit girişimi yok. Canlı DNS okundu: SPF · Workspace DKIM
(`google._domainkey`) · Resend DKIM (`resend._domainkey`) · `send.paraner.com` SPF+MX — **hepsi
doğru kurulu**. Eksik tek şey politika: `p=none` = **kamera var, kilit yok** (sahte mail tespit
edilir ama yine de teslim edilir).
🔴 **Sıkılaştırma BİLEREK yapılmadı — tarama sırasında sessiz kırılma riski çıktı.** Repo tarandı:
6 edge function Resend'le `merhaba@paraner.com` gönderiyor (kapsam içi), ama **Supabase Auth'un
kendi mailleri** (`signInWithOtp` kayıt kodu · `resetPasswordForEmail` · `inviteUserByEmail`)
Resend'den DEĞİL, Supabase'in SMTP ayarından çıkıyor ve **o ayarın ne olduğu repoda hiçbir yerde
yazmıyor**. From `paraner.com` ama gönderim Supabase sunucusundansa, `p=quarantine` yazıldığı gün
kayıt OTP'leri ve şifre sıfırlama mailleri **spam'e düşer — hata vermeden**; sonuç "kayıt
olamıyorum" şikâyeti olur. Yönetim API'sinden okumak denendi, CLI access token yok → **Mehmet'in
panel ekran görüntüsü bekleniyor**.
Plan `docs/DMARC-EPOSTA-KIMLIK.md`'ye yazıldı (durum tablosu · gönderen envanteri · kopyala-yapıştır
DNS metinleri · doğrulama komutları): Aşama 1 `p=quarantine`, 2-3 hafta sonra Aşama 2 `p=reject`.
⚠️ `aspf=s` YAZMA — Resend'in `send.paraner.com` hizalamasını kırar, kazancı yok.
⚠️ `pct=` örneklemesi bizde anlamsız (günde ~6 mail). ⚠️ Raporlar SİLİNMEYECEK, karar birikime bakacak.
**Zamanlama kararı:** iş ödeme entegrasyonuyla BİRLİKTE yapılacak — kimliğe bürünme kazançlı hedefe
yapılır; ödeme geldiği gün "faturanız/kartınız" maili taklidi para kazandıran dolandırıcılığa döner
ve aşamalı geçiş haftalar sürdüğü için kilit o gün TAKILI olmalı, o gün takılmaya başlanmamalı.

## 2026-07-22 — talep silme · müşteri talep akışı · çan toplu işlemleri · agent yetki testi

**Talep silme (admin-only) eklendi ve canlıya çıktı.** SQL/şema gerekmedi (`ticket_messages`
zaten CASCADE). ⚠️ **RLS'e DELETE politikası BİLEREK eklenmedi** — politika yoksa hiçbir istemci
silemez, silme yalnız guard'lı server action'dan geçer; politika eklemek yetki kapısını ikinci
bir yere kopyalamak olurdu. Asıl iş cascade'in KAPSAMADIĞI iki şeydi: **ek dosyalar** (storage
FK bilmez → yetim nesne) ve **bildirimler** (`notifications.data.ticket_id` jsonb, FK değil →
çanda ölü bağlantı). Liste tasarımı Shopify deseniyle hizalandı (Mehmet ekran görüntüsüyle
yönlendirdi): sütun başlığı ⇄ seçim çubuğu **aynı yerde**, biri diğerinin yerine geçiyor.

**🐞 Mehmet'in canlıda bulduğu 3 müşteri kusuru — üçü de AYRI sebepti.**
① Liste bayat kalıyordu: `submitTicket`'ta **`router.refresh()` yoktu** (CLAUDE.md kural 1).
⚠️ Kendi test boşluğum: 21.07'de admin tarafını ölçmüş, MÜŞTERİ listesini hiç test etmemiştim.
② Yavaşlık **2,23 → 1,49 sn** (ölçülerek): `getUser()`→`getSession()` (164 ms'lik ağ turu gitti,
RLS gerçek kapı olduğu için güvenlik kaybı yok) + ek yükleme ile mesaj yazımı **paralel**.
⚠️ "Önce mesajı yaz sonra `attachment_url`'i UPDATE et" yolu SEÇİLMEDİ: realtime yalnız INSERT
dinliyor → UPDATE karşı tarafa gitmez, ek ancak yenilemede görünürdü = **sessiz regresyon**.
③ Bildirim yoktu; kök neden `destek-departman.sql:125`'teki `WHERE s.user_id <> NEW.user_id`.
Doğru amaçla yazılmıştı (ekip üyesi kendi talebine İŞ bildirimi almasın) ama sonucu hiçbir
müşterinin onay bildirimi almamasıydı. Artık iki ayrı bildirim: ekibe `support_new`, sahibe
`support_created` "Talebin alındı". Mobil de kazandı (aynı tablo), mobil kod değişmedi.

**③'ün SQL'i çalıştırıldı ve uçtan uca ölçüldü (gün sonu).** Doğrulama 2/2 ✅, ardından canlıda
gerçek talep açılıp bakıldı: sahibine `support_created` "Talebin alındı" düştü, link `/panel/...`,
**tek satır** — sahip aynı zamanda admin olduğu hâlde ekip bildirimi gitmedi (çift bildirim yok).
🔴 **Ama çalıştırmadan önce dosyada iki kusur çıktı.** Dosya, fonksiyonu **20.07'deki sürümden değil
daha eski bir kopyadan** türetmişti: (1) `IS DISTINCT FROM` sertleştirmesini `<>`'ye geri alıyordu
(NEW.user_id NULL'sa ekibe HİÇ bildirim gitmez); (2) bildirim tipini `support_new_ticket` →
`support_new` diye sessizce yeniden adlandırıyordu (kodda `type`'ı okuyan yer yok, kırılma değil).
⚠️ **Ders:** aynı fonksiyonu 3 ayrı dosya `CREATE OR REPLACE` ediyorsa, yeni dosyayı **en son
çalıştırılanın gövdesinden** türet. "Repoda SQL olması çalıştırıldı demek değildir"in ikiz kardeşi:
*repodaki en eski kopya, canlıdaki gerçek gövde değildir.*
⚠️ Ayrıca "çalıştırdım mı?" sorusunun cevabı VERİDEN okunamadı — `notifications` tablosu aynı gün
"Temizle" testinde boşaltılmıştı, yani "bildirim yok" kanıt değildi. Cevap yalnız gövdededir.

**Çana "Okundu" + "Temizle" eklendi — peşinden iki gerçek hata çıktı.**
🔴 **Onay diyaloğu çan menüsünün ALTINDA kalıyordu:** `.confirm-overlay` z-index 200 = sıradan
menülerle aynı seviye, `.notif-menu` ise 300 → onay butonuna **basılamıyordu**. Bu yalnız bildirim
temizlemeyi değil, **bir menüden açılan HER onayı** etkiliyordu. 1000'e alındı (toast 9999'da
kaldı ki hata diyalog açıkken okunabilsin).
🔴 **`notif_delete` politikası canlıda YOKTU.** Kanıt: `DELETE` → **HTTP 200, gövde `[]`** (0 satır).
`destek-faz0.sql:107-108`'de yazılı, yani repoda VAR, canlıda yok.
⚠️ **Ders: repoda SQL olması "çalıştırıldı" demek değildir** — şüphelenince `pg_policies`'i
canlıdan oku. `sql/README.md`'ye yazıldı.
Ayrıca update/delete'lere `.select()` eklendi: **PostgREST'te RLS'in gizlediği satır HATA DEĞİLDİR**,
0 satır etkilense bile `error` null döner. `.select()` olmadan ekranı temizleyip "oldu" sanıyorduk,
kullanıcı yenileyince hepsi geri geliyordu ve hiçbir uyarı yoktu.

**★ Uzun süredir bekleyen İKİ doğrulama kapandı ★**
① **Ek dosya gerçekten siliniyor** (service_role denetimi): denetim kaydındaki 6 silinmiş talebin
hiçbirinde dosya kalmamış (3'ünün eki vardı), yetim klasör yok.
② **Agent talebi SİLEMİYOR — 13/13** (geçici agent hesabı, canlıda). Arayüz: seçim kutusu yok ·
"Sil" yok · menüde Müşteriler/Ekip yok · `/admin/musteriler` 404. **Departman ayrımı İLK KEZ
TARAYICIDA**: 5 talepten 1'ini gördü. 🔴 **DB katmanı ayrıca test edildi** ("UI'ı gizlemek güvenlik
değildir"): agent'ın kendi JWT'siyle doğrudan PostgREST'e gidildi → gördüğünü de görmediğini de
silemedi, mesajları silemedi, talep sayısı 5→5. Hesap sonra silindi; rol/departman FK CASCADE ile
gitti, SQL temizliği gerekmedi.

⚠️ **Kendi hatalarım:** `confirmDialog`'un alanlarını ezberden yazdım (`body/confirmText` sandım,
gerçeği `message/confirmLabel`) · `"use server"` dosyasından sabit export etmeye kalktım (Next
buna izin vermez, `supportShared.ts`'e taşındı) · talep başlığına eklediğim "Sil" butonu üst
bardaki yüzen kümenin altında kalıp TIKLANAMIYORDU (sorun benden önce de vardı, uzun başlıkta
"Çözüldü" aynı yere düşüyordu) · başlık ile seçim çubuğunun ölçülerini iki ayrı kuralda yazdım →
seçim yapınca üst bölüm 43→50px büyüyordu (Mehmet yakaladı, tek kurala bağlandı).

## 2026-07-21 — 20.07 işinin UÇTAN UCA CANLI testi: 6/6 geçti + "bugün/dün" hatası yakalandı

20.07 oturumu kodu+SQL'i canlıya koymuş ama **gözle hiç denenmemişti**. Bugün gerçek tarayıcıyla
(Playwright, prod), **gerçek bir müşteri hesabı açılarak** uçtan uca koşuldu — 6 iddianın 6'sı geçti:
admin yanıtı yenilenmeden **1,1 sn** (müşteride echo 2,1 sn) · ekli talep `/admin/destek`'e
**4,2 sn**'de sayfa yenilenmeden düştü (rozet 3→4, sayaçlar canlı) · ek **imzalı linkle 200/image-png** ·
sebep seçilmeden silme butonu **kapalı** · `/admin/destek` *"hesap silindi · admin@… · sebep"* ·
`/admin/denetim` *"1 destek talebi bu hesaba aitti · Sebep: Test / dahili hesap"*.
**Silme artık 500 vermiyor** → SET NULL migration'ı gerçekten iş görüyor (asıl kanıt buydu).

**🐞 Test sırasında GERÇEK bir hata çıktı — `relativeLabel` "bugün"ü yanlış söylüyordu.**
Denetim ekranında **aynı güne ait iki kayıt farklı etiketliydi**: `20 Tem 15:36 · bugün` ve
`20 Tem 09:54 · dün` (bakılan an 21 Tem 14:32). Sebep: `relativeDays` **yuvarlanan 24 saat**
hesaplıyor (`(now-t)/86400000` floor) — 22,9 saat → `0` → "bugün". Ama "bugün/dün" **takvim**
kavramı, süre değil. Yönetici denetim kaydında dünkü silmeyi "bugün" okuyor = yanlış bilgi.
**Fix:** `relativeLabel` artık Europe/Istanbul **takvim gününden** hesaplıyor.
⚠️ `relativeDays` BİLEREK değiştirilmedi: segment eşikleri (yeni kayıt, `LOST_AFTER_DAYS=30`)
onu kullanıyor ve orada süre ölçümü doğru olan; ikisini birden değiştirmek segment sınırlarını
sessizce kaydırırdı. 7 senaryoluk davranış testiyle doğrulandı (7/7), tsc + build temiz.
**Ders:** hatayı bulan şey ekrandaki VERİYE bakmaktı — "test geçti" satırı değil.

⚠️ **Kendi hatalarım (ikisi de seçici uydurmaktan):** admin giriş formunu `#email/#password`
sandım, gerçeği `#adm-email/#adm-pass` · gönder butonunu `button[type=submit]` birleşimiyle
aradım, modalın ARKASINDAKİ butonu yakalayıp 30 sn timeout aldım. İkisi de "kaynağa bakmadan
seçici yazma" sınıfı. Çözüm her seferinde aynı: sayfayı önce **keşfet**, sonra tıkla.

🧹 **Temizlenemeyen artık:** `ZZTEST ekli talep` talebi + eki DB'de duruyor (sahibi silindiği için
`user_id` NULL). Panelde talep silme yok, SQL gerekiyor → Mehmet'e bırakıldı.

## 2026-07-20 — hesap silme kırığı: yazışma korunarak çözüldü (SET NULL)

Mehmet karar verdi: **(b) `ON DELETE SET NULL`** — müşteri silinse de destek yazışması kalsın
("silinmiş kullanıcı"), çünkü o yazışma bir denetim/anlaşmazlık kaydı.

**⚠️ TEK FK YETMİYORDU — asıl tuzak buydu.** GOREVLER'de sorun `ticket_messages.sender_id`
FK'si diye kayıtlıydı. Ama yalnız onu SET NULL yapmak **hiçbir şeyi korumazdı**:
`support_tickets.user_id` **CASCADE**'di (`destek-faz0.sql:11`) ve `ticket_messages.ticket_id`
da CASCADE → kullanıcı silinir, TALEP gider, mesajlar peşinden giderdi. 500 hatası kaybolur,
veri de kaybolurdu ve "düzelttik" sanırdık. Migration üç FK'yi birden çeviriyor.

**Üçüncü FK — uyuyan kopya:** `support_tickets.assignee_id` de ON DELETE davranışsızdı.
Bugün acıtmıyor çünkü kolon hiç kullanılmıyor; talebe atama özelliği açılır açılmaz, atama
yapılmış bir **personeli** silmek aynı 23503'ü verirdi. Kapatıldı.
Bunu bulmak için iki repodaki `references auth.users` geçen TÜM FK'ler tarandı — kalan
hepsi CASCADE (notifications/user_roles/staff_departments/profiles/login-devices), doğru.
DOGRULAMA betiğine ayrıca **canlı catalog denetimi** kondu: repo'daki SQL dosyaları
Dashboard'dan elle açılmış tabloları göstermez, doğruyu `pg_constraint`'ten okumak gerek.

**Güvenlik kontrolü — "NOT NULL kalktı, sahipsiz kayıt yazılabilir mi?"** Hayır. RLS
`user_id = auth.uid()` / `sender_id = auth.uid()` NULL'da **true dönmez** (üç değerli mantık,
fail-closed) → istemci NULL yazamaz; NULL'a yalnız FK'nin SET NULL'ı ile geçilir.
Sahipsiz talep departman kuyruğunda kalır (`department` kolonu duruyor), yeni müşteri mesajı
imkânsız → yazışma donar, arşiv gibi davranır.

**İki repo tarandı (paralel ajan), kod NULL'a hazırlandı.** Web'de çöken yer yoktu (her Map
lookup'ta guard varmış) ama tipler `null`'a izin vermiyordu → `Ticket.user_id` +
`TicketMessage.sender_id` `string | null`, 4 tüketici guard'landı, yazışma ekranına
"Silinmiş müşteri"/"Silinmiş kullanıcı" etiketi. **Mobil UI hiç değişmedi** — balon hizalaması
`sender_type` üzerinden yürüyor, `sender_id` okunmuyor (şanslıyız).
🔴 **Ama mobil edge function'larda gerçek açık vardı:** `support-reply-notify:94` ve
`support-new-ticket-notify:145` `getUserById(ticket.user_id)` çağırıyordu, ikincisi `as string`
cast'iyle NULL'u TS'ten gizleyerek. SDK throw ederse 500 → pg_net retry döngüsü. Guard eklendi.
⚠️ **Kod yetmez → `supabase functions deploy` şart** (ikisi de). SQL + deploy Mehmet'te.

**SQL + deploy CANLIDA (aynı gün).** Doğrulama 6/6 ✅; genel FK denetimi 16 satır, **🔴 yok**
(8 Supabase `auth.*` + 5 bizim tablo CASCADE = doğru, 3 destek FK'si SET NULL). Artık DB'de
hesap silmeyi kilitleyen tek bir FK bile yok. Sahipsiz sayaç 0/0 — ilk silmede artmalı.
⚠️ Doğrulama betiği ilk denemede 42601 verdi: kolon takma adını `notnull` koymuşum,
**NOTNULL Postgres'te ayrılmış kelime** (`x NOTNULL` = `x IS NOT NULL`). Tam olarak kendime
"ayrılmış/otomatik adları tahmin etme" dediğim hata sınıfı, bu sefer kendi betiğimde.

**🔴 DEPLOY SIRASINDA GİZLİ TUZAK — az kalsın e-posta akışını sessizce kırıyordum.**
`support-reply-notify`'ın `supabase/config.toml`'da **kaydı yoktu**; `verify_jwt=false` yalnız
`--no-verify-jwt` BAYRAĞIYLA tutuluyormuş. GOREVLER'deki komut listesinde bayrak sadece ikinci
fonksiyonda yazılıydı → ilk deploy'u bayraksız yaptım, ayar sıfırlandı. Trigger (`pg_net`)
`Authorization` header'ı göndermediği için gateway 401 verirdi ve **agent yanıtı e-postaları
sessizce dururdu** — talep akışı çalışmaya devam ettiği için kimse fark etmezdi.
Kalıcı düzeltme: ayar `config.toml`'a yazıldı (bayrağa bağlı değil) + yeniden deploy.
**Kanıt:** sahte secret'la POST → dönen `Unauthorized` gateway'in DEĞİL fonksiyonun kendi
cevabı (`index.ts:74`) = JWT'siz istek gateway'i geçiyor. Kontrol grubu olarak config'te zaten
`false` olan `support-new-ticket-notify` birebir aynı cevabı verdi.
**Ders:** edge davranışı komut satırı bayrağında değil `config.toml`'da yaşamalı.

**Açık kalan karar:** silinen kişinin e-posta snapshot'ı tutulsun mu? Şu an kimlik tamamen
kopuyor (KVKK/GDPR silme hakkıyla uyumlu taraf); anlaşmazlıkta "kimdi bu" cevapsız kalır.
Sonradan kolon eklemek kolay, sızmış kişisel veriyi geri almak zor → bilinçli olarak eklenmedi.

## 2026-07-20 (2) — destek canlılığı · ek dosya · silme denetimi

Mehmet canlı kullanımda 4 eksik buldu. Kod yazmadan önce 3 paralel ajanla etki haritası
çıkarıldı (`docs/DESTEK-CANLI-EK-DENETIM-PLAN.md`) — ikisi beklenenden farklı çıktı.

**"Kendi mesajımı yenilemeden göremiyorum" — bir değil ÜÇ hata.** Görünen sebep `ThreadClient`'ın
mesajı listeye eklemeyip realtime echo'suna güvenmesiydi. Altından iki tane daha çıktı:
(1) `useState(initialMessages)` prop değişimini yok sayıyordu → `router.refresh()` ekrana
**hiçbir şey** yansıtmıyordu, yalnız F5 çalışıyordu; (2) `subscribeMessages`'ta `setAuth`
await EDİLMİYOR, `.subscribe()` aynı tick'te çalışıyordu → kanal token'sız açılırsa RLS'te
`auth.uid()` null olur, politika hiçbir satırı geçirmez ve olay **hata vermeden** düşer.
⚠️ Doğru sıra repoda ZATEN VARDI (`NotificationBell.tsx:73-75`); destek ondan sapmıştı.
⚠️ **Mobil bu hataya hiç düşmemiş** — `sendMessage` `.select().single()` döndürüp iyimser
ekliyor. Yani doğru desen elimizdeydi, web geri kalmıştı.

**"Yeni talep anlık düşmüyor" — üç bağımsız sebep üst üste.** DestekListClient'ta abone yoktu ·
`LiveRefresh` bu rota için `0` (disk IO kararı, bilinçli) · **`support_tickets` realtime
publication'ında bile DEĞİLDİ**. Üçüncüsü kritik: client kodu yazsak bile olay hiç yayınlanmaz,
"yazdım ama çalışmıyor" derdik. `TicketsLive` olay-tabanlı tazeliyor (3 sn boğazlamalı) —
yoklama değil. Satırı elle eklemek yerine `router.refresh()`: liste satırı müşteri bağlamını da
taşıyor (service_role'lü `listPeople`), realtime yükü onu vermiyor → elle eklesek
"müşteri kaydı bulunamadı" yalanı çizerdik.

**Çan admin panelinde HİÇ YOKTU.** Müşteri tarafındaki zincir sağlammış (trigger → notifications →
realtime), kırılma kapsamdaydı: bileşen yalnız `app/panel/layout.tsx`'te mount ediliyordu.
`components/`e taşındı, iki kabuk da kullanıyor. Kabuk-farkında olması gerekmedi — bildirimin
kendi `link` alanı zaten doğru hedefi taşıyor.

**Silme denetimi — şema değişikliği GEREKMEDİ.** `admin_audit_log.detail` zaten jsonb; sebep+not
oraya yazılıyor. Sebep listesi tek kaynakta (`lib/deleteReasons.ts`) ve **sunucuda da doğrulanıyor**
— bu kayıt ileride kanıt olarak okunacak, istemciden uydurma değer yazılabiliyorsa denetim
değersizdir. `confirmDialog` form alamıyor ve 30+ çağıranı var → dönüş tipini genişletmek yerine
silmeye özel `SilModal`. Ayrıca **`/admin/denetim` ekranı zaten yazılmışmış** — GOREVLER'deki
"audit log'u panelde göster" maddesi bayatmış, kapatıldı.

**"Bu talebi kim sildi" — dünkü kararın bedeli.** `user_id` SET NULL olduğu için talep ile silinen
kişi arasında join edecek anahtar kalmamıştı. Üç seçenekten şema değişikliği gerektirmeyeni
seçildi: silmeden ÖNCE o kişinin talep id'leri `detail.ticket_ids`'e yazılıyor, destek listesi
oradan eşleştiriyor. **Kişisel veri eklemiyor** (e-posta snapshot'ı değil) → KVKK duruşu korundu.
⚠️ Yalnız admin görür (audit RLS admin-only) · ⚠️ 20.07'den önceki silmelerde çalışmaz.

**Ek dosya.** `attachment_url` kolonu VARDI ama tamamen ölüydü (hiç yazılmıyor, hiç render
edilmiyor); bucket hiç oluşturulmamıştı. Bucket **private** seçildi → `receipts`/`avatars`'ın
`getPublicUrl` deseni burada geçersiz, `createSignedUrl` kullanılıyor. ⚠️ Kolona **tam URL değil
YOL** yazılıyor: imzalı link süreli, URL saklansa kayıt dakikalar içinde ölü bağlantıya dönerdi.
Görsel önizleme de bilinçli olarak yapılmadı (aynı sebep — açık kalan sohbette `<img>` sessizce
kırılırdı); tıklandığı an taze link üretiliyor. Ek silme/güncelleme policy'si YOK: destek eki
yazışma kaydıdır, müşteri "kanıtı" sonradan değiştirememeli.
⚠️ Storage policy'leri kopyalanamadı — mevcutlar klasörü `profiles.id` ile eşliyor, destek ise
kişi bazlı + departman görüşlü; `support_tickets` üzerinden yeniden yazıldı.

**Kendi hatam:** `SilModal`'ı yazarken `admin-input`/`admin-field` sınıflarını kullandım —
ikisi de projede YOK, uydurmuşum. tsc/build bunu yakalamaz (CSS sınıfı denetlenmez). Mevcut
`admin-select`/`admin-field-label` ile değiştirildi. [[liste-tanim-kopyalarken-uydurma]]

## 2026-07-19 — destek departman bitti · ekip daveti · disk IO teşhisi · yükleniyor UX

**Destek departman yönlendirme TAMAMLANDI (Adım 4-5).** RLS daraltıldı (`destek-departman-rls.sql`,
doğrulama 13/13 ✅): agent yalnız kendi departmanını görür, **fail-closed** — departmansız agent
HİÇBİR talep göremez. `tickets_update`'e WITH CHECK eklendi (agent talebi başka departmana taşıyıp
kendi görüş alanından çıkaramasın), `messages_insert`'e departman koşulu (göremediği talebe yazamasın),
K3 korundu. Adım 5: yeni talepte ekibe **e-posta** (`support-new-ticket-notify`) — canlı gönderilerek
doğrulandı. ⚠️ **Tetikleyici `support_tickets` DEĞİL ilk müşteri mesajı**: createTicket önce ticket'ı
sonra mesajı yazıyor, ticket anında gövde henüz yok → mail içeriksiz giderdi.
⚠️ **GOREVLER'deki Adım 5 tanımı YANLIŞTI** (`support-reply-notify` alıcıyı departmana göre seçsin):
o fonksiyon agent yanıtını MÜŞTERİYE yollar, seçilecek alıcı yok. Gerçek eksik ters yöndü.
🔴 **AÇIK: departman ayrımı hiç canlı test edilmedi** — agent hesabı kalmadı, ilk personelden önce şart.

**Ekip daveti uçtan uca kuruldu.** Boşluk: `inviteStaff` rol yazıyor ama departman yazmıyordu →
fail-closed RLS yüzünden davet edilen destekçi HİÇBİR talep göremiyordu, üstelik **sessizce**.
Artık davette departman ZORUNLU (grantRole'de de), listede değiştirilebiliyor, departmansız
destekçiye uyarı çıkıyor. Markalı davet maili (`staff-invite-notify` edge) + `/sifre-olustur`
rotası (kişi şifre SIFIRLAMIYOR, İLK KEZ oluşturuyor) + davet-farkında ekran (e-posta görünür,
personel şifre kurunca **admin.paraner.com**'a gider — eskiden app.paraner.com'a atıyordu = hata).
⚠️ **Ders:** edge function'da yetkiyi anahtar KARŞILAŞTIRARAK doğrulamak kırılgan — iki sistemdeki
değer aynı olmak zorunda değil (canlıda 401 verdi). Yeteneğe göre doğrulama: gelen anahtarla
yalnız service_role'ün yapabileceği bir çağrı denenir.

**🔴 GEÇİCİ DB HATASI YÖNETİCİYİ PANELDEN ATIYORDU.** `adminGuard` rol sorgusunun `error`'unu hiç
okumuyordu; PostgREST "schema cache" hatasında `data` null gelince kod bunu "rolü yok" sanıp
`/panel`'e yönlendiriyordu. Artık "rol yok" ile "sorgu patladı" ayrı; şema hatası geçici olduğu için
bir kez yeniden deniyor; hata sürerse yönlendirme yok, `app/admin/error.tsx` "tekrar dene" diyor.

**Saat dilimi — görüntü hatası değil, VERİ hatası.** `toLocaleString("tr-TR")` çağrılarında timeZone
yoktu; sunucu (Vercel) UTC'de çalıştığı için SSR çıktısı **3 saat geriydi** (destek yazışmasında
"son mesaj 11:35" oysa 14:35). Hydration hatası (#418) bunun yan etkisiydi. `lib/format.ts`'e tek
kaynak (`TZ` + biçimlendiriciler), 9 dosya ona bağlandı.

**Müşteri VERİSİNİ düzeltme.** Tüm müşteri aksiyonları hesap seviyesindeydi; yanlış girilmiş veriyi
düzeltmenin yolu yoktu. Eklendi: profil adı/hesap türü/para birimi + giriş e-postası değiştirme.
Sözlükler kaynaktan doğrulandı (profile_type VERİDEN: individual/business; para birimi
`lib/currencies.ts`) — DB'de CHECK yok, uydurma değer sessizce kaydolurdu.

**⚡ "Disk IO Budget" uyarısı — ölçüldü, iki hipotezim de çürüdü.**
1. "Panelin periyodik yenilemesi" sandım → ölçüm: 1. sırada Realtime WAL taraması (635.577 çağrı).
2. Ama asıl nüans: **Realtime disk OKUMA listesinde HİÇ YOK.** Diski yoran şema introspection
   sorguları (594+383 blok) → **Supabase Studio sekmesi açık kaldıkça**. En büyük kaldıraç bu.
Realtime yayınındaki 3 tablonun üçü de kullanılıyor (çan/destek sohbeti/askıya alınanı atma) —
çıkarılabilecek tablo yok. Yapılan gerçek kazançlar: `getSessionUser`+`getStaffRoleResult` React
`cache()` ile **sayfa başına 4 getUser (≈16 auth sorgusu) → 1**; LiveRefresh sayfaya duyarlı
(canlı 30sn · pano 2dk · liste ekranlarında YOK). Teşhis: `sql/admin/admin-yuk-teshis.sql`.

**`/admin` 3,6 sn → 205 ms.** Ölçüm yanlış teşhisi düzeltti: soğuk başlangıç DEĞİL (statik sayfa
sıcakken 59 ms), sayfanın kendi 8 sorgusu — her biri 300-850 ms, 9 SATIRLIK tablolarda (DB throttle).
Pano metrikleri `unstable_cache` ile 120 sn önbellekli.
🔴 **Ama önce BOZDUM:** oturum gerektiren üç metriği de önbelleğe almıştım, `unstable_cache` içinde
cookie okumak yasak → sayfa komple patladı. **Asıl hatam ölçümdeydi**: 205 ms görüp "hızlandı" dedim,
oysa sayfa HIZLI HATA veriyordu (hata ekranı da 200 döner). Artık testler süreyi VE içeriğin
gerçekten çizildiğini birlikte kontrol ediyor.

**Yükleniyor göstergesi.** Araştırma (NN/G, LogRocket): iskelet içerik sayfaları için daha iyi,
spinner kısa işlemler için. **Ama bizim ölçümümüz kararı değiştirdi**: sayfalar sıcakken 200-400 ms,
bekleme nadir → 5 sayfaya özel iskelet yazmak görünmeyen şeye emek. Karar: ortada tek gösterge,
sayfa özel iskeletler bir sayfa düzenli 1 sn'yi geçerse. Menüdeki spinner denendi, Mehmet istemedi.
⚠️ **Ortalama üç kez yanlış yapıldı** (55vh → 192px yukarı; calc(100dvh-56px) → panelde 69px aşağı,
çünkü 71px'lik üst bar hesaba katılmamıştı; flex:1 kutuyu uzattığı için margin-top tek başına
yarım kayma). Doğrusu: sabit sayı YOK, kutu kalan yüksekliği doldurur + panelde üst barın yarısı
kadar telafi (üst/alt eşit margin). 4 ekran boyutunda -2px doğrulandı.

**Sol panel + menü cilası (gün sonu).** ① Kapalı sol panel her yenilemede AÇILIP kapanıyordu
(ölçüm: 315ms'de 248px → 566ms'de 74px). Sebep: tercih localStorage'daydı, sunucu onu göremediği
için hep "açık" render ediyordu. **Çereze taşındı** → ilk HTML doğru genişlikte, zıplama yok
(+ mevcut kullanıcılar tercihini kaybetmesin diye tek seferlik taşıma).
② Daraltılınca **favoriler tamamen kayboluyordu** (`display:none`); artık rayda ikon olarak
duruyorlar (ad balonda, tek tık). Mehmet'in "alta taşı + hover'la açılan liste" önerisi
araştırma sonrası UYGULANMADI: hover dokunmatikte yok + WCAG tıklama öneriyor + alt bölge
az-kullanılan bölgedir + favori = tek tıkla erişim (W3C WAI, Level Access, Pencil&Paper).
③ Aktif menü öğesindeki **sol titanyum şerit** üç yerden de kaldırıldı (panel menü, panel alt
öğeler, admin menü) — çerçeve yeterli.

**🔴 TEST OTURUMU — yeni cihaz maili yağmuru.** Her test betiği sıfırdan tarayıcı açıp
password-grant yapıyordu → her seferinde yeni oturum + yeni cihaz → `admin@paraner.com`'a
sürekli "yeni cihazdan giriş" maili (bir günde 16 cihaz kaydı). ⚠️ Hafızada zaten "kalıcı
userDataDir kullan" notu vardı, uyulmadı. Kurulan yapı: kalıcı Chrome profili
(`~/Library/Caches/paraner-test-chrome`) + `refresh_token` ile tazeleme; gerçek giriş yalnız
profil yoksa. Ölçümle doğrulandı: 1. koşuda giriş, 2. ve 3. koşuda `last_sign_in` DEĞİŞMEDİ.
İş bitince `oturum.mjs cikis` → Supabase oturumu kapatılır + profil silinir (bu oturumda yapıldı).

**Proje kökü temizlendi:** 20 dosya `docs/` ve `sql/` altına taşındı (`sql/README.md`: hangi dosya ne
yapar, sırası, hangisi diğerini ezer). Hiçbir şey SİLİNMEDİ — hepsi referanslı, SQL'ler migration kaydı.

---

## 2026-07-18 (öğleden sonra) — buton dili · admin paneli · destek departman yönlendirme

**Butonlar titanyuma geçti + KÖK NEDEN düzeltildi.** Mehmet "butonlar neden hâlâ yeşil, biz bunun
için metin oluşturmuştuk" dedi. Gerçek sebep: o kural **yalnız Claude'un hafızasındaydı**, `CLAUDE.md`
ise TERSİNİ söylüyordu ("Tek primary renk #00BFA6") → yeni ekranlar sürekli yeşil çıkıyordu.
Kural `CLAUDE.md` → "🎨 RENK KURALI" başlığına yazıldı. **Ders: proje kuralı repoda yaşamalı.**
Titanyuma çevrilenler: `.btn-primary` tabanı · `.admin-nav-item.active` · rol çipi · `.cur-chip.on` ·
`.avatar-chip` · `.wallet-hint-btn` · `.dp-today-btn` · `.auth-row button`. **SaveButton** iki turda
oturdu: önce yalnız paleti çevirdim (Mehmet: "sadece rengini değiştirmişsin"), sonra `.sb` bloğunun
tamamı `.btn-primary` diline çevrildi (harf shimmer animasyonu kaldırıldı). Hover'da yukarı kalkma
kaldırıldı, ışıltı süpürmesi kaldı. ⚠️ Anlam renkleri (gelir yeşili, `--danger`, `--warning`) DURUYOR.

**Admin paneli iyileştirmeleri.** Sağ üst küme yeniden kuruldu: **bekleyen talep ikonu + sayı rozeti**
(çan mantığı — panele girer girmez iş var mı görünüyor), köşe yarıçapı 999px→12px. Rozet turuncu,
yeşil değil (yeşil "iyi" demek). Sorgu patlarsa `!` + kırmızı (Y4 dersi).
**Destek gelen kutusu** agent'ın çalışma ekranına dönüştü: e-posta + ad + yaşam döngüsü rozeti +
üyelik tarihi + profil sayısı + son aktiflik; durum filtresi (varsayılan "Yanıt bekleyen") + arama.
**Müşteri panelinden agent gelen kutusu KALDIRILDI** — destek sistemi kurulurken (16.07) admin paneli
yoktu, artık çift ekrandı; iç ekip aracı müşteri ürününün içinde durmamalı.

**⚠️ ADMIN YAVAŞLIĞI — kök neden.** Mehmet "admin neden yavaş" dedi. 14.07'de panel için çözülen
prefetch mekanizması admin'e **hiç uygulanmamıştı** (AdminSidebar düz `<Link>`). `next.config`'teki
`dynamicOnHover` + `staleTimes` AÇIK ama **ikisi de Link tarafında opt-in ister** — bayrak tek başına
hiçbir şey yapmaz. Admin menüsüne `router.prefetch(kind:"full")` + `unstable_dynamicOnHover` eklendi.
**Kural `CLAUDE.md`'de genişletildi:** artık "Yeni SAYFA/MODÜL" başlığı altında `app/panel/**` VE
`app/admin/**` kapsıyor + yeni kabuk açan kişiye "buraya da uygula" talimatı var.
⚠️ Ayrıca fark edildi: **CLAUDE.md'de admin paneli HİÇ GEÇMİYORDU** — yeni bir Claude varlığından
haberdar olmazdı; kuralın uygulanmamasının asıl sebebi buydu. Domain listesine + dizin ağacına eklendi.

**★ DESTEK DEPARTMAN YÖNLENDİRME (Adım 1-3) ★** — plan: `docs/DESTEK-DEPARTMAN-PLAN.md`.
Mehmet: "müşteri talep açarken departman seçsin; satış talebini muhasebe görmesin, admin her şeyi
görsün." Kod yazmadan önce etki haritası çıkarıldı (CLAUDE.md kuralı), Mehmet 3 kararı verdi:
**4 departman** (Teknik/Satış/Faturalandırma/Öneri) · **öncelik müşteriye SORULMAZ** (herkes "yüksek"
seçer → alan bilgi taşımaz olur; departmandan türetiliyor) · şema izni.
- **DB** (`sql/destek/destek-departman.sql`, çalıştırıldı + canlı doğrulandı): `support_tickets.department`
  (CHECK + **`DEFAULT 'teknik'` → MOBİL ESKİ SÜRÜM KIRILMADI**, App Store beklenmedi) ·
  `staff_departments` tablosu (user_roles'a kolon DEĞİL: oranın PK'sı `(user_id, role)`) ·
  `staff_sees_department()` (admin her zaman true) · **yeni talep → o ekip + tüm admin'lere bildirim**
  (bugüne kadar TERS YÖN YOKTU — yeni talepte kimseye haber gitmiyordu). Bildirim `link`'i
  `/admin/destek/<id>` — `NotificationBell`'de link `data.ticket_id`'den ÖNCELİKLİ, boş bırakılsa
  personel müşteri sayfasına atılırdı.
- **Web:** `DEPARTMENTS` tek kaynak (`lib/supportShared.ts`) · müşteri formunda **kart seçimi**
  (açılır liste değil — her kartta "buraya ne yazılır" cümlesi, yanlış ekibe düşen talebi azaltır;
  varsayılan seçili DEĞİL) · admin'de departman rozeti + filtre.
- ⚠️ **RLS DARALTMASI BİLİNÇLİ OLARAK YAPILMADI** (Adım 4): agent hâlâ tüm talepleri görüyor, ayrım
  şu an yalnız görsel. En riskli adım — yanlış politika ya talep gizler ya sızdırır. **Personel
  alınmadan ÖNCE** yapılacak; bugün tek staff admin olduğu için kimse etkilenmiyor.

**⚠️ KENDİ HATALARIM (Mehmet yakaladı, ikisi de ders):**
1. **Uydurma:** ölçek SQL'inde `admin_module_adoption`'ın 22 tablosunu ezberden yazdım (olmayan
   adlar uydurdum). Uyarı üzerine kendi SQL'lerimi kaynağa karşı denetleyince 2 tane daha çıktı:
   FK adını TAHMİN etmiştim (`DROP CONSTRAINT IF EXISTS` yanlış adda SESSİZCE hiçbir şey yapar) ve
   indeks kolon sırasına bakmadan "sargable olunca kullanılır" demiştim. → hafıza:
   [[liste-tanim-kopyalarken-uydurma]]. **Mekanizma:** mevcut tanımı ezberden yazma, `sed`/`grep` ile
   kaynaktan çek + `diff` ile kanıtla; otomatik adları catalog'dan bul.
2. **Regresyon:** O3'te `count(*)`'ı tamamen `reltuples` tahminine çevirmiştim → `ANALYZE` görmemiş
   tabloda 0 döndüğü için panel "3 profil kullanıyor · 0 kayıt" diyordu. Hibrit'e çevrildi
   (<50.000 gerçek sayım, üstünde tahmin).

**Doğrulama akışı kuruldu:** `sql/admin/admin-denetim-DOGRULAMA.sql` — sadece OKUYAN 8 satırlık ✅/❌ tablosu.
"Success dedi" ≠ "durum doğru". Sonuç **8/8 ✅**.

## 2026-07-18 — /admin panel denetimi (4 ajan) + 3 kritik + 6 yüksek düzeltme

`/admin/ai` hatası kapandıktan sonra Mehmet panelin genel denetimini istedi. 4 paralel ajan
(güvenlik · doğruluk · SQL/RPC · UX), **her kritik bulgu elle doğrulandı**. Tam rapor:
`docs/DENETIM-ADMIN-2026-07-18.md`. Mimari sağlam çıktı (service_role tarayıcıya sızmıyor —
`server-only` her yerde; 7 server action'ın 7'si de guard'lı; enjeksiyon/IDOR/XSS yok;
denetim kaydı client'tan silinemiyor; bugünkü tip tuzağının başka RPC'de kopyası yok).

**🔴 K1 — AI maliyet geçmişi HER PAZAR sessizce siliniyordu (veri kaybı).** Silme cron'u Pazar
00:00 (`date < CURRENT_DATE - 90 days`), rollup cron'u her gün 02:00 — yani silmeden **SONRA** —
ve `ON CONFLICT DO UPDATE SET x = EXCLUDED.x` ile körlemesine eziyordu. 90 gün sınırı hep ayın
ORTASINA düştüğü için rollup, budanmış kısmi ayı toplayıp tam aylık özetin üzerine yazıyordu.
⚠️ `ai-token-maliyet.sql:122`'deki "rollup daha erken çalışır" yorumu YANLIŞMIŞ.
**Fix:** `GREATEST(mevcut, yeni)` → maliyet defteri monoton artar, kısmi toplam tamı ezemez (+`coalesce`).

**🔴 K2 — `/admin/ai` geçmiş ayları eksik gösteriyordu.** Çift-sayma koruması (`NOT EXISTS`:
"o ay günlük satır varsa aylığı alma") K1 durumunda TAM kaydı atıp EKSİK olanı seçiyordu; ay
tamamen 90 günü aşınca sayı yukarı zıplıyordu (geçmiş rapor geriye dönük değişiyor).
**Fix:** varlık bazlı ayrım yerine iki kaynağı kullanıcı bazında toplayıp `FULL OUTER JOIN` +
`GREATEST` → canlı ayda günlük, geçmiş ayda aylık kazanır, çift sayma imkânsız. Ayrıca ay filtresi
**sargable** yapıldı (`date_trunc(...)=p_ay` indeksi kullanamıyordu → tam tablo taraması).

**🔴 K3 — müşteri `sender_type='agent'` mesaj yazabiliyordu (güvenlik).** `messages_insert`
politikası yalnız `sender_id = auth.uid()`'e bakıyordu. Asıl zarar kozmetik değil: `trg_touch_ticket`
bileti `answered` yapıyor → **bilet agent kuyruğundaki açık listeden düşüyor** (gerçek destek
talebi görünmez oluyor) + `trg_notify_agent_reply` Resend e-postası tetikliyor.
**Fix:** WITH CHECK'e rol koşulu (`agent` yazmak için `is_support_agent()`, `user` için bilet sahibi).
Agent paneli de kendi oturumuyla yazdığı için (service_role değil — `lib/support.ts` doğrulandı) akış bozulmuyor.

**🟠 Y1** `/admin` panosunun **kendi sayfa guard'ı yoktu** — service_role ile 10.000 profil +
destek başlıkları okuyup yalnız layout guard'ına dayanıyordu. Next 16 kendi auth rehberinde bunu
önermiyor (layout istemci-taraflı gezinmede yeniden çalışmaz; `staleTimes.dynamic:30` +30sn uzatır).
→ yeni `requireStaffPage()` (rolü hem döndürür hem kapıyı tutar). **Y2** premium/free tek tıkla,
onay yoktu — "tekrar bas" geri alma DEĞİL: aksiyon `trial_plan`+`trial_start_date`'i null'lıyor,
kalan deneme süresi geri gelmiyor → `confirmDialog` eklendi. **Y3** `ai_usage_rollup()` guard'sız +
REVOKE'suz → PUBLIC EXECUTE'taydı (müşteri çağırıp tam tablo agregasyonu tetikleyebilirdi);
`assert_admin()` KULLANILAMAZ (cron'da `auth.uid()` NULL → cron kırılır) → REVOKE. **Y4** destek
sorgusu hata listesinde değildi → 400'de pano "Bekleyen talep 0 · hepsi yanıtlandı" diyordu
(panelin birinci işi). **Y5** `inviteStaff` rol upsert'ünün hatasını yutup "davet edildi" diyordu →
kişi Ekip listesinde görünmüyor, girince `/panel`'e atılıyordu. **Y6** `/admin/canli` 5 sorgunun
hiçbirinin `.error`'ına bakmıyordu → RLS bozulsa "kimse uygulamada değil" diyordu.

**🟡 O12** agent panoda uydurma sıfır görüyordu ("Bugün aktif 0 · Ölü kayıt 0") — metrikler onun
için hiç çağrılmıyor, ama kartlar diziden çıkarılmıyordu (`href: undefined` yetmiyor) → kaldırıldı.
"Ölü kayıt" kartı filtresiz listeye gidiyordu (kartın tek amacı o kaydı bulmaktı) → `?seg=dead`
segmenti henüz yok, **yanlış vaat vermektense tıklanamaz** bırakıldı, segment GOREVLER'e yazıldı.

⚠️ **Ders:** K1 ve K2 bugün patlayan `sum(bigint)` hatasıyla **aynı sınıftan** — bugünkü veriyle
test edilse ikisi de "çalışıyor" görünürdü, ilk 90 günlük silme sınırı bir ayın ortasına düştüğünde
patlarlardı. Bu tür şeyler beklenerek değil, sahte kısmi ay kurularak test edilir (SQL'de yazılı).

**2. tur (aynı gün) — 10 orta bulgu:** O1 `user_devices.last_seen` indeksi · O3 `admin_module_adoption`
tam `count(*)` → `pg_class.reltuples` tahmini (Supabase'de `authenticated` rolünün `statement_timeout`'u
**8sn** — büyüyünce RPC yavaşlamaz, HATA VERİR) · O4 ölü-kayıt SAYISI için ayrı ucuz RPC (liste RPC'si
duruyor) · O5 panonun 10.000 kırpması artık uyarı veriyor · O7 "Kayıp" segmenti sinyali olmayan YENİ
üyeyi de sayıyordu (aynı kişi hem Yeni hem Kayıp) · O8 FK CASCADE · O9 audit `target_user_id` · O10
silme başarısızsa telafi kaydı · O11 admin'de `loading.tsx` yoktu · D3 kolon seçimi alfabetikti.

**⚠️ KENDİ HATAM — Mehmet yakaladı, ders kalıcı:** ölçek SQL'ini yazarken `admin_module_adoption`'ın
22 tablosunu **ezberden yazdım** (var olmayan `budgets`/`salaries` gibi adlar uydurdum, gerçek
`employee_expenses`/`debts`/`chat_messages` gibi olanları düşürdüm). Uyarı üzerine kendi SQL'lerimi
kaynağa karşı denetleyince **iki tane daha** çıktı: (1) O8'de FK adını TAHMİN etmiştim — kısıt kaynakta
isimsiz tanımlı, yanlış adda `DROP CONSTRAINT IF EXISTS` **sessizce hiçbir şey yapar** ve "düzeldi"
sanırdık → ad artık `pg_constraint`'ten bulunuyor; (2) "sargable yapınca indeks kullanılır" iddiam
fazlaydı — `idx_daily_ai_usage_user_date` öncü kolonu `user_id`, sadece tarih filtreleyen sorguya tam
hizmet etmiyor → yorum dürüstleştirildi. İkisi de tam olarak o gün AVLADIĞIM hata sınıfı (sessiz
başarısızlık + doğrulanmamış iddia). **Mekanizma:** mevcut bir tanımı yeniden üretirken elle yazma,
`sed`/`grep` ile kaynaktan çek ve `diff` ile kanıtla; otomatik üretilen adları (FK/indeks) tahmin etme,
catalog'dan bul. → hafıza: [[liste-tanim-kopyalarken-uydurma]].

**Doğrulama akışı kuruldu:** `sql/admin/admin-denetim-DOGRULAMA.sql` — sadece OKUYAN, 8 satırlık ✅/❌ tablosu
(eksikse hangi dosya çalıştırılacak yazıyor). "Success dedi" ≠ "durum doğru"; artık ölçülüyor.
**Sonuç: 8/8 ✅** (Mehmet ekran görüntüsüyle teyit etti). Ayrıca `ai-usage-rpc-fix.sql` GEÇERSİZ
işaretlendi — içindeki `admin_ai_usage` hâlâ K2 hatalı, sonradan çalıştırılsa K2'yi sessizce geri alırdı.

Her iki repo da push edildi (kod canlıya çıktı). Kalan: O6 (pano kartı PROFİL, segment KİŞİ sayıyor —
Mehmet'in birim kararı) + ~18 cila bulgu raporda, GOREVLER'de açık.

## 2026-07-18 — `/admin/ai` patladı: `sum(bigint)` → numeric tuzağı

Mehmet ekran görüntüsü gönderdi: `admin.paraner.com/admin/ai` → *"Veri okunamadı: structure of query does not match function result type"*.

**Kök neden:** `admin_ai_usage` `RETURNS TABLE (… prompt_tokens bigint, completion_tokens bigint)` tanımlı, ama gövdede `sum(b.prompt_tokens)` var. Postgres'te **`sum(bigint)` → `numeric`** (yalnız `sum(integer)` → bigint). `daily_ai_usage.message_count` integer, `ai_usage_monthly.message_count` bigint → UNION ALL tipi bigint'e yükseltiyor → dört `sum` da numeric dönüyor → tip uyuşmazlığı.

⚠️ **Neden 17.07'de "doğrulandı" göründü:** Postgres bu kontrolü **satır dönerken** yapar. O gün `daily_ai_usage` boştu (90 günlük temizlik cron'u silmişti) → 0 satır → hata yok. İlk gerçek AI mesajı gelince patladı. **İyi haber:** hata token kaydının ÇALIŞTIĞININ kanıtı — edge function `usageMetadata`'yı yazıyor.

**Fix:** `paraner-app/supabase/ai-usage-rpc-fix.sql` — dört `sum`'a `COALESCE(...)::bigint`. Şema/imza/yetki değişmiyor (`CREATE OR REPLACE`), mobil etkilenmez. Diğer admin RPC'leri (`admin_active_counts`, `admin_module_adoption`) `count()` kullanıyor → o zaten bigint, temiz.

**Ders:** `RETURNS TABLE`'lı bir RPC'yi BOŞ tabloyla "doğrulamak" doğrulama değildir — tip uyuşmazlığı ancak veriyle ortaya çıkar.

## 2026-07-17 — /admin iç ekip paneli · AI TOKEN + MALİYET takibi (hesap bazlı)

Admin paneli (`/admin`, `sql/admin/admin-panel-rpc.sql` + `sql/admin/admin-audit-log.sql`) üstüne AI maliyet ölçümü eklendi. **Amaç:** "Hangi hesap ne kadar AI maliyeti harcadı?" — cevabı yoktu; Gemini her yanıtta `usageMetadata` (token) döndürüyordu ama `ai-chat` edge function'ı metni alıp gerisini ATIYORDU → token hiç kaydedilmemişti.

**⚠️ İki repo + DB + edge — sıra kritikti** (yanlış sıra kota sayacını bozup kullanıcılara sınırsız AI verebilirdi). Uygulanan sıra:
1. **DB** (`paraner-web/admin-panel-rpc.sql` → sonra `paraner-app/supabase/ai-token-maliyet.sql`) — çalıştırıldı + **service_role ile canlı doğrulandı** (kolonlar, tablo, RPC'ler, geriye uyum hepsi ✅).
2. **Edge** (`supabase functions deploy ai-chat`) — **deploy edildi** (`oqhonmmbcqrkcaoijgnb`). Bu adım EN SON: yeni RPC imzası DEFAULT'lu olduğu için deploy gecikse bile AI bozulmuyordu.

**DB (mobil `ai-token-maliyet.sql`):** `daily_ai_usage`'a `prompt_tokens`+`completion_tokens` (DEFAULT 0, mobil kota mantığı etkilenmez) · `increment_ai_usage` 3→**5 parametreli** (eski imza DROP+yeni DEFAULT'lu → eski 3-arg çağrılar hâlâ çalışır, geriye uyum) · yeni `ai_usage_monthly` tablosu (90 günlük silme cron'u geçmişi yok etmesin diye aylık özet) · `ai_usage_rollup()` + gece 02:00 UTC cron · `admin_ai_usage(p_ay)` panel RPC'si (canlı ay `daily_ai_usage` + geçmiş `ai_usage_monthly` UNION, çift sayma korumalı, `assert_admin()` guard).

**Edge (mobil `ai-chat/index.ts`):** `readUsage()` ile `usageMetadata` güvenli okunuyor (alan değişirse 0, çağrı bozulmaz) → `increment_ai_usage`'a `p_prompt`/`p_completion` geçiliyor.

**Web:** `/admin/ai` paneli (ay seçici, hesap bazlı token + maliyet tablosu, en çok harcayan üstte) · `lib/aiPricing.ts` fiyat sabiti (⚠️ **Google fiyat API'si YOK** — 17.07'de kontrol; fiyat kodda sabit: giriş $0.30/1M, çıkış $2.50/1M, 17.07.2026 dokümanından; Google değiştirirse burası elle güncellenir. Panel token'ı DB'den alır, parayı burada hesaplar).

⚠️ **GERİYE DÖNÜK VERİ YOK:** token kaydı bu deploy'dan SONRA başlar; bugüne kadarki kullanım hesaplanamaz. `daily_ai_usage` şu an boş (90 günlük temizlik cron'u sildi) → panel dolmaya yeni kullanımla başlayacak.

**Bekleyen (canlı teyit):** gerçek bir AI mesajı sonrası `daily_ai_usage`'da token > 0 + `/admin/ai` panelinde satır görünmesi (test hesabıyla).

## 2026-07-15 — Ayarlar rakip paritesi · fatura yazdırma · bildirim menüsü · DESTEK SİSTEMİ (Faz 0)

Uzun oturum, çoğu Defteran (rakip) paritesi. Sırayla:

**Ayarlar → Hesap Bilgileri (Profil + Şirket bilgileri).** İlk sekme "Genel" → "Hesap Bilgileri"; alt sekmeler Profil (herkes) + Şirket bilgileri (yalnız işletme). ⚠️ **Şema keşfi:** `profiles`'ta web'in HİÇ kullanmadığı kolonlar zaten VARDI (mobil yazıyor): `company_name, tax_number, tax_office, company_address, company_email, phone, iban, website, mersis_no, company_logo_url, name` + abonelik (`is_premium, subscription_tier, trial_*`). Şemaya dokunmadan Şirket Bilgileri + logo yükleme (`avatars` bucket, `lib/profileMedia.ts`) kuruldu. Bunlar yasal faturanın SATICI tarafı — şimdiye dek hiç tutulmuyordu. Kolonlar paylaşılan `getProfiles()`'e EKLENMEDİ (her sayfada çalışıyor) → Ayarlar'a özel paralel sorgu.

**Ayarlar sekme mimarisi ayrıldı:** eski "İşletme" 3 ilgisiz şeyi tek çuvaldaydı → Hesap Bilgileri · Fatura · **Veri & Yedekleme** · Bildirimler · Hesap & Güvenlik. Veri & Yedekleme: dışa aktarma 2→5 kalem + Tam Yedek (JSON) + **CSV içe aktarma** (müşteri/ürün, TR başlık otomatik eşleme — "rakipten göç silahı", Defteran'da yok). `lib/csv.ts`'e `parseCsv`.

**Faturalar: yazdırılabilir fatura / PDF (Aşama 1).** `components/InvoicePrint.tsx` — A4 çıktı (satıcı=şirket bilgileri+logo, alıcı, kalem tablosu, KDV/toplam, IBAN/not). `@media print` izolasyonu. Bugüne dek web'de fatura çıktısı YOKTU (PDF sadece mobilde). Çekmeceye "Yazdır/PDF". ⚠️ Kalem editörü hâlâ yok → tek özet kalem, çıktıda generic "Mal/Hizmet".

**Faturalar cila:** satır hover + çekmece eylemleri İşlemler `.anim-act` desenine hizalandı. ⚠️ **Ders:** çekmece açılınca içerik FAZLA daralıyordu → Faturalar'da ZATEN bir iç `.tx-area` varmış, dış bir tane daha ekleyince `padding-right:408` İKİ KEZ uygulandı (816px). Desen taşırken "zaten kısmen var mı" kontrol et. [[değişiklikte detaylı kontrol]]

**Köşe yarıçapı tutarlılığı (tüm panel):** çipler + çekmece/satır butonları + badge → tek yumuşak-köşe dili (12px / 8px). Odak halkası da teal → nötr `--focus-ring` (11 kural). Marka rengi değişecek [[marka-rengi-degisecek]].

**Üst bar bildirim çanı:** ölü çan → açılır menü (2 sekme, boş durum). ⚠️ Menü çekmece ARKASINDA kalıyordu (üst bar stacking context) → `createPortal(body)` + fixed + z-index 300. Ayarlar dişlisi kaldırıldı (sol menüde var), işlevsiz AI Sohbet butonu kaldırıldı → üst barda tek çan.

**Sol menü:** Ayarlar + **Destek** + **Çıkış Yap** (rakip paritesi). `/panel/destek` sayfası: rakip deseni (üst kart + Talep Oluştur + hazır soru-yanıt + WhatsApp/e-posta).

**★ DESTEK SİSTEMİ — Faz 0 (web + mobil, ORTAK Supabase) ★** — detay `docs/DESTEK-SISTEMI.md` + `docs/DESTEK-SEMA-MOBIL.md`. Mehmet gerçek ticket+chat sistemi istedi (talep → taleplerim → agent yanıtı → e-posta + çan + push). 2 araştırma (sektör mimarisi + altyapı denetimi) → "conversational ticketing". **Mobil Claude ile mutabakat sağlandı** (Mehmet kopyala-yapıştır ile iki Claude'u konuşturdu). Kuruldu:
- **Şema (`sql/destek/destek-faz0.sql`, Supabase'de çalıştırıldı):** `support_tickets`, `ticket_messages`, `notifications`, `user_roles` + RLS (kullanıcı kendi / agent hepsi, `is_support_agent()`) + realtime publication + `notify_on_agent_reply` trigger (agent mesajı → `notifications` INSERT, `data.ticket_id` HER ZAMAN) + DELETE policy. Sahiplik `auth.users.id` (KİŞİ — "her yerde profile.id" kuralının bilinçli istisnası, iki taraf onayladı).
- **Web:** `lib/support.ts` (createTicket/sendMessage/resolveTicket/subscribeMessages realtime), Destek DB'li (Talep Oluştur + Taleplerim + agent "Gelen Talepler"), chat thread `/panel/destek/[id]` (balonlar + realtime + Çözüldü), NotificationBell → gerçek `notifications` (fetch + realtime INSERT + okundu + tıkla-route).
- **Mobil (mobil repo):** aynı tablolar, hibrit çan (local+remote), thread, `support-reply-notify` edge function (Resend, `merhaba@paraner.com`, `RESEND_API_KEY`, `x-support-secret`) — notifications INSERT'i YAPMAZ (trigger yapıyor), sadece e-posta. Deploy edildi ✅.
- **Test:** web'de talep→thread→mesaj→Taleplerim + agent gelen kutusu (admin@paraner.com agent yapıldı) headless doğrulandı. e-posta hariç çekirdek çalışıyor.

⚠️ **KALDIĞIMIZ YER (bir dahaki destek işinde):** Sadece **e-posta bildirimi** eksik. Supabase Database Webhook (`ticket_messages` INSERT → `support-reply-notify` + `x-support-secret` header) kurulamadı: **`schema "supabase_functions" does not exist`** hatası — pg_net AÇIK ama Supabase'in "technical issue" banner'ı webhook altyapısını engelliyor. Karar: **BEKLE**, Supabase düzelince webhook 2 dk'da kurulur (`SUPPORT_WEBHOOK_SECRET` Edge Function Secrets'ta zaten var — değeri Mehmet'in Notlar'ında). Alternatif (istenirse): webhook yerine trigger içinde `pg_net.http_post` + Vault. Çan+thread e-postasız zaten tam çalışıyor.

## 2026-07-14 — Panel hızı (iskelet → 20 ms) · slogan · Şifre Belirle · Ayarlar yerleşimi

**Slogan değişti:** "Paranı yönet, geleceğini kur" → **"Parasını yöneten, geleceğini yönetir."** (hero + footer + PWA manifest + CTA bandı + `/bireysel`). Mobil app'te zaten 21.06'da değişmişti (cross-repo notu app GOREVLER'inde açıktı, kapatıldı). Hero başlığı yeni sloganda 4 satıra kırılıyordu → metin kutusu 520→580px, ölçek `clamp(44,7vw,80)` → `clamp(48,5vw,68)` (+mobil `clamp(33,9.5vw,56)`), `.hero-sub` `text-wrap:pretty` (öksüz "al." satırı). 7 genişlikte gerçek tarayıcıda ölçüldü: hepsinde tam 2 satır.

**PANEL YAVAŞLIĞI — kök neden bulundu ve çözüldü (ölçüm: ~1.5 sn + iskelet → 14-26 ms, iskelet YOK).**
Mehmet "Defteran'da tıklayınca anında açılıyor, bizde bekletiyor" dedi. İki bağımsız denetim aynı yere çıktı:
- ⚠️ **ASIL SEBEP:** Next 16'da `<Link>` **dinamik** rotalarda yalnız `loading.tsx` sınırına kadar prefetch eder, **SAYFA VERİSİNİ GETİRMEZ** (docs `prefetching.md`: "Server roundtrip on click: Yes"). Tıklamada veri turu sıfırdan başlıyordu = gördüğümüz iskelet. İstemci bundle'ı suçsuz (geçişte inen JS 4-22 KB gzip — ölçüldü).
- **Çözüm:** `experimental.dynamicOnHover` + Link'lerde `unstable_dynamicOnHover` (**ikisi birden şart**) → hover'da tam yük. + `Sidebar`'da `CORE_PREFETCH` (6 rota) `router.prefetch(href, {kind:"full"})` ile **programatik** ısıtma. ⚠️ `prefetch={true}` **VIEWPORT'a bağlıdır** → kapalı akordeon içindeki Faturalar hiç görünmediği için asla ısınmıyordu; dokunmatikte hover da yok. Ölçüm: hover'sız ısıtılmamış rota **1554 ms + iskelet** → programatik ısıtma sonrası **5-8 ms**.
- **Diğer turlar:** `proxy.ts` `getUser()` → **`getClaims()`** (proje ES256 JWKS yayınlıyor → token YERELDE doğrulanır, ağ turu yok; eski HS256 token'da auth-js kendisi getUser'a düşer). JWKS önbelleği auth-js'te zaten **modül düzeyinde** (`GLOBAL_JWKS`) — kendi eklediğim önbellek katmanı gereksizdi, silindi.
- **`staleTimes {dynamic:30}`** açıldı → geri dönüşler anında. ⚠️ Bir tur AÇILDI-GERİ ALINDI-tekrar açıldı: panel CRUD ekranlarının HİÇBİRİ `router.refresh()` çağırmıyordu; sunucu verisi `initialX` prop'u olarak `useState`'e tohumlandığı için önbellek açıkken sayfadan çıkıp dönmek **bayat payload**'u geri getiriyordu ("eklediğim işlem kayboldu", "bakiye güncellenmedi"). → **20 CRUD ekranı / ~52 handler**'a başarı yolunda `router.refresh()` eklendi (4 paralel ajan, diff elle denetlendi), sonra önbellek güvenle açıldı. Next 16'da tek `refresh()` **TÜM** segment önbelleğini düşürüyor (kaynak: `segment-cache/cache.js:238` `currentSegmentCacheVersion++`) → çapraz sayfa bayatlığı da çözülüyor.
- **Vercel region `fra1` → `lhr1`** (Supabase `eu-west-2` Londra; her sorguda boşuna ~15-20 ms gidiyordu). **Plan: Hobby** → soğuk başlangıç var; prefetch onu maskeliyor (fonksiyon kullanıcı tıklamadan ısınıyor).
- **Sıralı sorgular paralelleştirildi:** ayarlar (3 tur → paralel + mükerrer `profiles` sorgusu kalktı), izinler, stok.
- **`AccountStatusGuard`:** 30sn yoklama → 5dk (realtime DELETE kanalı + sekmeye dönüş zaten yakalıyor; saatte ~240 gereksiz istek) + `focus`/`visibilitychange` çift tetikleme giderildi.
- **proxy sertleştirmesi (denetimden):** `getClaims`'in 403'ü ALTYAPIDAN da gelebilir (jwks.json'a 403 → WAF/duraklatma) ve eski kod bunu "hesap silinmiş" sayıp **tüm kullanıcıların çerezini silip** `/giris?closed=1`'e atardı → çerez silme artık `getUser` ile teyit ediliyor. Ayrıca `getClaims` AuthError olmayan istisnaları rethrow ediyor (bozuk JWK'da WebCrypto) → `try/catch` yoksa panelin tamamı 500.

**Şifre Belirle / Değiştir (web, Ayarlar → Hesap & Güvenlik):** mobil `change-password.tsx` paritesi. "Şifresi var mı" = **`user_metadata.has_password` ortak bayrağı** (⚠️ provider'a bakmak YANLIŞ: e-posta+OTP kullanıcısının da şifresi yok). Belirlemede mevcut şifre sorulmaz; değiştirmede önce `signInWithPassword` ile doğrulanır + sonra `signOut({scope:'others'})`. Şifre gücü göstergesi + Supabase hatalarının TR karşılıkları. Modal **hedef e-postayı** yazıyor.

**Ayarlar yerleşimi:** 820px dar kolon (sağ taraf boş) → **tam genişlik + her bölüm kendi kartında**. Kutu-içinde-kutu ve hizasız satırlar giderildi; Tehlike Bölgesi'nde çift çerçeve önlendi (`:has()`). 4 sekme de canlı oturumla (test hesabı) headless doğrulandı.

---

## 2026-07-13 — Rakip denetimi (Defteran) + web yeniden yapılanma: /destek · İşletme-Bireysel mega-menü · tipografi sistemi · panel

18 commit. Mehmet "rakibi incele" ile başladı, oradan çıkan eksikler sırayla kapatıldı. Referans olarak **resend.com** ölçülerek taklit edildi (tahminle değil: headless ile DOM/CSS/geçiş ölçümü).

**Rakip analizi — `docs/RAKIP-defteran.md`** (4 paralel ajan, 180 URL). Ürün olarak biz öndeyiz (34 modül; bütçe/KDV/vergi takvimi/veresiye/Cüzdanım onlarda YOK), pazarlama makinesi olarak onlar çok önde (bizde 2 URL'lik sitemap, onlarda 180: akademi 32 ders, sözlük 21, 9 hesaplayıcı, `llms.txt`+AI crawler daveti). Fiyat ₺750/ay tek paket. **Her iddia elle doğrulandı** — ajanların 2 SEO yanlışı (canonical/keywords "yok" demişlerdi, VARDI) düzeltildi. Bizde gerçekten eksik: e-Fatura/GİB, **fatura kalem editörü** (e-Fatura + teklif→fatura + stok düşümü üçü buna kilitli), Excel import, mutabakatta paylaşım linki, PDF rapor, puantaj. Onlarda da yok: banka entegrasyonu, OCR, offline.

**Yeni sayfalar + nav:**
- **`/destek`** — 9 SSS (JS'siz `<details>`) + **FAQPage schema** (ilk rich-snippet fırsatımız), WhatsApp `+90 532 237 99 09` (mobil `help.tsx` ile aynı numara) + destek@paraner.com. e-Fatura sorusuna DÜRÜST yanıt ("yol haritamızda").
- **`/isletme` + `/bireysel`** + üst barda **İşletme/Bireysel mega-menü**. Alt sayfalar henüz yok → menü linkleri şimdilik segment sayfası içi `#çapa`lara gidiyor (`navData.ts` tek kaynak; alt sayfa açılınca sadece href değişecek).
- **SEO:** title → "Şirketinizi ve bütçenizi Paraner ile yönetin | Gelir-Gider ve Ön Muhasebe". Schema: `Offer price:"0"` → **AggregateOffer** (₺0/129/349 artık Google'a görünüyor), `operatingSystem` "iOS, Android" → **"Web, iOS, Android"** (web panelini hiç söylemiyorduk), `featureList` (9). Nav'da bulunulan sayfa parlak (`aria-current`).

**Mega-menü — Resend'in GERÇEK deseni (3 turda oturdu, her turda ölçtüm):**
1. Her tetikleyiciye ayrı panel yaptım → YANLIŞ. Resend'de **TEK panel** var, geçişte kapanmıyor.
2. Paneli tetikleyicinin altına ortaladım → YANLIŞ. Ölçüm: Resend'de panel merkezi tetikleyici 469'da da 915'te de **hep 720 = ekran ortası**. Panel KIMILDAMIYOR, sadece genişliyor/daralıyor.
3. İçeriği fade ile geçirdim → YANLIŞ. Kare kare ölçüm: **opacity hep 1, saf KAYDIRMA** — imleç sağa giderse eski içerik sola süzülüp çıkıyor (x: 452→223), yeni içerik sağdan giriyor (788→533); panel `overflow:hidden` ile kırpıyor.
- ⚠️ **Ders:** `.nav-links`'e `position:relative` EKLEME — o element `position:absolute; left:50%` ile ortalanıyor; relative yazınca ortalama düşer, nav sağa kayıp Giriş/Kayıt butonlarının üstüne biner.
- **Mobil:** akordeon DEĞİL, **içeri giriş (drill-down)**: kök liste (segmentler sağ oklu, düz linkler oksuz) → basınca ← geri + vurgu kartları + linkler. `<button>` sıfırlamaları (`border:0`, `font:inherit`) `.mm-row`'un çizgisini ve 600 ağırlığını EZİYORDU → düzeltildi. Kaydırma çubuğu içeriğe değiyordu: kaydırılan kap yan dolgunun içinde kalıyordu → negatif margin ile ekran kenarına taşındı.

**Tipografi sistemi (pazarlama):**
- Resend ölçüldü: h1 = Domaine (serif) **w400**, gövde = Inter 18px/27px w400. Asıl fark font değil **AĞIRLIK**: onlar 400'de, biz 800'deydik.
- Domaine ticari lisanslı → ücretsiz muadil arandı. Mehmet **Prata**'yı seçti ama entegrede yakalandı: ⚠️ **PRATA TÜRKÇE DESTEKLEMİYOR** (Google Fonts alt kümeleri latin/cyrillic/vietnamese — `latin-ext` YOK → ğ Ğ ş Ş İ ve ₺ fontta yok, Times'tan basılırdı). → **Playfair Display** (geniş + yüksek kontrast + latin-ext).
- ⚠️ **Ders:** yeni Google Font seçmeden önce `curl "…/css2?family=X" -H "UA:<Chrome>" | grep latin-ext`.
- **Sistem kuralı:** `h1 { serif, w400 }` global → yeni sayfa otomatik doğru gelir. İstisna (sans): `.panel-shell h1`, `.panel-h1`, `.auth-head h1`, `.reset-card h1`.
- **Hero başlığı "bozuk" görünüyordu — font değilmiş:** harf-harf animasyon için her harf ayrı `<span>`'di ve gradyan span'a yazılmıştı → **gradyan her harfte sıfırdan başlıyor**, her harf tek tek soluyordu. Resend'in h1'inde animasyon/span YOK. → düz metin + düz renk + line-height 1.04→1.14 (ğ/g kuyrukları kırpılıyordu).
- **Gövde ölçeği:** 14/15/16/17/18px karışıktı → `--fs-body 18` / `--fs-sub 16` / `--fs-small 14`. Nav 14px/w500 → 15px/w400.

**Panel:**
- **Tipografi:** 20 farklı boyut (8.5→44px) + 6 ağırlık vardı → 9 boyut / 3 ağırlık. **800 ve 900 KALDIRILDI** (tavan 700). Sayfa başlıkları birleşti: `PageHead` (.panel-h1, 30+ modül) 22/800 ve Genel Bakış (.ov-header h1) 28/800 → ikisi de **24px/600**. Panelde SERİF YOK (veri ekranı) — üretilen CSS'e panel işaretlemesi uygulanarak sızıntı olmadığı test edildi.
- **Genel Bakış yerleşimi:** grafik ile Kartlarım yan yanaydı; hesap kartları (aspect-ratio 1.6) sütun genişliğinde ~330px, 3 kart ~1000px, grafik 300px → grid stretch grafiği geriyordu → **grafiğin altında ~600px ölü boşluk**. Grafik TAM GENİŞLİĞE alındı, kartlar YATAY sıraya dizildi, `align-items:start`. LineChart viewBox 880x300 → 1400x300 (tam genişlikte 510px'e uzuyor + yazılar 1.7× büyüyordu).
- ⚠️ **Hata + ders:** yatay sırada `auto-fit + 1fr` kullanınca **tek hesabı olan kullanıcıda kart 1500x940px'e devleşti** (Mehmet yakaladı). Mock'umda 3 hesap vardı, 1-hesap senaryosunu test etmemiştim. → kart genişliği `max-width:360px` + `auto-fill`. **Ders: aspect-ratio'lu kartlarda "1, 2, 3 adet" senaryolarının hepsini test et.**
- **Panel auth arkasında** → tasarım iterasyonu için GEÇİCİ mock (`MOCK_PANEL=1`) ile headless render edildi; mock commit'e GİRMEDİ (`grep MOCK` = 0 ile doğrulandı).

## 2026-07-02 — Baştan sona denetim (4 paralel ajan: güvenlik×2 + hata + app↔web parite) + 18 düzeltme

Mehmet "hacker gibi tüm web'i denetle, güvenlik + app↔web tutarsızlık" istedi. 4 paralel ajan + her kritik bulgu gerçek kod/RLS SQL ile ELLE doğrulandı (yanlış pozitif elendi). Genel durum: mimari sağlam (RLS tüm tablolarda UPDATE/DELETE gate ediyor, edge function'lar JWT'yi sunucuda doğruluyor, secret sızıntısı yok, IDOR/XSS/PostgREST-injection YOK). Bulgular ağırlıkla veri-bütünlüğü + parite. **18 kalem düzeltildi + deploy** (31 dosya + `lib/csv.ts` + `lib/useSubmitLock.ts`):

**Güvenlik:**
- **G1 HTTP güvenlik header'ları** (`next.config.ts` `headers()`): X-Frame-Options DENY + CSP frame-ancestors none (clickjacking), HSTS, X-Content-Type-Options, Referrer-Policy. Canlı `curl -I` ile doğrulandı.
- **G2 CSV formül enjeksiyonu** (faturalar + ayarlar + gelir-gider-raporu export): ortak `lib/csv.ts` (`toCsv`/`downloadCsv`) — `=+-@` ile başlayan hücre başına `'`, RFC4180 tırnak katlama. Faturalar eski `"${c}"` tırnak bile kaçırmıyordu. Birim test 8/8.

**Kritik veri/para:**
- **K1 çift-submit kilidi** — `lib/useSubmitLock.ts` (senkron useRef; `disabled={saving}` async olduğundan yarışı engellemiyordu → mükerrer kayıt/çift bakiye). Para/kayıt yazan 22 handler'a uygulandı (17 uniform CRUD script'le, cuzdanim/hesaplar/veresiye elle). Mobil GUVENLIK.md 12.06 double-submit dersinin web karşılığı.
- **K2 bütçe currency** (`butceler/page.tsx`): "harcanan" sorgusu currency filtrelemiyordu → dövizli gider TRY bütçesine ham ekleniyordu. `.eq("currency", …)` eklendi.
- **K3 profil değiştirme kilitlenmesi** (`ayarlar switchTo`): "hepsini pasifle→seçileni aktifle" sırası + error-check yoktu → ikinci adım düşerse hiç aktif profil kalmıyordu (panel kilitlenirdi). Sıra çevrildi (önce aktifle) + error-check + setSwitching reset.
- **K4 collection_in bakiye ters-işareti** (`islemler appliedDelta`): mobil `collection_in` whitelist'te değildi → mobil tahsilat transferini web'den silmede bakiye 2× ters bozuluyordu. INFLOW_CATEGORIES set'ine eklendi.
- **K5 düzenli fatura çift-üretim** (`duzenli-fatura`): "İlerlet" gerçek fatura üretmeden tarihi atlıyordu → mobil dashboard açılışı aynı dönemleri geri-doldurup çift/atlama yaratıyordu. "Şimdi Oluştur"a çevrildi: RPC numara + invoice_items + transaction senkronu + ilerlet (mobil generateInvoiceFromTemplate paritesi).

**App↔web parite (hepsi web istemcisinde, şemaya dokunmadan, mobil davranışına hizalı):**
- **P1 fatura numarası** (`faturalar`): web `MGZR0003` (4h, tiresiz, atomik-olmayan sayaç) ≠ ayarlar önizleme `MGZR-000003` ≠ mobil. Atomik RPC `get_next_invoice_number` + `PREFIX-000006` formatına geçti (mükerrer numara riski de bitti).
- **P2 fatura→transactions** (`faturalar`): web faturaları ciro/kâr KPI'sına girmiyordu → non-draft faturada invoice_id'li transaction yazılıyor; taslak→paid'de markPaid tamamlıyor. Silme FK CASCADE ile temiz.
- **P3 invoice_items + title** (`faturalar`): web kalem/başlık yazmıyordu → mobilde boş kalem tablosu + boş başlık/no. Tek özet kalem + `NUMARA - müşteri` başlık yazılıyor.
- **P4 durum enum** (`faturalar`): `cancelled`/`partial` tanınmıyordu (mobil iptal/kısmi web'de yanlış rozet); markPaid `status='paid'` de set etmiyordu. StatusKey genişletildi + invStatus + markPaid.
- **P5 gerçek due_date** (`faturalar`): `due_date` kolonu VAR (mobil yazıyor), web yok sayıp `invoice_date+30` uyduruyordu (yanlış overdue). Artık gerçek due_date okunuyor (yoksa +30 fallback) + oluşturmada yazılıyor.
- **P6 KDV raporu** (`kdv-raporu`): dönem üst sınırı yoktu → gelecek tarihli fatura "Bu Ay"a sızıyordu. `endOfExclusive` eklendi (currency filtresi zaten doğruydu, korundu).
- **P7 para birimi listesi** (`lib/currencies.ts`): 6→30 kod (mobil ile birebir) → AED/JPY vb. hesaplar web'de ham kod/boş seçici göstermez.
- **P8 findCategory** (`lib/categories.ts`): `adjust_in/out` + `collection_in/out` etiketleri eklendi (mobil sistem işlemleri web'de ham id görünmez).
- **P9 aktif profil** (`profile.ts`): `is_active → is_primary → ilk` fallback (mobil default'uyla hizalı; tam parite cihaz-yerel AsyncStorage yüzünden şema ister — not).

**Fix edilmedi (bilinçli):** mobil-taraflı bulgular (mobil KDV currency-mix, is_primary AsyncStorage kaynağı, ai-chat client systemPrompt, token cookie httpOnly-olamaz SSO tasarımı) → mobil Claude'a/ileriye. Edge function CORS/JWT zaten sağlam.

tsc + build temiz; header'lar + CSV birim test canlı doğrulandı.

## 2026-07-02 — Ayarlar sayfası SaaS-standardı sekmeli yapıya geçti

Mehmet "SaaS ayarları nasıl olmalı" araştırması istedi (web araştırması: 3-katmanlı kapsam ayrımı kişisel/işletme/hesap, sekme-veya-yan-menü navigasyon, solda etiket/sağda kontrol satırları, hibrit kaydetme, tehlike bölgesi; galeriler: saasinterface/nicelydone/saasframe/Mobbin) → öneri onaylandı, uygulandı (`AyarlarClient.tsx` + globals.css):
- **4 sekme:** Genel (aktif profil: tip/para birimi/ad + profil değiştir) · İşletme (yalnız business: fatura numaralama, CSV dışa aktarma, roller-yakında) · Bildirimler · Hesap & Güvenlik (e-posta, cihazlar, oturum, tehlike bölgesi). Sekme = `?tab=` derin link (`history.replaceState`, mount'ta URL'den okunur; SSR uyumu için effect'te).
- **Yerleşim:** `.settings-wrap` 820px; `.set-tabs` alt-çizgili nötr sekmeler (Vercel tarzı, teal yok — [[marka-rengi-degisecek]]); `.set-field` masaüstünde yatay (sol etiket+ipucu `.sf-info`, sağ 240px input); mobilde dikey + sekmeler yatay kaydırma.
- **Tehlike bölgesi:** Hesabı Sil kırmızı çerçeveli `.danger-zone` kartına taşındı (GitHub deseni).
- İşlevsel mantığa (Supabase çağrıları, confirmDialog/toast akışları) DOKUNULMADI — yalnız yeniden gruplama+stil. tsc+build temiz; mock veriyle 2 viewport × 4 sekme ekran görüntüsüyle doğrulandı (mock commit'e girmedi).

## 2026-07-02 — Mobil tarama (hero 320px taşması) + iOS Safari mask-drop beyaz kaması

- **Genel mobil tarama (GOREVLER "Şimdiki"):** headless Chromium ile 320/360/390/560/768px'te ana sayfa + /giris + /kayit gerçek-viewport ölçümü. Paralel statik CSS taramasının "yüksek güven" bulgularının neredeyse tamamı yine yanlış pozitifti (max-width kabı aşamaz) — ölçümle elendi. **Tek gerçek sorun:** 320px'te ana sayfada 11px yatay scroll. Kök neden: ≤900'de `.hero.wrap` kolon flex + `align-items:center` → `.hero-text` genişliğini içerikten alıyor; 3 rozetin tek-satır min-content'i 342px. **Fix:** mobil bloğunda `.hero-text{width:100%}` (rozetler zaten `flex:1 1 0; min-width:0` ile küçülüyor). 5 genişlikte de taşma sıfırlandı; auth sayfaları zaten temizdi. Not: masaüstünde 13px doc-overflow var ama önceden beri ve bilinçli (hero küpün negatif-sağ konumu, `body overflow-x:hidden` kırpıyor, kullanıcı görmez).
- **iOS Safari'de e-posta inputunda beyaz kama (Mehmet ekran görüntüsü, yenileyince kayboldu):** kök neden kanıtlandı — `.beam-ring`'in dönen huzmesi aslında pill ortasından açılan koca beyaz conic kama + onu 1px kenara indiren `mask-composite:exclude`; iOS Safari (mask + animasyonlu `@property` açı + üstte `backdrop-filter` kombinasyonunda) nadiren maskeyi uygulamadan rasterize ediyor → kama ham görünüyor, reload'da düzeliyor. Headless'ta mask kapatılarak birebir aynı görüntü üretildi. **Fix (görünüm birebir):** mask tamamen kaldırıldı → iki katmanlı background (iç kutu `padding-box` OPAK koyu zemin, `border-box` conic; huzme yalnız 1px şeffaf border'da). `.beam-border/.beam-ring` DOM+CSS silindi; aynı desen `.store-badge::before` hover huzmesine de uygulandı (iç katman #000; logo/yazı `z-index:1` ile üstte — opak iç örtmesin). `var(--beam-angle, 0deg)` fallback: @property yoksa huzme sabit ama pill boyanır.
- ⚠️ **Ders (iOS Safari mask ailesine ek):** "dev bir şeyi çiz + mask ile küçült" deseninde mask düşerse ham dev şey görünür — Safari'de mask + animasyon + backdrop-filter kombosunda bu GERÇEKLEŞİYOR. Dekoratif kenar efektlerinde mask yerine iki katmanlı background (padding-box/border-box) kullan; başarısızlık modu görünmez olsun. Sitede kalan mask'ler zararsız-başarısızlık sınıfında (wordmark PNG maskeleri, fade'ler, SaveButton parlaması). `.splash-word` CSS'i yetim (SplashScreen 07-01'de silinmişti) — temizlenebilir.

## 2026-07-01 — Sayfa geçişi "dikey zıplama": KÖK NEDEN bulundu + fix (GIS buton reflow)

Aylardır çözülemeyen prod-only zıplama (ana sayfa→Giriş/Kayıt; localde/headless üretilemiyor). Tahmin yerine **teşhis probu** (`JumpProbe.tsx`, `?jump=1` ile ekran-overlay: scrollY/viewport/docHeight/**layout-shift kaynağı**/`.social-auth` satır yüksekliği) yazıldı → Mehmet ekran görüntüsü aldı → **kesin neden**:
- **Kök neden:** `/giris`'e inince **async GIS Google butonu** render olurken `.social-auth` satırı **52→80→52** sıçrıyor (kişiselleştirilmiş 2-satır buton + GIS'in render reflow'u). Altındaki her şeyi (bölücü/e-posta/Devam Et/rozetler) itip çekiyordu = zıplama. **Canlı-özel çünkü GIS localhost origin'de bloke** → yedek buton hiç değişmez → localde reflow yok. (Eski hipotezler smooth-scroll + One Tap YANLIŞTI.)
- **Fix (satır/layout — ÇÖZÜLDÜ, canlı onaylandı "butonların/inputun zıplaması gitti"):** `.google-slot` (relative, **sabit 52px**) içine GIS kabı + yedek buton üst üste (absolute); `.gsi-wrap` `overflow:hidden` → GIS'in 80px sıçraması KIRPILIR, satır hep 52px. Deploy'lar: min-height denemesi (f79453b) → sabit height+overflow (941b10c) → görünmez-render+settle (8d0f801).
- **GIS buton reveal cilası (fb77425):** yedek "Google" ↔ GIS "Continue with Google" yazı-değişimi göze çarpıyordu → yükleme boyunca slot BOŞ, GIS oturunca (rAF ile yükseklik ~150ms sabit) fade-in; yedek yalnız GIS yüklenemezse (`onerror`/1.6s timeout). ⚠️ Mehmet "olmadı yine" dedi + Mac fanı ısındı (prob sürekli rAF) → **prob kaldırıldı** (bu commit). Asıl layout zıplaması çözülü; GIS butonun mikro-belirme davranışı istenirse ileride ele alınır (alternatif: GIS renderButton yerine sabit Türkçe custom Google butonu → personalization kaybı pahasına sıfır reflow).
- ⚠️ **Ders:** async 3P widget (GIS) yükseklik reflow'unda `min-height` taban yetmez; sabit `height`+`overflow:hidden` ile TAVANLA. Şeffaf/async alanları baştan sabit yükseklikle rezerve et.

## 2026-07-01 — Hero küp "çerçeve" fix (renk yönetimi) + panel sessiz-hata denetimi

- **Hero 3B küp Windows'ta çerçeveli görünüyordu** (Mac + harici monitörde normal). Kök neden three.js kaynağından kanıtlandı: canvas `alpha:true`+premultiplied ile boş pikseller (0,0,0,0) = şeffaf; ama **Vignette post-pass** bu ŞEFFAF piksellere `darkness=1.12` ile negatif RGB yazıyordu → **OutputPass ACES tonemap negatifi POZİTİFE çeviriyor** (−0.07→+0.09) → premultiplied compositor artığı sayfa zeminine ekliyor → çevreden açık dikdörtgen. İyi ekranda görünmez, kalibrasyonsuz/yüksek-siyah-seviyeli panelde görünür. **Fix:** `AuthCube3D` Vignette (+zaten kapalı Bloom) pass'i kaldırıldı; FilmPass kaldı (siyaha 0 ekler, şeffaflığı bozmaz — doğrulandı). Deploy 50e2fcb → **kardeşinin Windows dizüstüsünde çerçeve gitti (canlı onaylandı).** Ders: şeffaf WebGL canvas'ta "boş piksele sabit karıştıran" pass'lerden kaçın; ACES+premultiplied negatifi görünür artığa çevirir. Detay: [[hero-kup-cerceve-fix]].
- **Web geneli hata taraması (2 paralel Explore ajanı):** panel modülleri + pazarlama/auth/3B. tsc+lint+`next build` temiz. **Kritik nokta: pazarlama bulgularının neredeyse tamamı yanlış pozitif çıktı** — gerçek kodla tek tek doğrulandı, körlemesine uygulanmadı (OtpVerify "stale email" → `email` zaten dep'te; SocialAuth matchMedia guard'ı doğru sırada + modeRef kasıtlı; proxy `rewrite` kasıtlı; Cüzdanım optimistic restore çalışıyor; AuthForm `window` useEffect'te client-only).
- **Panel sessiz DB hata yutmaları giderildi (deploy 1a411ee):** (1) İşlemler ay filtresi — sorgu hatası spinner'ı sonsuza takıyordu → hata gösterilip loading temizleniyor. (2) `adjustBalance`/`dbAdjust` — bakiye update hatası yutuluyordu → kullanıcıya bildiriliyor (dbAdjust hata→null, çağıran `!= null` ile zaten güvenli). (3) Transfer silme — ters sıra (bakiye geri al→sil) silme başarısızsa bakiyeyi bozuyordu → önce sil, hata varsa çık, sonra bakiye geri al. (4) Ayarlar "diğer cihazlardan çıkış" — `user_devices` delete hatası yanlış "başarılı" mesajı yerine hata toast'ı.
- **Bilerek YAPILMADI:** Faturalar numara sayacı update hatası (düşük önem; atomik artış server-side/RPC ister — DB şemasına dokunma). AuthForm/proxy edge-case robustluk (yanlış pozitif).

## 2026-07-01 — Web geneli denetim (4 paralel ajan) + düzeltmeler

Baştan sona hata/ölü-kod denetimi (tsc+build temiz, 11/11 rota 200 ile doğrulandı). **Düzeltildi (4 commit):**
- **Ölü kod:** SplashScreen.tsx + ServiceWorkerRegister.tsx (import edilmiyor), paraner-bg.jpg (860K) + paraner-logo.png + boot.html, 12 orphan CSS sınıfı (−27 satır). `sw.js` KORUNDU (kill-switch). CLAUDE.md güncellendi.
- **WebGL sızıntı/perf:** SplashCursor useEffect'e cleanup (cancelAnimationFrame + 7 dinleyici removeEventListener + WEBGL_lose_context) + dep array `[]` (inline obje prop'tan kümülatif context açılmaz). Beams görünürlük duraklatma (IntersectionObserver + visibilitychange → frameloop "never").
- **Teklifler:** numara `count()` yerine mevcut en büyük numaradan (silince mükerrer önlendi); quote_items patlarsa quote geri silinir (yetim önlendi).
- **proxy:** `isApp = hostname.startsWith("app.")`; pazarlama→app redirect yalnız paraner.com/www; girişli kullanıcı /giris|/kayit → panele.
- **Cila:** `lib/format.parseAmount` (Türkçe "1.234,56" → 1234.56, eskiden NaN→0) + `lib/date.advanceDate` (UTC-güvenli + ay taşması kısma, 31 Oca→28 Şub) → duzenli-odemeler/duzenli-fatura/maaslar/butceler retrofit. Modal a11y (role=dialog + odak yönetimi + focus-trap). vade daysSince UTC tarih-only. butceler disabled guard sadeleşti.

**Bilerek YAPILMADI (rapor + GOREVLER'de):** maaş/düzenli "Ödendi"→`transactions` (mobil parite/çift-kayıt riski), `contacts` profile_id (kod tutarlı, şema teyidi), update/delete'e user_id defense-in-depth (~11 modül, RLS zaten gate ediyor), panel server-side auth guard (proxy+RLS yeterli; "ikinci getUser" perf optimizasyonu korundu), budget kategori-id normalize (veri teyidi gerek).

## 2026-07-01 — Buton yenileme Adım 2: modal "Kaydet" → ortak SaveButton (titanyum)

Mehmet uiverse dark-glossy buton HTML/CSS'i verdi (kıvılcım ikonu + harf-harf shimmer + parıltı, referans mavi hue 210). "Uygun şekilde" uyarlandı:
- **Yeni ortak bileşen `components/SaveButton.tsx`** + `.sb`/`.sb-*` (globals.css). Mavi highlight NÖTR TİTANYUMA çevrildi ([[marka-rengi-degisecek]]): `--sb-accent:#d4d9df`. API: `<SaveButton busy={saving} disabled={saving} style={...}>{label}</SaveButton>` — children **string** olmalı (harflere bölünüp animasyonlanıyor). Varsayılan `type="submit"`. reduced-motion'da animasyon kapalı. `busy` (=kaydediliyor) → sürekli parıltı + ikon hızlı flicker; disabled ama .is-busy dim OLMAZ.
- **20 modal submit butonu (19 modül)** eski yeşil `btn btn-primary btn-block btn-lg` → SaveButton. Çoğu perl toplu-replace (2 geçiş: stilli/stilsiz), cüzdanım (2, btn-lg'siz) + hesaplar transfer (busy=tSaving) elle. **Kapsam dışı:** hesaplar info-modal "Anladım/Kapat" butonu (type=button) — hâlâ `btn btn-primary`.
- ⚠️ Perl notu: `s{}{}` delimiter'ı regex içindeki `[^}]` yüzünden bozuluyordu → `s###` delimiter kullanıldı. zsh'te `$files` unquoted BÖLÜNMEZ → glob'u doğrudan ver.
- tsc temiz + `next build` OK → deploy (4fd7566). **Canlı görünüm onayı bekleniyor** (özellikle harf shimmer'ın her modalda çok mu hareketli olduğu). Sıradaki: Adım 3 (ikincil `btn-ghost` butonlar).

## 2026-06-29 — Mobil auth KOYU tema (siyah) + mağaza rozetleri tek satır + Google buton fix

Mehmet onayıyla adım adım (canlı ekran görüntüleriyle), tümü `app/globals.css` + `SocialAuth.tsx`:
- **Mağaza rozetleri mobil (≤560):** `flex-wrap:nowrap` → 3 rozet TEK SATIR, eşit esner (`flex:1 1 0; min-width:0`), font `clamp()` + küçük padding/logo (≤360 ekstra sıkı). Masaüstü tek satır KORUNDU. Hero + auth altı tek bileşen (DRY) → ikisi de düzeldi.
- **Mobil auth SİYAH tema:** beyaz form override'ları (`.auth-card-form .X`, ~40 kural) `@media (min-width:1025px)`'e hapsedildi → mobil (≤1024) tek-sütun form base KOYU temaya döndü. `.auth-page/.auth-card/.auth-card-form` zemin `#000`/`--bg`, metin `var(--text)` (h1 miras alır), wordmark gunmetal→açık titanyum gradyan (siyahta görünür). **iOS dersleri uygulandı:** `min-height 100dvh→100svh` (klavye zıplaması), input `font-size:16px` (odakta zoom yok). Sabit konum / mask+filter YOK.
- **Teal nötrleme (mobil koyu):** base teal aksanları ([[marka-rengi-degisecek]]) nötrlendi — link/buton (Şifremi unuttum, Kod ile giriş yap) beyaz, input odak kenarı + OTP hücreleri nötr beyaz. Hata kırmızısı korundu.
- **Input köşeleri:** pill (999px) + 20px padding artık masaüstü+mobil ORTAK (şekil tutarlılığı, temadan bağımsız).
- **Google butonu (GIS) fix:** mobilde tema `outline`→`filled_black` (Apple koyu pill ile tutarlı). **Genişlik bug'ı:** GIS genişliği gizli (`display:none`) `gsi-wrap`'ten ölçülüyordu → `clientWidth=0` → sabit 240px (dar/ortada). Artık görünür parent `.social-auth`'tan hesaplanıyor (telefon=tam, masaüstü=yarım) → Apple ile birebir eşit.
- ⚠️ **Dev'deki 3 GSI_LOGGER hatası** ("origin not allowed" + 2× "failed to open popup") = localhost'a özgü, canlıda çıkmaz. Susturmak için Google Cloud Console → OAuth client → Authorized JS origins'e `http://localhost:3000` (config, kod değil; client ID mobil ile ortak ama JS origin web'e özel).
- **Mobil menü (☰) rozetleri:** ayrı 2-rozetli markup (`.mm-store`, App Store+Google Play) → paylaşılan `<StoreBadges />` (3 rozet yan yana, ana sayfa/auth ile birebir). Ölü `.mm-store*` CSS temizlendi; `.mm-stores` sadece alta-yaslama wrapper'ı.
- **Hero banner fade rozetlere biniyordu (mobil) FIX:** mobilde küp `order:-1` ile üste alınınca rozetler en dibe, `.hero-banner::after` fade (alt 220px, z1) içine düşüyordu. İçerik çocukları (entry animasyonu kalıcı `transform/filter` + iOS WebGL canvas compositing) ayrı stacking context olduğundan fade üstlerine sızıyordu. **Çözüm:** `.hero.wrap`'a `z-index:2` → tüm içerik tek katman, fade kesin olarak Beams (z0) ile içerik arasında.
- **Auth sayfası One Tap `prompt()` kaldırıldı (zıplama hipotezi 2):** local↔prod farkı = GIS One Tap canlıda çalışıyor (localde origin hatası → çalışmıyor). Auth'ta `prompt()` gereksiz (buton görünür) + ana sayfa GoogleOneTap ile çift `initialize()` ("multiple times" uyarısı) → geçişte layout/UI kayması şüphesi. `SocialAuth`'tan `prompt()` çıkarıldı; One Tap yalnız ana sayfada. (Headless'te oturum olmadığından canlı zıplama %100 reprodüce edilemedi; gerçek Chrome ölçümünde scroll zaten anındaydı → kalan prod-only fark GIS.)
- **Sayfa geçişinde dikey "zıplama" FIX (Next 16 kırılması):** ana sayfa→giriş/kayıt geçişinde scroll tepeye ANIMASYONLU gidip zıplıyordu. Sebep: `html{scroll-behavior:smooth}` (globals.css) var ama Next 16 artık geçişte smooth'u otomatik kapatmıyor (önceki sürümlerin aksine) — opt-in `data-scroll-behavior="smooth"` attribute'u gerekiyor (Next 16 upgrade doc + `disable-smooth-scroll.js` kaynağında doğrulandı). **Çözüm:** `app/layout.tsx` `<html>`'e `data-scroll-behavior="smooth"` eklendi → geçiş anında scroll, in-page #anchor linkler yine smooth. Dev'deki "Detected scroll-behavior: smooth…" uyarısı da kalkar.

## 2026-06-29 — Hero banner: ReactBits Beams (3D ışık huzmeleri) + arka plan görseli kaldırıldı

Ana sayfa hero arka planı (`paraner-bg.webp`) → **ReactBits Beams** (`components/Beams.jsx`, R3F custom shader material).
- **Yol:** önce ReactBits **SideRays** (ogl) denendi, sonra **Beams** seçildi → SideRays + `ogl` + `public/paraner-bg.webp` temizlendi.
- **Bağımlılıklar:** `@react-three/fiber@9` + `@react-three/drei@10` (React 19 uyumlu) + mevcut `three`.
- **Yerleşim:** `<Beams>` `.hero-fx` (position:absolute, inset:0) sarmalayıcısında → R3F Canvas inline `height:100%` doğru dolar (yoksa tepede minik şeride çöküyordu). İçeriğin arkasında (`.hero-fx` z-index:0, metin z:2, küp z:1).
- **Banner altı fade:** `.hero-banner::after` son 220px'de `transparent→#000` → alttaki #000 bölümle keskin çizgi yok.
- **Marka/ayar (onaylı):** `lightColor:#9aa0a6`, `beamWidth:1`, `beamNumber:12`, `beamHeight:15`, `speed:2`, `noiseIntensity:1.75`, `scale:0.2`, `rotation:30`. Parlaklık kısıldı: `directionalLight` 1→0.7, `ambientLight` 1→0.65.
- **Beams.jsx ayar düğmeleri:** parlaklık prop değil → `lightColor` + bileşen içi `directionalLight`/`ambientLight` intensity.

## 2026-06-29 — Footer arka planı: ReactBits Splash Cursor (akışkan imleç)

Footer arka planı için birkaç tur denendi, oturmuş durum:
- **Araştırma:** resend.com/forward arka planı = Paper Shaders WebGL (Warp ailesi). Önce bağımlılıksız özel shader, sonra `@paper-design/shaders-react <Warp>`, sonra ReactBits **Hyperspeed** (three.js otoyol) denendi — hepsi bırakıldı.
- **Final = ReactBits "Splash Cursor"** (`components/SplashCursor/`, vanilla WebGL akışkan, **sıfır bağımlılık**). Footer'a hapsedildi: konteyner `fixed`→`absolute`, koordinatlar canvas'a göreceli (splat'lar footer içinde doğru yerde).
- **Marka:** monokrom **titanyum** renk (`#9aa0a6`), `RAINBOW_MODE` kapalı, şeffaf bg ([[marka-rengi-degisecek]]). Params: SIM 128 / DYE 1440 / density 3.5 / curl 10 / splat 0.25·6000.
- **Footer `min-height: 300px`** → akışkana dikey alan (en-boy ~10:1→~5:1), girdaplar gelişir; aksi halde ince şeritte sıkışık görünüyordu.
- **Perf:** footer görünüme girince **bir kez** mount (bileşende cleanup yok → unmount sızdırırdı), reduced-motion'da hiç yüklenmez. `pointer-events:none` (efekt window'dan dinler, footer linkleri etkilenmez).
- **`Hyperspeed.css`** global `canvas {}` selektörü diğer canvas'ları (AuthCube3D/BeamInput) bozuyordu → kaldırılınca sorun gitti. `three` AuthCube3D'de kullanılıyor → `^0.185.0`'da kalmalı (Hyperspeed denemesinde istemsiz 0.180 düşüşü düzeltildi).
- ⚠️ Bu efekt yalnız **imleç footer üstündeyken** tepki verir (global değil — Mehmet bilerek footer'ı seçti). İstenirse `RAINBOW_MODE={true}` tek satırla çok renkli olur.

## 2026-06-28 — Auth: masaüstü görsel arka plan (KALICI) + mobil koyu deneme geri alındı

- **Masaüstü (KALICI, onaylı):** `.auth-page` arka planı koyu görsel `public/auth-bg.webp` (cover, `#060607` fallback). Sol panel içi boşaltıldı → arkadaki görsel görünür; beyaz çerçeve (`.auth-card` 4px border) + sağ köşeler yuvarlatıldı (`0 24 24 0`). `.auth-cube` panel görseli sayfa bg'siyle dikişsiz. `.auth-card` bg `#fff`.
- **Mobil (≤560) resend-tarzı koyu deneme → TAMAMEN GERİ ALINDI:** klavye (iOS yatay kayma / dvh) ve logo görünmezliği (mask+filter Safari bug) çözülemedi → Mehmet "ilk haline al" dedi. `@media (max-width:560px)` auth bloğu komple silindi → mobil orijinal **tek-sütun BEYAZ formu** kullanıyor. SocialAuth mobil değişiklikleri + `html overflow-x` + `.btn-dots` geri alındı. (Dersler yukarıda ⚠️.)

## 2026-06-27 — Hesap silme veda maili + Ayarlar "Hesabı Sil" (CANLI doğrulandı)

İki repo (web + app) + Supabase. Veda maili artık `auth.users` DELETE trigger'ında (tek yerden) → silme nereden gelirse gelsin tek mail gider. `send-farewell-email` Edge Function (app, secret-korumalı) + DB trigger; `delete-account`'tan satır-içi mail kaldırıldı (çift gönderim önlendi). Web Ayarlar'a "Hesabı Sil" butonu (`AyarlarClient`, onay → `delete-account` → signOut → `/giris?closed=1`). **Canlı doğrulandı:** dashboard'dan silmede "Görüşmek üzere" maili geldi.
- **İLERİDE (Mehmet):** admin/dashboard silmede FARKLI mail (kullanıcı kendi silince ayrı, biz silince ayrı). Trigger'a silme kaynağı ayrımı eklenecek.

## 2026-06-27 — Hesap birleşme + onboarding fix (CANLI doğrulandı)

- **Hesap birleşme:** Aynı e-posta hem OTP hem Google ile → Supabase tek hesapta birleştiriyor (Email+Google tek UID), veri bölünmüyor. Kod değişikliği gerekmedi.
- **Onboarding "Hazırlanıyor…" sonsuz takılma FIX:** bitişte `router.refresh()` (server yeni profili hemen görmüyordu) → `window.location.assign("/panel")` (tam reload, server profili taze okur, modal %100 kapanır).

## 2026-06-27 — Auth koyu mod + Sonner toast + çıkış yönlendirme

Marka yeşili kaldırılıyor ([[marka-rengi-degisecek]]), nötr/koyu dile çekildi. Hepsi canlı doğrulandı.
- **Çıkış → paraner.com** (`LogoutButton` host'tan `app.` ön ekini kaldırır, tam yönlendirme).
- **Switcher + butonlar:** parlak siyah pill (Uiverse marcelodolza, `FancySubmit` 3 submit'i sarar), titanyum thumb, yeşil/teal temizlendi (input focus, OTP, linkler nötr; hata kırmızısı korundu). Buton loading metinleri ayrıştırıldı ("Kod gönderiliyor…", "E-postanı kontrol et…").
- **Sonner-tarzı toast (proje geneli):** mevcut `toast.ts`+`ToastHost` bağımlılık eklemeden Sonner davranışına getirildi (sağ üst yığılma, hover'da listeye açılma, variant ikonları nötr). `auth-msg` inline kutuları `showToast`'a yönlendirildi.

## 2026-06-27 — Ana sayfa: Beam Input + mağaza rozetleri + Google One Tap + kayıt sadeleştirme

- **Beam Input** (`BeamInput.tsx`, hover.dev tarzı, sıfırdan saf-CSS — `@property --beam-angle` + conic-gradient + mask, framer-motion yok): hero CTA çifti kaldırıldı → e-posta pill + "Ücretsiz Başla". Submit → `/kayit?email=...&start=1` → AuthForm otomatik `sendSignupOtp` → "Kodu gir" adımı. Hover'da ok belirir+buton büyür; autofill koyu zemin fix. Titanyum huzme (teal istenirse tek değişken).
- **Mağaza rozetleri (3'lü):** `StoreBadges.tsx` (Google Play 4-renk · Apple · Huawei AppGallery, inline SVG). Ana sayfa hero + auth altı (DRY aynı bileşen). Şimdilik tıklanmaz (uygulamalar yayında değil). Hover'da beam huzmesi.
- **Google One Tap** (`GoogleOneTap.tsx`, ana sayfa): Gmail açıkken "Paraner olarak devam et" kartı → `signInWithIdToken` → app.paraner.com. ⚠️ Canlıda gerçek Google oturumuyla test edilmeli (headless'te kart görünmez = beklenen).
- **Kayıt sadeleşti:** Ad Soyad kayıttan kaldırıldı → onboarding'e taşındı (`OnboardingModal`: bireysel name adımı, işletme company+name; OAuth'tan auto-dolu, e-postada zorunlu). Hover'da yukarı-kalkma efekti kaldırıldı.

## 2026-06-27 — Ana sayfa hero animasyonları + 3D küp performans/flaş

- **Hero metin giriş animasyonu** (Resend tarzı): `.hero-text > *` `heroRise` (translateY+blur+fade, stagger), başlık sheen. **Hero başlık harf-harf blur-in-up** (`HeroTitle.tsx`, Magic UI blurInUp → saf CSS, her harf gecikmeli `hcRise`, gradyan `background-image` ile korundu). `prefers-reduced-motion` kapalı.
- **3D küp performans:** görünmezken duraklat (`visibilitychange` + `IntersectionObserver` → rAF iptal) → fan/CPU düştü.
- **Küp beyaz flaş (NİHAİ):** yalnız harici DisplayPort monitör + Windows'ta, ara sıra → compositor zamanlama yarışı. Çözüm: `renderer.render()` bir kez yapıp canvas'ı öyle `appendChild` + `preserveDrawingBuffer:true` → boş kare compositlenmez. ⚠️ Harici monitörde son teyit bekliyor.
- **Performans:** `paraner-bg.jpg` 4K 880KB → WebP q88 **79KB (%91↓)**. FCP 0.85s, genel hızlı.

## 2026-06-27 — Auth görsel arka plan (ilk versiyon, 06-28'de oturdu)

Düz koyu degrade → markaya özel koyu görsel (`auth-bg.webp`). Bkz. 2026-06-28 (final masaüstü durumu).

## 2026-06-26 — Marka logosu: yeşil → titanyum

Yeşil logo bırakıldı, küple uyumlu titanyuma geçildi (web + app). Mehmet **Titanyum (01)** seçti; auth beyaz form zemininde **Gunmetal (03)**.
- Yeni şeffaf PNG: `paraner-wordmark-titan.png` + `paraner-p-titan.png`. CSS-mask wordmark'lar (PNG=alfa maske, renk CSS bg'den): `.splash-word`/`.auth-wordmark`(gunmetal)/`.reset-card`/`.switch-word` titanyuma çekildi. Sidebar `<Image>` src'leri yenilendi.
- **Favicon + PWA ikonları:** teal P → dikey titanyum gradyan (favicon.ico elle PNG-gömülü).
- **App tarafı (paraner-app, commit dc4c322):** asset PNG'ler + `AnimatedWordmark` titanyuma. ⚠️ App ikonu + native splash yeni native build + store gönderimi gerektirir.

## 2026-06-26 — Ana sayfa: tam ekran banner + titanyum (yeşilsiz) + hero'da 3D küp

- **Banner = markaya özel görsel** `public/paraner-bg.jpg` (4K, yalnız `.hero-banner`'da; site geneli sade koyu). Tek katman flex: metin solda (max 520), küp sağda `position:absolute` (kırpılmaz). Hero tam ekran (`100svh-68px`).
- **Yeşil tamamen kaldırıldı (marketing monokrom/titanyum):** eyebrow/h1-em/logo/butonlar titanyum (`.nav/.hero/.cta-band` scope'lu). **Panel/auth/onboarding teal'i KASITLI korundu** ([[marka-rengi-degisecek]]).
- Küp: `AuthCube3D` `zoom`/`playIntro` prop'ları (ana sayfada intro kapalı).

## 2026-06-26 — Üst bar + mobil menü (mgzrmedia / Resend tarzı)

- **Üst bar:** banner'a gömülü, kaydırınca **iOS Liquid Glass pill** (`Nav.tsx` client, `scrollY>30` → `.scrolled`). Koyu cam (`rgba(10,12,15,0.86)` + sheen + blur). Pill genişliği hero ile hizalı (`calc(1500px - 2*clamp(24,5vw,72))`). `solid` prop (banner'sız sayfalar).
- **Mobil:** liquid-glass pill YOK → sade blur bar + ☰ → tam ekran `.mobile-menu` (Resend düzeni: wordmark+✕, Kayıt Ol pill, Giriş, satırlar, mağaza rozetleri). `.mobile-menu` `.nav` DIŞINDA kardeş (ata `backdrop-filter` `position:fixed` çocuğu bozuyordu). Logo mobilde hep wordmark.
- ⚠️ Mobil base `.logo*` kuralları `@media`'dan ÖNCE tanımlanmalı (eşit specificity'de sonraki kazanır).

## 2026-06-26 — Auth küp: Three.js (özgün) — v1→v6 iterasyonları

Resend'in sürüklenebilir 3D küpü istendi (telifli `cube.mp4` ALINMADI → özgün Three.js sahnesi). Çok tur geliştirildi, **final v6** durumu:
- `AuthCube3D.tsx`: vanilla Three.js (dinamik import), 3×3×3 eğimli cubie (`RoundedBoxGeometry`), **yüz-başına malzeme** (lake/karbon/fırçalı metal/ızgara/satin), **her yüzde para birimi** ($ € £ ₺ ¥), filmik ışık (ACES + key/rim/specular + yumuşak gölge).
- **Hareket:** yavaş çok-eksenli dönüş + Rubik katman dönüşü (90°/180°/alt-üst ters, küp DAĞILMAZ). Custom pointer drag (`rotateOnWorldAxis` + momentum), OrbitControls kaldırıldı. reduced-motion → durur.
- **Giriş:** ortadan scale 0.05→1, %55'ten sonra spin rampa, ~%70'te cam-kırılma overlay (`cube-crack`, prosedürel).
- (Ara denemeler: scatter/topla morph, harf-decal, video-küp `paraner-cube.mp4` — hepsi bırakıldı, video public'te kullanılmıyor.)

## 2026-06-26 — Auth form cilası (canlı turlar) + primary buton

Çok tur canlı geri bildirim, oturmuş durum:
- **Switcher dikey/yatay zıplama fix:** `.auth-card-form justify-content:flex-start` + `.auth-split-form` min-height kaldırıldı + `padding-top:clamp(40px,14vh,150px)` → wordmark/switcher iki modda SABİT konum.
- **Label→placeholder** (input içi) + `aria-label`. **Giriş⇄Kayıt geçiş animasyonu** (`key={mode}`, yumuşak kayıp belirme). **Titreme fix:** `SocialAuth` GIS bir kez init (`key="social"`, animasyon dışında).
- **Google+Apple birebir eşit** (`flex:0 0 calc(50%-8px)`, GIS gerçek genişliğe render). **OTP aktif hücre** teal override + yanıp sönen caret.
- **Auth kartı** `max-width:1440 max-height:820` (her ekranda aynı kompozisyon), tek-sütun eşiği ≤1024.
- **Primary buton (`.btn-primary`):** teal glow + cam iç-parlaması + hover kalkma + shine sweep (`::before`). Tüm primary butonları etkiler.
- **Ölü kod:** `AuthVisual.tsx` + `.av-*`/`.fin-card`/`.fc-*` CSS silindi (sol panel videoya/küpe geçince ölmüştü).

## 2026-06-26 — Şifremi unuttum (mobil paritesi)

- **`AuthForm`:** "Şifremi unuttum" → `resetPasswordForEmail(email, {redirectTo: origin+'/sifre-sifirla'})`.
- **`/sifre-sifirla`** (yeni, noindex + `ResetPasswordClient`): recovery oturumu kurar (PKCE `?code` / `token_hash`+`type` / detectSessionInUrl auto-takas — hepsine dayanıklı) → yeni şifre → `updateUser` → panele.
- **`proxy.ts`** `PUBLIC_PATHS`'e `/sifre-sifirla` eklendi.
- **Fix:** reset maili **implicit flow** ile gönderiliyor (`createClient({implicit:true})`) → `{{ .TokenHash }}` düz token olur (pkce_ değil) → farklı cihaz/tarayıcıda da çalışır.
- ⚠️ Supabase Redirect URLs config gerekli (yukarıda ⚠️ listesinde).

## 2026-06-25 — Auth redesign: birleşik AuthForm + sürüklenebilir switcher

- **Birleşik `AuthForm.tsx`:** `/giris` + `/kayit` aynı bileşen, farklı `initialMode`; mod yerinde değişir (`history.replaceState` ile URL de). Tüm mantık korundu (OTP, şifre fallback, Google GIS, OAuth `?code`, kayıt OTP).
- **iOS UISegmentedControl tarzı switcher** (tıkla/sürükle, pointer events). Üstte Paraner wordmark. Alttaki "hesabın var mı" linkleri kaldırıldı.
- Sol panel 4px beyaz çerçeve + yuvarlak köşe. (Sol panel içeriği önce finans videosu → sonra küp → en son 06-28'de görsel.)

## 2026-06-20 — favicon.ico (Google Search Console) + temizlik

`app/favicon.ico` (16/32/48 ICO) → `/favicon.ico` 200 (önce 404'tü). `app/acilis/` (vazgeçilen boot splash) silindi. `_gen-icons.js` gitignore'a.

## 2026-06-19 — Gizlilik Politikası (App Store için)

`app/gizlilik/page.tsx` (server, `https://paraner.com/gizlilik`): mobil `privacy.tsx` ile eşleşen metin (KVKK m.11, MGZR LLC, destek@paraner.com). Footer + sitemap + `.legal` stili. ⚠️ App Store Nutrition Labels + reviewer demo hesabı panel işi (GOREVLER).

## 2026-06-15 — PWA ikonu (dock siyah kare fix) + açılış hızı

- **PWA ikon:** keskin siyah kare → `sharp` ile Surfshark-tarzı teal gradyan zemin + **orijinal teal P korundu** (Mehmet: logo rengi aynı kalmalı). icon-512/192, apple-icon, maskable-512, manifest. ⚠️ Kurulu PWA ikonu cache'li → kaldırıp yeniden kur + deploy.
- **Açılış hızı (FINAL):** `public/boot.html` (inline CSS + base64 logo gömülü, 14KB, anında boyanır → `/panel`'i ısıtır → redirect) + `public/sw.js` (yalnız boot.html cache, uygulama/veri cache YOK). `start_url=/boot.html`. (Ara denemeler `/acilis` static splash bırakıldı.) ⚠️ start_url + SW ancak PWA yeniden kurulunca aktif.
- **Splash:** `SplashScreen.tsx` (siyah + teal wordmark + shimmer); manifest `background/theme_color` → `#000000` (eskiden teal → açılış yeşildi).

## 2026-06-13 — Dashboard sıfırdan + hesap kartları + ikonlu kategoriler

- **İşlem Ekle modalı:** Gelir solda/Gider sağda (mobil), hesap seçimi = kaydırılabilir gerçek kart görselleri (`Modal wide`).
- **Seçiciler (portal popover):** `DatePicker` (özel TR takvim), `CategoryPicker` (ikon+renk, satır-içi "Yeni kategori" formu, özel kategori düzenle/sil). Temel kategoriler düzenlenemez.
- **Kategori ikonları:** `lib/categoryIcons.tsx` mobil Ionicons → lucide (65 ikon). Özel kategoriler localStorage (cihaz-yerel).
- **Hesaplar:** `AccountCard` 6 gradient tema (`lib/cardThemes`), PARANER wordmark, em-tabanlı ölçek (`1cqw`) → her boyutta tutarlı. Form: tema seçici + tür segmenti + para birimine göre IBAN/routing.
- **Genel Bakış → dashboard:** 4 KPI + sparkline, Shopify-tarzı `LineChart` (saf SVG, hover tooltip), Kartlarım, Kategori `Donut`, zengin Son İşlemler. Tek render (1 transactions + 1 bank_accounts, son 6 ay).
- **Menü temizliği:** sayfaya giden tekrarlar kaldırıldı (Gelir/Gider Özeti, Kasa & Banka, KDV Beyanname; Teklif×2 → tek Teklifler). Panel içeriği tam genişlik.

## 2026-06-12 — Cüzdanım canlandı (Truncgil) + sidebar + çoklu para birimi

- **Cüzdanım tam işlevsel:** `lib/market.ts` Truncgil `today.json` server fetch (5dk cache, mobil `marketService` paritesi). `lib/assets.ts` katalog + değerleme. `CuzdanimClient`: portföy şeridi (Değer/K-Z/Bugün) + dağılım donut + varlık listesi. İşlemler (mobil `savingsStore`): ekle = ağırlıklı ort. maliyet; sat = tam→sil / kısmi→koru; `savings_asset_movements` hareket kaydı (ortak tablo). Gerçek altın görselleri (`public/gold/`). Varlık türü dikey açılır seçici.
- **Sidebar:** işletme üst menüsüne Cüzdanım eklendi (çekirdek: Genel Bakış·İşlemler·Hesaplar·Cüzdanım).
- **İşlemler:** çoklu para birimi çipi (yalnız >1 para birimi varsa görünür).
- **Workflow notu:** Mehmet dev'den kontrol ediyor → her değişikliği deploy etme, push "işi bitir"de.

## 2026-06-11 — İşlemler (düzenleme/transfer/detay) + hesap ekleme + sol menü + işletme sayfaları

- **İşlemler:** düzenleme (bakiye mutabakatı), ay filtresi (`<input month>` → o ayı DB'den), **hesaplar arası transfer** (`transfer_out/in` + opsiyonel `transfer_fee`, ortak `transfer_group_id`, farklı para birimi engelli; transfer satırı düzenlenemez, silince çift bacak birlikte gider).
- **İşlem detay paneli** (sağ yüzen kart, Esc/X): tutar/kategori/tarih/**saat**/hesap/**eklendiği yer**/not. `transactions.source` kolonu eklendi (web `'web'` yazar; boş→Mobil; ileride `'accountant'`).
- **Dosya/fiş ekleme:** sürükle-bırak (max 3, PNG/JPG/PDF), mobil ile ortak `receipts` bucket + kolonlar. PDF yanlış content-type'la saklanmışsa blob ile telafi.
- **Hesap ekleme (max 3):** Sidebar switcher'da Bireysel/İşletme + ad → `createAccount` (mobil `createProfile` alan seti) → otomatik geçiş. **Liquid-glass geçiş animasyonu** (PARANER wordmark soldan sağa yeşile dolar). İşletme webde direkt açılıyor (Stripe/trial sonra).
- **Sol menü revizyonu:** ayrı yüzen liquid-glass bar, aç/kapa kol (tık + sürükle-snap), iç scroll + mask-image fade, **Lucide ikonlar** (tüm site), işletme accordion (`businessMenu.tsx`, mobil paritesi 7 bölüm), Favoriler (localStorage).
- **İşletme sayfaları çalışır (şemaya dokunmadan):** Stok/Ürünler, Çalışanlar, Finans (düzenli-ödeme/çek-senet/borç-alacak/bütçe/kdv), Müşteriler (veresiye/mutabakat/vade), Faturalar (`?type` filtre + Teklifler kalemli + düzenli-fatura), Raporlar (nakit-akışı/gelir-gider+CSV/kar-zarar/kdv/vergi-takvimi). 30 öğe çalışır, 6 "Yakında" (OCR/döviz API/PDF/SGK/e-Defter/Muhasebeci).
- **İşletme Ayarları** → Ayarlar sayfasına (Fatura Numaralandırma, Bildirim, Yedek/Export, Roller-yakında).
- **Mobil Claude'a:** `source` mobil de yazsın; mobil transfer silme bug (tek bacak); mobil PDF content-type bug.

## 2026-06-10 — Panel altyapısı (sıfırdan) + Stripe-tarzı redesign + performans

- **Altyapı:** `@supabase/ssr` + `supabase-js`, `.env.local` mobil ile aynı proje (`oqhonmmbcqrkcaoijgnb`, `NEXT_PUBLIC_`). `lib/supabase/` (client/server/cookieDomain `.paraner.com`). `proxy.ts` (Next 16 middleware→proxy: host bazlı yönlendirme + auth guard). DNS: `app` CNAME → Vercel. Canlı OK.
- **Panel modülleri:** Genel Bakış (KPI), İşlemler, Hesaplar, Cariler, Faturalar (KDV otomatik + sayaç), Cüzdanım (v1 salt-okunur), Ayarlar. `lib/format` + `lib/categories` (mobil paritesi).
- **Stripe-tarzı redesign (koyu+teal):** token katmanı (anlamsal renkler/skala), ortak `components/ui/` (Modal/PageHead/Field/Avatar/Sparkline). Sparkline + metrik düzeni, gruplu/daralabilir Sidebar (localStorage), filtre çipleri, profil/işletme logosu (`avatar_url`/`company_logo_url`), PARANER wordmark.
- **Performans:** `loading.tsx` iskelet, aktif profil React `cache()` tek sorgu (`lib/supabase/profile.ts`), gereksiz ikinci `getUser()` kaldırıldı.
