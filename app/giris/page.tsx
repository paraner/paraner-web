import AuthForm from "../components/AuthForm";
import AuthSideVideo from "../components/AuthSideVideo";

export default function GirisPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthSideVideo />
        <div className="auth-card-form">
          <AuthForm initialMode="giris" />
        </div>
      </div>
    </div>
  );
}
