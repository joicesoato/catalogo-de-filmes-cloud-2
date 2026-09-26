import { useCallback, useEffect, useState, type FormEvent } from "react";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { endpoints } from "../services/api";
import type { ModerationComment, Movie, Report } from "../types";

const pageSize = 10;

export default function Admin() {
  const { user } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [pending, setPending] = useState(0);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [movieId, setMovieId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<ModerationComment | null>(null);

  const load = useCallback(async (pageNumber = page) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(pageNumber), limit: String(pageSize) });
    if (search.trim()) query.set("search", search.trim());
    if (movieId) query.set("movieId", movieId);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (status) query.set("status", status);
    if (reportedOnly) query.set("reportedOnly", "true");
    try {
      const [commentResult, countResult, reportResult] = await Promise.all([
        endpoints.moderationComments(query), endpoints.reportCount(), endpoints.reports(),
      ]);
      setComments(commentResult.comentarios); setTotal(commentResult.total); setPages(Math.max(commentResult.paginas, 1));
      setPending(countResult.pendentes); setReports(reportResult.denuncias);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar a moderação."); }
    finally { setLoading(false); }
  }, [from, movieId, page, reportedOnly, search, status, to]);

  useEffect(() => {
    let active = true;
    void endpoints.movies().then((result) => { if (active) setMovies(result.filmes); }).catch(() => undefined);
    void load(1);
    return () => { active = false; };
  }, []);

  async function refresh() { await load(page); }
  function applyFilters(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); void load(1); }

  async function updateReports(nextStatus: "ignorada" | "resolvida") {
    if (!selected) return;
    const related = reports.filter((report) => Number(report.comentario_id) === selected.id && report.status === "pendente");
    setNotice("");
    try {
      await Promise.all(related.map((report) => endpoints.updateReport(report.id, nextStatus)));
      setSelected(null); setNotice(nextStatus === "resolvida" ? "Denúncias resolvidas." : "Denúncias ignoradas."); await load(page);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível atualizar as denúncias."); }
  }

  async function deleteComment(comment: ModerationComment) {
    if (!window.confirm("Excluir este comentário? Esta ação não pode ser desfeita.")) return;
    setNotice("");
    try {
      await endpoints.removeComment(comment.id); setSelected(null); setNotice("Comentário removido."); await load(page);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível excluir o comentário."); }
  }

  if (user?.role !== "admin") return <EmptyState title="Acesso restrito" description="A conta atual não tem acesso à moderação." />;
  const pendingReports = reports.filter((report) => report.status === "pendente");
  const reportsToday = reports.filter((report) => report.criado_em.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  return <section className="admin-page"><div className="page-title-row"><div><span className="eyebrow">FERRAMENTAS INTERNAS</span><h1>Moderação</h1><p>Analise comentários e denúncias da comunidade.</p></div><button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={loading}><span aria-hidden="true">↻</span> Atualizar</button></div>
    <Toast message={error || notice} tone={error || notice.includes("Não foi") || notice.includes("permissão") ? "error" : "success"} />
    <div className="admin-stats"><article><span>DENÚNCIAS PENDENTES</span><strong>{pending.toString().padStart(2, "0")}</strong></article><article><span>COMENTÁRIOS</span><strong>{total.toString().padStart(2, "0")}</strong></article><article><span>DENÚNCIAS HOJE</span><strong>{reportsToday.toString().padStart(2, "0")}</strong></article></div>
    <form className="admin-filters" onSubmit={applyFilters}><label className="field"><span>Busca</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar texto" /></label><label className="field"><span>Filme</span><select value={movieId} onChange={(event) => setMovieId(event.target.value)}><option value="">Todos os filmes</option>{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.titulo}</option>)}</select></label><label className="field"><span>De</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="field"><span>Até</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="pendente">Pendente</option><option value="resolvida">Resolvida</option><option value="ignorada">Ignorada</option></select></label><label className="check-field"><input type="checkbox" checked={reportedOnly} onChange={(event) => setReportedOnly(event.target.checked)} /> Somente denunciados</label><button className="button button-primary" type="submit">Aplicar filtros</button></form>
    <div className="admin-columns"><section className="admin-list-panel"><div className="panel-title"><div><span className="eyebrow">REVISÃO</span><h2>Comentários <small>{total}</small></h2></div><span className="page-counter">Página {page} / {pages}</span></div>
      {loading ? <Loading label="Carregando moderação" /> : error ? <div className="error-panel"><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void refresh()}>Tentar novamente</button></div> : comments.length ? <><div className="moderation-list">{comments.map((comment) => <article className="moderation-item" key={comment.id}><div className="moderation-item-top"><div><span className="movie-label">{comment.titulo_filme}</span><strong>{comment.usuario_nome}</strong></div><time>{new Date(comment.criado_em).toLocaleString("pt-BR")}</time></div><p>{comment.texto}</p><div className="moderation-item-footer"><span className={`status-badge ${comment.denuncias_pendentes ? "status-pending" : ""}`}>{comment.denuncias_pendentes} pendente(s)</span><div><button className="text-action" type="button" onClick={() => setSelected(comment)}>Detalhes</button><button className="text-action danger-text" type="button" onClick={() => void deleteComment(comment)}>Excluir</button></div></div></article>)}</div><div className="pagination"><button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(next); }}>← Anterior</button><span>{page} de {pages}</span><button className="button button-secondary" type="button" disabled={page >= pages} onClick={() => { const next = page + 1; setPage(next); void load(next); }}>Próxima →</button></div></> : <EmptyState title="Nenhum comentário" description="Não há comentários correspondentes aos filtros atuais." />}
    </section><aside className="admin-reports"><div className="panel-title"><div><span className="eyebrow">FILA DE ANÁLISE</span><h2>Denúncias <small>{pendingReports.length}</small></h2></div></div>{pendingReports.length ? <div className="report-list">{pendingReports.map((report) => <button className="report-row" key={report.id} type="button" onClick={() => setSelected(comments.find((comment) => comment.id === report.comentario_id) || ({ id: report.comentario_id, tmdb_movie_id: report.tmdb_movie_id, texto: report.texto, criado_em: report.criado_em, usuario_id: 0, usuario_nome: report.autor_nome, titulo_filme: report.titulo_filme, denuncias_pendentes: 1, motivos: [report.motivo] } as ModerationComment))}><span className="report-status-dot" /><span><strong>{report.titulo_filme}</strong><small>{report.motivo}</small><time>{new Date(report.criado_em).toLocaleString("pt-BR")}</time></span><b aria-hidden="true">↗</b></button>)}</div> : <p className="quiet-empty">Nenhuma denúncia pendente.</p>}</aside></div>
    {selected && <Modal title="Detalhes do comentário" onClose={() => setSelected(null)}><div className="modal-body"><div className="detail-summary"><span className="eyebrow">{selected.titulo_filme}</span><strong>{selected.usuario_nome}</strong><time>{new Date(selected.criado_em).toLocaleString("pt-BR")}</time><p>{selected.texto}</p></div><h3>Denúncias relacionadas</h3><ul className="report-detail-list">{reports.filter((report) => Number(report.comentario_id) === selected.id).map((report) => <li key={report.id}><strong>{report.motivo}</strong><span>{report.denunciante_nome} · {new Date(report.criado_em).toLocaleString("pt-BR")} · <span className={`status-badge status-${report.status}`}>{report.status}</span></span></li>)}{!reports.some((report) => Number(report.comentario_id) === selected.id) && <li>Este comentário não possui denúncias.</li>}</ul><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => void updateReports("ignorada")} disabled={!reports.some((report) => Number(report.comentario_id) === selected.id && report.status === "pendente")}>Ignorar denúncias</button><button className="button button-secondary" type="button" onClick={() => void updateReports("resolvida")} disabled={!reports.some((report) => Number(report.comentario_id) === selected.id && report.status === "pendente")}>Resolver</button><button className="button button-danger" type="button" onClick={() => void deleteComment(selected)}>Excluir comentário</button></div></div></Modal>}
  </section>;
}