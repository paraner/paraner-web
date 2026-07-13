// Üst bar mega-menü verisi (Resend deseni: solda metin linkleri, sağda vurgu kartları).
// Tek kaynak: Nav (masaüstü dropdown + mobil menü) ve segment landing sayfaları bunu kullanır.
//
// NOT: Alt sayfalar (ör. /isletme/faturalar) henüz YOK. Linkler şimdilik segment
// sayfasındaki bölümlere (#çapa) gidiyor. Alt sayfalar açıldıkça href'ler oraya çevrilecek.

export type MenuLink = { label: string; desc: string; href: string };
export type MenuCard = { title: string; desc: string; href: string };

export type SegmentMenu = {
  key: string;
  label: string;
  href: string;
  links: MenuLink[];
  cards: MenuCard[];
};

export const ISLETME: SegmentMenu = {
  key: "isletme",
  label: "İşletme",
  href: "/isletme",
  links: [
    { label: "Fatura & Teklif", desc: "Kes, gönder, tahsil et", href: "/isletme#fatura" },
    { label: "Cari & Veresiye", desc: "Müşteri ve tedarikçi bakiyesi", href: "/isletme#cari" },
    { label: "Stok & Ürün", desc: "Katalog ve kritik stok", href: "/isletme#stok" },
    { label: "Çalışan & Maaş", desc: "Özlük, maaş, izin", href: "/isletme#calisan" },
    { label: "Çek & Senet", desc: "Vade takibi", href: "/isletme#cek" },
    { label: "KDV & Vergi", desc: "Beyanname ve takvim", href: "/isletme#kdv" },
    { label: "Raporlar", desc: "Kâr-zarar, nakit akışı", href: "/isletme#rapor" },
    { label: "Kasa & Banka", desc: "Hesaplar ve transferler", href: "/isletme#kasa" },
  ],
  cards: [
    { title: "İşletme paneli", desc: "Ön muhasebenin tamamı tek ekranda", href: "/isletme" },
    { title: "Cüzdanım", desc: "Altın ve döviz portföyü, canlı kur", href: "/isletme#cuzdan" },
  ],
};

export const BIREYSEL: SegmentMenu = {
  key: "bireysel",
  label: "Bireysel",
  href: "/bireysel",
  links: [
    { label: "Gelir & Gider", desc: "Her kuruş kategoriyle", href: "/bireysel#gelir-gider" },
    { label: "Bütçe", desc: "Kategori bazlı limit", href: "/bireysel#butce" },
    { label: "Birikim Hedefleri", desc: "Ev, araba, tatil", href: "/bireysel#hedef" },
    { label: "Fiş Tarama", desc: "Fotoğrafla, otomatik dolsun", href: "/bireysel#fis" },
    { label: "Döviz & Altın", desc: "Canlı kur ve portföy", href: "/bireysel#doviz" },
    { label: "Raporlar", desc: "Nereye gitti, tek bakışta", href: "/bireysel#rapor" },
  ],
  cards: [
    { title: "Parla — AI koçun", desc: "“Bu ay ne kadar harcadım?” diye sor", href: "/bireysel#parla" },
    { title: "Mobil uygulama", desc: "iOS ve Android'de aynı hesap", href: "/bireysel#mobil" },
  ],
};

export const SEGMENTS: SegmentMenu[] = [ISLETME, BIREYSEL];
