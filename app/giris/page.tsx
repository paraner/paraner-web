import AuthForm from "../components/AuthForm";
import AuthCube3D from "../components/AuthCube3D";

export default function GirisPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthCube3D />
        <div className="auth-card-form">
          <AuthForm initialMode="giris" />
        </div>
      </div>
    </div>
  );
}
