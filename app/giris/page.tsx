import AuthForm from "../components/AuthForm";
import ToastHost from "../components/ToastHost";

export default function GirisPage() {
  return (
    <div className="auth-page">
      <ToastHost />
      <div className="auth-card">
        <div className="auth-visual auth-cube" aria-hidden="true" />
        <div className="auth-card-form">
          <AuthForm initialMode="giris" />
        </div>
      </div>
    </div>
  );
}
