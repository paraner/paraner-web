# Destek: canlılık + ek dosya + silme denetimi — plan

> 2026-07-20, Mehmet'in canlı kullanımda bulduğu 4 eksik. Kod yazılmadan ÖNCE çıkarılan
> etki haritası (CLAUDE.md kuralı). Üç paralel ajan raporu + elle doğrulama.

---

## 1) Canlılık (realtime) — üç ayrı kırık

### A. Yeni talep admin listesine anlık düşmüyor
**Sebep tek değil, ÜÇÜ birden** (biri çözülse diğerleri hâlâ engeller):
1. `app/admin/destek/DestekListClient.tsx` — hiç realtime abonesi yok, saf sunucu render.
2. `app/admin/LiveRefresh.tsx:29-33` — `/admin/canli` 30sn · `/admin` 120sn · **diğer her şey `0`**
   (kapalı). Bu bilinçliydi: Supabase Free disk IO bütçesi (dosyanın 8-26. satırlarında gerekçe).
3. ⚠️ **`support_tickets` realtime publication'ında DEĞİL** (`destek-faz0.sql:115-125` yalnız
   `ticket_messages` + `notifications` ekliyor). Client kodu yazılsa bile olay YAYINLANMAZ.

→ Çözüm sırası: publication'a ekle (SQL) → `DestekListClient`'a abone → `router.refresh()`.

### B. Gönderilen mesaj yenilemeden görünmüyor (web)
`app/panel/destek/[id]/ThreadClient.tsx`:
- `:44` `useState<TicketMessage[]>(initialMessages)` — prop değişince **re-sync YOK**
  (`useEffect([initialMessages])` yok) → `:88` `router.refresh()` ekrana hiçbir şey yansıtmıyor.
- `:70-89` `handleSend` mesajı listeye **elle eklemiyor**; `:86` yorumu "realtime kendi
  mesajımızı da getirir" diyor → tek bacak realtime'a bırakılmış.
- `lib/support.ts:64-71` `insert()` sonrası `.select()` yok → dönen satır elde bile değil.

**Mobil bu hataya DÜŞMÜYOR** — `paraner-app/lib/support.ts` `sendMessage` `.select().single()`
döndürüyor, `app/support-ticket.tsx:85` `setMessages(prev => [...prev, msg])` ile iyimser ekliyor.
Yani doğru desen zaten repoda var, web ondan geri kalmış.

İkincil şüpheli: `lib/support.ts:87` `setAuth` **await edilmiyor**, `.subscribe()` aynı tick'te.
Karşılaştır `app/panel/NotificationBell.tsx:73-75` — orada sıra doğru. Token set edilmeden
abone olunursa `auth.uid()` null → RLS hiçbir satırı geçirmez, olay **sessizce** düşer.

### C. Müşteriye anlık bildirim
Zincir SAĞLAM: `destek-faz0.sql:156-170` trigger → `notifications` (publication'da) →
web `NotificationBell.tsx:76-80` / mobil `NotificationsGate` realtime.
Kırılma **kapsamda**:
- Web çanı yalnız `app/panel/layout.tsx:66`'da mount → panel dışında bildirim yok.
- **`app/admin/layout.tsx`'te çan HİÇ YOK** → personel web'de anlık bildirim almıyor.
- Mobil doğru: `app/_layout.tsx:637` kökte + `AppState 'active'` tazelemesi → her ekranda çalışır.

---

## 2) Ek dosya (ekran görüntüsü/PDF)

**Mevcut:** `ticket_messages.attachment_url` kolonu VAR (`destek-faz0.sql:31`), tipler iki repoda da
tanımlı — ama **hiçbir INSERT'te yazılmıyor, hiçbir ekranda render edilmiyor**. Tamamen ölü alan.
`ticket-attachments` bucket'ı **oluşturulmamış** (`destek-faz0.sql:196` yalnız yorum).

**Kopyalanabilir (desen kanıtlanmış):**
- Web upload: `lib/receipts.ts:15-33` birebir şablon · `RECEIPT_ACCEPT` + `isPdfUrl()` (`:8,10-12`)
- Web UI: `AyarlarClient.tsx:436-461` (tek dosya + boyut + toast)
- Mobil yükleme: `add-transaction.tsx:185-208` (base64 → `decode()` → upload)
- Mobil seçici: `lib/imagePicker.ts` + `app/attachment-picker.tsx` — **sıkıştırma bedava geliyor**
  (1600px/JPEG q0.7, "20 MB → ~500-800 KB")

**Yeniden yazılacak (kopyalanamaz):**
- **Storage policy'leri:** mevcutlar (`receipts-storage.sql:27-34`) klasörü `profiles.id` ile eşliyor.
  Destek KİŞİ bazlı + `{ticket_id}/` deseni + **agent hepsini okumalı** → yeni SQL şart.
- **Bucket private mi public mi:** `docs/DESTEK-SEMA-MOBIL.md:45` private diyor → o zaman
  `getPublicUrl` deseni geçersiz, `createSignedUrl` gerekir (upload helper + render değişir).
- Mesaj balonunda ek render'ı — projede chat-içi ek gösterimi hiç yok.
- `createTicket`/`sendMessage` imzaları 4 yerde (web+mobil × 2) SENKRON değişmeli.

⚠️ Mobil `attachmentStore` profil geçişinde temizlenmiyor (`diğer/docs/AUDIT_2026-04-24.md:52-54`)
→ destek formunda aynı store kullanılırsa bu bug miras alınır.

---

## 3) Silme denetimi (kim sildi, neden)

**İyi haber: ŞEMA DEĞİŞİKLİĞİ GEREKMİYOR.**
`admin_audit_log.detail` **jsonb NOT NULL default '{}'** (`admin-audit-log.sql:22`) — sebep+not
oraya yazılır. `logAction` (`lib/adminActions.ts:77-94`) zaten 4. argüman olarak detail alıyor.
`deleteUserAccount` (`:311-336`) şu an `:319`'da detail'SİZ yazıyor; `userId`+`email` elinde var.

`/admin/denetim` ekranı **ZATEN VAR** (`app/admin/denetim/page.tsx` + `DenetimClient.tsx`),
`detail`i `key: value` olarak otomatik basıyor → sebep/not eklenince kendiliğinden görünür
(etiketleri güzelleştirmek ayrı, küçük iş).
⚠️ `GOREVLER.md:50` "audit log'u panelde GÖSTER (şu an yalnız yazılıyor)" maddesi **BAYAT** — kapat.

**UI engeli:** `confirmDialog` (`app/components/confirm.ts:19`) `Promise<boolean>` döndürüyor,
form/input alamıyor ve **30+ çağrı yeri** boolean bekliyor → dönüş tipini değiştirmek riskli.
Çözüm: silme için `components/ui/Modal.tsx` ile AYRI bir modal (sebep seçimi + not + yaz-onayla).

### ⚠️ "Bu talebi kim sildi" — DOĞRUDAN GÖSTERİLEMİYOR
Dün `support_tickets.user_id` SET NULL yapıldığı için talep ↔ silinen kişi arasında
**join edecek anahtar kalmadı** (`ticket_messages.sender_id` de aynı). Üç seçenek:

| # | Yol | Şema değişikliği | Not |
|---|---|---|---|
| 1 | `support_tickets`'a `owner_email_snapshot` kolonu | **EVET** | KVKK kararı gerektirir (silme hakkına rağmen kişisel veri tutmak) |
| 2 | Silmeden ÖNCE o kişinin talep id'lerini `detail.ticket_ids`'e yaz, destek listesinde ters join | HAYIR | Kişisel veri EKLEMİYOR, yalnız "hangi talepler bu silmeye ait" bağını kuruyor |
| 3 | Sadece `/admin/denetim`'e link ver | HAYIR | En ucuz, ama talep satırında cevap yok |

**Öneri: 2.** Kimliği geri getirmeden "bu talep, X tarafından şu sebeple silinen bir hesaba aitti"
sorusunu cevaplar ve dünkü KVKK duruşunu bozmaz.

---

## Sıra önerisi
1. **B** (kendi mesajını görme) — saf web bug'ı, DB'ye dokunmaz, en hızlı kazanç
2. **Silme denetimi** — şema değişikliği yok, geri alınamaz işlemi belgeliyor
3. **A** (yeni talep anlık) — publication SQL + client abonelik
4. **C** (çan kapsamı) — admin layout'a çan
5. **Ek dosya** — en büyük iş; bucket + policy + 4 imza + iki repo UI
