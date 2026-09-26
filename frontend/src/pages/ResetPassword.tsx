import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import { endpoints } from "../services/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [senha, setSenha] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!token) { setError("Este link de redefinição é inválido."); return; }
    setLoading(true);
    try {
      const result = await endpoints.resetPassword(token, senha);
      setMessage(result.mensagem || "Senha alterada com sucesso."); setSenha("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível redefinir a senha.");
    } finally { setLoading(false); }
  }

  return <main className="auth-screen auth-single"><section className="auth-panel"><Link className="wordmark auth-wordmark" to="/login"><span className="wordmark-symbol">F</span><span>FRAME<small>FILM INDEX</small></span></Link><div className="auth-form-wrap"><span className="eyebrow">ACESSO À SUA CONTA</span><h2>Crie uma nova senha.</h2><p className="form-intro">Escolha uma senha para voltar ao seu catálogo.</p><Toast message={message} tone="success" /><Toast message={error} tone="error" /><form className="form-stack" onSubmit={submit}><label className="field"><span>Nova senha</span><input type="password" autoComplete="new-password" value={senha} onChange={(event) => setSenha(event.target.value)} required minLength={6} maxLength={128} /><small>Use pelo menos 6 caracteres.</small></label><button className="button button-primary button-wide" type="submit" disabled={loading}>{loading ? "Redefinindo..." : "Redefinir senha"}<span aria-hidden="true">→</span></button></form><p className="auth-switch"><Link to="/login">← Voltar ao login</Link></p></div><p className="auth-legal">O link é válido por 30 minutos e pode ser usado uma vez.</p></section></main>;
}