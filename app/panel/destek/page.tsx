import { MessageCircle, Mail, HelpCircle } from "lucide-react";
import PageHead from "../../../components/ui/PageHead";

// Panel-içi destek sayfası (şimdilik iletişim kanalları — ileride canlı destek/ticket ile
// genişletilecek). SSS ve WhatsApp bilgileri pazarlama /destek sayfasıyla aynı kaynaktan.
const WHATSAPP = "905322379909";
const WHATSAPP_LABEL = "+90 532 237 99 09";
const EMAIL = "destek@paraner.com";

export const metadata = { title: "Destek", robots: { index: false, follow: false } };

export default function DestekPage() {
  return (
    <div className="settings-wrap">
      <PageHead title="Destek" sub="Sorularında yanındayız — en hızlı yanıt için WhatsApp." />

      <div className="support-grid">
        <a
          className="support-card"
          href={`https://wa.me/${WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="support-ic wa">
            <MessageCircle size={20} />
          </span>
          <div className="support-main">
            <div className="support-title">WhatsApp</div>
            <div className="support-sub">{WHATSAPP_LABEL}</div>
            <div className="support-hint">Genellikle birkaç dakika içinde yanıtlıyoruz.</div>
          </div>
        </a>

        <a className="support-card" href={`mailto:${EMAIL}`}>
          <span className="support-ic mail">
            <Mail size={20} />
          </span>
          <div className="support-main">
            <div className="support-title">E-posta</div>
            <div className="support-sub">{EMAIL}</div>
            <div className="support-hint">Detaylı sorular ve ekran görüntüleri için.</div>
          </div>
        </a>

        <a
          className="support-card"
          href="https://paraner.com/destek"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="support-ic faq">
            <HelpCircle size={20} />
          </span>
          <div className="support-main">
            <div className="support-title">Sık Sorulan Sorular</div>
            <div className="support-sub">Hızlı yanıtlar</div>
            <div className="support-hint">En çok merak edilenlere göz at.</div>
          </div>
        </a>
      </div>

      <p className="set-note" style={{ marginTop: 20 }}>
        Çalışma saatleri: Hafta içi 09:00–18:00. Bu sayfa yakında canlı destek ve talep takibiyle genişleyecek.
      </p>
    </div>
  );
}
