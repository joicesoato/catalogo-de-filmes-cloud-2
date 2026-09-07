let currentPage = 1;
let totalPages = 1;
let selectedCommentId = null;
let selectedReportId = null;
let reports = [];
let moderationComments = [];

const filterForm = document.getElementById("moderation-filters");
const moderationList = document.getElementById("moderation-list");
const reportsList = document.getElementById("reports-list");
const detailsModal = document.getElementById("details-modal");
const toast = document.getElementById("admin-toast");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || "Não foi possível concluir a operação.");
  return data;
}

function queryFromFilters() {
  const params = new URLSearchParams(new FormData(filterForm));
  if (!filterForm.elements.reportedOnly.checked) params.delete("reportedOnly");
  params.set("page", currentPage);
  params.set("limit", "10");
  return params;
}

async function loadModeration() {
  moderationList.innerHTML = '<p class="loading">Carregando moderação...</p>';
  try {
    const data = await api(`/api/admin/comments?${queryFromFilters()}`);
    moderationComments = data.comentarios;
    totalPages = Math.max(data.paginas || 1, 1);
    document.getElementById("results-label").textContent = `${data.total} resultado(s)`;
    document.getElementById("page-label").textContent = `Página ${data.pagina} de ${totalPages}`;
    document.getElementById("previous-page").disabled = currentPage <= 1;
    document.getElementById("next-page").disabled = currentPage >= totalPages;

    if (!data.comentarios.length) {
      moderationList.innerHTML = '<p class="empty">Não encontramos comentários para essa pesquisa.</p>';
      return;
    }

    moderationList.innerHTML = data.comentarios.map((comment) => `
      <article class="moderation-card">
        <div class="moderation-card-top"><span class="movie-label">🎬 ${escapeHtml(comment.titulo_filme)}</span><time>${new Date(comment.criado_em).toLocaleString("pt-BR")}</time></div>
        <strong>👤 ${escapeHtml(comment.usuario_nome)}</strong>
        <p>“${escapeHtml(comment.texto)}”</p>
        <div class="moderation-card-bottom"><span class="report-count">⚠️ ${comment.denuncias_pendentes} pendente(s)</span><span>${comment.motivos.map(escapeHtml).join(" · ")}</span><button data-action="details" data-comment-id="${comment.id}">Ver detalhes</button><button data-action="delete" data-comment-id="${comment.id}" class="danger-button">Excluir</button></div>
      </article>`).join("");
  } catch (error) {
    moderationList.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function loadSummary() {
  try {
    const [count, comments, allReports] = await Promise.all([
      api("/api/admin/reports/count"),
      api("/api/admin/comments?limit=1"),
      api("/api/admin/reports")
    ]);
    document.getElementById("pending-count").textContent = count.pendentes;
    document.getElementById("comment-count").textContent = comments.total;
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("today-count").textContent = allReports.denuncias.filter((report) => report.criado_em.slice(0, 10) === today).length;
    document.getElementById("pending-notice").textContent = count.pendentes ? `Você possui ${count.pendentes} denúncia(s) pendente(s).` : "Não há denúncias pendentes.";
    reports = allReports.denuncias;
    renderReports();
  } catch (error) {
    reportsList.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

function renderReports() {
  const pending = reports.filter((report) => report.status === "pendente");
  if (!pending.length) {
    reportsList.innerHTML = '<p class="empty">Não há denúncias pendentes.</p>';
    return;
  }
  reportsList.innerHTML = pending.map((report) => `
    <button class="report-item" data-action="report-details" data-report-id="${report.id}">
      <strong>🎬 ${escapeHtml(report.titulo_filme)}</strong><span>${escapeHtml(report.motivo)}</span><small>${new Date(report.criado_em).toLocaleString("pt-BR")}</small>
    </button>`).join("");
}

async function loadMovieFilter() {
  try {
    const data = await api("/api/movies");
    const select = document.getElementById("movie-filter");
    data.filmes.forEach((movie) => {
      const option = document.createElement("option");
      option.value = movie.id;
      option.textContent = movie.titulo;
      select.append(option);
    });
  } catch (error) {
    console.error("Erro ao carregar filmes para filtro:", error.message);
  }
}

async function openDetails(commentId, reportId) {
  selectedCommentId = commentId;
  selectedReportId = reportId || null;
  const related = reports.filter((report) => Number(report.comentario_id) === Number(commentId));
  const comment = related[0] || moderationComments.find((item) => Number(item.id) === Number(commentId));
  if (!comment) return;
  document.getElementById("details-content").innerHTML = `
    <div class="detail-summary"><strong>🎬 ${escapeHtml(comment.titulo_filme)}</strong><strong>👤 ${escapeHtml(comment.autor_nome || comment.usuario_nome)}</strong><p>“${escapeHtml(comment.texto)}”</p></div>
    <h3>Denúncias (${related.length})</h3>
    <ul class="report-detail-list">${related.map((report) => `<li><strong>${escapeHtml(report.motivo)}</strong><span>${new Date(report.criado_em).toLocaleString("pt-BR")} · ${escapeHtml(report.denunciante_nome)}</span></li>`).join("")}</ul>`;
  detailsModal.classList.remove("hidden");
}

async function updateReportStatus(status) {
  const related = reports.filter((report) => Number(report.comentario_id) === Number(selectedCommentId) && report.status === "pendente");
  try {
    await Promise.all(related.map((report) => api(`/api/admin/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })));
    detailsModal.classList.add("hidden");
    showToast("Denúncias atualizadas com sucesso.");
    await Promise.all([loadModeration(), loadSummary()]);
  } catch (error) { showToast(error.message); }
}

async function deleteComment(id) {
  if (!window.confirm("Tem certeza que deseja excluir este comentário?\n\nEssa ação não poderá ser desfeita.")) return;
  try {
    await api(`/api/comments/${id}`, { method: "DELETE" });
    showToast("Comentário removido com sucesso.");
    await Promise.all([loadModeration(), loadSummary()]);
  } catch (error) { showToast(error.message); }
}

async function deleteSelectedComment() {
  if (!selectedCommentId) return;
  await deleteComment(selectedCommentId);
  detailsModal.classList.add("hidden");
}

filterForm.addEventListener("submit", (event) => { event.preventDefault(); currentPage = 1; loadModeration(); });
document.getElementById("previous-page").addEventListener("click", () => { currentPage -= 1; loadModeration(); });
document.getElementById("next-page").addEventListener("click", () => { currentPage += 1; loadModeration(); });
document.getElementById("refresh-moderation").addEventListener("click", () => Promise.all([loadModeration(), loadSummary()]));
document.getElementById("close-details").addEventListener("click", () => detailsModal.classList.add("hidden"));
document.getElementById("ignore-details").addEventListener("click", () => updateReportStatus("ignorada"));
document.getElementById("resolve-details").addEventListener("click", () => updateReportStatus("resolvida"));
document.getElementById("delete-details").addEventListener("click", deleteSelectedComment);
document.getElementById("admin-logout").addEventListener("click", async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; });
moderationList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "delete") deleteComment(button.dataset.commentId);
  if (button.dataset.action === "details") openDetails(button.dataset.commentId);
});
reportsList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-report-id]");
  if (!item) return;
  const report = reports.find((entry) => String(entry.id) === item.dataset.reportId);
  if (report) openDetails(report.comentario_id, report.id);
});

Promise.all([loadMovieFilter(), loadModeration(), loadSummary()]);
