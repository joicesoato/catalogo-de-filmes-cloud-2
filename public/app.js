let filmes = [];
let favoritos = [];
let filmeComentarioAtual = null;
let usuarioAtual = null;
let contagensComentarios = {};
let comentarioParaDenunciar = null;


// =====================================
// ELEMENTOS
// =====================================

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

const loginForm = document.getElementById("form-login");
const registerForm = document.getElementById("form-register");

const loginContainer = document.getElementById("login-form");
const registerContainer = document.getElementById("register-form");

const loginMessage = document.getElementById("login-message");
const registerMessage = document.getElementById("register-message");

const moviesContainer =
  document.getElementById("movies-container");

const favoritesContainer =
  document.getElementById("favorites-container");

const userName =
  document.getElementById("user-name");

const commentModal =
  document.getElementById("comment-modal");

const commentsContainer =
  document.getElementById("comments-container");

const commentForm =
  document.getElementById("comment-form");

const moderationLink = document.getElementById("moderation-link");
const moderationBadge = document.getElementById("moderation-badge");
const reportModal = document.getElementById("report-modal");
const reportForm = document.getElementById("report-form");
const reportMessage = document.getElementById("report-message");

moviesContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const movieId = Number(button.dataset.movieId);

  if (button.dataset.action === "favorite") {
    alternarFavorito(
      movieId,
      button.dataset.title,
      button.dataset.posterPath
    );
  }

  if (button.dataset.action === "comment") {
    abrirComentarios(movieId, button.dataset.title);
  }
});

favoritesContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action=remove-favorite]");

  if (button) {
    removerFavorito(Number(button.dataset.favoriteId));
  }
});

commentsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action=delete-comment]");

  if (button) {
    removerComentario(Number(button.dataset.commentId));
  }
});

commentsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action=report-comment]");
  if (button) abrirDenuncia(Number(button.dataset.commentId));
});


// =====================================
// TROCAR LOGIN / CADASTRO
// =====================================

document
  .getElementById("show-register")
  .addEventListener("click", () => {

    loginContainer.classList.add("hidden");
    registerContainer.classList.remove("hidden");

    loginMessage.textContent = "";
  });


document
  .getElementById("show-login")
  .addEventListener("click", () => {

    registerContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");

    registerMessage.textContent = "";
  });


// =====================================
// CADASTRO
// =====================================

registerForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const nome =
      document.getElementById("register-nome").value;

    const email =
      document.getElementById("register-email").value;

    const senha =
      document.getElementById("register-senha").value;

    registerMessage.textContent =
      "Criando sua conta...";

    try {

      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            nome,
            email,
            senha
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro);
      }

      registerMessage.textContent =
        data.mensagem ||
        "Cadastro realizado! Verifique seu e-mail para ativar sua conta.";

      registerForm.reset();

    } catch (erro) {

      registerMessage.textContent =
        erro.message;
    }
  }
);

// =====================================
// LOGIN
// =====================================

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      document.getElementById("login-email").value;

    const senha =
      document.getElementById("login-senha").value;

    loginMessage.textContent =
      "Entrando...";

    try {

      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email,
            senha
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro);
      }

      await iniciarAplicacao(data.usuario);

    } catch (erro) {

      loginMessage.textContent =
        erro.message;
    }
  }
);


// =====================================
// INICIAR APLICAÇÃO
// =====================================

async function iniciarAplicacao(usuario) {

  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  usuarioAtual = usuario;
  userName.textContent = usuario.nome;
  document.getElementById("user-role").textContent = usuario.role;
  moderationLink.classList.toggle("hidden", usuario.role !== "admin");

  await carregarFilmes();
  await carregarFavoritos();

  if (usuario.role === "admin") atualizarBadgeModeracao();
}

async function atualizarBadgeModeracao() {
  try {
    const response = await fetch("/api/admin/reports/count");
    if (!response.ok) return;
    const data = await response.json();
    moderationBadge.textContent = data.pendentes;
    moderationBadge.classList.toggle("hidden", data.pendentes === 0);
  } catch (erro) {
    console.error("Erro ao carregar denúncias pendentes:", erro.message);
  }
}

// =====================================
// VERIFICAR LOGIN AO ABRIR
// =====================================

async function verificarSessao() {

  try {

    const response =
      await fetch("/api/auth/me");

    const data =
      await response.json();

    if (data.logado) {

      await iniciarAplicacao(
        data.usuario
      );

    } else {

      authScreen.classList.remove("hidden");
      appScreen.classList.add("hidden");

    }

  } catch (erro) {

    console.error(
      "Erro ao verificar sessão:",
      erro
    );
  }
}


// =====================================
// CARREGAR FILMES
// =====================================

async function carregarFilmes() {

  moviesContainer.innerHTML =
    `<div class="loading">
      Carregando filmes do Tom Hanks...
    </div>`;

  try {

    const response =
      await fetch("/api/movies");

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.erro);
    }

    filmes = data.filmes;

    await carregarContagensComentarios();
    renderizarFilmes();

  } catch (erro) {

    moviesContainer.innerHTML =
      `<p class="empty">
        ${erro.message}
      </p>`;
  }
}

async function carregarContagensComentarios() {
  const movieIds = filmes.map((filme) => filme.id).join(",");
  if (!movieIds) return;

  try {
    const response = await fetch(`/api/comments/counts?movieIds=${movieIds}`);
    if (response.ok) {
      const data = await response.json();
      contagensComentarios = data.contagens || {};
    }
  } catch (erro) {
    console.error("Erro ao carregar contagens de comentários:", erro.message);
  }
}


// =====================================
// RENDERIZAR FILMES
// =====================================

function renderizarFilmes() {

  if (!filmes.length) {

    moviesContainer.innerHTML =
      `<p class="empty">
        Nenhum filme encontrado.
      </p>`;

    return;
  }

  moviesContainer.innerHTML =
    filmes
      .map((filme) => {

        const favoritado =
          favoritos.some(
            (item) =>
              Number(item.tmdb_movie_id) ===
              Number(filme.id)
          );

        const dataLancamento =
          filme.data_lancamento
            ? new Date(
                filme.data_lancamento + "T00:00:00"
              ).toLocaleDateString("pt-BR")
            : "Data não disponível";

        return `
          <article class="movie-card">

            ${
              filme.poster
                ? `<img
                    class="movie-poster"
                    src="/api/poster?path=${encodeURIComponent(filme.poster_path)}"
                    alt="Pôster de ${escapeHtml(filme.titulo)}"
                  >`
                : `<div class="movie-poster"></div>`
            }

            <div class="movie-info">

              <h3>
                ${escapeHtml(filme.titulo)}
              </h3>

              <div class="movie-date">
                ${dataLancamento}
              </div>

              <p class="movie-overview">
                ${escapeHtml(filme.sinopse)}
              </p>

              <div class="movie-actions">

                <button
                  class="favorite-button"
                  data-action="favorite"
                  data-movie-id="${filme.id}"
                  data-title="${escapeHtml(filme.titulo)}"
                  data-poster-path="${escapeHtml(filme.poster_path || "")}"
                >
                  ${
                    favoritado
                      ? "❤️ Favoritado"
                      : "♡ Favoritar"
                  }
                </button>

                <button
                  class="comment-button"
                  data-action="comment"
                  data-movie-id="${filme.id}"
                  data-title="${escapeHtml(filme.titulo)}"
                >
                  💬 Comentários
                </button>

              </div>

            </div>

          </article>
        `;
      })
      .join("");
}


// =====================================
// CARREGAR FAVORITOS
// =====================================

async function carregarFavoritos() {

  try {

    const response =
      await fetch("/api/favorites");

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.erro);
    }

    favoritos = data.favoritos;

    renderizarFavoritos();

    if (filmes.length) {
      renderizarFilmes();
    }

  } catch (erro) {

    console.error(
      "Erro ao carregar favoritos:",
      erro
    );
  }
}


// =====================================
// ADICIONAR FAVORITO
// =====================================

async function alternarFavorito(
  movieId,
  titulo,
  posterPath
) {

  const existente =
    favoritos.find(
      (item) =>
        Number(item.tmdb_movie_id) ===
        Number(movieId)
    );

  try {

    if (existente) {

      const response =
        await fetch(
          `/api/favorites/${existente.id}`,
          {
            method: "DELETE"
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(data.erro);
      }

    } else {

      const response =
        await fetch(
          "/api/favorites",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              tmdb_movie_id: movieId,
              titulo,
              poster_path:
                posterPath || null
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(data.erro);
      }
    }

    await carregarFavoritos();

  } catch (erro) {

    alert(erro.message);
  }
}


// =====================================
// RENDERIZAR FAVORITOS
// =====================================

function renderizarFavoritos() {

  if (!favoritos.length) {

    favoritesContainer.innerHTML =
      `<p class="empty">
        Você ainda não possui favoritos.
      </p>`;

    return;
  }

  favoritesContainer.innerHTML =
    favoritos
      .map(
        (favorito) => {

          const poster =
            favorito.poster_path
              ? `https://image.tmdb.org/t/p/w500${favorito.poster_path}`
              : "";

          return `
            <article class="favorite-card">

              ${
                poster
                  ? `<img
                      src="${poster}"
                      alt="Pôster de ${escapeHtml(
                        favorito.titulo
                      )}"
                    >`
                  : ""
              }

              <div class="favorite-card-content">

                <h3>
                  ${escapeHtml(favorito.titulo)}
                </h3>

                <button
                  class="remove-favorite"
                  data-action="remove-favorite"
                  data-favorite-id="${favorito.id}"
                >
                  Remover dos favoritos
                </button>

              </div>

            </article>
          `;
        }
      )
      .join("");
}


// =====================================
// REMOVER FAVORITO
// =====================================

async function removerFavorito(id) {

  try {

    const response =
      await fetch(
        `/api/favorites/${id}`,
        {
          method: "DELETE"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.erro);
    }

    await carregarFavoritos();

  } catch (erro) {

    alert(erro.message);
  }
}


// =====================================
// ABRIR COMENTÁRIOS
// =====================================

async function abrirComentarios(
  movieId,
  titulo
) {

  filmeComentarioAtual = {
    id: movieId,
    titulo
  };

  document.getElementById(
    "modal-title"
  ).textContent =
    `Comentários — ${titulo}`;

  commentModal.classList.remove("hidden");

  commentsContainer.innerHTML =
    `<p class="empty">
      Carregando comentários...
    </p>`;

  await carregarComentarios(movieId);
}


// =====================================
// CARREGAR COMENTÁRIOS
// =====================================

async function carregarComentarios(movieId) {

  try {

    const response =
      await fetch(
        `/api/comments/${movieId}`
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.erro);
    }

    renderizarComentarios(
      data.comentarios
    );

  } catch (erro) {

    commentsContainer.innerHTML =
      `<p class="empty">
        ${erro.message}
      </p>`;
  }
}


// =====================================
// RENDERIZAR COMENTÁRIOS
// =====================================

function renderizarComentarios(
  comentarios
) {

  if (!comentarios.length) {

    commentsContainer.innerHTML =
      `<p class="empty">
        Não há comentários ainda.
      </p>`;

    return;
  }

  commentsContainer.innerHTML =
    comentarios
      .map(
        (comentario) => {

          const data =
            new Date(
              comentario.criado_em
            ).toLocaleString("pt-BR");
          const proprio = Number(comentario.usuario_id) === Number(usuarioAtual.id);
          const acao = proprio
            ? `<button class="delete-comment" data-action="delete-comment" data-comment-id="${comentario.id}">Excluir</button>`
            : `<button class="report-comment" data-action="report-comment" data-comment-id="${comentario.id}">⚑ Denunciar</button>`;

          return `
            <div class="comment-item">

              ${comentario.usuario_nome
                ? `<strong class="comment-author">${escapeHtml(comentario.usuario_nome)}</strong>`
                : ""}

              <p>
                ${escapeHtml(
                  comentario.texto
                )}
              </p>

              <small>
                ${data}
              </small>

              <div class="comment-actions">${acao}</div>

            </div>
          `;
        }
      )
      .join("");
}


// =====================================
// ADICIONAR COMENTÁRIO
// =====================================

commentForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const texto =
      document.getElementById(
        "comment-text"
      ).value;

    if (!filmeComentarioAtual) {
      return;
    }

    try {

      const response =
        await fetch(
          "/api/comments",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              tmdb_movie_id:
                filmeComentarioAtual.id,

              texto
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(data.erro);
      }

      document.getElementById(
        "comment-text"
      ).value = "";

      await carregarComentarios(
        filmeComentarioAtual.id
      );
      await carregarContagensComentarios();
      renderizarFilmes();

    } catch (erro) {

      document.getElementById(
        "comment-message"
      ).textContent =
        erro.message;
    }
  }
);


// =====================================
// EXCLUIR COMENTÁRIO
// =====================================

async function removerComentario(id) {

  try {

    const response =
      await fetch(
        `/api/comments/${id}`,
        {
          method: "DELETE"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.erro);
    }

    await carregarComentarios(
      filmeComentarioAtual.id
    );
    await carregarContagensComentarios();
    renderizarFilmes();

  } catch (erro) {

    alert(erro.message);
  }
}


// =====================================
// FECHAR MODAL
// =====================================

document
  .getElementById("close-modal")
  .addEventListener(
    "click",
    () => {

      commentModal.classList.add(
        "hidden"
      );

      filmeComentarioAtual = null;
    }
  );

function abrirDenuncia(commentId) {
  comentarioParaDenunciar = commentId;
  reportForm.reset();
  reportMessage.textContent = "";
  reportModal.classList.remove("hidden");
  reportModal.querySelector("input[name=report-reason]").focus();
}

function fecharDenuncia() {
  reportModal.classList.add("hidden");
  comentarioParaDenunciar = null;
}

document.getElementById("close-report-modal").addEventListener("click", fecharDenuncia);
document.getElementById("cancel-report").addEventListener("click", fecharDenuncia);

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const motivoSelecionado = reportForm.elements["report-reason"].value;
  const detalhe = document.getElementById("report-other").value.trim();
  if (motivoSelecionado === "Outro" && !detalhe) {
    reportMessage.textContent = "Descreva brevemente o motivo da denúncia.";
    return;
  }
  const motivo = motivoSelecionado === "Outro" && detalhe
    ? `Outro: ${detalhe}`
    : motivoSelecionado;

  if (!comentarioParaDenunciar || !motivo) return;
  reportMessage.textContent = "Enviando denúncia...";

  try {
    const response = await fetch(`/api/comments/${comentarioParaDenunciar}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro);
    reportMessage.textContent = data.mensagem;
    window.setTimeout(fecharDenuncia, 1600);
    if (usuarioAtual.role === "admin") atualizarBadgeModeracao();
  } catch (erro) {
    reportMessage.textContent = erro.message;
  }
});


// =====================================
// LOGOUT
// =====================================

document
  .getElementById("logout-button")
  .addEventListener(
    "click",
    async () => {

      try {

        await fetch(
          "/api/auth/logout",
          {
            method: "POST"
          }
        );

        location.reload();

      } catch (erro) {

        console.error(
          "Erro ao fazer logout:",
          erro
        );
      }
    }
  );


// =====================================
// ATUALIZAR FILMES
// =====================================

document
  .getElementById("reload-movies")
  .addEventListener(
    "click",
    carregarFilmes
  );

// =====================================
// SEGURANÇA — ESCAPAR HTML
// =====================================

function escapeHtml(valor) {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =====================================
// INICIAR
// =====================================

verificarSessao();

// ===============================
// RECUPERAÇÃO DE SENHA
// ===============================

const forgotPasswordButton = document.getElementById("forgot-password-button");

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener("click", async () => {
    const email = prompt("Digite o e-mail cadastrado:");

    if (!email) {
      return;
    }

    try {
      forgotPasswordButton.disabled = true;
      forgotPasswordButton.textContent = "Enviando...";

      const resposta = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        })
      });

      const dados = await resposta.json();

      alert(dados.mensagem || dados.erro);

    } catch (erro) {
      console.error("Erro na recuperação:", erro);
      alert("Não foi possível solicitar a recuperação de senha.");
    } finally {
      forgotPasswordButton.disabled = false;
      forgotPasswordButton.textContent = "Esqueci minha senha";
    }
  });
}