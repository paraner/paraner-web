# Destek Sistemi — mimari + akış planı

> 2026-07-15. Mehmet: kullanıcı destek talebi oluşturunca sistemde "taleplerim" olarak görünsün,
> destek ekibi yanıtlayınca kullanıcıya e-posta + uygulama-içi bildirim (web + mobil push) gitsin,
> kullanıcı chat gibi bir thread'de devam etsin. "Zor olsa da yaparız, kullanıcı odaklı olsun."
> **Karar BEKLİYOR — DB şeması + edge function + mobil koordinasyon içerir.**

## 1. Doğru model: "Conversational ticketing" (Mehmet'in sezgisi doğru)

Üç yaklaşım var:
- **Shared inbox** (destek@ mailine ortak bakmak): kurulumu 0, ama sahiplik/atama/raporlama yok, ölçeklenmez. Şu an bizim durumumuz (WhatsApp/mailto).
- **Klasik ticket**: her talep = ID + durum + sahip. Yapılandırılmış ama "soğuk" hisseder.
- **Conversational ticketing** ✅: kullanıcı **chat gibi bir thread**'de yazar, arkada **ticket** olarak izlenir. Mehmet'in tarif ettiği tam bu — sıcak deneyim + yapılandırılmış takip.

Bizde kendi backend (Supabase) olduğu için baştan hafif bir **ticket + thread** modeli kurup arayüzü chat gibi göstermek en doğrusu (Zendesk gibi ikinci bir sistem almaya gerek yok — ayrı kimlik/veri yükü olurdu).

## 2. Veri modeli (yeni tablolar — ŞEMA, mobil ile koordine + onay)

```
support_tickets
  id · user_id (talep sahibi) · subject · status(open|answered|resolved|closed)
  priority · category · assignee_id (atanan destek personeli) · created_at · updated_at · last_message_at

ticket_messages           ← "chat thread"in temeli (ticket'a 1-N)
  id · ticket_id · sender_id · sender_type(user|agent) · body · attachment_url · created_at

notifications             ← uygulama-içi bildirim (NotificationBell'i besler; app+web ortak)
  id · user_id · type · title · body · link · is_read · created_at

user_roles                ← destek ekibini kullanıcıdan ayırır
  user_id · role(agent|admin)
```
Ek dosya (ekran görüntüsü) için Supabase Storage bucket `ticket-attachments`.
Referans şema: Chatwoot (Conversation→Message), Ticketit. Kaynaklar araştırma ajanında.

## 3. Akış (uçtan uca)

1. **Kullanıcı** Destek → "Talep Oluştur" → `support_tickets` + ilk `ticket_messages` INSERT. Talep "Taleplerim"de `open` görünür.
2. **Destek ekibi** rol-korumalı ekrandan talebi görür, yanıt yazar → yeni `ticket_messages` (sender_type=agent) + ticket `answered`.
3. **Yanıt INSERT'i** → Supabase **Database Webhook** → **tek Edge Function** üç işi yapar:
   - **E-posta** (Resend) → "Talebiniz yanıtlandı"
   - **`notifications` satırı** → web + mobil çanına anlık düşer (Realtime)
   - **Mobil push** (Expo) → telefonda bildirim
4. **Kullanıcı** çandan/mailden görür, thread'de (chat) devam eder. Çözülünce `resolved`.

Tek olay (yeni mesaj) → üç kanal, tek yerde. Temiz.

## 4. RLS (güvenlik)
- Kullanıcı **yalnız kendi** ticket'larını görür: `user_id = auth.uid()`.
- Destek ekibi **hepsini** görür: `user_id = auth.uid() OR EXISTS(user_roles: role='agent')`.
- MVP'de rol kontrolü RLS içinde `EXISTS` (anlık rol değişimi, basit). Ölçekte JWT'ye taşınır (Custom Access Token Hook — performans; ⚠️ JWT geri-alınamaz, rol değişimi login'e kadar gecikir).

## 5. Destek ekibi (agent) arayüzü
Ayrı bir sistem/sunucu DEĞİL → **aynı panelde rol-korumalı gizli route** (ör. `/panel/destek/yonetim` veya `/admin`), erişim `agent` rolüyle sınırlı. Tek kod tabanı, tek Supabase, tek Realtime. Küçük ekip için en pragmatik (Chatwoot bile tek uygulamada "agent dashboard" yapıyor).

## 6. Bizde HAZIR olan (araştırma: altyapı denetimi)
- **E-posta edge function deseni** çalışıyor: `login-alert`, `send-farewell-email` (mobil repo) + `auth.users` trigger. Yeni `support-reply-notify` function'ı bu desenle yazılır.
- **Realtime deseni** hazır (kanonik): `AccountStatusGuard.tsx:104` `channel + postgres_changes + subscribe + setAuth`. DELETE dinliyor → INSERT'e birebir uyarlanır.
- **NotificationBell** UI kabuğu hazır (ACTIVE/HISTORY sekmeleri) → sadece `notifications` tablosu bağlanacak.
- **Destek sayfası + modal** hazır (DestekClient) → DB'ye yazmaya çevrilecek.

## 7. SIFIRDAN kurulacak (şema + backend)
- `support_tickets` + `ticket_messages` + RLS + Storage bucket.
- `notifications` tablosu + RLS + Realtime INSERT dinleme.
- `user_roles` (agent/admin) + RLS'e rol kontrolü.
- Agent arayüzü (rol-korumalı route).
- `support-reply-notify` edge function (Resend e-posta + notifications).
- **Mobil push** (Faz 1): `profiles.expo_push_token` + `push` edge function (Expo API). Bizde push altyapısı HİÇ yok (mobilde de belgelenmemiş → mobil Claude ile koordine).

## 8. Fazlı plan (önerilen)

### Faz 0 — MVP (web, kendi ekibin) ⭐ buradan başlanır
`support_tickets` + `ticket_messages` + RLS + Storage. Panelde "Taleplerim" listesi + chat thread. Canlılık: **Postgres Changes** (kurulumu en az). Bildirim: yeni agent mesajı → webhook → **e-posta (Resend) + `notifications` satırı** (uygulama-içi çan). Agent tarafı: rol-korumalı route.
→ **Kullanıcı talebini sistemde görür, yanıtlanınca çana + maile düşer, chat'te devam eder.** Mehmet'in çekirdek isteği tamam.

### Faz 1 — Mobil push + tam bildirim
`profiles.expo_push_token` + Expo push edge function (Supabase resmi örneği birebir). notifications realtime rozeti web+mobil. → "Talebiniz yanıtlandı" telefona push.

### Faz 2 — Ölçek + operasyon
RBAC'ı JWT'ye taşı, Realtime'ı Broadcast'e geçir (Supabase'in ölçek önerisi), SLA + öncelik + atama + "yazıyor…" göstergesi + raporlama (yanıt süresi/çözüm oranı).

## 9. Kararlar (Mehmet)
1. **DB şeması onayı** — 4 yeni tablo, mobil AYNI Supabase → mobil Claude ile koordinasyon şart.
2. **Nereden başlanır** — Faz 0 (web MVP: ticket + thread + e-posta + uygulama-içi çan) öneriliyor; push Faz 1.
3. **Agent arayüzü** — aynı panelde rol-korumalı route (önerilen) vs ayrı /admin.
4. **E-posta sağlayıcı** — Resend (öneri; mobil edge function'lar zaten bir sağlayıcı kullanıyor, muhtemelen aynısı).
