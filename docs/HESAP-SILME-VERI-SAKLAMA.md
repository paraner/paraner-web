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
- [x] ~~`/admin/destek` sahibi NULL olan talebi "Silinmiş kullanıcı" olarak çizsin~~
      **GEREKMİYOR — zaten yapılmış.** `DestekListClient.tsx:191-195` kişi bulunamayınca boş
      bırakmıyor, *"müşteri kaydı bulunamadı (silinmiş olabilir)"* yazıyor.
      ⚠️ Sohbette "sessizce boş görünüyor" demiştim, **YANLIŞTI** — kodu okumadan söylemiştim.
- [x] ~~Silme akışı ham Postgres hatasını ekrana veriyor~~ **BU DA YANLIŞTI.**
      `lib/adminActions.ts:326-329` hatayı yakalıyor, `user_delete_failed` telafi kaydı yazıyor
      (denetim O10) ve *"Silinemedi: …"* döndürüyor. Yani akış sağlam; yalnız mesajın GÖVDESİ
      teknik (`violates foreign key constraint …`).
- [ ] **(düşük öncelik, FK kararına bağlı)** O teknik mesajı sadeleştirmek —
      ⚠️ ama FK `SET NULL` yapılınca bu hata **tamamen ortadan kalkar**, yani şimdi yazılacak
      metin sonra silinir. Karar verilmeden dokunma.
- [ ] Araştırmanın eksik ayağı: **Türk vergi mevzuatı saklama süreleri** + KVKK destek yazışması görüşü.

---

## 5. HESAP SİLME YAŞAM DÖNGÜSÜ — soft delete + geri dönüş süresi (2026-07-24)

> Mehmet'in sorusu: "kullanıcı hesabını silince hemen mi silinsin, yoksa Stripe gibi bir süre
> geri dönebilsin mi?" Bölüm 1-4 **destek talebine** odaklıydı; bu bölüm **hesabın kendisine**.

### Bugünkü durum (kanıt: `lib/adminActions.ts` deleteUserAccount + panel ayarlar deleteAccount + mobil edge)
Hesap **anında ve kalıcı** siliniyor — geri dönüş YOK. "Görüşmek üzere" maili gidiyor. Kullanıcı
yanlışlıkla silerse ya da fikir değiştirirse kurtarma imkânı yok.

### Sektör standardı (araştırma 2026-07-24, kaynaklar aşağıda)
Neredeyse tüm SaaS aynı deseni kullanıyor: **yumuşak silme + geri dönüş penceresi.**
- **`deleted_at` zaman damgası** (boolean değil — silme anını da yakalar). Kullanıcı işaretlenir,
  girişi engellenir, verisi DURUR.
- **Geri dönüş penceresi 30 gün yaygın** (aralık 30-180; GitLab 7→30'a çıkardı). Pencere içinde
  kullanıcı "Hesabımı geri getir" ile kurtarır.
- **Gece cron'u** penceresi dolan hesapları KALICI siler.
- **Bilgilendirme mailleri:** silme planlandı + hatırlatma + kesin tarih (süre değil tarih yaz).
- Sonuç: "yanlışlıkla sildim" şikâyetleri ~0'a düşer, gizlilik mevzuatına da uyumlu kalır.

**Apple App Store 5.1.1(v):** uygulama-içi hesap silme ZORUNLU; geri dönüş penceresi **ne yasak ne
zorunlu** (24 saat–30 gün yaygın). Ama sonunda kişisel veri GERÇEKTEN silinmeli (sadece "dondur" yetmez).

**Stripe / finansal:** müşteri silinse de **işlem/fatura kayıtları yasal zorunlulukla saklanır**
(AML/vergi). Kişisel veri "redaction" ile görünmez yapılır, kayıt kalır. → Ödeme gelince fatura/
muhasebe verisi ayrı tabloda ayrı saklama süresiyle tutulacak (Bölüm 3 sonu ile aynı sonuç).

### Önerilen politika (Mehmet onayına)
1. **Kullanıcı kendi silince:** anında yok etme YOK → `deleted_at` işaretle, girişi engelle, veriyi
   sakla. Pencere içinde giriş denerse "Hesabın silinecek — geri getirmek ister misin?" → tek tık kurtarma.
2. **Pencere = 30 gün** (Mehmet kararı 2026-07-24 — sektör standardı, Apple/Google + GDPR "1 ay" uyumlu).
3. **Pencere dolunca:** gece cron'u KALICI siler (Bölüm 3 deseni: destek talebi kimliği kopar, içerik kalır).
4. **Biz/admin silince:** ayrı akış — kötüye kullanım/talep temizliği anında olabilir (Hesap silme v2:
   farklı mail zaten GOREVLER'de).
5. **Ödeme gelince:** finansal kayıt ayrı saklama (yukarı).

⚠️ **Bu BÜYÜK bir özellik** — dokunduğu yerler: DB (`deleted_at` + login guard) · **web + mobil auth
akışı** (silinmiş hesapta giriş → kurtarma ekranı) · **cron** (kalıcı silme) · **edge/mail** (planlandı/
hatırlatma/kurtarma). Etki haritası çıkmadan kodlanmaz. **Muhtemelen ödeme/lansman fazıyla birlikte.**

**Kaynaklar:** [Userlist grace-period email](https://userlist.com/blog/account-removal-emails/) ·
[soft vs hard delete](https://dev.to/akarshan/the-delete-button-dilemma-when-to-soft-delete-vs-hard-delete-3a0i) ·
[GitLab 7→30 gün](https://gitlab.com/groups/gitlab-org/-/epics/17375) ·
[Apple 5.1.1(v)](https://developer.apple.com/news/?id=12m75xbj) ·
[Apple deletion req](https://developer.apple.com/news/upcoming-requirements/?id=06302022b) ·
[Stripe deletion](https://docs.stripe.com/privacy/deletion-requests) ·
[Stripe delete customer API](https://docs.stripe.com/api/customers/delete).
