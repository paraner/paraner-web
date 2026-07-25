import type { ReactNode } from "react";

/* Boş durum — panelin EN ÇOK görülen ekranı.
 *
 * ⚠️ NEDEN VAR (25.07 tasarım turu): 30+ modülde boş durum, gri bir kutunun ortasında
 * TEK SATIR yazıydı ("Henüz fatura yok. Sağ üstten ilk faturanı oluştur."). Yeni bir
 * kullanıcının gördüğü İLK ekran bu — ne yapacağını anlatmıyor, tıklanacak bir şey
 * vermiyor ve sayfa "bozuk/eksik" hissi veriyordu.
 *
 * Yerine: ikon + net başlık + tek cümle açıklama + (varsa) aksiyon butonu.
 * Aksiyon butonu sağ üstteki "Ekle" ile AYNI işi yapar — kullanıcı boş ekranda
 * gözünü sağ üst köşede aramak zorunda kalmasın.
 *
 * ⚠️ Renk: ikon çerçevesi ve buton NÖTR/titanyum — marka rengi değişecek (CLAUDE.md),
 * boş duruma teal yatırımı yapılmıyor.
 */
export default function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  /** lucide ikonu — modülün sol menüdeki ikonuyla aynı olmalı (aynı dil). */
  icon?: ReactNode;
  title: string;
  /** Tek cümle: ne işe yarar / ilk adım ne. */
  hint?: string;
  /** Genelde `<AddButton>` — sağ üsttekiyle aynı işlem. */
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-state-ic" aria-hidden>{icon}</span>}
      <div className="empty-state-title">{title}</div>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
