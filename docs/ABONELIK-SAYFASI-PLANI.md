# Abonelik Sayfası — Plan Popup'ı + Ödeme Yöntemi + Faturalar

> Durum: **PLAN** · Mehmet, 28.07.2026. Onay bekliyor, kodlanmadı.
> İstek: (1) FireVibe tarzı plan seçim popup'ı — abone değilse/denemedeyse Abonelik
> sekmesine basınca çıksın, kapatınca sayfaya düşsün. (2) Abonelik sayfasına kayıtlı
> kartlar + ödeme faturaları bölümleri, ödeme gelince hazır olsun.

---

## Bağlam — bugün elimizde ne var, ne yok

**Var:** `Ayarlar > Abonelik` sekmesi çalışıyor (`app/panel/ayarlar/AbonelikBolumu.tsx`).
Durum kartı + plan kartları + "14 Gün Ücretsiz Başlat". Plan kataloğu tek kaynakta
(`lib/plans.ts`), durum hesabı sunucuda (`lib/abonelik.ts`).

**Yok:** Hiçbir ödeme sağlayıcısı entegre değil — ne paket, ne tablo, ne webhook.
`payments` / `payment_methods` / abonelik faturası tablosu **yok**. Bugün "Ödeme yakında"
düğmesi pasif duruyor; tek gerçek işlem deneme başlatmak.

**🔴 Engel zinciri (kodla çözülmez):** EIN → Stripe hesabı → webhook + tablolar → UI.
`paraner-app/GOREVLER.md:136`'ya göre **EIN IRS'te takılı**, Stripe hesabı bugün açılamıyor.
Ödeme mimarisi kararı zaten verilmiş (`GOREVLER.md:137`): **web = Stripe · iOS = Apple IAP ·
tek yetki kaynağı RevenueCat**.

**Sonuç:** Bu iş **arayüz işi**. Kart/fatura bölümleri boş durumda ("Yakında") kurulur, Stripe
geldiğinde yalnız veri bağlanır. Sahte kart/fatura satırı **basılmaz**.

**⚠️ İsim çakışması:** `invoices` tablosu **kullanıcının kendi kestiği ticari faturalar**
(e-fatura modülü). Paraner'in kullanıcıdan aldığı abonelik ücreti makbuzu **başka bir şey** →
ileride ayrı tablo: `billing_invoices`. Bu planda tablo oluşturulmuyor, sadece isim sabitleniyor.

---

## Yapılacaklar

### 1. `PlanSecici` — ortak bileşen (yeni: `app/panel/ayarlar/PlanSecici.tsx`)
Plan kartı ızgarası + aylık/yıllık geçişi tek bileşene çıkar. **Hem sekme hem popup bunu
kullanır** — iki ayrı plan listesi olmasın.

- Kart görselini **sıfırdan yazma**: `AbonelikBolumu.tsx:166-211` içindeki blok taşınacak.
  CSS zaten hazır ve renk kuralına uygun (`globals.css:3393-3462` — `.plan-card`, `.pc-*`,
  seçili kart titanyum, `.pc-radio`, `.plan-card.onerilen .pc-badge`).
- **Aylık/Yıllık geçişi:** hazır segment deseni `.chip-seg` (`globals.css:2556-2568`) — nötr,
  yeni CSS gerekmez. Yıllıkta "2 AY BEDAVA" tarzı rozet `.pc-badge` ile.
- Dönem, plan id'sinin sonekinden türetilir → `lib/plans.ts`'e küçük yardımcı:
  `planDonemi(id): "aylik" | "yillik"` (`_monthly` / `_yearly`). Yeni sabit liste yok.
- Proplar: `profileType`, `durum: AbonelikDurum`, `secili`, `onSecim`, `onBasla`.

### 2. Plan popup'ı (yeni: `app/panel/ayarlar/PlanPopup.tsx`)
Ekran görüntüsündeki düzen, **bizim renklerimizle**:

```
┌──────────────────────────────────────────── × ┐
│         ●●●●●  [tek satır güven cümlesi]      │
│            Büyük başlık (2 satır)             │
│           kısa alt açıklama                   │
│         [ Aylık | Yıllık  2 AY BEDAVA ]       │
│   ┌────┐  ┌────┐  ┌────┐   ← PlanSecici       │
│   └────┘  └────┘  └────┘                      │
│  🔒 Güvenli ödeme · ↺ İstediğin an iptal      │
└───────────────────────────────────────────────┘
```

- Kabuk: `components/ui/Modal.tsx`. ⚠️ Mevcut genişlikler yetmiyor (440 / 560px) →
  **`size="xl"` varyantı eklenecek** (~880px). Modal.tsx tek noktadan değişecek şekilde
  yazılmış, doğru yer orası.
- Kapanış: × / dışarı tıklama / Esc → **hiçbir şey yapmaz, arkadaki Abonelik sekmesi zaten
  açıktır.** Kullanıcı istediğini görmüş olur.
- ⚠️ **Renk:** FireVibe'ın limon yeşili **alınmayacak**; öne çıkan kart ve düğme **titanyum**
  (`.btn-primary` / `.plan-card.onerilen`). Teal de kullanılmayacak — marka rengi değişecek
  (CLAUDE.md renk kuralı). `.onb-*` sınıfları **kopyalanmayacak**, onlar hâlâ teal.

**Üstteki sosyal kanıt satırı — SAYAÇ GERÇEK VERİDEN GELİR**
FireVibe'daki görsel satırın aynısı yapılacak (yuvarlak avatarlar + tek cümle), ama sayı
**elle yazılmayacak**: `SosyalKanit` bileşeni kayıtlı işletme sayısını DB'den okur.

- Sayı bir eşiğin (öneri: 250) **üstündeyse** → "**N+ işletmenin tercihi**" (yuvarlanmış:
  8.000 → "8.000+").
- Eşiğin **altındaysa** → sayı yerine doğrulanabilir güven satırı:
  *"14 gün ücretsiz · Kredi kartı istemiyoruz · İstediğin an iptal"*.

Böylece tasarım bugünden hazır olur ve rakam gerçekten 8.000'e ulaştığı gün **kendiliğinden**
yazar; kimsenin bir yeri güncellemesi gerekmez.

⚠️ **Elle "8.000+ işletmenin tercihi" yazmıyorum.** Sebebi ahlaki değil hukuki/ticari:
Ticari Reklam Yönetmeliği reklamdaki her iddianın **ispatlanabilir** olmasını şart koşuyor;
Reklam Kurulu bu tip sayı iddialarına idari para cezası + durdurma cezası veriyor (6502 sayılı
kanun). Üstelik bu cümle **10.000 işletmeye atılacak soğuk mailde** de kullanılacak — hedef
kitle esnaf; bir tanesinin doğrulaması ve paylaşması yeter. Rakip yapıyor olması savunma
değil. Sayı gerçek olduğu an aynı cümle otomatik çıkacak.

### 3. Popup'ı tetikleme (`app/panel/ayarlar/AyarlarClient.tsx`)
- **Koşul:** `durum.tur !== "paid"` (yani deneme / ücretsiz / denemesi bitmiş).
- **Ne zaman:** `abonelik` sekmesi seçildiğinde — hem sekmeye tıklayınca (`selectTab`,
  `:122-127`) hem üst bar rozetinden `?tab=abonelik` ile gelince (`:116-120`).
- **Sıklık: oturumda bir kez.** `sessionStorage` bayrağı — projede zaten kullanılan desen
  (`app/panel/LoginReporter.tsx:29-39`, `try/catch` ile sarmalı).

### 4. Abonelik sekmesinin yeni düzeni (`AbonelikBolumu.tsx`)
Yukarıdan aşağı beş blok (hepsi mevcut `.settings-block` kabuğunda):

| # | Blok | İçerik |
|---|---|---|
| 1 | **Aboneliğin** | Mevcut durum kartı — değişmiyor (`.sub-status`, `.badge`) |
| 2 | **Planım** | ⭐ YENİ. Yalnız aktif planı olanda (trial/paid): plan adı, tutar, bitiş/yenileme tarihi, "Planı değiştir" · iptal düğmesi **pasif + "Yakında"** |
| 3 | **Planlar** | `PlanSecici` (popup'takinin aynısı) + mevcut `.plan-foot` aksiyon satırı |
| 4 | **Ödeme Yöntemi** | ⭐ YENİ. Boş durum: `.soon-card` + `.soon-badge` — "Ödeme yöntemi ekleyince kartların burada görünecek." Hazır desen: `AyarlarClient.tsx:1898-1912` |
| 5 | **Faturalarım** | ⭐ YENİ. Boş durum: aynı `.soon-card`. Veri gelince satır deseni **`.tx-list`/`.tx-row`** olacak (sol: plan + tarih · sağ: tutar + `.badge` + indir) — panelde tablo kullanılmıyor, bu doğru desen |

---

## Dokunulacak dosyalar

| Dosya | Ne |
|---|---|
| `app/panel/ayarlar/PlanSecici.tsx` | 🆕 ortak plan ızgarası + aylık/yıllık geçişi |
| `app/panel/ayarlar/PlanPopup.tsx` | 🆕 popup kabuğu (başlık + PlanSecici + güven satırı) |
| `app/panel/ayarlar/AbonelikBolumu.tsx` | Plan bloğu → `PlanSecici`; "Planım" + "Ödeme Yöntemi" + "Faturalarım" blokları |
| `app/panel/ayarlar/AyarlarClient.tsx` | Popup tetikleme + oturum bayrağı |
| `components/ui/Modal.tsx` | `size="xl"` varyantı |
| `lib/plans.ts` | `planDonemi(id)` yardımcısı + `business_pro_yearly` (bkz. bölüm 5) |
| `app/panel/ayarlar/SosyalKanit.tsx` | 🆕 avatar sırası + gerçek sayaç (eşik altında güven satırı) |
| mobil `premium.tsx` · `authStore.ts` · `app/page.tsx` · `app/layout.tsx` | yeni plan için (bölüm 5) |
| `app/globals.css` | `.modal-xl`, popup başlık bloğu, "Planım" satırı. **Yeni teal yok, titanyum kullan** |

**Yeniden kullanılacaklar (yeni yazılmayacak):** `lib/plans.ts` (`plansFor`, `planHasTrial`,
`trialStartFields`, `TRIAL_DAYS`) · `lib/abonelik.ts` (`aboneDurumu`) · `.plan-card`/`.pc-*`
CSS'i · `.chip-seg` · `.soon-card` · `.tx-list`/`.tx-row` · `EmptyState` · `SaveButton` ·
`showToast` · `useSubmitLock`.

---

## Kapsam DIŞI (bilerek)

- Gerçek ödeme, kart kaydetme, fatura üretme → **Stripe gelince**. Zincir EIN'de takılı.
- Tablo/RLS değişikliği yok. (Ödeme günü gelince: `billing_invoices` + `payment_methods` +
  premium alanlarına RLS write kilidi — `AbonelikBolumu.tsx:15-17` uyarısı.)
- Mobil dokunulmuyor.

## Bu iş sırasında görülen, ayrı ele alınacak borçlar
- **`OnboardingModal.tsx:32-52` kendi fiyat listesini tutuyor** — `lib/plans.ts`'teki
  "fiyat 4 yerde" listesinin sayılmayan 5.'si. Fiyat değişince unutulacak yer burası.
- **`app/gizlilik/page.tsx:25` CANLIDA YANLIŞ:** "Ödeme bilgileri RevenueCat tarafından
  işlenir" yazıyor — RevenueCat entegre değil, hiç ödeme alınmıyor. Mobilde de aynı
  (`paraner-app/app/privacy.tsx:24`) ve `terms.tsx:35` bununla çelişiyor.
- ~~İşletmede "Pro Yıllık" yok~~ → **eklenecek** (Mehmet onayladı, 28.07). Ayrıntı aşağıda.

---

---

## 5. YENİ PLAN: İşletme Pro Yıllık (`business_pro_yearly`)

Mehmet, 28.07: *"işletmeye de pro yıllık ekle, fiyatı da ona göre ayarlarsın."*

**Önerilen fiyat — işletme tarafının mevcut indirim desenine göre.** İşletme Max Yıllık
`890 → 8.900/yıl` yani **2 ay bedava**; bireysel taraf 3 ay bedava (`149,90 → 1.349`).
İşletme içinde tutarlı olsun diye Pro Yıllık da **2 ay bedava**:

| | |
|---|---|
| Aylığa indirgenmiş | **₺408,33/ay** |
| Yıllık tahsilat | **₺4.900/yıl** (490 × 10) |
| Tasarruf | **₺980** (490 × 12 = 5.880 → 4.900) |
| Rozet | "2 AY BEDAVA" |

⚠️ Rakam **yer tutucu**; fiyat kararı senin, zaten toplu güncelleme yapacaksın.

### ⚠️ Bu web-only bir değişiklik DEĞİL — 5 yer birlikte
Yeni bir tier eklemek `lib/plans.ts`'te bir satır değil. `subscription_tier` kolonunda **DB
CHECK yok** → tanımadığı bir değer yazılırsa mobil onu etiketleyemez (bilinen bug sınıfı).

| Sıra | Yer | Ne |
|---|---|---|
| ① | **mobil `stores/authStore.ts:26-32`** | `SubscriptionTier` birleşimine `business_pro_yearly` |
| ② | **mobil `app/premium.tsx:79-130`** `getBusinessPlans()` | **ASIL FİYAT KAYNAĞI** — plan buraya eklenir |
| ③ | `lib/plans.ts` | `SUBSCRIPTION_TIERS` + `TIER_LABELS` ("İşletme Pro (Yıllık)") + `BUSINESS_PLANS` |
| ④ | `app/page.tsx` PLANS | pazarlama sayfası |
| ⑤ | `app/layout.tsx` AggregateOffer | **Google'a yayınlanan fiyat şeması** — atlanırsa arama sonucunda eski fiyat kalır |

`TRIAL_PLANS`'a **eklenmeyecek**: 14 gün deneme yalnız aylık planlarda
(`lib/plans.ts:172-175`, mobil `premium.tsx:167` ile birebir).

---

## Nasıl test edilecek

1. **Denemedeki hesapla** (`admin@paraner.com`) `app.paraner.com` → Ayarlar → **Abonelik**
   sekmesi → popup **açılmalı**. Aylık/Yıllık geçişini dene, kartlar değişmeli.
2. Popup'ı **×** ile kapat → arkada Abonelik sayfası duruyor olmalı. Sekmeye tekrar bas →
   popup **bir daha çıkmamalı** (oturumda bir kez). Sekmeyi kapatıp yeniden aç → çıkmalı.
3. Popup dışına tıkla / **Esc** → aynı davranış.
4. **Ücretli profille** (MGZR LLC) aynı sekme → popup **hiç çıkmamalı**; "Planım" bloğu
   görünmeli.
5. Sekmedeki plan kartları ile popup'takiler **birebir aynı** olmalı (tek bileşen).
6. "Ödeme Yöntemi" ve "Faturalarım" blokları **"Yakında"** kutusu göstermeli — sahte kart
   veya fatura satırı **olmamalı**.
7. Deneme başlatma akışı **bozulmamalı**: denemesi olmayan bireysel hesapta "14 Gün Ücretsiz
   Başlat" → toast + durum "Deneme"ye dönmeli.
8. **Renk denetimi:** yeni eklenen hiçbir yerde teal/yeşil olmamalı — düğme ve seçili kart
   titanyum. Üst bar rozetinden (`?tab=abonelik`) girişte de popup çalışmalı.
9. Telefon genişliğinde popup taşmamalı (kartlar alt alta).
10. **İşletme profiliyle** Yıllık sekmesi → **iki kart** (Pro Yıllık + Max Yıllık) görünmeli.
    Yeni planı seçip kaydedince `subscription_tier = business_pro_yearly` yazılmalı ve
    **mobil uygulama** o planı doğru etiketlemeli (etiketleyemiyorsa ① ve ② atlanmış demektir).
11. Üstteki sayaç: bugün eşiğin altında olduğu için **güven satırı** görünmeli, uydurma
    sayı görünmemeli.
