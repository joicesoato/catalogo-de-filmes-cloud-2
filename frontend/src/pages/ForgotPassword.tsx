import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Toast from "../components/Toast";
import { endpoints } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      const result = await endpoints.forgotPassword(email.trim().toLowerCase());
      setMessage(result.mensagem || "Se o e-mail estiver cadastrado, um link será enviado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível solicitar a recuperação.");
    } finally { setLoading(false); }
  }

  return <main className="auth-screen auth-single"><section className="auth-panel"><Link className="wordmark auth-wordmark" to="/login"><span className="wordmark-symbol">F</span><span>FRAME<small>FILM INDEX</small></span></Link><div className="auth-form-wrap"><span className="eyebrow">RECUPERAÇÃO DE ACESSO</span><h2>Vamos encontrar sua conta.</h2><p className="form-intro">Informe o e-mail usado no cadastro. Se ele existir, enviaremos um link de redefinição.</p><Toast message={message} tone="success" /><Toast message={error} tone="error" /><form className="form-stack" onSubmit={submit}><label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={150} /></label><button className="button button-primary button-wide" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}<span aria-hidden="true">→</span></button></form><p className="auth-switch"><Link to="/login">← Voltar ao login</Link></p></div><p className="auth-legal">O link enviado expira em 30 minutos.</p></section></main>;
}