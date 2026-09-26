import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Toast from "../components/Toast";
import { endpoints } from "../services/api";

export default function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const result = await endpoints.register(nome.trim(), email.trim(), senha);
      setMessage(result.mensagem || "Cadastro realizado. Confira seu e-mail para confirmar a conta.");
      setNome(""); setEmail(""); setSenha("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-visual" aria-label="Catálogo de filmes"><div className="auth-visual-art" /><div className="auth-visual-copy"><span className="eyebrow">SEU PRÓXIMO FILME</span><h1>Uma nova<br />perspectiva.</h1><p>Guarde favoritos e participe das conversas.</p></div><span className="auth-visual-credit">FRAME / FILM INDEX</span></section>
      <section className="auth-panel">
        <Link className="wordmark auth-wordmark" to="/login"><span className="wordmark-symbol">F</span><span>FRAME<small>FILM INDEX</small></span></Link>
        <div className="auth-form-wrap"><span className="eyebrow">FAÇA PARTE</span><h2>Crie sua conta</h2><p className="form-intro">Uma conta para salvar e conversar sobre filmes.</p>
          <Toast message={message} tone="success" /><Toast message={error} tone="error" />
          <form className="form-stack" onSubmit={submit}>
            <label className="field"><span>Nome</span><input type="text" autoComplete="name" value={nome} onChange={(event) => setNome(event.target.value)} required maxLength={100} /></label>
            <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={150} /></label>
            <label className="field"><span>Senha</span><input type="password" autoComplete="new-password" value={senha} onChange={(event) => setSenha(event.target.value)} required minLength={6} maxLength={128} /><small>Pelo menos 6 caracteres.</small></label>
            <button className="button button-primary button-wide" type="submit" disabled={loading}>{loading ? "Criando conta..." : "Criar conta"}<span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-switch">Já tem uma conta? <Link to="/login">Entrar</Link></p>
        </div>
        <p className="auth-legal">A confirmação do e-mail é necessária para entrar.</p>
      </section>
    </main>
  );
}