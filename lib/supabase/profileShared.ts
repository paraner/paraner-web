// Sunucu/istemci ORTAK profil tipleri ve saf yardımcılar.
// ÖNEMLİ: Bu dosya next/headers gibi sunucu-özel modülleri ASLA import etmez,
// böylece client component'ler (ör. Sidebar) güvenle kullanabilir.

export type ActiveProfile = {
  id: string;
  currency: string | null;
  profile_name: string | null;
  profile_type: string | null;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
  is_active: boolean;
  avatar_url?: string | null; // bireysel profil fotoğrafı
  company_logo_url?: string | null; // işletme logosu
  // Onboarding durumu (web kurulum modalı için)
  onboarding_completed?: boolean | null;
  account_type?: string | null;
  name?: string | null;
};

// Profil tipine göre gösterilecek avatar/logo URL'si.
// İşletme → şirket logosu, bireysel → profil fotoğrafı (yoksa diğerine düşer).
export function profileAvatarUrl(p: ActiveProfile): string | null {
  return p.profile_type === "business"
    ? p.company_logo_url ?? p.avatar_url ?? null
    : p.avatar_url ?? p.company_logo_url ?? null;
}
