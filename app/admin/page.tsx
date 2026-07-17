import Link from "next/link";
import { Users, Building2, User, Star, Clock, LifeBuoy, ChevronRight, Activity, UserX, Hourglass, Layers } from "lucide-react";
import { createAdminClient, hasAdminKey } from "../../lib/supabase/admin";
import { getStaffRole } from "../../lib/adminGuard";
import { TICKET_COLS, TICKET_STATUS_META, type Ticket } from "../../lib/supportShared";
import { relativeLabel, TRIAL_ENDING_DAYS } from "../../lib/lifecycle";
import { TRIAL_DAYS } from "../../lib/plans";
import { getActiveCounts, getDeadProfileCount, getModuleAdoption } from "../../lib/adminMetrics";
import AdminKeyNotice from "./AdminKeyNotice";

export default async function AdminDashboard() {
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const countOf = (q: ReturnType<typeof admin.from>) => q.select("*", { count: "exact", head: true });

  /* Üye (kişi) ≠ profil: bir kişi hem bireysel hem işletme profili açabilir. Kart/yüzdeler PROFİL
     bazlı; "Toplam Üye" gerçek kişi sayısı olmalı. PostgREST'te distinct count yok → auth_user_id
     kolonu çekilip benzersizleştiriliyor (tek uuid kolonu; büyürse RPC gerekir → DB şeması = önce sor). */
  // Rol: agent Müşteriler'e giremez (requireAdminPage) → ona kart linki VERME, 404 yerdi.
  const role = await getStaffRole();
  const isAdminRole = role === "admin";
  const [totalR, businessR, premiumR, recentR, ownersR, ticketsR, openR, active, dead, adoption] =
    await Promise.all([
    countOf(admin.from("profiles")),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "business"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    /* auth_user_id → üye sayısı · ad → gelen talep satırında "kim yazmış"
       · trial alanları → "denemesi bitiyor" sayacı (durum is_premium'dan DEĞİL, tarihten
       hesaplanır — bkz. lib/lifecycle.ts: is_premium bayat olabiliyor). */
    admin
      .from("profiles")
      .select("auth_user_id, profile_name, name, trial_plan, trial_start_date, is_premium")
      .limit(10000),
    /* Gelen talepler: yalnız İŞ BEKLEYENLER (açık + yanıtlandı). Çözülmüş/kapanmış olanı
       göstermek panoyu doldurur, aksiyon gerektirmez. Kolonlar TICKET_COLS'tan (tek kaynak —
       elle yazınca olmayan kolon kaçıp sorgu sessizce 400 dönüyordu, bkz. /admin/destek). */
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
    /* Aksiyon panosu metrikleri — RPC (admin-panel-rpc.sql), yoksa JS yedeği.
       agent bunları GÖREMEZ: RPC'lerde yönetici guard'ı var, yedekleri de çağırmıyoruz. */
    isAdminRole ? getActiveCounts() : Promise.resolve({ dau: 0, wau: 0, mau: 0 }),
    isAdminRole ? getDeadProfileCount() : Promise.resolve(0),
    isAdminRole ? getModuleAdoption() : Promise.resolve(null),
  ]);

  /* ⚠️ Hataları GÖSTER, yutma: `count ?? 0` sessizce 0'a düşüyordu → kolon/izin hatasında
     panelin ilk ekranı "Toplam Üye 0 · %0" der ve kimse sebebini bilmez. */
  const err = [totalR, businessR, premiumR, recentR, ownersR].find((r) => r.error)?.error;
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
  const tickets = (ticketsR.data ?? []) as unknown as Ticket[];
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
    {
      label: "Ölü kayıt",
      value: dead,
      sub: total ? `%${Math.round((dead / total) * 100)} · hiç işlem girmemiş` : "hiç işlem girmemiş",
      icon: UserX,
      tone: "",
      href: isAdmin ? "/admin/musteriler" : undefined,
    },
    {
      label: "Bugün aktif",
      value: active.dau,
      sub: `hafta ${active.wau} · ay ${active.mau}`,
      icon: Activity,
      tone: "",
      href: isAdmin ? "/admin/canli" : undefined,
    },
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
                      {nameByUser.get(t.user_id) ?? `#${t.id.slice(0, 8)}`} ·{" "}
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
              Modül verisi için <b>admin-panel-rpc.sql</b> çalıştırılmalı.
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
