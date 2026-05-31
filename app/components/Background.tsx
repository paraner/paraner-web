// Marka arka planı — sabit, tüm sayfaların arkasında durur (teal + mor ışıma)
export default function Background() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-base" />
      <div className="bg-ambient" />
      <div className="bg-noise" />
      <div className="bg-vignette" />
    </div>
  );
}
