import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { endpoints } from "../services/api";
import type { Comment, Movie } from "../types";

export default function MovieDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const stateMovie = (location.state as { movie?: Movie } | null)?.movie;
  const [movie, setMovie] = useState<Movie | null>(stateMovie || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [reporting, setReporting] = useState<Comment | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(!stateMovie);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadComments = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) return;
    try { const result = await endpoints.comments(Number(id)); setComments(result.comentarios); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar os comentários."); }
  }, [id]);

  useEffect(() => {
    let active = true;
    async function loadMovie() {
      if (!id || !/^\d+$/.test(id)) { setError("Identificador de filme inválido."); setLoading(false); return; }
      try {
        if (!stateMovie) {
          const result = await endpoints.movies();
          if (!active) return;
          setMovie(result.filmes.find((item) => Number(item.id) === Number(id)) || null);
        }
        await loadComments();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o filme.");
      } finally { if (active) setLoading(false); }
    }
    void loadMovie();
    return () => { active = false; };
  }, [id, stateMovie, loadComments]);

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!id) return;
    setNotice("");
    try { await endpoints.addComment(Number(id), text); setText(""); setNotice("Comentário publicado."); await loadComments(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível publicar o comentário."); }
  }

  async function deleteComment(comment: Comment) {
    setNotice("");
    try { await endpoints.removeComment(comment.id); setComments((items) => items.filter((item) => item.id !== comment.id)); setNotice("Comentário removido."); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível remover o comentário."); }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!reporting) return;
    setNotice("");
    try { await endpoints.reportComment(reporting.id, reportReason.trim()); setNotice("Denúncia enviada para análise."); setReporting(null); setReportReason(""); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível enviar a denúncia."); }
  }

  if (loading) return <Loading label="Carregando filme" />;
  if (error && !movie) return <div className="error-panel"><p>{error}</p><Link className="button button-secondary" to="/catalog">Voltar ao catálogo</Link></div>;
  if (!movie) return <EmptyState title="Filme não encontrado" description="Este título não está disponível no catálogo atual." action={{ label: "Voltar ao catálogo", to: "/catalog" }} />;

  return <article className="movie-detail-page">
    <Link className="back-link" to="/catalog">← Catálogo</Link>
    <section className="detail-hero"><div className="detail-poster">{movie.poster ? <img src={movie.poster} alt={`Pôster de ${movie.titulo}`} /> : <span className="poster-fallback">FRAME</span>}</div><div className="detail-copy"><span className="eyebrow">FILMOGRAFIA / TOM HANKS</span><h1>{movie.titulo}</h1><p className="detail-meta">{movie.data_lancamento ? new Date(`${movie.data_lancamento}T00:00:00`).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" }) : "Data não disponível"}</p><div className="detail-rule" /><h2>Sinopse</h2><p className="detail-overview">{movie.sinopse || "Sinopse não disponível."}</p><p className="detail-note">Informações disponíveis no catálogo atual do TMDB.</p></div></section>
    <section className="comments-section"><div className="section-heading"><div><span className="eyebrow">COMUNIDADE</span><h2>Conversas sobre o filme</h2><p>{comments.length} comentários</p></div></div><Toast message={notice || error} tone={(notice || error).includes("Não foi") || (notice || error).includes("permissão") || (notice || error).includes("sessão") ? "error" : "success"} />
      <form className="comment-composer" onSubmit={addComment}><label className="field"><span>Escreva um comentário</span><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} minLength={1} required placeholder="Compartilhe sua perspectiva..." /></label><div className="composer-footer"><span>{text.length}/1000</span><button className="button button-primary" type="submit">Publicar <span aria-hidden="true">→</span></button></div></form>
      {comments.length ? <div className="comment-list">{comments.map((comment) => { const own = Number(comment.usuario_id) === Number(user?.id); return <article className="comment-item" key={comment.id}><div className="comment-avatar" aria-hidden="true">{comment.usuario_nome?.slice(0, 1).toUpperCase() || "M"}</div><div className="comment-content"><div className="comment-meta"><strong>{comment.usuario_nome}</strong><time>{new Date(comment.criado_em).toLocaleString("pt-BR")}</time></div><p>{comment.texto}</p><div className="comment-actions">{own ? <button className="text-action danger-text" type="button" onClick={() => void deleteComment(comment)}>Excluir</button> : <button className="text-action" type="button" onClick={() => setReporting(comment)}>Denunciar</button>}</div></div></article>; })}</div> : <EmptyState title="A conversa começa aqui" description="Ainda não há comentários para este filme." />}
    </section>
    {reporting && <Modal title="Denunciar comentário" onClose={() => setReporting(null)}><form className="modal-body form-stack" onSubmit={submitReport}><p className="form-intro">Informe o motivo para que a equipe de moderação possa analisar.</p><label className="field"><span>Motivo</span><textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} minLength={3} maxLength={500} required placeholder="Descreva o motivo (3 a 500 caracteres)" /></label><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setReporting(null)}>Cancelar</button><button className="button button-primary" type="submit">Enviar denúncia</button></div></form></Modal>}
  </article>;
}