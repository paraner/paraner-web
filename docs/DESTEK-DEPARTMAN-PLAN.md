# DESTEK DEPARTMAN YÖNLENDİRME — PLAN (2026-07-18)

> Mehmet: "müşteri talep açarken departman seçsin; satış talebini muhasebe GÖRMESİN, admin her şeyi görsün."
> Bu dosya **öneri + etki haritası**. Kod yazılmadan önce Mehmet'in 3 kararı gerekiyor (en altta).

---

## 1. Mevcut durumun envanteri (kaynaktan doğrulandı)

| Var olan | Durum |
|---|---|
| `support_tickets.category` (text) | **VAR ama HİÇ KULLANILMIYOR** — kısıtsız serbest metin |
| `support_tickets.priority` | VAR (`low/normal/high`), formda sorulmuyor, hep `normal` |
| `support_tickets.assignee_id` | VAR, hiç yazılmıyor (atama özelliği yok) |
| `user_roles(user_id, role)` | Yalnız `agent` / `admin`. **Departman kavramı YOK** |
| `is_support_agent()` | "Staff mi?" der — hangi departman olduğunu bilmez |
| RLS `tickets_select` | Agent **TÜM** talepleri görür (departman ayrımı yok) |
| Mobil `lib/support.ts` | **Mobil de talep AÇIYOR** → şema değişikliği mobili etkiler |

**İyi haber:** `category` ve `priority` kolonları zaten duruyor → şemaya minimum dokunuş.
**Dikkat:** RLS'i değiştirmek mobil+web'i AYNI ANDA etkiler; yanlış politika ya talepleri gizler ya sızdırır.

---

## 2. Hangi departmanlar olmalı? (öneri)

⚠️ **Kritik ilke: personeli olmayan departman AÇMA.** Boş departman = müşteri talebi kimseye
düşmez, kimse fark etmez. Şu an ekip = Mehmet. O yüzden **3 ile başla**, sistem 10 departmanı
kaldıracak şekilde kurulsun (departman eklemek KOD değil, KONFİG olsun).

### Faz 1 — şimdi (3 departman)
| Departman | Ne gelir | Neden ayrı |
|---|---|---|
| **Teknik Destek** | Hata, senkron sorunu, giriş yapamıyorum, veri görünmüyor | En yoğunu; teknik bilgi ister |
| **Satış & Abonelik** | Paket yükseltme, kurumsal/özel teklif, "hangi plan bana uygun" | **Gelir fırsatı** — hızlı yanıt gerekir, teknik kuyruğunda beklememeli |
| **Faturalandırma & Ödeme** | Ödeme alınamadı, iade, fatura talebi, abonelik iptali | **Para + yasal**; erişimi dar tutulmalı (kart/ödeme verisi hassas) |

### Faz 2 — ekip büyüyünce
- **Öneri & Geri Bildirim** — özellik isteği. Ayrı olmalı: SLA'sı yok, ürün tarafına gider,
  teknik kuyruğu şişirmesin.
- **e-Fatura / Entegrasyon** — GİB entegrasyonu gelince (GOREVLER "Sonraki Faz"). Entegratör
  hesabı/kontör soruları teknikten farklı uzmanlık.
- **KVKK / Veri Talebi** — hesap silme, veri dışa aktarma, yasal talep. Yasal süre kısıtı var,
  ayrı kişi görmeli.

> Faz 2'dekiler için **şimdi kod yazma**, ama veri modeli onları kaldırsın.

---

## 3. Önerilen model

### 3.1 Yönlendirme
```
support_tickets.department  →  hangi ekibe ait
staff_departments(user_id, department)  →  kim hangi ekipte
```
- **Agent** yalnız KENDİ departmanının taleplerini görür.
- **Admin** her şeyi görür (Mehmet'in şartı) — `staff_departments` kaydı olmasa bile.
- Bir agent birden fazla departmanda olabilir (küçük ekipte şart: Mehmet 3'ünde de).

Neden ayrı tablo, `user_roles`'a kolon değil: `user_roles` birincil anahtarı `(user_id, role)`.
Oraya departman eklemek anahtarı bozar ve "admin'in departmanı ne?" sorusunu doğurur.
Ayrı tablo = rol ile departman birbirine karışmaz.

### 3.2 Müşteriye SORULACAKLAR (talep formu)
| Alan | Zorunlu | Not |
|---|---|---|
| **Departman** | ✅ | Kart seçimi (örnek ekrandaki gibi): başlık + 1 cümle "buraya ne yazılır". Yanlış departman seçimini AZALTIR |
| **Konu** | ✅ | Mevcut |
| **Mesaj** | ✅ | Mevcut |
| **İlgili profil** | ➖ opsiyonel | Bizde çoklu profil var ("hangi işletmeniz için?") → agent doğru veriye bakar |
| **Ek dosya** | ➖ opsiyonel | Faz 2 (`ticket-attachments` bucket zaten planda) |

### 3.3 ⚠️ ÖNCELİĞİ MÜŞTERİYE SORMA (öneri)
Örnek ekranda "Öncelik: Orta" seçtiriliyor. **Bunu yapmamalıyız:** herkes "Yüksek" seçer,
alan bilgi taşımaz olur, gerçek acil talep kaybolur. Onun yerine:
- Öncelik **departmana göre** başlasın (ör. Faturalandırma → yüksek; Öneri → düşük),
- **agent** panelden değiştirsin (`priority` kolonu zaten var).

### 3.4 Bildirim yönlendirmesi (asıl kazanç burada)
Şu an: agent yanıt yazınca müşteriye bildirim + e-posta gidiyor. **Tersi YOK** — yeni talep
geldiğinde ekibe hiçbir şey gitmiyor (bugün Mehmet panele bakmak zorunda).
Kurulacak: yeni talep → **o departmanın üyeleri + tüm admin'ler** bildirim alır (`notifications`
INSERT trigger'ı ile, mevcut `notify_on_agent_reply` deseninin aynısı).

---

## 4. ETKİ HARİTASI (CLAUDE.md kuralı — kodlamadan önce)

| Katman | Değişiklik | Risk |
|---|---|---|
| **DB şema** | `support_tickets.department` (+CHECK +index), `staff_departments` tablosu | Mevcut 5 talebe geriye dönük değer: `DEFAULT 'teknik'` |
| **DB RLS** | `tickets_select` / `messages_select` departman-farkında olmalı | 🔴 **EN RİSKLİ ADIM** — yanlış politika ya talep gizler ya sızdırır. Ayrı ayrı test |
| **DB trigger** | Yeni talep → departman ekibine + admin'e bildirim | Mevcut trigger deseni kopyalanır |
| **Web müşteri** | `/panel/destek` formuna departman kart seçimi | Küçük |
| **Web admin** | `/admin/destek` departman filtresi + satırda rozet; `/admin/ekip`'te departman atama | Orta |
| **🔴 MOBİL** | `lib/support.ts` `createTicket` departman göndermeli | **App Store sürümü ister.** Çözüm: DB'de `DEFAULT 'teknik'` → **eski mobil sürüm ÇALIŞMAYA DEVAM EDER**, talepleri teknik'e düşer. Mobil güncellemesi sonra gelir |
| **Edge function** | `support-reply-notify` alıcıyı departmana göre seçmeli | `supabase functions deploy` gerekir |
| **Metinler** | `/destek` pazarlama sayfası + panel açıklamaları | Küçük |

---

## 5. Önerilen sıra (her adım tek başına çalışır)

1. **DB:** kolon + tablo + `DEFAULT 'teknik'` (mobil kırılmaz) — *kimse fark etmez, hazırlık*
2. **Web müşteri formu:** departman seçimi → yeni talepler doğru etiketlenir
3. **Web admin:** departman filtresi + rozet → Mehmet ayrımı görür
4. **RLS daraltma:** agent yalnız kendi departmanını görsün — *personel alınmadan ÖNCE yapılmalı*
5. **Bildirim yönlendirme** (trigger + edge)
6. **Mobil** (App Store sürümüyle)

---

## 6. 🔴 MEHMET'İN KARARI GEREKEN 3 ŞEY

1. **Departmanlar:** Teknik / Satış / Faturalandırma (3) ile başlayalım mı? Yoksa "Öneri &
   Geri Bildirim"i de ekleyelim mi (4)?
2. **Öncelik alanı:** müşteriye sormayalım (öneri) — katılıyor musun?
3. **Şema izni:** `support_tickets`'a kolon + yeni `staff_departments` tablosu ekliyoruz.
   Mobil ile ORTAK şema → mobil Claude'a haber verilecek. Onay?
