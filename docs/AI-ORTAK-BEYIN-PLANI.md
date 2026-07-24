# AI ASİSTAN (Parla) — TEK BEYİN PLANI (web + mobil ortak)

> Amaç: Kullanıcı ister telefondan ister `app.paraner.com` panelinden girsin, AYNI AI asistanı
> kullansın. Davranış/prompt/yetenek bir yerden güncellenince İKİSİ BİRDEN değişsin.
> Tarih: 2026-07-24 · Durum: **plan — kod yazılmadı, Mehmet kararı bekliyor**

---

## 1. MEVCUT GERÇEK (kaynaktan doğrulandı, varsayım değil)

**AI'ın "beyni" şu an tamamen TELEFONUN İÇİNDE.** Edge function akıllı değil, sadece boru.

| Parça | Nerede | Ne yapıyor | Satır |
|---|---|---|---|
| Karakter + kurallar + kullanıcı verisi (system prompt) | `paraner-app/lib/aiContext.ts` | Profil, bu ay/geçen ay özeti, kategori bütçeleri, hedefler, son 15 işlem, uygulama rehberi, üslup kuralları | 208 |
| İşlem ekle/sil/sorgula (regex + anahtar kelime) | `paraner-app/lib/smartRouter.ts` | "500 tl market" → `transactions` INSERT; "sil" → DELETE; "bu ay ne harcadım" → AI'ya hiç gitmeden cevap | 587 |
| Fiş/fatura tarama | `paraner-app/lib/receiptVision.ts` | Görsel → JSON alanlar | 243 |
| Hata metinleri / yönlendirme | `paraner-app/lib/aiRouter.ts` | 429/401/timeout → Türkçe mesaj | 37 |
| Sohbet ekranı + geçmiş | `app/ai-chat.tsx` + `stores/chatStore.ts` | UI + `chat_messages` tablosu | 996 + 205 |
| **Edge function `ai-chat`** | `paraner-app/supabase/functions/ai-chat/index.ts` | JWT doğrula → **kota** (5 ücretsiz / 30 deneme) → Gemini 2.5 Flash'a ilet → token maliyetini yaz | 352 |

**Kritik iki tespit:**

1. **`systemPrompt` İSTEMCİDEN geliyor** (`index.ts:179`). Yani AI'ın kişiliğini ve kurallarını
   telefon gönderiyor, sunucu ne olduğuna bakmadan Gemini'ye iletiyor.
   → *Zaten bilinen borç:* GOREVLER "ai-chat client-kontrollü systemPrompt server'da sabitlensin".
2. **İşlem ekleme/silme sunucuda DEĞİL**, telefonda regex ile çözülüp doğrudan DB'ye yazılıyor.

**Webde AI YOK.** Web'de yalnız `lib/aiPricing.ts` (maliyet gösterimi) + `/admin/ai` (kullanım izleme) var.

### Bunun sonucu — neden "kopyala-yapıştır" YANLIŞ olur
Web'e bu 1000+ satırı kopyalarsak **iki ayrı beyin** olur: prompt'u değiştirince iki repoyu birden
elle güncellemek gerekir, biri unutulur → kullanıcı telefonda başka, webde başka cevap alır.
Mehmet'in istemediği tam olarak bu.

---

## 2. ÖNERİLEN MİMARİ — beyni sunucuya taşı

```
        ┌──────────────┐        ┌──────────────┐
        │  MOBİL app   │        │  WEB paneli  │      ← ikisi de SADECE sohbet EKRANI
        │ (ai-chat.tsx)│        │ (yeni)       │        (baloncuk çiz, yazı yaz, gönder)
        └──────┬───────┘        └──────┬───────┘
               │   "kullanıcı ne yazdı" + JWT   │
               └───────────┬───────────────────┘
                           ▼
              ┌───────────────────────────┐
              │  EDGE FUNCTION `ai-chat`  │   ← TEK BEYİN (Supabase'de, tek deploy)
              │  · kim bu kullanıcı (JWT) │
              │  · aktif profil + verisi  │
              │  · system prompt SABİT    │
              │  · regex katmanı (işlem)  │
              │  · kota + token maliyeti  │
              │  · Gemini çağrısı         │
              │  · DB yazma (RLS'li)      │
              └───────────────────────────┘
```

**Kazanç:** AI'ın davranışını değiştirmek = **tek komut** (`supabase functions deploy ai-chat`).
Web anında değişir, **mobil de anında değişir — App Store onayı BEKLEMEDEN.** Bugün bir prompt
düzeltmesi bile mobil sürüm çıkmayı gerektiriyor.

**Sohbet geçmişi zaten ortak:** `chat_messages` tablosu `user_id` bazlı → telefonda başlayan
konuşma webde kaldığı yerden devam eder, ekstra iş yok. **Kota da zaten ortak** (sunucuda,
kullanıcı bazlı) → telefonda 3, webde 2 mesaj = günlük 5'in tamamı. Doğru davranış.

---

## 2b. MEHMET'İN KARARI (2026-07-24)

- **Kurallar KODDA DEĞİL, PANELDE:** `admin.paraner.com` içinde "AI Kuralları" sayfası. Mehmet
  kuralı oradan yazar/kaydeder, telefon ve web anında o kurala geçer — kod/deploy/App Store yok.
  (Sektör karşılığı: Langfuse/PromptLayer "prompt management" — prompt DB'de, sürümlü, arayüzden
  düzenlenir, uygulama her istekte güncelini çeker.)
- **Web kapsamı = mobil paritesi:** sohbet + işlem ekleme/silme + sorgulama + ortak geçmiş.
  Fiş/fatura tarama sonraki faza.
- **Ertelendi:** kategori kataloğunun tek kaynağı (madde 4.1) — sıra netleşince ele alınacak.

### Yeni tablo talebi (DB = önce onay kuralı)
Tek tablo yeter: **`ai_config_versions`** — her kayıt AI'ın o anki tam kural setinin bir sürümü.

| kolon | ne işe yarar |
|---|---|
| `id` | kayıt no |
| `config` (jsonb) | karakter/üslup metni + kural listesi (bireysel/işletme ayrımıyla) |
| `note` | "ne değiştirdim" notu (Mehmet yazar) |
| `is_active` | canlıda olan sürüm bu (tek satır true) |
| `created_by`, `created_at` | kim, ne zaman |

Neden tek tablo + sürüm: **kaydet = yeni sürüm**, **geri al = eski sürümü aktif yap**. Yanlış bir
kural yazılırsa tek tıkla dönülür. Erişim: yalnız iç ekip (RLS), müşteri istemcileri bu tabloyu
hiç okumaz — sunucu okur. Mobil şemasına dokunmaz (yeni tablo, mevcut tabloların hiçbiri değişmez).

---

## 3. FAZLAR (her faz tek başına canlıya çıkabilir)

### Faz 1 — Edge function'a "beyin modu" ekle *(mobil KIRILMAZ)*
Yeni bir istek biçimi (`mode: "assistant"`): istemci yalnız **mesajı** yollar; prompt'u,
kullanıcı verisini, işlem yazmayı sunucu yapar. Eski biçim (istemcinin prompt yolladığı)
çalışmaya devam eder → mobilin bugünkü sürümü bozulmaz.
- `aiContext.ts` + `smartRouter.ts` mantığı Deno'ya taşınır (kopya değil, **taşıma**).
- İşlem yazma **kullanıcının kendi oturumuyla** yapılır (service_role ile DEĞİL) → RLS korunur,
  bir kullanıcı başkasının verisine yazamaz.
- Yanıt: `{ reply, action?: { type: "transaction_added", ... } }` → istemci ekranı tazeler.
- Yan fayda: yukarıdaki 1 numaralı güvenlik borcu kapanır.

- Kurallar `ai_config_versions`'ın aktif sürümünden okunur (~60 sn önbellek → her mesajda DB turu yok).

### Faz 2 — Admin panelde "AI Kuralları" sayfası
`admin.paraner.com` → kural listesi + karakter metni; kaydet = yeni sürüm, geri al = eski sürüm.
- `requireAdminPage()` guard + AdminSidebar prefetch kaydı (panel kuralları).
- Kaydetmeden önce **önizleme** ("bu kurallarla AI şuna böyle cevap verir") — yanlış kural canlıda denenmesin.

### Faz 3 — Web panelinde sohbet ekranı
`app.paraner.com` içinde Parla ekranı: `chat_messages`'tan geçmiş + aynı edge function'a istek.
- Edge'in CORS listesinde `https://app.paraner.com` **zaten izinli** → sunucu tarafında ek iş yok.
- Panel kuralı: AI işlem eklediğinde `router.refresh()` (yoksa "eklendi ama listede yok" olur).
- Ücretsiz/deneme kullanıcıya kalan hakkı ekranda göstermek gerek (mobilde var).

### Faz 4 — Mobili yeni sözleşmeye geçir *(App Store sürümü gerektirir)*
Mobilden `smartRouter.ts` + `aiContext.ts` + `aiRouter.ts` **silinir**, ekran sunucuya konuşur.
⚠️ **BU FAZA KADAR ADMIN PANELİNDEN YAZILAN KURAL YALNIZ WEB'İ ETKİLER.** Telefon hâlâ kendi
içindeki eski kurallarla çalışır. "Bir yerden değiştir, ikisi de değişsin" ancak burada gerçek olur
→ bu pencereyi kısa tutmak gerekir.

### Faz 5 — Fiş/fatura tarama webde *(sonraya bırakıldı)*
Mobilde var, webde yok. Sunucu tarafı (vision) hazır; web'e dosya seçici + önizleme eklenir.

---

## 4. AÇIK KALAN SORULAR

1. **Kategori kataloğu üçüncü kopya olacak.** Bugün iki kopya var (mobil `constants/categories.ts`,
   web `lib/categories.ts`). Beyin sunucuya taşınınca sunucunun da kategori listesine ihtiyacı olur.
   Seçenek A: edge function içinde tek kaynak (basit, ama üç kopya). Seçenek B: **DB tablosu**,
   üçü de oradan okur (temiz, ama **şema değişikliği → önce onay**).
2. **Profil ayrımı:** Sohbet geçmişi bugün `user_id` bazlı → işletme ve bireysel profil arasında
   geçiş yapınca **aynı sohbet** görünüyor. Böyle mi kalsın, yoksa her profilin kendi sohbeti mi
   olsun? (İkincisi şema değişikliği.)
3. **Mobil geçişi (Faz 4) ne zaman?** Faz 1-3 bittiğinde web yeni beyinle, mobil eski beyinle
   çalışır; admin panelinden yazılan kural o pencerede yalnız web'i etkiler.

## 5. ETKİ HARİTASI (dokunulacak yerler)
- **web kodu:** panel sohbet sayfası + admin "AI Kuralları" sayfası (+ sol menülere giriş noktası,
  AdminSidebar prefetch kaydı)
- **mobil kodu:** Faz 4'te 3 dosya silinir, ekran sunucuya bağlanır (App Store sürümü)
- **DB:** **tek yeni tablo `ai_config_versions`** (mevcut tabloların hiçbiri değişmez; chat_messages +
  daily_ai_usage zaten yeterli) → `sql/ai/` altına migration + `sql/README.md` satırı
- **edge function:** `ai-chat` yeniden yazılır → `supabase functions deploy ai-chat` ŞART
  (kod repoda durmakla canlıya çıkmaz) · `config.toml` kaydı zaten var
- **kullanıcıya görünen metinler:** kalan hak/limit uyarıları webde de olmalı
- **SEO/pazarlama:** panel noindex → etkisi yok. *(Pazarlama sayfasında "AI asistan webde de var"
  denecekse ayrı iş.)*
- **ileriye dönük:** ödeme entegrasyonu gelince kota mantığı (`is_premium`) gerçek abonelikten
  okunmalı — bu dosya da o listeye dahil
