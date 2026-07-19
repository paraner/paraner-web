"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { profileAvatarUrl, type ActiveProfile } from "../../lib/supabase/profileShared";
import Avatar from "../../components/ui/Avatar";
import {
  LayoutDashboard,
  ArrowRightLeft,
  CreditCard,
  FileText,
  Users,
  Wallet,
  Settings,
  ChevronDown,
  ChevronLeft,
  Star,
  Plus,
  Lock,
  User,
  Building2,
  LifeBuoy,
} from "lucide-react";
import { BUSINESS_SECTIONS, type BusinessMenuItem } from "./businessMenu";
import LogoutButton from "./LogoutButton";

// `unstable_dynamicOnHover` App Router Link'inde VAR (next/dist/client/app-dir/link.d.ts:125)
// ama `next/link` girişinin tip tanımına henüz yansımamış → prop'u tipe tanıtan ince sarmalayıcı.
// Davranış: fare linkin üstüne gelince prefetch TAM YÜKE (veri dahil) yükselir.
const NavLink = Link as unknown as React.ComponentType<
  React.ComponentProps<typeof Link> & { unstable_dynamicOnHover?: boolean }
>;

const MAX_PROFILES = 3; // mobil ile aynı: kullanıcı en fazla 3 hesap açabilir
const COLLAPSE_KEY = "paraner-sidebar-collapsed";
const FAV_KEY = "paraner-fav-ops"; // favori işlemler (web'e özel)
// Sidebar genişlikleri (globals.css ile aynı): sürükle-bırak snap için referans
// Çekirdek rotalar: menü göründüğü anda TAM YÜK (veri dahil) prefetch edilir → tıklama anında
// açılır, iskelet görünmez. Alt menülerdeki 30+ link hover'da ısınıyor (unstable_dynamicOnHover)
// — hepsini peşin çekmek her açılışta 30 sunucu render'ı demek olurdu.
//
// Neden hover YETMİYOR da peşin liste gerekiyor: canlı ölçüm (2026-07-14, admin hesabı) —
// hover'lı tıklama 14-26 ms (iskelet YOK), hover'sız ısıtılmamış rota 1554 ms (iskelet VAR).
// Dokunmatikte hover diye bir şey yok → telefondan panele girenler o 1.5 sn'yi yerdi.
// Bu yüzden en sık kullanılan rotalar peşin ısıtılıyor.
const CORE_PREFETCH = new Set([
  "/panel",
  "/panel/islemler",
  "/panel/hesaplar",
  "/panel/cuzdanim",
  "/panel/faturalar",
  "/panel/ayarlar",
]);

const SIDEBAR_OPEN = 248;
const SIDEBAR_COLLAPSED = 74;
const SIDEBAR_MID = (SIDEBAR_OPEN + SIDEBAR_COLLAPSED) / 2;
const DRAG_THRESHOLD = 4; // bu kadar piksel hareket = sürükleme (yoksa tık)

// Menü ikonları — Lucide (tutarlı grid + stroke → optik eşit boyut).
// Boyut globals.css'teki `.panel-nav-item svg { width:18; height:18 }` ile gelir.
const icons = {
  overview: <LayoutDashboard />,
  transactions: <ArrowRightLeft />,
  accounts: <CreditCard />,
  invoices: <FileText />,
  contacts: <Users />,
  wallet: <Wallet />,
};

type Item = { label: string; href: string; icon: React.ReactNode };
type Group = { label: string | null; items: Item[] };

export default function Sidebar({
  profiles,
  initialCollapsed = false,
}: {
  profiles: ActiveProfile[];
  /** Sunucudan gelir (çerez) → ilk render ZATEN doğru genişlikte, açılıp kapanma yok. */
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Çekirdek rotaları panel açılır açılmaz ISIT (veri dahil tam yük).
  // Link'teki prefetch={true} viewport'a bağlıdır: Faturalar gibi KAPALI akordeon içindeki
  // linkler hiç görünmediği için asla ısınmazdı. router.prefetch viewport'tan bağımsız çalışır.
  // kind:"full" şart — varsayılan (auto) dinamik rotada yalnız kabuğu getirir, veriyi getirmez.
  useEffect(() => {
    const t = setTimeout(() => {
      CORE_PREFETCH.forEach((href) => {
        try {
          router.prefetch(href, { kind: "full" as never });
        } catch { /* prefetch başarısızsa sayfa yine normal açılır */ }
      });
    }, 300); // ilk boyamayı bloklamasın
    return () => clearTimeout(t);
  }, [router]);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null;
  const isBusiness = active?.profile_type === "business";

  // Aktif vurgu — query'li hrefleri (örn. faturalar?type=income) da doğru eşleştir
  function isActive(href: string) {
    const [path, qs] = href.split("?");
    if (pathname !== path) return false;
    if (!qs) return true;
    const want = new URLSearchParams(qs).get("type");
    return searchParams.get("type") === want;
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  // Yeni hesap ekleme (mobil "Yeni Hesap Ekle · max 3" deseni)
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<"individual" | "business">("individual");
  const [addName, setAddName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // Hesap geçişi animasyon overlay'i — P aşağıdan yukarıya gunmetal'den açık titanyuma dolar
  const [transition, setTransition] = useState<{
    name: string;
    type: string | null;
  } | null>(null);
  const transitionStart = useRef(0);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // Akordeon: aynı anda tek bölüm açık (Faturalar açıkken Finans'a basınca Faturalar
  // kapanır, Finans açılır). null = hepsi kapalı.
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [navFade, setNavFade] = useState({ top: false, bottom: false });
  const switchRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Hesap seçici: boş bir yere tıklayınca ya da Esc'e basınca kapansın
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Hesap değişimi tamamlanınca (router.refresh sonrası yeni aktif profil gelince)
  // "değiştiriyorum" kilidini bırak — yoksa buton kalıcı disabled kalır.
  useEffect(() => {
    setSwitching(false);
  }, [active?.id]);

  // Menü kapanınca "yeni hesap" formunu sıfırla (yarım kalan giriş kalmasın)
  useEffect(() => {
    if (!menuOpen) {
      setAddOpen(false);
      setAddName("");
      setAddType("individual");
      setAddError(null);
    }
  }, [menuOpen]);

  // Aktif profil değişince geçiş tamamlandı → overlay'i (en az 1.1sn gösterip) kapat.
  // Böylece dolma animasyonu hep tamamlanır, hızlı geçişte yanıp sönmez.
  useEffect(() => {
    if (!transition) return;
    const MIN = 1100;
    const wait = Math.max(0, MIN - (Date.now() - transitionStart.current));
    const t = setTimeout(() => setTransition(null), wait);
    return () => clearTimeout(t);
  }, [active?.id]);

  // Güvenlik: bir aksilikte overlay takılı kalmasın (örn. aktif id değişmezse)
  useEffect(() => {
    if (!transition) return;
    const t = setTimeout(() => setTransition(null), 6000);
    return () => clearTimeout(t);
  }, [transition]);

  /* ⚠️ Eski `useEffect(localStorage → setCollapsed)` KALDIRILDI: sunucu "açık" render edip
     tarayıcı sonradan kapattığı için sol panel her yenilemede açılıp kapanıyordu
     (ölçüm: 248px → 74px, ~250ms göz kırpması). Tercih artık ÇEREZDE, ilk HTML doğru gelir.

     Aşağısı TEK SEFERLİK TAŞIMA: bu değişiklikten önce tercihi localStorage'da olan
     kullanıcılar (herkes) çerez olmadığı için panelini AÇIK bulurdu — sessiz bir kayıp.
     Çerez yoksa ve localStorage "kapalı" diyorsa çerezi yazıp durumu düzeltiyoruz.
     Bu bir kez göz kırpar, sonraki yenilemelerde hiç olmaz. Bir sonraki büyük temizlikte
     (kullanıcılar geçince) bu blok silinebilir. */
  useEffect(() => {
    if (document.cookie.includes(`${COLLAPSE_KEY}=`)) return; // çerez zaten var
    if (localStorage.getItem(COLLAPSE_KEY) !== "1") return;   // tercih "açık" → yapacak bir şey yok
    document.cookie = `${COLLAPSE_KEY}=1; path=/; max-age=31536000; samesite=lax`;
    setCollapsed(true);
  }, []);

  // Aktif sayfanın bulunduğu işletme bölümünü SADECE ilk yüklemede otomatik aç.
  // Oturum içi gezinmede (özellikle favoriden tıklamada) akordeonu kendiliğinden
  // açmayız → favoriye basınca sadece sayfaya gider, ilgili bölüm patlamaz.
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (didAutoOpen.current) return;
    didAutoOpen.current = true;
    const sec = BUSINESS_SECTIONS.find((s) =>
      s.items.some((i) => i.href != null && i.href.split("?")[0] === pathname)
    );
    if (sec) setOpenSection(sec.id);
  }, [pathname]);

  // Akordeon: açık bölüme tekrar basınca kapanır, başka bölüme basınca ona geçer.
  function toggleSection(id: string) {
    setOpenSection((prev) => (prev === id ? null : id));
  }

  // Daraltılmışken bölüme tıklama: önce menüyü genişlet, sonra o bölümü aç.
  function onSectionClick(id: string) {
    if (collapsed) {
      applyCollapsed(false);
      setOpenSection(id);
    } else {
      toggleSection(id);
    }
  }

  // ── Favoriler (web'e özel): kullanıcının sık kullandığı işlemleri yıldızla ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(JSON.parse(raw));
    } catch {}
  }, []);

  function toggleFav(key: string) {
    setFavs((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }

  // Favori anahtarı → menüdeki gerçek öğe (sırayı favs'a göre koru)
  const favItems = favs
    .map((key) => {
      for (const sec of BUSINESS_SECTIONS) {
        const it = sec.items.find((i) => `${sec.id}:${i.label}` === key);
        if (it) return { key, item: it };
      }
      return null;
    })
    .filter((x): x is { key: string; item: (typeof BUSINESS_SECTIONS)[number]["items"][number] } => x !== null);

  // ── Kaydırma fade'i (üst/alt blur): içerik taşıyorsa kenarlar yumuşasın ──
  function updateNavFade() {
    const el = navRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setNavFade((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }

  // İçerik değişince (bölüm aç/kapa, favori, daralt) fade'i yeniden hesapla
  useEffect(() => {
    updateNavFade();
  }, [openSection, favs, collapsed, isBusiness]);

  // Alt öğe satırı (bölüm içi + favoriler aynı görünümü paylaşır) + yıldız
  function renderSubRow(item: BusinessMenuItem, favKey: string) {
    const fav = favs.includes(favKey);
    return (
      <div key={favKey} className="nav-subitem-row">
        {item.href ? (
          <NavLink
            href={item.href}
            className={`nav-subitem${isActive(item.href) ? " active" : ""}`}
            /* Daraltılmışken etiket gizlendiği için adı balonda göster (üst öğelerle aynı desen).
               Açıkken title verilmez → gereksiz balon çıkmasın. */
            title={collapsed ? item.label : undefined}
            unstable_dynamicOnHover
          >
            <span className="nav-subicon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ) : (
          <div className="nav-subitem soon">
            <span className="nav-subicon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-soon-badge">Yakında</span>
          </div>
        )}
        <button
          type="button"
          className={`nav-fav-btn${fav ? " on" : ""}`}
          onClick={() => toggleFav(favKey)}
          aria-label={fav ? "Favoriden çıkar" : "Favorilere ekle"}
          title={fav ? "Favoriden çıkar" : "Favorilere ekle"}
        >
          <Star />
        </button>
      </div>
    );
  }

  function applyCollapsed(next: boolean) {
    setCollapsed(next);
    /* ÇEREZ: sunucu bir sonraki render'da doğru genişlikte üretsin (localStorage'ı sunucu
       göremez → eskiden açılıp kapanma oluyordu). 1 yıl, tüm panel yolları için.
       SameSite=Lax yeterli: sadece görsel tercih, hassas veri değil. */
    document.cookie = `${COLLAPSE_KEY}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setMenuOpen(false);
  }

  function toggleCollapsed() {
    applyCollapsed(!collapsed);
  }

  // Kolu sürükle: parmağı takip et, bırakınca en yakın duruma (açık/kapalı) otur.
  // Hiç sürüklemeden bırakırsan → tek tık → aç/kapa.
  function onHandlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return; // yalnız sol tık / birincil dokunuş
    e.preventDefault();
    const leftEdge = asideRef.current?.getBoundingClientRect().left ?? 0;
    const startX = e.clientX;
    let moved = false;

    const widthAt = (clientX: number) =>
      Math.min(SIDEBAR_OPEN, Math.max(SIDEBAR_COLLAPSED, clientX - leftEdge));

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) > DRAG_THRESHOLD) {
        moved = true;
        setDragging(true);
        document.body.style.userSelect = "none";
      }
      if (moved) setDragWidth(widthAt(ev.clientX));
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      if (!moved) {
        applyCollapsed(!collapsed); // sürükleme yok → tık
      } else {
        applyCollapsed(widthAt(ev.clientX) < SIDEBAR_MID); // en yakına snap
      }
      setDragging(false);
      setDragWidth(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Sürükleme sırasında: genişlik parmağı takip eder; etiket/ikon görünümü de
  // en yakın duruma göre canlı önizlenir (orta noktayı geçince kapalı görünür).
  const showCollapsed = dragWidth !== null ? dragWidth < SIDEBAR_MID : collapsed;

  const typeLabel = (t: string | null | undefined) =>
    t === "business" ? "İşletme" : "Bireysel";

  async function switchTo(p: ActiveProfile) {
    if (p.is_active || switching) return;
    setSwitching(true);
    setMenuOpen(false);
    transitionStart.current = Date.now();
    setTransition({ name: p.profile_name ?? "Profil", type: p.profile_type });
    const ids = profiles.map((x) => x.id);
    await supabase.from("profiles").update({ is_active: false }).in("id", ids);
    await supabase.from("profiles").update({ is_active: true }).eq("id", p.id);
    router.push("/panel");
    router.refresh();
  }

  // Yeni hesap oluştur — mobildeki createProfile ile birebir alan seti.
  // Webde billing yok; işletme hesabı da (mobildeki gibi) is_premium:false açılır,
  // Stripe entegrasyonu sonra eklenecek. Oluşunca o hesaba geçilir.
  async function createAccount() {
    if (creating) return;
    const name = addName.trim();
    if (!name) {
      setAddError("Hesap adı gerekli");
      return;
    }
    setCreating(true);
    setAddError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAddError("Oturum bulunamadı");
      setCreating(false);
      return;
    }

    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        profile_type: addType,
        profile_name: name,
        account_type: addType,
        is_active: false,
        name: addType === "individual" ? name : "",
        company_name: addType === "business" ? name : null,
        currency: "TRY",
        language: "tr",
        theme: "dark",
        is_premium: false,
        monthly_income: 0,
        monthly_budget: 0,
        monthly_revenue: 0,
        monthly_savings_target: 0,
      })
      .select("id")
      .single();

    if (error || !created) {
      setAddError("Hesap oluşturulamadı");
      setCreating(false);
      return;
    }

    // Yeni hesaba geç: tüm profilleri pasifle, yenisini aktif yap.
    const ids = [...profiles.map((x) => x.id), created.id];
    await supabase.from("profiles").update({ is_active: false }).in("id", ids);
    await supabase.from("profiles").update({ is_active: true }).eq("id", created.id);
    setMenuOpen(false);
    transitionStart.current = Date.now();
    setTransition({ name, type: addType });
    router.push("/panel");
    router.refresh();
  }

  // Genel (üst) menü — her iki profil tipinde de aynı çekirdek sayfalar.
  // İşletmede Hesaplar ayrıca Finans bölümünde de var (aynı sayfaya hızlı erişim).
  const groups: Group[] = [
    {
      label: null,
      items: [
        { label: "Genel Bakış", href: "/panel", icon: icons.overview },
        { label: "İşlemler", href: "/panel/islemler", icon: icons.transactions },
        { label: "Hesaplar", href: "/panel/hesaplar", icon: icons.accounts },
        { label: "Cüzdanım", href: "/panel/cuzdanim", icon: icons.wallet },
      ],
    },
  ];

  const canSwitch = profiles.length > 1;
  const canAdd = profiles.length < MAX_PROFILES;
  // Menü artık hem geçiş hem "hesap ekle" için açılır → tek profilde bile erişilir.
  const menuEnabled = canSwitch || canAdd;

  return (
    <>
    <aside
      ref={asideRef}
      className={`panel-sidebar${showCollapsed ? " collapsed" : ""}${dragging ? " dragging" : ""}`}
      style={dragWidth !== null ? { width: `${dragWidth}px` } : undefined}
    >
      <div className="panel-brand">
        {/* Açık: tam PARANER wordmark · Daraltılmış: aynı wordmark'tan kırpılmış temiz P.
            P birebir aynı (aynı kaynak), A sızması/kesilme olmaz. */}
        <Image
          src="/paraner-wordmark-titan.png"
          alt="Paraner"
          width={118}
          height={24}
          className="brand-full"
          priority
        />
        <Image
          src="/paraner-p-titan.png"
          alt="Paraner"
          width={19}
          height={24}
          className="brand-mini"
          priority
        />
      </div>

      {/* Profil değiştirici */}
      {active && (
        <div className="profile-switch" ref={switchRef}>
          <button
            type="button"
            className="profile-switch-btn"
            onClick={() => menuEnabled && setMenuOpen((o) => !o)}
            disabled={!menuEnabled || switching}
            aria-expanded={menuOpen}
            title={collapsed ? active.profile_name ?? "Profil" : undefined}
          >
            <Avatar name={active.profile_name} url={profileAvatarUrl(active)} />
            <span className="profile-switch-info">
              <span className="profile-switch-name">
                {active.profile_name ?? "Profil"}
              </span>
              <span className="profile-switch-type">
                {typeLabel(active.profile_type)}
              </span>
            </span>
            {menuEnabled && <ChevronDown className="profile-switch-chev" />}
          </button>

          {menuOpen && (
            <div className="profile-switch-menu">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`profile-switch-opt${p.is_active ? " active" : ""}`}
                  onClick={() => switchTo(p)}
                >
                  <Avatar name={p.profile_name} url={profileAvatarUrl(p)} small />
                  <span className="profile-switch-info">
                    <span className="profile-switch-name">
                      {p.profile_name ?? "Profil"}
                    </span>
                    <span className="profile-switch-type">
                      {typeLabel(p.profile_type)}
                    </span>
                  </span>
                  {p.is_active && <span className="profile-switch-dot" />}
                </button>
              ))}

              <div className="profile-switch-sep" />

              {/* Yeni hesap ekle — max 3 (mobil ile aynı kural) */}
              {canAdd ? (
                addOpen ? (
                  <div className="profile-add-form">
                    <div className="profile-add-types">
                      <button
                        type="button"
                        className={`profile-add-type${addType === "individual" ? " on" : ""}`}
                        onClick={() => setAddType("individual")}
                      >
                        <User />
                        <span>Bireysel</span>
                      </button>
                      <button
                        type="button"
                        className={`profile-add-type${addType === "business" ? " on" : ""}`}
                        onClick={() => setAddType("business")}
                      >
                        <Building2 />
                        <span>İşletme</span>
                      </button>
                    </div>
                    <input
                      className="profile-add-input"
                      value={addName}
                      onChange={(e) => {
                        setAddName(e.target.value);
                        setAddError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createAccount();
                      }}
                      placeholder={addType === "business" ? "İşletme adı" : "Hesap adı"}
                      maxLength={40}
                      autoFocus
                    />
                    {addError && <div className="profile-add-error">{addError}</div>}
                    <div className="profile-add-actions">
                      <button
                        type="button"
                        className="profile-add-cancel"
                        onClick={() => setAddOpen(false)}
                        disabled={creating}
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        className="profile-add-submit"
                        onClick={createAccount}
                        disabled={creating}
                      >
                        {creating ? "Oluşturuluyor…" : "Oluştur"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="profile-switch-opt profile-add-trigger"
                    onClick={() => setAddOpen(true)}
                  >
                    <span className="profile-add-plus">
                      <Plus />
                    </span>
                    <span className="profile-switch-info">
                      <span className="profile-switch-name">Yeni Hesap Ekle</span>
                      <span className="profile-switch-type">Bireysel veya işletme</span>
                    </span>
                  </button>
                )
              ) : (
                <div className="profile-add-locked">
                  <span className="profile-add-plus locked">
                    <Lock />
                  </span>
                  <span className="profile-switch-info">
                    <span className="profile-switch-name">Hesap limiti doldu</span>
                    <span className="profile-switch-type">En fazla 3 hesap</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={`nav-region${navFade.top ? " fade-top" : ""}${navFade.bottom ? " fade-bottom" : ""}`}
      >
        <nav className="panel-nav" ref={navRef} onScroll={updateNavFade}>
          {groups.map((g, gi) => (
            <div key={gi} className="nav-group">
              {g.label && <div className="nav-group-label">{g.label}</div>}
              {g.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  className={`panel-nav-item${isActive(item.href) ? " active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  // Çekirdek rotalar (Genel Bakış / İşlemler / Hesaplar / Cüzdanım): hover'ı
                  // BEKLEMEDEN tam yükü (veri dahil) çek → menüde bunlar hep sıcak, tıklama anında.
                  // Alt menülerdeki 30+ link'e verilmez; onlar hover'da yükseliyor (aşağıda).
                  prefetch={CORE_PREFETCH.has(item.href) ? true : undefined}
                  unstable_dynamicOnHover
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                    </NavLink>
              ))}
            </div>
          ))}

          {/* Favoriler (web'e özel) — yıldızlanan işlemler en üstte hızlı erişim */}
          {isBusiness && favItems.length > 0 && (
            <div className="nav-group nav-fav-group">
              <div className="nav-group-label">FAVORİLER</div>
              {/* Daraltılmışken bu bölüm GİZLENMİYOR (2026-07-19): ikonlar rayda kalıyor —
                  daraltılmış menü zaten "hızlı erişim" modu, favorinin en çok işe yaradığı yer orası. */}
              {favItems.map(({ key, item }) => renderSubRow(item, key))}
            </div>
          )}

          {/* İşletme bölümleri — mobil ile tutarlı, açılır-kapanır (accordion) */}
          {isBusiness && (
            <div className="nav-sections">
              {BUSINESS_SECTIONS.map((sec) => {
                const open = openSection === sec.id && !collapsed;
                return (
                  <div key={sec.id} className="nav-section">
                    <button
                      type="button"
                      className={`nav-section-head${open ? " open" : ""}`}
                      onClick={() => onSectionClick(sec.id)}
                      title={collapsed ? sec.label : undefined}
                      aria-expanded={open}
                    >
                      <span
                        className="nav-section-icon"
                        style={{ "--sec": sec.color } as CSSProperties}
                      >
                        {sec.icon}
                      </span>
                      <span className="nav-label">{sec.label}</span>
                      <ChevronDown className="nav-section-chev" />
                    </button>

                    {/* Akordeon paneli — grid-rows 0fr↔1fr ile yumuşak aç/kapa
                        (biri kapanırken öteki açılır). İçerik hep DOM'da. */}
                    <div
                      className={`nav-section-panel${open ? " open" : ""}`}
                      inert={!open}
                    >
                      <div className="nav-section-panel-inner">
                        <div className="nav-section-items">
                          {sec.items.map((item) =>
                            renderSubRow(item, `${sec.id}:${item.label}`)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Alt menü (Ayarlar · Destek · Çıkış) — kaydırmadan bağımsız, en altta sabit */}
      <div className="nav-footer">
        <NavLink
          href="/panel/ayarlar"
          className={`panel-nav-item${pathname === "/panel/ayarlar" ? " active" : ""}`}
          title={collapsed ? "Ayarlar" : undefined}
          unstable_dynamicOnHover
        >
          <Settings />
          <span className="nav-label">Ayarlar</span>
        </NavLink>
        <NavLink
          href="/panel/destek"
          className={`panel-nav-item${pathname === "/panel/destek" ? " active" : ""}`}
          title={collapsed ? "Destek" : undefined}
          unstable_dynamicOnHover
        >
          <LifeBuoy />
          <span className="nav-label">Destek</span>
        </NavLink>
        <LogoutButton variant="nav" collapsed={collapsed} />
      </div>

      {/* Daralt / genişlet — sağ kenara yüzen yuvarlak kol.
          Tek tık: aç/kapa · Sürükle-bırak: en yakın duruma snap */}
      <button
        type="button"
        className="sidebar-toggle"
        onPointerDown={onHandlePointerDown}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        title="Tıkla ya da sürükle"
      >
        <ChevronLeft />
      </button>
    </aside>

    {/* Hesap geçişi — liquid glass kart; PARANER yazısı soldan sağa beyazdan yeşile dolar */}
    {transition && (
      <div className="switch-overlay" role="status" aria-live="polite">
        <div className="switch-card">
          <span className="switch-card-sheen" aria-hidden />
          <div className="switch-word" aria-hidden>
            <div className="switch-word-base" />
            <div className="switch-word-fill" />
          </div>
          <div className="switch-card-caption">
            <span className="switch-card-sub">Hesap değiştiriliyor</span>
            <span className="switch-card-name">{transition.name}</span>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

