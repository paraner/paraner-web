# Soğuk Mail Kampanyası — İşletmelere 14 Gün Ücretsiz Deneme

> Durum: **PLAN** (kod değil). Mehmet, 28.07.2026: "Paraner'i bitirdikten sonra işletmelerin
> maillerini bulup 14 gün ücretsiz denemeyi anlatan güzel bir mail atmak istiyorum; 10.000+
> mail, her işletmeye özel başlık, otomatik olsun."
> Bu dosya yol haritası + karar gerekçeleri. Uygulama zamanı geldiğinde buradan ilerlenir.

---

## 0. ÖNCE ŞU İKİ ŞEYİ BİL — GERİSİ BUNUN ÜSTÜNE KURULUR

### ⛔ Kural 1: Bu mailler **paraner.com'dan GİDEMEZ**
Paraner'in kendi mailleri (şifre sıfırlama, hoş geldin, destek yanıtı, ekip daveti, veda maili)
**paraner.com** adresinden gidiyor. Kaynak: `lib/staffInvite.ts`, `lib/adminActions.ts` ve
mobil edge function'lar (`send-welcome-email`, `support-reply-notify`, `login-alert` …).

Soğuk mail, tanımı gereği "istenmemiş" maildir. Binlerce kişiye atınca bir kısmı **spam
işaretler**. Spam şikâyeti alan alan adının itibarı düşer → o alan adından giden **HER MAİL**
spam'e düşmeye başlar. Yani şifre sıfırlama maili müşteriye ulaşmaz. Bu, kampanyadan
kazanılacak her şeyden pahalıya patlar.

**Karar: kampanya için AYRI alan adı alınacak** (ör. `paranerapp.com`, `paranerio.com`).
Yanarsa yansın; `paraner.com` temiz kalır. Linkler yine `paraner.com`'a gider.

### ⛔ Kural 2: Bu mailler **Resend'den GİDEMEZ**
Paraner şu an Resend kullanıyor. Resend'in Kabul Edilebilir Kullanım Politikası **soğuk maili
ve satın alınmış/toplanmış listeleri açıkça yasaklıyor**. Denersen hesap askıya alınır →
Paraner'in tüm işlem mailleri aynı anda durur.

Aynısı Postmark, SendGrid, Brevo, Mailchimp için de geçerli. Bunlar "izinli liste" araçları.

**Karar: soğuk mail için soğuk mail aracı kullanılacak** (Instantly / Smartlead sınıfı).
Bunlar kendi sunucularından atmaz; **senin posta kutularını** bağlar, aralarında paylaştırır,
ısıtır. Tamamen farklı bir iş modeli.

> Sonuç: **iki ayrı sistem**. İşlem mailleri (Resend + paraner.com) ve kampanya (soğuk mail
> aracı + ayrı alan adı) birbirine HİÇ değmez.

---

## 1. Yasal taraf (Türkiye) — iyi haber var

**6563 sayılı kanun + Ticari İletişim Yönetmeliği:** ticari elektronik ileti için normalde
önceden onay şart. **AMA alıcı tacir veya esnaf ise önceden onay ARANMAZ.** Yani işletmelere
mail atmak yasal.

Ancak üç şart var:

1. **İYS kaydı zorunlu.** Hizmet sağlayıcı olarak İleti Yönetim Sistemi'ne kaydolman,
   gönderdiğin adresleri İYS'ye yüklemen gerekiyor.
2. **Ret hakkı kontrol edilmeli.** Bir işletme "artık gönderme" derse İYS'ye işlenir ve bir
   daha gönderilmez. Her mailde **kolay bir çıkış yolu** olmalı ("Bu maili almak istemiyorsan
   'çıkar' diye yanıtla" yeterli ve daha samimi durur).
3. **Şahıs şirketi / kişisel mail = KVKK.** `info@sirket.com` tüzel kişi verisidir, KVKK
   kapsamı dışı. Ama `ahmet@sirket.com` ya da şahıs işletmesi sahibinin maili **kişisel
   veridir** → aydınlatma yükümlülüğü doğar. Mailin altına tek satır kaynak açıklaması koy:
   "Bu adrese, işletmenizin herkese açık iletişim bilgilerinden ulaştık."

⚠️ Bu bir hukuk görüşü değil. 10.000 gönderim ciddi hacim; **başlamadan önce bir avukata
yarım saat danış**, İYS kaydını da onunla yap. Ceza riski kampanya bütçesinden büyük.

---

## 2. Altyapı — "10.000 maili nasıl gönderirim" işin en kritik kısmı

Yeni bir alan adından bir günde 10.000 mail atılmaz. Atarsan hepsi spam'e düşer, alan adı yanar.

### Kurulum
- **2–3 alan adı** al (yumurtaları tek sepete koyma).
- Her alan adına **3–5 posta kutusu** (Google Workspace veya Microsoft 365). Toplam ~9–15 kutu.
- Her alan adı için **SPF + DKIM + DMARC** kaydı. (Bunları kurmadan atılan mail doğrudan spam.)
- Soğuk mail aracına kutuları bağla, **ısıtma (warm-up)** özelliğini aç.

### Isıtma
2–4 hafta boyunca araç, kutularının birbirine sahte yazışma yaptırır; Gmail/Outlook o adresi
"gerçek insan" sanır. **Bu adım atlanamaz.** Isıtmadan atılan kampanya %90 spam'e gider.

### Hacim matematiği
| | |
|---|---|
| Güvenli hız | posta kutusu başına **günde ~30 mail** (ısıtma sonrası) |
| 12 kutu ile | günde ~360 mail |
| 10.000 tek dokunuş | **~28 gün** |
| 2 takip maili ile (toplam 3 dokunuş) | ~30.000 gönderim → kutu sayısını artır ya da 2–3 aya yay |

Yani bu bir "bir gecede" işi değil, **1–2 aylık bir kampanya**. Buna göre planla.

---

## 3. İşletmeleri bulma

Öncelik sırası (kalite → hacim):
1. **Google Haritalar kazıma** (Outscraper / Apify gibi servisler). Şehir + sektör ile filtre:
   "Ankara kuaför", "İzmir kafe", "Bursa mobilyacı". Ad, telefon, site, adres, puan gelir.
   Mail çoğu kayıtta yok → sitesinden çekilir.
2. **Site üzerinden mail bulma** — kazıma aracı siteyi gezip `info@`, `iletisim@` yakalar.
3. **Oda/dernek üye listeleri** — esnaf odaları, sanayi/ticaret odası üye dizinleri, sektör
   dernekleri. Herkese açık ve kaliteli.
4. **Ticaret Sicil Gazetesi** — yeni kurulan şirketler. "Yeni kurdu, henüz muhasebe düzeni
   yok" → Paraner için en iyi zamanlama.

### ⚠️ Atlanamaz adım: mail doğrulama
Listeyi göndermeden önce **doğrulama servisinden geçir** (MillionVerifier / ZeroBounce sınıfı).
Ölü adreslere atmak **sert geri dönüş (hard bounce)** demektir; %3'ü geçince alan adın yanar.
10.000 adres doğrulama ~1.500–2.000 ₺ civarı; **kampanyanın en ucuz sigortası budur.**

---

## 4. "Her işletmeye özel" nasıl otomatik olur

10.000 maili tek tek yazmak diye bir şey yok. Üç katman var, üçü birlikte kullanılır:

### Katman 1 — Birleştirme alanları (en kolay, en sağlam)
Listede sütun olarak tutulur, araç mailde yerine koyar:
`{{isletme_adi}}`, `{{sehir}}`, `{{sektor}}`, `{{ilgili_kisi}}`

> Konu: **Kırmızı Kuaför için 14 gün ücretsiz**

### Katman 2 — Sektör şablonları (en kârlı yatırım)
10.000 ayrı mail değil, **6–8 sektöre 6–8 ayrı şablon**. Kuaföre "randevu ve kasa takibi",
kafeye "günlük ciro ve gider", mobilyacıya "sipariş ve stok" dersin. Aynı emekle çok daha
yüksek dönüş verir çünkü mail **onun işini biliyormuş gibi** okunur.

### Katman 3 — AI ile kişisel ilk cümle
Her işletmenin sitesinden/Haritalar açıklamasından bir cümle üretilir:
> "Beşiktaş'ta 12 yıldır aynı yerde olmanız dikkatimi çekti."

Bunu araçların kendi AI'ı yapabilir; ya da **Claude API ile toplu çalıştırılır** (10.000 satır
için maliyet birkaç dolar). Dönüşü en çok artıran katman budur ama en son eklenmelidir —
önce 1 ve 2 çalışsın.

### Konu satırı kuralı
Kısa, küçük harf, reklam kokmayan. Pazarlama diliyle yazılmış konu satırı spam filtresini de
tetikler, insanı da kaçırır.
- ✅ `Kırmızı Kuaför — kasa defteri`
- ✅ `soru: Kırmızı Kuaför'ün gider takibi`
- ❌ `🎉 %100 ÜCRETSİZ DENEME FIRSATI!!! 🎉`

---

## 5. Mail şablonu (taslak — sektöre göre uyarlanacak)

**Kurallar:** düz metin gibi görünsün (renkli/görselli HTML şablon = reklam = spam),
**tek link**, 90 kelimeyi geçme, tek bir istek.

```
Konu: {{isletme_adi}} — gider takibi

Merhaba,

{{sehir}}'de {{sektor}} işi yapan işletmelerle konuşuyorum. Çoğunun ortak derdi
aynı: ay sonunda "para nereye gitti" sorusuna defterden bakarak cevap vermek.

Paraner'i tam bunun için yaptık: gelir-gider, fatura, cari ve KDV tek yerde.
Telefondan da bilgisayardan da aynı hesap.

14 gün ücretsiz deneyebilirsiniz, kart istemiyoruz:
https://paraner.com

Uygun değilse "çıkar" diye yanıtlamanız yeterli, bir daha yazmam.

Mehmet
Paraner

Bu adrese işletmenizin herkese açık iletişim bilgilerinden ulaştık.
```

### Takip zinciri (asıl dönüş buradan gelir)
| Gün | İçerik |
|---|---|
| 0 | Yukarıdaki mail |
| +3 | Tek satır: "Bunu gördünüz mü? Kısa bir soru: faturaları şu an nasıl takip ediyorsunuz?" |
| +7 | Somut örnek: "{{sektor}} işletmelerinde en çok şu işe yarıyor: …" |
| +12 | Kapanış: "Sizde karşılığı yok galiba, listeden çıkarıyorum. İleride lazım olursa buradayız." |

Kapanış maili şaşırtıcı biçimde en çok yanıt alan maildir.

---

## 6. Ölçüm — neye bakacaksın

- **Açılma oranını fazla ciddiye alma.** Apple Mail açılmaları sahte şişiriyor. Dahası
  **açılma takibi (piksel) spam riskini artırır → KAPAT.**
- Gerçek ölçüt: **yanıt oranı** ve **deneme başlatan işletme sayısı**.
- Linke `?utm_source=mail&utm_campaign=<sektor>` ekle; hangi sektörün çalıştığını gör.
- **Sert geri dönüş %3'ü geçerse kampanyayı DURDUR**, listeyi temizle. Geçmezsen alan adı yanar.

### Gerçekçi beklenti (tahmin, garanti değil)
| | |
|---|---|
| Yanıt oranı | %1–4 → 10.000'de **100–400 yanıt** |
| Deneme başlatan | %0,3–1 → **30–100 işletme** |
| Ödemeye dönen | denemelerin %10–25'i → **5–25 müşteri** |

Bunu "az" diye okuma: 10–20 gerçek işletme müşterisi, ürün daha yeniyken çok değerli geri
bildirim demek. Ama "10.000 mail = 1000 müşteri" beklentisiyle girme, öyle olmuyor.

---

## 7. Bütçe (yaklaşık, ay bazında — fiyatlar teyit edilmeli)

| Kalem | Yaklaşık |
|---|---|
| 2–3 alan adı | ~500 ₺/yıl |
| 12 posta kutusu (Google Workspace) | ~3.000 ₺/ay |
| Soğuk mail aracı (Instantly/Smartlead) | ~1.500–3.500 ₺/ay |
| Liste kazıma (tek seferlik) | ~2.000–4.000 ₺ |
| Mail doğrulama (10.000 adres) | ~1.500–2.000 ₺ |
| **Toplam (kampanya boyunca, 2 ay)** | **~15.000–20.000 ₺** |

Kutu sayısını azaltarak ucuzlatabilirsin ama süre uzar. **Doğrulamadan ve ısıtmadan kısma** —
kısarsan tüm bütçe çöpe gider.

---

## 8. Sıra (bu sırayla yapılacak)

1. [ ] Avukat görüşmesi + **İYS kaydı**
2. [ ] Kampanya alan adlarını al, SPF/DKIM/DMARC kur
3. [ ] Posta kutularını aç, araca bağla, **ısıtmayı başlat** (2–4 hafta bekleyecek)
4. [ ] Bu sürede: liste topla → doğrula → sektöre göre ayır
5. [ ] Sektör şablonlarını yaz (6–8 adet) + takip zinciri
6. [ ] **PİLOT: 300 mail.** Yanıt oranına bak, konu/metni düzelt.
7. [ ] Pilot tuttuysa hacmi kademeli aç (günde +50)
8. [ ] Haftalık: geri dönüş oranı, yanıtlar, deneme sayısı
9. [ ] Yanıt verenlerle **birebir ilgilen** — asıl dönüşüm orada olur

### Bunlar hazır olmadan başlama
- [ ] Ödeme sistemi çalışıyor (deneme bitince ödeyemezlerse kampanya boşa gider)
- [ ] Onboarding akıcı (ilk 5 dakikada değer görmezse denemeyi bırakırlar)
- [ ] Destek kanalı açık (yanıtlara hızlı dönmek şart)

---

## İlgili
- İşlem mailleri: `lib/staffInvite.ts`, `lib/adminActions.ts`, mobil `supabase/functions/*`
- Mail şablonları: `docs/email-templates/`
- Destek sistemi: `docs/DESTEK-SISTEMI.md`

## Kaynaklar
- İYS — tacir/esnafa onay şartı: <https://iys.doruk.net.tr/faq-items/tacir-veya-esnafa-ticari-elektronik-ileti-gonderilirken-onay-sarti-var-midir/>
- Resend Kabul Edilebilir Kullanım (soğuk mail yasak): <https://resend.com/legal/acceptable-use>
- "Resend: Wrong Tool for Cold Email": <https://missioninbox.com/compare/resend>
- Smartlead vs Instantly karşılaştırması: <https://sparkle.io/blog/smartlead-vs-instantly/>
