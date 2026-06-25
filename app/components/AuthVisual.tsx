// Giriş/kayıt sol paneli — Paraner marka renkleriyle animasyonlu finans kartları.
// Saf sunum (CSS animasyonları globals.css'te). Mobilde gizlenir.
import Image from "next/image";

export default function AuthVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="av-glow" />
      <div className="av-glow av-glow-2" />
      <div className="av-noise" />

      {/* Marka — sol panel üstünde P logosu */}
      <div className="av-brand">
        <Image src="/paraner-logo.png" alt="Paraner" width={40} height={40} priority />
      </div>

      <div className="av-cards">
        {/* Bakiye */}
        <div className="fin-card fc-balance">
          <div className="fc-label">Bu ayki bakiye</div>
          <div className="fc-amount">₺12.480,00</div>
          <div className="fc-up">↑ %12 bu ay</div>
        </div>

        {/* Donut dağılım */}
        <div className="fin-card fc-donut">
          <div className="donut" />
          <div className="fc-cap">Harcama dağılımı</div>
        </div>

        {/* Son işlemler */}
        <div className="fin-card fc-tx">
          <div className="tx-row"><span className="tx-name">Maaş</span><span className="pos">+₺18.000</span></div>
          <div className="tx-row"><span className="tx-name">Market</span><span className="neg">−₺240</span></div>
          <div className="tx-row"><span className="tx-name">Fatura</span><span className="neg">−₺560</span></div>
        </div>

        {/* Parla AI */}
        <div className="fin-card fc-parla">
          <div className="parla-dot" />
          <div className="parla-text">Bu ay gelirinin <b>%12</b>'sini biriktirdin — harika gidiyorsun! 🎉</div>
        </div>
      </div>

      <div className="av-slogan">
        <h2>Parasını yöneten,<br />geleceğini yönetir.</h2>
        <p>Gelir-gider, birikim ve işletme finansları — tek yerde, Parla AI ile.</p>
      </div>
    </div>
  );
}
