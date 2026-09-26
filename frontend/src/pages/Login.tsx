import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verified = new URLSearchParams(location.search).get("verified") === "1";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), senha);
      navigate("/catalog", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-visual" aria-label="Catálogo de filmes">
        <div className="auth-visual-art" />
        <div className="auth-visual-copy"><span className="eyebrow">UMA FILMOGRAFIA EM FOCO</span><h1>Histórias que<br />ficam com você.</h1><p>Um catálogo dedicado aos filmes de Tom Hanks.</p></div>
        <span className="auth-visual-credit">FRAME / FILM INDEX</span>
      </section>
      <section className="auth-panel">
        <Link className="wordmark auth-wordmark" to="/login"><span className="wordmark-symbol">F</span><span>FRAME<small>FILM INDEX</small></span></Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">BEM-VINDO DE VOLTA</span>
          <h2>Entre na sua conta</h2>
          <p className="form-intro">Continue de onde a última sessão terminou.</p>
          {verified && <Toast message="E-mail confirmado. Você já pode entrar." tone="success" />}
          <Toast message={error} tone="error" />
          <form className="form-stack" onSubmit={submit}>
            <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={150} /></label>
            <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required /></label>
            <div className="form-between"><span>Sua sessão é protegida.</span><Link to="/forgot">Esqueceu a senha?</Link></div>
            <button className="button button-primary button-wide" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}<span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-switch">Ainda não tem uma conta? <Link to="/register">Cadastre-se</Link></p>
        </div>
        <p className="auth-legal">Ao continuar, você acessa sua sessão segura do catálogo.</p>
      </section>
    </main>
  );
}