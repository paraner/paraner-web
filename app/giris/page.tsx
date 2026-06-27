import AuthForm from "../components/AuthForm";

export default function GirisPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-form">
          <AuthForm initialMode="giris" />
        </div>
      </div>
    </div>
  );
}
