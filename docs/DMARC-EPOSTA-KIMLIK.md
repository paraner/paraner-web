# E-POSTA KİMLİK DOĞRULAMA (SPF · DKIM · DMARC) — durum + sıkılaştırma planı

> 2026-07-23. Tetikleyen: Mehmet'e her gün `noreply-dmarc-support@google.com`'dan gelen zip'li
> "Report domain: paraner.com" mailleri. **O mailler hata bildirimi DEĞİL**, Google'ın günlük
> DMARC toplu raporu (aggregate report). İlk rapor incelendi: **6/6 mail DKIM+SPF geçti**,
> taklit girişimi yok.

---

## 1) Bugünkü DNS durumu (canlıdan `dig` ile okundu, 2026-07-23)

| Kayıt | Değer | Durum |
|---|---|---|
| `_dmarc.paraner.com` | `v=DMARC1; p=none; rua=mailto:admin@paraner.com` | ⚠️ **p=none → koruma YOK** |
| `paraner.com` SPF | `v=spf1 include:_spf.google.com ~all` | ✅ Workspace |
| `google._domainkey.paraner.com` | RSA anahtar var | ✅ Workspace DKIM kurulu |
| `resend._domainkey.paraner.com` | RSA anahtar var (`v=DKIM1` öneki yok, sorun değil) | ✅ Resend DKIM kurulu |
| `send.paraner.com` SPF | `v=spf1 include:amazonses.com ~all` | ✅ Resend/SES |
| `send.paraner.com` MX | `feedback-smtp.eu-west-1.amazonses.com` | ✅ geri dönüş |
| `paraner.com` MX | `smtp.google.com` | Workspace posta kutusu |
| DNS barındırma | `p3/p4.hosting.com.tr` | kayıt değişikliği BURADAN yapılır |

`adkim=r` / `aspf=r` (gevşek hizalama) — yazılı değil, varsayılan. **Böyle kalmalı:** Resend'in
zarf alanı `send.paraner.com`, header From `merhaba@paraner.com` → gevşek hizalamayla geçiyor.
`aspf=s` yazmanın hiçbir kazancı yok, kırılganlık ekler.

## 2) İlk raporun okunuşu (22 Tem, 24 saat, yalnız Gmail'e ulaşanlar)

6 kayıt, 6 mail, hepsi `54.240.3.x` (Amazon SES = Resend altyapısı):
`disposition=none · DKIM pass (d=paraner.com, selector=resend) · SPF pass (send.paraner.com)`.
Yani **giden gerçek trafiğimizin tamamı doğrulanıyor.** Sahte gönderim kaydı yok.

⚠️ Bu **tek gün + tek alıcı (Google)** verisidir. Outlook/Yahoo raporları ayrı gelir.

## 3) Gönderen envanteri (repo taranarak çıkarıldı)

| Kaynak | From | Yol | DMARC |
|---|---|---|---|
| 6 edge function (`support-reply-notify`, `support-new-ticket-notify`, `staff-invite-notify`, `login-alert`, `send-welcome-email`, `send-farewell-email`) | `Paraner <merhaba@paraner.com>` | Resend → SES | ✅ geçiyor (raporla kanıtlı) |
| Google Workspace (Mehmet'in yazışması) | `admin@paraner.com` vb. | Gmail | ✅ SPF + DKIM kurulu |
| **Supabase Auth** — `signInWithOtp` (kayıt/giriş kodu), `resetPasswordForEmail`, `inviteUserByEmail` | **BİLİNMİYOR** | Supabase SMTP ayarı | ❓ **AÇIK SORU** |

### 🔴 Sıkılaştırmadan önce cevaplanacak TEK soru

**Supabase → Authentication → Emails/SMTP Settings'te özel SMTP (Resend) tanımlı mı?**

- **Tanımlıysa** (From = `merhaba@paraner.com`, Resend üzerinden): her şey kapsam içinde, sıkılaştırma güvenli.
- **Tanımlı değilse** (Supabase varsayılan gönderici, From = `…@mail.app.supabase.io`): o mailler
  bizim alan adımızı kullanmıyor → DMARC onları etkilemez, sıkılaştırma yine güvenli.
  Ama marka açısından kötü (kullanıcı "Paraner" değil "supabase.io" görür) — ayrı bir iş.
- **Üçüncü ihtimal, tehlikeli olan:** From `paraner.com` ama gönderim Supabase'in kendi
  sunucusundan → **SPF/DKIM tutmaz**. `p=quarantine` yazıldığı gün **kayıt OTP'leri ve şifre
  sıfırlama mailleri spam'e düşer**, kimse fark etmez, "kayıt olamıyorum" şikâyeti gelir.

Bu yüzden panel ekran görüntüsü / gelen kutusundaki bir OTP mailinin "gönderen" satırı görülmeden
politika değiştirilmeyecek.

## 4) Kademeli sıkılaştırma planı

**Aşama 0 — ŞİMDİ (yapıldı/yapılacak, risksiz)**
- Bu doküman + GOREVLER kaydı.
- Gmail'de filtre: `noreply-dmarc-support@google.com` → **"DMARC" etiketi + gelen kutusunu atla**.
  Raporlar birikmeye devam eder (veri kaybı yok), gelen kutusu temizlenir.
  ⚠️ Raporları SİLME — Aşama 1 kararı bu birikime bakılarak verilecek.
- Supabase SMTP sorusunun cevabı alınır.

**Aşama 1 — 2-3 hafta rapor biriktikten VE Supabase sorusu cevaplandıktan sonra**
```
v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:admin@paraner.com
```
Sahte mail spam'e düşer, gerçek trafiğimiz etkilenmez.
ℹ️ `pct=` ile örnekleme (pct=25 vb.) bizde **anlamsız**: günde ~6 mail hacminde örneklem çok küçük,
kademelendirme bilgi vermez. Doğrudan %100 quarantine.

**Aşama 2 — Aşama 1'den ~2-4 hafta sonra, raporlarda beklenmedik kaynak yoksa**
```
v=DMARC1; p=reject; sp=reject; rua=mailto:admin@paraner.com
```
Sahte mail hiç teslim edilmez.

**Aşama 2 için ön koşul (kritik):** Aşama 1 boyunca gelen raporlarda **yalnız** SES (Resend) ve
Google IP'leri görünmeli. Beklenmedik bir IP çıkarsa önce o kaynağın ne olduğu bulunacak
(unutulmuş bir servis mi, gerçek taklit mi) — bulunmadan reject yazılmayacak.

## 5) Neden acele edilmiyor / neden yine de yapılacak

**Acele yok:** kimliğe bürünme kazançlı hedefe yapılır. Bugün ödeme sistemi yok, müşteri kitlesi
yok, raporda tek sahte gönderim yok. Kilit takılı değil ama kapıya gelen de yok.

**Yine de yapılacak, çünkü:**
1. **Ödeme entegrasyonu gelince** "faturanız/kartınızı güncelleyin" maili taklit etmek doğrudan
   para kazandıran bir dolandırıcılığa dönüşür — kilit o gün takılı OLMALI, o gün takılmaya
   başlanmamalı (aşamalı geçiş haftalar sürüyor).
2. Gmail/Yahoo 2024'ten beri toplu gönderende DMARC şartı arıyor; sıkı politika teslim
   edilebilirliği yükseltiyor (destek maillerimizin spam'e düşme riski azalır).

→ Bu madde **ödeme entegrasyonu bloğuyla birlikte** ele alınmalı; GOREVLER'de oraya bağlandı.

## 6) Durum kontrolü (istendiğinde tek komut)

```bash
dig +short TXT _dmarc.paraner.com
dig +short TXT paraner.com | grep spf
dig +short TXT google._domainkey.paraner.com | head -c 60
dig +short TXT resend._domainkey.paraner.com | head -c 60
dig +short TXT send.paraner.com
```

Gelen bir raporu okumak için: zip'i aç, XML'de `<policy_evaluated>` altındaki `dkim`/`spf`
satırlarına bak. İkisi de `pass` ise sorun yok. `fail` görülen `source_ip` araştırılır.

## 7) Kapsam dışı bırakılanlar (bilinçli)

- **Üçüncü parti DMARC analiz servisi** (dmarcian/Postmark digest): raporları okunur özete çevirir
  ama gönderim verimizi dışarı verir + yeni hesap/bağımlılık demek. Hacim günde 6 mailken
  gerekmiyor; Gmail etiketi + gerektiğinde elle okuma yetiyor.
- **`ruf=` (forensic rapor):** alıcıların çoğu desteklemiyor, gönderdiğinde mail içeriği/kişisel
  veri taşıyabiliyor → KVKK açısından istenmez.
- **MTA-STS / TLS-RPT:** ayrı konu (taşıma şifrelemesi), DMARC'la karıştırılmamalı, şimdilik yok.
