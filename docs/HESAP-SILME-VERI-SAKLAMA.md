# Hesap silinince veriye ne olacak? (2026-07-20)

> Tetikleyen olay: DB temizliği sırasında `/admin/musteriler` → "Kalıcı sil" **500 verdi**
> (`ticket_messages_sender_id_fkey`, 23503). Araştırma buradan çıktı.
> ⚠️ **BU ARAŞTIRMA YARIM KALDI** — 106 doğrulama ajanının 68'i oturum limitine takıldı.
> Aşağıda "kanıt gücü" sütunu var; **hukuki karar vermeden önce eksikler tamamlanmalı**
> (özellikle KVKK maddeleri ve Türk vergi mevzuatı saklama süreleri hiç doğrulanamadı).

---

## 1. BUGÜNKÜ DURUM — ölçüldü, tahmin değil

İki FK birbiriyle çelişiyor (canlıda deneyerek doğrulandı, 2026-07-20):

| FK | Davranış | Sonuç | Nasıl doğrulandı |
|---|---|---|---|
| `support_tickets.user_id → auth.users` | **ON DELETE CASCADE** | Kullanıcı silinince **talep de siliniyor** | Mesajsız talep açıldı → kullanıcı silindi → HTTP 200, **talep yok oldu** |
| `ticket_messages.sender_id → auth.users` | **ON DELETE davranışı YOK** | Silmeyi **kilitliyor** (500 / 23503) | 8 hesabın 3'ü ilk denemede silinemedi |

**Yani bugün: mesaj yazmamış müşteri silinince arşivi sessizce yok oluyor; mesaj yazmış
müşteri ise hiç silinemiyor.** İkisi de istenmeyen davranış.

⚠️ Denetimdeki **O8 "FK CASCADE" maddesi bu sorunu kapatmıyor** — o
`ticket_messages.ticket_id → support_tickets` içindi, `sender_id → auth.users` atlanmış.

---

## 2. ARAŞTIRMA BULGULARI — kanıt gücüne göre

### 🟢 Doğrulandı (adversarial oylamadan geçti)

| Bulgu | Kaynak | Oy |
|---|---|---|
| **Zendesk hesap silinince talepleri SİLMİYOR** — talepler kalır, yalnız kullanıcı profili görüntülenemez hâle gelir | [Zendesk](https://support.zendesk.com/hc/en-us/articles/4408827493530-What-happens-to-the-tickets-of-a-deleted-user) | 2-1 |
| **Zendesk, kapanmamış talebi olan kullanıcıyı SİLDİRMİYOR** — açık destek konuşması, hesap silmeyi sıraya sokan sert bir kısıt | aynı | 3-0 |
| GDPR m.17(1): veri toplanma amacı için artık gerekli değilse gecikmeksizin silinmeli → destek yazışmasını **süresiz** saklamanın kendiliğinden gerekçesi yok | [gdpr-info](https://gdpr-info.eu/art-17-gdpr/) | 1-1 (zayıf) |

### 🟡 Gerçek kaynaktan alıntılandı ama DOĞRULANAMADI (limit)

Bunlar uydurma değil — sayfalardan alıntıyla çıkarıldı, sadece doğrulama turu çalışamadı:

- **GDPR m.17(3):** "hukuki taleplerin tesisi, kullanılması veya savunulması" için gereken işleme
  silme hakkından **muaf** → destek geçmişini saklamanın standart dayanağı (uyuşmazlık, chargeback).
- **ICO:** Silme hakkı **mutlak değil**; sayılı hâllerde geçerli. Hukuki yükümlülük veya hukuki
  savunma gerekçesiyle silme **reddedilebilir**.
- **EDPB (AB veri koruma otoriteleri ortak kararları):** Ret gerekçesi olarak esas kabul edilen şey
  **ulusal mevzuatın zorunlu saklama süresi** — "ticari kolaylık" yetmiyor. Ayrıca saklanacaksa
  **yalnız o yükümlülük için GEREKEN veri**, "ara depolama"da tutulur; **her şeyi sakla olmaz**.
- **EDPB gereklilik testi (önemli):** Bir otorite, 2 yıllık tüketici garantisi için müşteri profilini
  saklamayı **reddetti** — çünkü şikâyet e-posta/telefonla da yapılabilirdi. *Amaç kişisel veri
  olmadan da gerçekleşebiliyorsa, saklama gereklilik testini geçemez.*
- **KVKK (silme rehberi):** "Silme", verinin fiziksel yok edilmesi değil, **ilgili kullanıcılar için
  erişilemez ve tekrar kullanılamaz hâle getirilmesi** → erişim yetkisi kaldırılmış soft-delete
  desenleri mevzuata uygun "silme" sayılabilir.
- **KVKK (anonimleştirme):** Anonim sayılmak için veri, **başka verilerle eşleştirilse dahi**
  kimliği belirlenebilir kişiyle ilişkilendirilememeli.
  🔴 **Bu bizim tasarımı doğrudan vuruyor:** talebe "silme anındaki e-posta/ad" yazmak
  **anonimleştirme DEĞİL, pseudonymization'dır ve kişisel veri olmaya devam eder.**
- **Zendesk'in GDPR "unutulma" uygulaması:** saf hard delete değil — sistem alanlarındaki ad
  **"Permanently Deleted User"** ile değiştiriliyor (yani içerik kalıyor, kimlik siliniyor).
- **Stripe:** müşteri silme bir **soft delete**; işlem/finansal kayıtlar saklama yükümlülüğü
  nedeniyle silinemiyor.

### 🔴 Hiç araştırılamadı — açık

- **Türk vergi mevzuatı saklama süreleri** (VUK defter/belge saklama, e-fatura arşiv süresi).
  Ödeme entegrasyonu gelmeden önce netleşmeli.
- KVKK'nın **destek yazışması** özelinde bir görüşü/kararı var mı.
- Intercom / Slack davranışı (araştırma listedeydi, tamamlanamadı).

---

## 3. ÖNERİLEN TASARIM

Sektör pratiği ile hukuki mantık aynı yerde buluşuyor: **içeriği tut, kimliği kopar.**

> Zendesk tam bunu yapıyor: talep duruyor, kişi "Permanently Deleted User" oluyor.
> KVKK'nın "erişilemez hâle getirme" tanımı da bunu karşılıyor.
> EDPB'nin gereklilik testi de bunu destekliyor: destek geçmişini **istatistik/uyuşmazlık** için
> tutmak, kişinin **kim olduğunu** tutmayı gerektirmiyor.

### 🔴 ÖNCEKİ ÖNERİM ZAYIFLADI
Sohbette "silme anındaki e-posta/adı talebe snapshot'la" demiştim. **KVKK anonimleştirme
tanımına göre bu anonimleştirme sayılmaz** — kişisel veri olarak kalır, yani silme talebi
geldiğinde onu da silmek gerekir. Snapshot'ı **kalıcı kimlik** olarak konumlandırmak yanlış.

### Uygulanacak desen

1. **`support_tickets.user_id`** → `ON DELETE SET NULL` (bugün CASCADE — talebi öldürüyor)
2. **`ticket_messages.sender_id`** → `ON DELETE SET NULL` (bugün kilitliyor)
3. Talebe **kimlik değil, ETİKET**: `silinmis_kullanici boolean` (veya `sahip_durumu`).
   Panelde "Silinmiş kullanıcı" yazar. **E-posta/ad SAKLANMAZ.**
4. ⚠️ Silmeden önce **`user_id`'yi NULL'a çekmeden** ticket'ın hangi profil tipinden geldiği gibi
   **kişiye bağlanamayan** alanlar korunabilir (departman, tarih, durum) — bunlar zaten kişisel değil.
5. **Zendesk kısıtı değerlendirilmeli:** "açık talebi olan kullanıcı silinemez" — bizde de
   mantıklı olabilir (silmeden önce talebi kapat). **Mehmet kararı.**

### Ödeme geldiğinde (şimdi DEĞİL, ama şimdiden bil)
Fatura/muhasebe kaydı **ayrı tabloda, ayrı saklama süresiyle** tutulmalı — Stripe deseni.
O noktada "hepsini sil" seçeneği hukuken kapanır: vergi mevzuatı saklamayı zorunlu kılar.
⚠️ Süreler doğrulanmadı → ödeme entegrasyonundan önce **mali müşavire sor**.

---

## 4. YAPILACAKLAR

- [ ] **Mehmet kararı:** kimlik tamamen mi kopsun (önerilen), yoksa snapshot da tutulsun mu
      (hukuken zayıf, silme talebinde ayrıca temizlenmesi gerekir)?
- [ ] Karar sonrası `sql/destek/` altına migration (iki FK + etiket kolonu) + `sql/README.md` satırı.
      ⚠️ **DB şeması = önce sor** (CLAUDE.md) — bu dosya öneri, migration çalıştırılmadı.
- [ ] `/admin/destek` + müşteri detay: sahibi NULL olan talebi "Silinmiş kullanıcı" olarak çiz
      (bugün `listPeople` eşleşmeyince satır **sessizce boş** görünüyor — Y4 tipi sessiz yalan).
- [ ] Silme akışının kodu ham Postgres hatasını ekrana veriyor → anlaşılır mesaj + sıralı silme.
- [ ] Araştırmanın eksik ayağı: **Türk vergi mevzuatı saklama süreleri** + KVKK destek yazışması görüşü.
