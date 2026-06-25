// Sol panel arka plan videosu — sessiz, döngülü, otomatik oynar finans klibi.
// Köşeler dış .auth-card + .auth-visual'ın overflow:hidden + border-radius'undan korunur.
export default function AuthSideVideo() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <video
        className="auth-visual-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/paraner-auth-bg.jpg"
      >
        <source src="/paraner-auth-bg.mp4" type="video/mp4" />
      </video>
      <div className="auth-visual-overlay" />
    </div>
  );
}
