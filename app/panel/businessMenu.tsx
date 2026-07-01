// İşletme sol menüsü — mobil (paraner-app/constants/businessMenu.ts) ile birebir
// tutarlı 8 bölüm. Web'de sayfası olan alt öğeler `href` ile bağlı; henüz olmayanlar
// `href: null` → "Yakında" (pasif). İkonlar Lucide.
import {
  FileText, Wallet, Users, Briefcase, Package, BarChart3, Landmark,
  Repeat, ScanLine, Files,
  ArrowLeftRight, TrendingUp, CircleDollarSign, Percent, PieChart, UserCircle,
  BookOpen, CircleCheck, Clock, Banknote, Receipt, CalendarDays, Tags, Layers,
  Download, FileBarChart, Share2, AlarmClock, ShieldCheck, Cloud,
} from "lucide-react";
import type { ReactNode } from "react";

export interface BusinessMenuItem {
  label: string;
  icon: ReactNode;
  href: string | null; // null → henüz web'de yok (Yakında)
}

export interface BusinessMenuSection {
  id: string;
  label: string;
  icon: ReactNode;
  color: string; // bölüm ikonu squircle rengi (mobil ile aynı)
  items: BusinessMenuItem[];
}

export const BUSINESS_SECTIONS: BusinessMenuSection[] = [
  {
    id: "invoices",
    label: "Faturalar",
    icon: <FileText />,
    color: "#1A6BFA",
    items: [
      { label: "Faturalar", icon: <FileText />, href: "/panel/faturalar" },
      { label: "Düzenli Fatura", icon: <Repeat />, href: "/panel/duzenli-fatura" },
      { label: "Fiş / Makbuz Tara", icon: <ScanLine />, href: null },
      { label: "Teklifler", icon: <Files />, href: "/panel/teklifler" },
    ],
  },
  {
    id: "finance",
    label: "Finans",
    icon: <Wallet />,
    color: "#1D9E75",
    items: [
      { label: "Düzenli Ödemeler", icon: <Repeat />, href: "/panel/duzenli-odemeler" },
      { label: "Çek / Senet Takibi", icon: <CircleCheck />, href: "/panel/cek-senet" },
      { label: "Borç / Alacak", icon: <ArrowLeftRight />, href: "/panel/borc-alacak" },
      { label: "Nakit Akışı Analizi", icon: <TrendingUp />, href: "/panel/nakit-akisi" },
      { label: "Döviz & Altın", icon: <CircleDollarSign />, href: null },
      { label: "KDV Hesapla", icon: <Percent />, href: "/panel/kdv" },
      { label: "Kategori Bütçeleri", icon: <PieChart />, href: "/panel/butceler" },
    ],
  },
  {
    id: "customers",
    label: "Müşteriler & Tedarikçiler",
    icon: <Users />,
    color: "#7F77DD",
    items: [
      { label: "Müşteri / Tedarikçi Kartları", icon: <UserCircle />, href: "/panel/musteriler" },
      { label: "Cari Hesaplar", icon: <Users />, href: "/panel/cariler" },
      { label: "Veresiye Defteri", icon: <BookOpen />, href: "/panel/veresiye" },
      { label: "Mutabakat Oluştur", icon: <CircleCheck />, href: "/panel/mutabakat" },
      { label: "Vade Takibi", icon: <Clock />, href: "/panel/vade" },
    ],
  },
  {
    id: "employees",
    label: "Çalışanlar",
    icon: <Briefcase />,
    color: "#BA7517",
    items: [
      { label: "Çalışan Listesi", icon: <Users />, href: "/panel/calisanlar" },
      { label: "Maaş Ödemeleri", icon: <Banknote />, href: "/panel/maaslar" },
      { label: "Harcama Kayıtları", icon: <Receipt />, href: "/panel/harcamalar" },
      { label: "İzin & Devamsızlık", icon: <CalendarDays />, href: "/panel/izinler" },
    ],
  },
  {
    id: "stock",
    label: "Stok & Ürünler",
    icon: <Package />,
    color: "#14B8A6",
    items: [
      { label: "Ürün / Hizmet Kataloğu", icon: <Tags />, href: "/panel/urunler" },
      { label: "Stok Takibi", icon: <Layers />, href: "/panel/stok" },
    ],
  },
  {
    id: "reports",
    label: "Raporlar",
    icon: <BarChart3 />,
    color: "#E24B4A",
    items: [
      { label: "Gelir / Gider Raporu", icon: <PieChart />, href: "/panel/gelir-gider-raporu" },
      { label: "Kâr / Zarar Tablosu", icon: <TrendingUp />, href: "/panel/kar-zarar" },
      { label: "KDV Raporu", icon: <FileBarChart />, href: "/panel/kdv-raporu" },
      { label: "PDF Rapor Oluştur", icon: <FileText />, href: null },
      { label: "Muhasebeci Erişimi", icon: <Share2 />, href: null },
    ],
  },
  {
    id: "tax",
    label: "Vergi & Yasal",
    icon: <Landmark />,
    color: "#F97316",
    items: [
      { label: "Vergi Takvimi", icon: <AlarmClock />, href: "/panel/vergi-takvimi" },
      { label: "SGK Bildirgeleri", icon: <ShieldCheck />, href: null },
      { label: "e-Defter / e-Fatura", icon: <Cloud />, href: null },
    ],
  },
  // Not: "İşletme Ayarları" bölümü kaldırıldı — bu özellikler en alttaki
  // sabit "Ayarlar" sayfasına işlenecek.
];
