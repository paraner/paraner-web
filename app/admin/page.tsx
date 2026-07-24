import Link from "next/link";
import { Users, Building2, User, Star, Clock, LifeBuoy, ChevronRight, Activity, UserX, Hourglass, Layers } from "lucide-react";
import { createAdminClient, hasAdminKey } from "../../lib/supabase/admin";
import { requireStaffPage } from "../../lib/adminGuard";
import { TICKET_COLS, TICKET_STATUS_META, type Ticket } from "../../lib/supportShared";
import {
  relativeLabel,
  relativeDays,
  personLifecycle,
  hasBusiness,
  displayName,
  TRIAL_ENDING_DAYS,
  NEW_WITHIN_DAYS,
} from "../../lib/lifecycle";
import { listPeopleCached } from "../../lib/adminUsers";
import { getActiveCounts, getDeadProfileCount, getModuleAdoption } from "../../lib/adminMetrics";
import AdminKeyNotice from "./AdminKeyNotice";
import AdminPageHead from "./AdminPageHead";

export default async function AdminDashboard() {
  /* ⚠️ SAYFA guard'ı — layout'takine GÜVENME (denetim 2026-07-18 / Y1): Next 16'da layout
     istemci-taraflı gezinmede yeniden çalışmaz. Bu sayfa service_role ile profiles (10.000
     satır) + destek talebi başlıklarını okuyor → guard'ı sayfanın İLK satırında olmalı.
     requireAdminPage() DEĞİL: agent de panoyu görebiliyor (kartları rolle kısıtlıyoruz). */
  const role = await requireStaffPage();
  const isAdminRole = role === "admin";
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  /* ⚠️ Kartlar SEGMENTLERLE AYNI KAYNAKTAN sayılır (2026-07-24 kararı: "her yerde KİŞİ say").
     Eskiden pano `panoMetrikleri` ile PROFİL sayıyordu ("Premium profil" = is_premium profil,
     DENEME DAHİL), tıklanınca giden /admin/musteriler segmentleri ise KİŞİ sayıyordu
     (personLifecycle) → kart 40 der, liste 6 açardı. Artık ikisi de listPeopleCached + lib/lifecycle
     kullanıyor → kart değeri tıklanan listeyle BİREBİR eşleşir. (Müşteri = auth kullanıcısı; bir
     kişinin birden çok profili olabilir.) service_role, 60 sn önbellekli, /admin/musteriler +
     /admin/destek ile PAYLAŞIMLI. */
  const { people, truncated, error: peopleErr } = await listPeopleCached();

  /* ⚠️ Destek sorguları BİLEREK önbelleksiz: "bekleyen talep" panelin birinci işi, taze kalmalı.
     active/dead/adoption yönetici-özel RPC'ler (agent'ta 0). */
  const [ticketsR, openR, active, dead, adoption] = await Promise.all([
    admin
      .from("support_tickets")
      .select(TICKET_COLS)
      .in("status", ["open", "answered"])
      .order("last_message_at", { ascending: false })
      .limit(6),
    // Sayaç AYRI: yukarıdaki sorgu 6 ile sınırlı → tickets.length sayılsaydı 7 talepte "6" derdi.
    admin
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "answered"]),
    isAdminRole ? getActiveCounts() : Promise.resolve({ dau: 0, wau: 0, mau: 0 }),
    isAdminRole ? getDeadProfileCount() : Promise.resolve(0),
    isAdminRole ? getModuleAdoption() : Promise.resolve(null),
  ]);

  /* ⚠️ Hataları GÖSTER, yutma (denetim 2026-07-18 / Y4): destek sorgusu 400 dönerse tickets=[] +
     openCount=0 → kart "Bekleyen talep 0 · hepsi yanıtlandı" der ve talepler sessizce yanıtsız kalır. */
  const err = peopleErr ?? [ticketsR, openR].find((r) => r.error)?.error?.message;
  if (err) {
    return (
      <div>
        <h1 className="admin-h1">Genel Bakış</h1>
        <p className="admin-sub">Metrikler yüklenemedi: {err}</p>
      </div>
    );
  }

  const now = Date.now();
  const plural = (n: number) => n.toLocaleString("tr-TR");

  /* KİŞİ bazlı sayımlar — /admin/musteriler segmentleriyle (MusterilerClient.inSegment) BİREBİR. */
  const total = people.length; // Toplam Müşteri (kişi)
  const nProfiles = people.reduce((n, p) => n + p.profiles.length, 0); // alt bilgi: toplam profil
  const business = people.filter(hasBusiness).length; // ?tur=business (≥1 işletme profili)
  const individual = total - business; // ?tur=individual (hiç işletme profili yok)
  const paid = people.filter((p) => personLifecycle(p, now).kind === "paid").length; // ?seg=paid
  const recent = people.filter((p) => {
    const d = relativeDays(p.created_at, now);
    return d != null && d <= NEW_WITHIN_DAYS;
  }).length; // ?seg=new (son 7 gün)
  const endingSoon = people.filter((p) => {
    const l = personLifecycle(p, now);
    return l.kind === "trial" && l.days <= TRIAL_ENDING_DAYS;
  }).length; // ?seg=ending

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  // Talep sahibinin adı: support_tickets.user_id = KİŞİ (auth.users.id). displayName "—" ise
  // atla → kart #id fallback'ine düşer (nameByUser.get undefined döner).
  const nameByUser = new Map<string, string>();
  for (const p of people) {
    const n = displayName(p);
    if (n !== "—") nameByUser.set(p.id, n);
  }
  const tickets = (ticketsR.data ?? []) as Ticket[];
  const openCount = openR.count ?? 0;
  const isAdmin = isAdminRole;

  /* AKSİYON PANOSU (Mehmet kararı): "bugün ne yapmalıyım" ekranı.
     Sıra bilinçli — aksiyon gerektirenler önde, envanter sayıları arkada.
     Her kart tıklanınca ilgili FİLTRELİ listeye gider (sayıya bakıp aramak zorunda kalma). */
  const cards = [
    {
      label: "Bekleyen talep",
      value: openCount,
      sub: openCount ? "yanıt bekliyor" : "hepsi yanıtlandı",
      icon: LifeBuoy,
      tone: "",
      href: "/admin/destek",
    },
    {
      label: "Denemesi bitiyor",
      value: endingSoon,
      sub: `${TRIAL_ENDING_DAYS} gün içinde`,
      icon: Hourglass,
      tone: "",
      href: isAdmin ? "/admin/musteriler?seg=ending" : undefined,
    },
    /* ⚠️ Bu iki kart YALNIZ yöneticiye (denetim 2026-07-18 / O12): agent için metrikler hiç
       çağrılmıyor (RPC'lerde yönetici guard'ı var) → değerler 0 geliyordu. href'i undefined
       bırakmak YETMEZ, kart yine görünüp "Bugün aktif 0 · Ölü kayıt 0" YANLIŞ BİLGİ veriyordu.
       Diziye hiç eklenmiyorlar. */
    ...(isAdmin
      ? [
          {
            label: "Ölü kayıt",
            value: dead,
            // Bu metrik PROFİL bazlı (hiç işlem girmemiş profil) → % de profil üzerinden.
            sub: nProfiles
              ? `%${Math.round((dead / nProfiles) * 100)} · hiç işlem girmemiş profil`
              : "hiç işlem girmemiş profil",
            icon: UserX,
            tone: "",
            /* Bilinçli olarak TIKLANAMAZ: eskiden filtresiz /admin/musteriler'e gidiyordu →
               "Ölü kayıt 47" görüp tıklayan kişi 3.000 kişilik listeye düşüp o 47'yi bulamıyordu.
               Gerçek çözüm `?seg=dead` segmenti (admin_dead_profiles id'lerini listeye taşımak
               gerekir) → GOREVLER'de. O gelene kadar yanlış vaat vermiyoruz. */
            href: undefined,
          },
          {
            label: "Bugün aktif",
            value: active.dau,
            sub: `hafta ${active.wau} · ay ${active.mau}`,
            icon: Activity,
            tone: "",
            href: "/admin/canli",
          },
        ]
      : []),
    {
      label: "Toplam Müşteri",
      value: total,
      sub: `${plural(nProfiles)} profil · son 7 günde +${recent}`,
      icon: Users,
      tone: "",
      href: isAdmin ? "/admin/musteriler" : undefined,
    },
    // Etiketler artık KİŞİ diyor (profil değil) → tıklanan segmentle birebir. %'ler kişi üzerinden.
    { label: "İşletme", value: business, sub: `%${pct(business)}`, icon: Building2, tone: "biz", href: isAdmin ? "/admin/musteriler?tur=business" : undefined },
    { label: "Bireysel", value: individual, sub: `%${pct(individual)}`, icon: User, tone: "ind", href: isAdmin ? "/admin/musteriler?tur=individual" : undefined },
    // "Ücretli" = gerçek ödeyen (premium AMA denemesi yok) — ?seg=paid ile aynı. is_premium'a
    // BAKMIYORUZ: o deneme dahil şişer; personLifecycle "paid" gerçek aboneyi verir.
    { label: "Ücretli", value: paid, sub: `%${pct(paid)}`, icon: Star, tone: "prem", href: isAdmin ? "/admin/musteriler?seg=paid" : undefined },
  ];



  return (
    <div>
      <AdminPageHead
        title="Genel Bakış"
        sub="Tüm müşteriler ve abonelik dağılımı. Müşteri = kişi; bir kişi birden fazla profil açabilir. Kart sayıları KİŞİ bazlı — tıklanan listeyle birebir."
      />
      {truncated && (
        <p className="admin-sub" style={{ color: "var(--danger)", marginTop: -4 }}>
          ⚠️ Müşteri listesi 10.000&apos;de kırpıldı → kart sayaçları artık EKSİK sayıyor.
          Bu sayaçlar ölçekte RPC&apos;ye taşınmalı (DB şeması = önce sor).
        </p>
      )}

      <div className="admin-kpi-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          const inner = (
            <>
              <span className="admin-kpi-ic">
                <Icon size={18} />
              </span>
              <div className="admin-kpi-label">{c.label}</div>
              <div className="admin-kpi-value">{c.value.toLocaleString("tr-TR")}</div>
              <div className="admin-kpi-sub">{c.sub}</div>
            </>
          );
          const cls = `admin-kpi${c.tone ? " " + c.tone : ""}`;
          // href yoksa (agent) düz kart — tıklanabilir gösterip 404'e göndermeyelim.
          return c.href ? (
            <Link key={c.label} href={c.href} className={`${cls} clickable`}>
              {inner}
            </Link>
          ) : (
            <div key={c.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* --- Gelen talepler: tıkla → ilgili talebin thread'i --- */}
      <div className="admin-panel" style={{ marginTop: 20, padding: 0 }}>
        <div className="admin-panel-head" style={{ padding: "18px 20px 0" }}>
          <LifeBuoy size={16} /> Gelen talepler
          {openCount > 0 && <span className="admin-live-pill">{openCount}</span>}
          <Link href="/admin/destek" className="admin-head-link">
            Tümü <ChevronRight size={13} />
          </Link>
        </div>
        {tickets.length === 0 ? (
          <p className="live-empty" style={{ padding: "0 20px 18px" }}>
            Yanıt bekleyen talep yok.
            <span>Yeni bir talep açıldığında burada belirir.</span>
          </p>
        ) : (
          <div className="admin-ticket-list">
            {tickets.map((t) => {
              const meta = TICKET_STATUS_META[t.status] ?? TICKET_STATUS_META.open;
              return (
                <Link key={t.id} href={`/admin/destek/${t.id}`} className="admin-ticket-row">
                  <div className="admin-ticket-main">
                    <div className="admin-ticket-subject">{t.subject}</div>
                    <div className="admin-ticket-meta">
                      {/* user_id null = müşteri silinmiş (FK SET NULL); talep denetim kaydı olarak durur */}
                      {(t.user_id ? nameByUser.get(t.user_id) : "Silinmiş müşteri") ??
                        `#${t.id.slice(0, 8)}`}{" "}
                      ·{" "}
                      {relativeLabel(t.last_message_at, now)}
                    </div>
                  </div>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  <ChevronRight size={16} className="admin-ticket-chevron" />
                </Link>
              );
            })}
            {openCount > tickets.length && (
              <Link href="/admin/destek" className="admin-ticket-more">
                +{openCount - tickets.length} talep daha →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* --- Modül benimseme: hangi modülü kaç profil kullanıyor --- */}
      {isAdmin && (
        <div className="admin-panel" style={{ marginTop: 16 }}>
          <div className="admin-panel-head">
            <Layers size={16} /> Modül benimseme
            <span className="admin-td-dim" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
              kaç profil kullanıyor
            </span>
          </div>
          {adoption == null ? (
            <p className="live-empty">
              Modül verisi için <b>sql/admin/admin-panel-rpc.sql</b> çalıştırılmalı.
              <span>22 tabloya tek tek sorgu atmak yerine tek RPC ile alınıyor.</span>
            </p>
          ) : adoption.length === 0 ? (
            <p className="live-empty">Hiçbir modül henüz kullanılmamış.</p>
          ) : (
            <div className="live-bars">
              {adoption.map((m) => (
                <div key={m.modul} className="live-bar-row adopt">
                  <span className="live-bar-label">{m.modul}</span>
                  <span className="live-bar-track">
                    <span
                      className="live-bar-fill"
                      style={{
                        width: `${Math.round((m.kullanici / Math.max(1, adoption[0].kullanici)) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="live-bar-n">{m.kullanici}</span>
                  <span className="adopt-rows">{m.kayit.toLocaleString("tr-TR")} kayıt</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">
          <Clock size={16} /> Abonelik dağılımı (kişi bazlı)
        </div>
        {/* Ücretli = gerçek ödeyen (deneme HARİÇ) → "Ücretli değil" denemede/ücretsiz/kurulumsuz
            herkesi kapsar; ayrıntı segment çiplerinde (Denemede/Ücretsiz/Kurulum yapılmamış). */}
        <div className="admin-bar">
          <div className="admin-bar-fill prem" style={{ width: `${pct(paid)}%` }} />
        </div>
        <div className="admin-bar-legend">
          <span>
            <i className="dot prem" /> Ücretli {paid} (%{pct(paid)})
          </span>
          <span>
            <i className="dot free" /> Ücretli değil {total - paid} (%{pct(total - paid)})
          </span>
        </div>
      </div>
    </div>
  );
}
