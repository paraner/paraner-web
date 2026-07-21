# SQL dosyaları — ne, ne zaman, hangi sırayla

> Bunlar **çalıştırılmış migration kaydıdır** — veritabanının bugünkü hâline nasıl geldiğinin
> geçmişi. Silme: bir sorun çıktığında "bu kolon nereden geldi, hangi politika neyi eziyor"
> sorusunun tek cevabı burası. Supabase Dashboard → SQL Editor'a yapıştırılarak çalıştırılır.
>
> ⚠️ **DB mobil uygulamayla ORTAK** (`paraner-app`). Şemaya dokunan her şey mobili de etkiler —
> yeni kolon/tablo gerekiyorsa önce Mehmet'e sor. Mobil tarafın kendi SQL'leri
> `paraner-app/supabase/` altında.

## admin/ — yönetim paneli

| Dosya | Ne yapar | Durum |
|---|---|---|
| `admin-panel-rpc.sql` | Panel metrikleri + `admin_ai_usage` RPC'si | ✅ çalıştırıldı |
| `admin-audit-log.sql` | `admin_audit_log` tablosu — kim neyi değiştirdi | ✅ çalıştırıldı |
| `admin-denetim-fix-K3.sql` | Müşterinin `sender_type='agent'` yazmasını engeller | ✅ çalıştırıldı ⚠️ bkz. not |
| `admin-denetim-fix-olcek.sql` | Ölçek düzeltmeleri (indeks, sayaç RPC'si) | ✅ çalıştırıldı |
| `admin-denetim-DOGRULAMA.sql` | **Sadece OKUR** — 8 satır ✅/❌ durum kontrolü | istediğin zaman |
| `admin-yuk-teshis.sql` | **Sadece OKUR** — yük/disk IO nereden geliyor (en çok çalışan sorgular, tablo boyutları, cron) | yavaşlık/kota uyarısında |

## destek/ — destek + departman yönlendirme

Sıra önemliydi, uygulanma sırası:

| # | Dosya | Ne yapar | Durum |
|---|---|---|---|
| 1 | `destek-faz0.sql` | Ticket/mesaj/bildirim tabloları + RLS + agent yanıt e-postası | ✅ |
| 2 | `destek-departman.sql` | `department` kolonu (DEFAULT'lu → mobil kırılmadı), `staff_departments`, ekibe çan bildirimi | ✅ |
| 3 | `destek-departman-rls.sql` | **RLS daraltma** — agent yalnız kendi departmanını görür (fail-closed) | ✅ |
| 4 | `destek-departman-bildirim.sql` | Yeni talepte departman ekibine **e-posta** (edge: `staff-invite-notify` değil, `support-new-ticket-notify`) | ✅ |
| 5 | `destek-hesap-silme-set-null.sql` | Hesap silme 500 hatasını kapatır: 3 FK → `ON DELETE SET NULL` (yazışma denetim kaydı olarak KALIR) | ✅ **çalıştırıldı 2026-07-20** (doğrulama 6/6 ✅) |
| — | `destek-hesap-silme-DOGRULAMA.sql` | **Sadece OKUR** — 6 satır ✅/❌ + auth.users'a bakan TÜM FK'lerin silme davranışı | 5'ten sonra |
| 6 | `destek-talep-realtime.sql` | `support_tickets`'ı realtime yayınına ekler → yeni talep admin listesine ANLIK düşer | ⏳ **BEKLİYOR** |
| 7 | `destek-ek-dosya.sql` | `ticket-attachments` **private** bucket + storage policy'leri (ek dosya) | ⏳ **BEKLİYOR** |
| — | `destek-departman-DOGRULAMA.sql` | **Sadece OKUR** — 13 satır ✅/❌ | istediğin zaman |
| — | `destek-departman-TEST.sql` | İkinci hesapla canlı test betiği (rol/departman atar, sonunda geri alır) | test için |

## ⚠️ Bilinmesi gerekenler

- **`destek-departman-rls.sql`, `destek-faz0.sql`'in politikalarını EZER.** Faz 0'ı tekrar
  çalıştırırsan departman daraltmasını geri alırsın — agent tüm talepleri görmeye başlar.
  Aynı dosya K3 korumasını da içinde taşır (`admin-denetim-fix-K3.sql` ayrıca gerekmez).
- **`destek-hesap-silme-set-null.sql`'in edge bağımlılığı KAPANDI** (2026-07-20): `ticket.user_id`
  NULL gelebildiği için `support-reply-notify` + `support-new-ticket-notify` NULL guard'lı
  sürümleriyle deploy edildi. ⚠️ Bu iki fonksiyonu bir daha deploy edersen **`--no-verify-jwt`
  bayrağını unutma** — ya da daha iyisi, ayar artık `paraner-app/supabase/config.toml`'da
  kayıtlı olduğu için bayrak gerekmez. Kayıt silinirse deploy sessizce JWT zorunlu yapar ve
  destek e-postaları durur (2026-07-20'de tam bu oldu, yakalandı).
- **`paraner-app/supabase/ai-usage-rpc-fix.sql` GEÇERSİZ** — tekrar çalıştırılırsa denetimdeki
  K2 düzeltmesini sessizce geri alır.
- `*-DOGRULAMA.sql` dosyaları hiçbir şeyi değiştirmez; "hangi adım gerçekten canlıda?"
  sorusunu tahmine bırakmamak için var. Bir şeyden şüphelenince önce onları çalıştır.
