import Link from "next/link";
import { Users, Building2, User, Star, Clock, LifeBuoy, ChevronRight, Activity, UserX, Hourglass, Layers } from "lucide-react";
import { createAdminClient, hasAdminKey } from "../../lib/supabase/admin";
import { requireStaffPage } from "../../lib/adminGuard";
import { TICKET_COLS, TICKET_STATUS_META, type Ticket } from "../../lib/supportShared";
import { relativeLabel, TRIAL_ENDING_DAYS } from "../../lib/lifecycle";
import { TRIAL_DAYS } from "../../lib/plans";
import {
  panoMetrikleri,
  getActiveCounts,
  getDeadProfileCount,
  getModuleAdoption,
} from "../../lib/adminMetrics";
import AdminKeyNotice from "./AdminKeyNotice";

export default async function AdminDashboard() {
  /* ⚠️ SAYFA guard'ı — layout'takine GÜVENME (denetim 2026-07-18 / Y1): Next 16'da layout
     istemci-taraflı gezinmede yeniden çalışmaz. Bu sayfa service_role ile profiles (10.000
     satır) + destek talebi başlıklarını okuyor → guard'ı sayfanın İLK satırında olmalı.
     requireAdminPage() DEĞİL: agent de panoyu görebiliyor (kartları rolle kısıtlıyoruz). */
  const role = await requireStaffPage();
  const isAdminRole = role === "admin";
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  /* Üye (kişi) ≠ profil: bir kişi hem bireysel hem işletme profili açabilir. Kart/yüzdeler PROFİL
     bazlı; "Toplam Üye" gerçek kişi sayısı olmalı. PostgREST'te distinct count yok → auth_user_id
     kolonu çekilip benzersizleştiriliyor (tek uuid kolonu; büyürse RPC gerekir → DB şeması = önce sor). */
  // Rol: agent Müşteriler'e giremez (requireAdminPage) → ona kart linki VERME, 404 yerdi.
  // (role/isAdminRole yukarıda, guard ile birlikte alınıyor.)
  /* ⚠️ AĞIR METRİKLER ÖNBELLEKLİ (2026-07-19) — ölçüm: /admin sıcakken bile 3,6 sn sürüyordu,
     diğer admin sayfaları 350-400 ms. Sebep bu sayfanın 8 sorgusu; tek tek 300-850 ms (9 satırlık
     tablolarda!) çünkü Free plan disk IO bütçesi tükenince throughput 5 MB/s'e düşüyor.
     Bu sayılar KİŞİYE ÖZEL DEĞİL (service_role, global metrik) → 2 dakika önbelleklemek güvenli.
     Kazanç çift yönlü: sayfa anında açılır VE DB'ye giden sorgu sayısı ~30 kat azalır (panel
     açık kaldıkça her yenilemede baştan çalışmıyor) — disk IO uyarısının da bir parçası buydu.
     ⚠️ DESTEK sorguları ÖNBELLEĞE ALINMADI: "bekleyen talep" panelin birinci işi, taze kalmalı. */
  const [{ totalR, businessR, premiumR, recentR, ownersR }, ticketsR, openR, active, dead, adoption] =
    await Promise.all([
      /* ⚠️ Yalnız service_role sorguları önbellekli. Aşağıdaki üç metrik ÇEREZ tabanlı
         istemci kullanıyor (RPC guard'ı auth.uid() istiyor) → önbelleğe ALINAMAZ,
         alınırsa sayfa komple patlar (2026-07-19'da yaşandı). */
      panoMetrikleri(),
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

  /* ⚠️ Hataları GÖSTER, yutma: `count ?? 0` sessizce 0'a düşüyordu → kolon/izin hatasında
     panelin ilk ekranı "Toplam Üye 0 · %0" der ve kimse sebebini bilmez.
     ⚠️ ticketsR/openR de LİSTEDE olmalı (denetim 2026-07-18 / Y4): destek sorgusu 400 dönerse
     tickets=[] + openCount=0 → kart "Bekleyen talep 0 · hepsi yanıtlandı" der ve müşteri
     talepleri sessizce yanıtsız kalır. Panelin BİRİNCİ işi bu. */
  const err = [totalR, businessR, premiumR, recentR, ownersR, ticketsR, openR].find((r) => r.error)
    ?.error;
  if (err) {
    return (
      <div>
        <h1 className="admin-h1">Genel Bakış</h1>
        <p className="admin-sub">Metrikler yüklenemedi: {err.message}</p>
      </div>
    );
  }

  const total = totalR.count ?? 0;
  const business = businessR.count ?? 0;
  const premium = premiumR.count ?? 0;
  const recent = recentR.count ?? 0;
  const owners = (ownersR.data ?? []) as {
    auth_user_id: string | null;
    profile_name: string | null;
    name: string | null;
    trial_plan: string | null;
    trial_start_date: string | null;
    is_premium: boolean | null;
  }[];
  const members = new Set(owners.map((r) => r.auth_user_id).filter(Boolean)).size;
  /* Kırpıldıysa SÖYLE (O5): sayılar artık "en az" anlamına geliyor, kesin değil. */
  const ownersTruncated = (ownersR.count ?? owners.length) > owners.length;
  const individual = Math.max(0, total - business);
  const free = Math.max(0, total - premium);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const plural = (n: number) => n.toLocaleString("tr-TR");
  const now = Date.now();

  // Talep sahibinin adı: support_tickets.user_id = KİŞİ (auth.users.id) — profil id DEĞİL.
  const nameByUser = new Map<string, string>();
  for (const p of owners) {
    const n = p.profile_name || p.name;
    if (p.auth_user_id && n && !nameByUser.has(p.auth_user_id)) nameByUser.set(p.auth_user_id, n);
  }
  const tickets = (ticketsR.data ?? []) as Ticket[];
  const openCount = openR.count ?? 0;
  const isAdmin = isAdminRole;

  /* Denemesi bitmek üzere olanlar — müşteri listesindeki "Denemesi bitiyor" segmentiyle
     AYNI kural (lifecycle.ts): deneme başlamış sayılmak için trial_plan + trial_start_date
     İKİSİ de dolu olmalı; kalan gün = TRIAL_DAYS - geçen gün. */
  const endingSoon = owners.filter((p) => {
    if (!p.trial_plan || !p.trial_start_date) return false;
    const gecen = Math.floor((now - new Date(p.trial_start_date).getTime()) / 86400000);
    const kalan = TRIAL_DAYS - gecen;
    return kalan > 0 && kalan <= TRIAL_ENDING_DAYS;
  }).length;

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
            sub: total
              ? `%${Math.round((dead / total) * 100)} · hiç işlem girmemiş`
              : "hiç işlem girmemiş",
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
      label: "Toplam Üye",
      value: members,
      sub: `${plural(total)} profil · son 7 günde +${recent}`,
      icon: Users,
      tone: "",
      href: isAdmin ? "/admin/musteriler" : undefined,
    },
    { label: "İşletme profili", value: business, sub: `%${pct(business)}`, icon: Building2, tone: "biz", href: isAdmin ? "/admin/musteriler?tur=business" : undefined },
    { label: "Bireysel profili", value: individual, sub: `%${pct(individual)}`, icon: User, tone: "ind", href: isAdmin ? "/admin/musteriler?tur=individual" : undefined },
    { label: "Premium profil", value: premium, sub: `%${pct(premium)} · Free ${free}`, icon: Star, tone: "prem", href: isAdmin ? "/admin/musteriler?seg=paid" : undefined },
  ];



  return (
    <div>
      <h1 className="admin-h1">Genel Bakış</h1>
      <p className="admin-sub">
        Tüm üyeler ve abonelik dağılımı. Bir üye birden fazla profil açabilir — dağılımlar profil bazlıdır.
      </p>
      {ownersTruncated && (
        <p className="admin-sub" style={{ color: "var(--danger)", marginTop: -4 }}>
          ⚠️ Profil listesi 10.000&apos;de kırpıldı ({(ownersR.count ?? 0).toLocaleString("tr-TR")}{" "}
          profil var). &quot;Toplam Üye&quot; ve &quot;Denemesi bitiyor&quot; artık EKSİK sayıyor —
          bu sayaçlar RPC&apos;ye taşınmalı.
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
          <Clock size={16} /> Abonelik dağılımı (profil bazlı)
        </div>
        <div className="admin-bar">
          <div className="admin-bar-fill prem" style={{ width: `${pct(premium)}%` }} />
        </div>
        <div className="admin-bar-legend">
          <span>
            <i className="dot prem" /> Premium {premium} (%{pct(premium)})
          </span>
          <span>
            <i className="dot free" /> Free {free} (%{pct(free)})
          </span>
        </div>
      </div>
    </div>
  );
}
