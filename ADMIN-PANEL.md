# Admin / iç ekip paneli — mimari yön + fazlı plan

> 2026-07-16. Mehmet: destek ekibi kullanıcı taleplerini nereden görmeli? İleride admin@paraner.com'a
> özel admin paneli + çalışan ekleme düşünülüyor. Sistem böyle mi olmalı, SaaS'lar nasıl yürütür?
> İki araştırma (sektör mimarisi + Paraner kod keşfi). Karar/uygulama BEKLİYOR.

## Kısa cevap
**Şu anki hal (agent müşteri paneli içinde `/panel/destek → Gelen Talepler`) başlangıç için DOĞRU** —
kurucu tek başına + düşük hacim. Ama **kalıcı değil.** Personel eklemeye başlayacağın an iç ekip
aracı müşteri panelinden **ayrılmalı.** SaaS'ların standart evrimi: aynı-app rol → ayrı /admin → izole subdomain.

## Üç desen (sektör)
- **(a) Müşteri uygulamasında rol-korumalı route** — bizim şu anki halimiz. En hızlı başlangıç, ama iç ekip müşteriden FARKLI bilgi görür (ham bakiye, iç ID, log); tek arayüz iki kitleye yaramaz.
- **(b) Ayrı iç admin/back-office panel** (`/admin` route veya `admin.paraner.com`, aynı DB) — olgun hal. Ayrılma sebepleri KANITLI: **blast radius** (müşteri açığı admin yetkisi vermesin — Stripe ilkesi), **XSS yayılımı** (stored XSS admin panelinde tetiklenebilir), **web'e maruz kalma 10× risk**, farklı UX + **audit log**.
- **(c) 3. taraf helpdesk** (Chatwoot açık kaynak / Zendesk ~$55/agent/ay) — sadece konuşma/ticket'ı çözer, "hesaba müdahale"yi (iade, bakiye, ban) ÇÖZMEZ.

**Küçük ekip sırası:** (a) ile başla → ekip gelince (b) → hacim artınca (c)'yi (b) yanına koy ama hesap-müdahalesini kendi panelinde tut.

## Subdomain vs /admin route
| | admin.paraner.com | app içi /admin |
|---|---|---|
| İzolasyon | Ayrı origin → daha güçlü sınır | Aynı origin |
| Deploy | Ayrı izlenecek site (yük) | Tek deploy, basit |
⚠️ **Kritik nüans:** Bizim cookie domain'i `.paraner.com` (çapraz-subdomain oturum). Yani `admin.paraner.com` **tek başına izolasyon VERMEZ** — aynı oturum her subdomain'de geçerli. Gerçek fayda için admin oturumu ayrı cookie/domain/auth ile izole edilmeli; yoksa subdomain sadece "kod/route ayrımı" olur.

## RBAC (iç ekip rolleri)
Tek "admin" rolü yaygın hata. Katman şablonu: **super-admin** (kurucu — personel davet + rol ata) · **admin** (plan/rol/kullanıcı yönetimi) · **agent/standard** (destek işinin %80'i — talep gör/yanıtla). Least privilege. Supabase: Custom Access Token Hook → JWT'ye `user_role` claim + `user_roles`/`role_permissions`. **Audit log zorunlu** (kim/ne/ne zaman/IP, 12-18 ay saklama; insider-threat riski). Impersonation eklersen GitHub modeli: audit'e yaz + kullanıcıya bildir.

## Build vs Buy
Paraner iç paneli müşteri verisi + işlem mantığına SIKI bağlı (ön-muhasebe: cari/fatura/bakiye) → **kendi yaz** ağır basar ("ürünün gerçek parçası"). Ama salt destek CRUD/dashboard için erken fazda **Retool/Forest Admin** (Supabase Postgres'e bağla) mühendislik zamanı kazandırır — meşru ara adım, özellikle kurucu tek başınayken.

## Paraner kod durumu (keşif)
`admin.paraner.com` eklemek **düşük maliyet:** cookie `.paraner.com` zaten kapsıyor (0 kod), rol altyapısı (`user_roles` agent/admin + `is_support_agent()`) hazır, `lib/support.ts` veri katmanı yeniden kullanılır, agent inbox mantığı temiz ayrılabilir. **Gereken:** `proxy.ts` ~4-5 satır (`isAdmin` host tanıma + `replace(/^(app|admin)\./,...)`), `app/admin/layout.tsx` server-side rol guard (panel'de guard yok — GOREVLER:127), `agent` vs `admin` ayrımı (bugün kod ikisini eşitliyor), çalışan yönetimi UI (sıfırdan; `app/panel/calisanlar` = MÜŞTERİ özelliği, karıştırma).

## ÖNERİ — fazlı (mevcut durumdan ideale)

### Faz 0 — ŞİMDİ (kurucu tek başına, düşük hacim): DOKUNMA
Agent müşteri paneli içinde kalsın. Mevcut hal düşük hacimde doğru. Acele etme. (İstersen RBAC'ı tablo-sorgusundan JWT claim'ine taşımak ileriye-uyumlu ucuz bir adım, ama şart değil.)

### Faz 1 — İLK PERSONELİ ekleyeceğin an (Mehmet'in "çalışanları ekleyeceğiz" isteği burada)
- İç ekranları ayrı route ağacına çıkar: `app/admin/` (ayrı layout + **server-side rol guard**). Müşteri panelindeki `isAgent` bloğunu buraya taşı.
- Rol katmanları: super-admin (sen, personel davet + rol ata) / admin / agent.
- **Çalışan davet UI:** e-posta ile personel davet → rol ata → `user_roles`. (Müşteri tarafındaki davet sisteminden farklı — bu iç ekip.)
- **Audit log tablosu** (kim/ne/ne zaman/IP) — her iç mutasyonu yaz.

### Faz 2 — ÖLÇEK / hassas işlemler (iade, ban, PII görüntüleme)
- İç paneli `admin.paraner.com`'a taşı + **oturumu gerçekten izole et** (ayrı cookie/auth — yoksa kozmetik).
- Ayrı iç API katmanı (public API'yi admin işlemlerine açma).
- Ticket hacmi konuşma yönetimini zorlarsa Chatwoot/Zendesk omnichannel yanına, hesap-müdahalesi kendi panelinde.

## Karar (Mehmet)
1. Şimdi Faz 1'i mi kuralım (ayrı /admin + agent/admin ayrımı + çalışan davet + audit) yoksa personel gelene kadar bekle mi?
2. Faz 1 için: ayrı `/admin` route mu (basit, öneri), yoksa direkt `admin.paraner.com` subdomain mi?
3. Erken destek CRUD için Retool/Forest ara adımı düşünülür mü, yoksa hep kendi yaz mı?
