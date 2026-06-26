// Sol panel (masaüstü) — markaya özel hazırlanan 3D küp videosu (paraner-cube.mp4).
// ≤1024px sol panel gizli → yalnız masaüstünde görünür. Sessiz/döngülü/otomatik oynar.
export default function AuthCube3D() {
  return (
    <div className="auth-visual auth-cube" aria-hidden="true">
      <video
        className="auth-cube-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/paraner-cube.jpg"
      >
        <source src="/paraner-cube.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
