// Hero başlığı — DÜZ METİN, animasyon YOK (Resend deseni).
//
// Eskiden her harf ayrı <span> idi + "blur in up" giriş animasyonu vardı. İki sorun:
//  1) Gradyan her span'a yeniden uygulandığından her harf tek tek beyazdan griye
//     soluyordu → serif başlık dalgalı/bozuk görünüyordu.
//  2) Resend'in h1'i ölçüldü: animationName none, transform none, opacity 1, span yok.
// Mehmet "animasyonu kaldır, Resend'deki gibi olsun" dedi → sade metin.
export default function HeroTitle() {
  return (
    <h1 className="hero-title">
      Parasını yöneten,
      <br />
      <em>geleceğini yönetir.</em>
    </h1>
  );
}
