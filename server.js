require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const {
  exigirLogin,
  exigirPermissao,
  consultarPermissao
} = require("./middleware/auth");
const { buscarTomHanks } = require("./services/tmdb");

const app = express();
const PORT = process.env.PORT || 3000;
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);

if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS deve ser um inteiro maior ou igual a zero.");
}

app.set("trust proxy", trustProxyHops);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://image.tmdb.org", "data:"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: { policy: "same-origin" }
}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "desenvolvimento-altere-este-segredo",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.get(
  "/admin.html",
  exigirPermissao("admin:moderate"),
  (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html"))
);
app.use(express.static("public"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente mais tarde." }
});

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";
let titulosFilmesCache = new Map();
let titulosFilmesCacheExpiraEm = 0;

async function obterTitulosFilmes() {
  if (Date.now() < titulosFilmesCacheExpiraEm) {
    return titulosFilmesCache;
  }

  try {
    const filmes = await buscarTomHanks();
    titulosFilmesCache = new Map(
      filmes.map((filme) => [String(filme.id), filme.titulo])
    );
    titulosFilmesCacheExpiraEm = Date.now() + 15 * 60 * 1000;
  } catch (erro) {
    console.error("Erro ao carregar títulos para moderação:", erro.message);
  }

  return titulosFilmesCache;
}

function enriquecerTitulos(comentarios, titulos) {
  return comentarios.map((comentario) => ({
    ...comentario,
    titulo_filme: titulos.get(String(comentario.tmdb_movie_id)) ||
      `Filme #${comentario.tmdb_movie_id}`
  }));
}

function validarDataFiltro(valor) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const data = new Date(`${valor}T00:00:00Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor
    ? null
    : valor;
}

async function encaminharAuth(req, res, rota, opcoes = {}) {
  try {
    const resposta = await fetch(`${AUTH_SERVICE_URL}${rota}`, {
      method: opcoes.method || req.method,
      headers: { "Content-Type": "application/json" },
      body: opcoes.body === undefined ? JSON.stringify(req.body) : opcoes.body
    });
    const dados = await resposta.json();
    res.status(resposta.status).json(dados);
  } catch (erro) {
    console.error("Erro ao chamar auth-service:", erro.message);
    res.status(503).json({ erro: "Serviço de autenticação indisponível." });
  }
}

app.post("/api/auth/register", authLimiter, (req, res) =>
  encaminharAuth(req, res, "/register", { method: "POST" })
);

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const resposta = await fetch(`${AUTH_SERVICE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    req.session.usuario = dados.usuario;
    req.session.authToken = dados.token;
    res.json({ mensagem: dados.mensagem, usuario: dados.usuario });
  } catch (erro) {
    console.error("Erro ao chamar auth-service:", erro.message);
    res.status(503).json({ erro: "Serviço de autenticação indisponível." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((erro) => {
    if (erro) {
      console.error("Erro ao fazer logout:", erro.message);
      return res.status(500).json({ erro: "Não foi possível fazer logout." });
    }
    res.clearCookie("connect.sid");
    res.json({ mensagem: "Logout realizado com sucesso." });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.usuario) {
    return res.json({ logado: false });
  }
  res.json({ logado: true, usuario: req.session.usuario });
});

app.get("/api/auth/verify-email", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).send("Token não informado.");
    const resposta = await fetch(
      `${AUTH_SERVICE_URL}/verify-email?token=${encodeURIComponent(token)}`
    );
    if (!resposta.ok) return res.status(resposta.status).send(await resposta.text());
    res.redirect(`${process.env.APP_URL || "/"}?verified=1`);
  } catch (erro) {
    console.error("Erro na verificação:", erro.message);
    res.status(500).send("Erro ao verificar e-mail.");
  }
});

app.post("/api/auth/forgot-password", authLimiter, (req, res) =>
  encaminharAuth(req, res, "/forgot-password", { method: "POST" })
);

app.post("/api/auth/reset-password", authLimiter, (req, res) =>
  encaminharAuth(req, res, "/reset-password", { method: "POST" })
);

app.get("/api/movies", exigirLogin, async (req, res) => {
  try {
    res.json({ filmes: await buscarTomHanks() });
  } catch (erro) {
    console.error("Erro TMDB:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar os filmes da TMDB." });
  }
});

app.get("/api/favorites", exigirLogin, async (req, res) => {
  try {
    const [favoritos] = await pool.execute(
      `SELECT id, tmdb_movie_id, titulo, poster_path, criado_em
       FROM favoritos WHERE usuario_id = ? ORDER BY criado_em DESC`,
      [req.session.usuario.id]
    );
    res.json({ favoritos });
  } catch (erro) {
    console.error("Erro ao buscar favoritos:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar seus favoritos." });
  }
});

app.post("/api/favorites", exigirLogin, async (req, res) => {
  try {
    const { tmdb_movie_id, titulo, poster_path } = req.body;
    if (!/^\d+$/.test(String(tmdb_movie_id || "")) || !titulo?.trim() || titulo.length > 255) {
      return res.status(400).json({ erro: "ID e título do filme são obrigatórios." });
    }
    await pool.execute(
      `INSERT INTO favoritos (usuario_id, tmdb_movie_id, titulo, poster_path)
       VALUES (?, ?, ?, ?)`,
      [req.session.usuario.id, tmdb_movie_id, titulo.trim(), poster_path || null]
    );
    res.status(201).json({ mensagem: "Filme adicionado aos favoritos." });
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ erro: "Este filme já está nos seus favoritos." });
    }
    console.error("Erro ao adicionar favorito:", erro.message);
    res.status(500).json({ erro: "Não foi possível adicionar o favorito." });
  }
});

app.delete("/api/favorites/:id", exigirLogin, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ erro: "ID de favorito inválido." });
    }
    const [resultado] = await pool.execute(
      "DELETE FROM favoritos WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.session.usuario.id]
    );
    if (!resultado.affectedRows) return res.status(404).json({ erro: "Favorito não encontrado." });
    res.json({ mensagem: "Favorito removido." });
  } catch (erro) {
    console.error("Erro ao remover favorito:", erro.message);
    res.status(500).json({ erro: "Não foi possível remover o favorito." });
  }
});

app.get("/api/comments/:movieId", exigirLogin, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.movieId)) {
      return res.status(400).json({ erro: "ID de filme inválido." });
    }
    const [comentarios] = await pool.execute(
      `SELECT c.id, c.tmdb_movie_id, c.texto, c.criado_em,
              c.usuario_id, u.nome AS usuario_nome
       FROM comentarios c INNER JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.tmdb_movie_id = ? ORDER BY c.criado_em DESC`,
      [req.params.movieId]
    );
    res.json({ comentarios });
  } catch (erro) {
    console.error("Erro ao buscar comentários:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar os comentários." });
  }
});

app.get("/api/comments/counts", exigirLogin, async (req, res) => {
  try {
    const ids = String(req.query.movieIds || "")
      .split(",")
      .filter((id) => /^\d+$/.test(id))
      .slice(0, 100);

    if (!ids.length) {
      return res.json({ contagens: {} });
    }

    const placeholders = ids.map(() => "?").join(", ");
    const [linhas] = await pool.execute(
      `SELECT tmdb_movie_id, COUNT(*) AS total
       FROM comentarios
       WHERE tmdb_movie_id IN (${placeholders})
       GROUP BY tmdb_movie_id`,
      ids
    );
    const contagens = Object.fromEntries(
      linhas.map((linha) => [String(linha.tmdb_movie_id), Number(linha.total)])
    );
    res.json({ contagens });
  } catch (erro) {
    console.error("Erro ao contar comentários:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar os contadores." });
  }
});

app.post("/api/comments", exigirLogin, async (req, res) => {
  try {
    const { tmdb_movie_id, texto } = req.body;
    if (!/^\d+$/.test(String(tmdb_movie_id || "")) || !texto?.trim() || texto.trim().length > 1000) {
      return res.status(400).json({ erro: "Filme e comentário são obrigatórios." });
    }
    const [resultado] = await pool.execute(
      "INSERT INTO comentarios (usuario_id, tmdb_movie_id, texto) VALUES (?, ?, ?)",
      [req.session.usuario.id, tmdb_movie_id, texto.trim()]
    );
    res.status(201).json({ mensagem: "Comentário salvo.", id: resultado.insertId });
  } catch (erro) {
    console.error("Erro ao adicionar comentário:", erro.message);
    res.status(500).json({ erro: "Não foi possível salvar o comentário." });
  }
});

app.post("/api/comments/:id/report", authLimiter, exigirLogin, async (req, res) => {
  try {
    const comentarioId = req.params.id;
    const motivo = req.body.motivo?.trim();
    const denuncianteId = req.session.usuario.id;

    if (!/^\d+$/.test(comentarioId)) return res.status(400).json({ erro: "ID de comentário inválido." });
    if (!motivo || motivo.length < 3 || motivo.length > 500) {
      return res.status(400).json({ erro: "Informe um motivo entre 3 e 500 caracteres." });
    }
    const [comentarios] = await pool.execute(
      "SELECT usuario_id FROM comentarios WHERE id = ?", [comentarioId]
    );
    if (!comentarios.length) return res.status(404).json({ erro: "Comentário não encontrado." });
    if (Number(comentarios[0].usuario_id) === Number(denuncianteId)) {
      return res.status(400).json({ erro: "Você não pode denunciar o próprio comentário." });
    }
    await pool.execute(
      `INSERT INTO comentario_denuncias (comentario_id, denunciante_id, motivo, status)
       SELECT ?, ?, ?, 'pendente'
       WHERE NOT EXISTS (
         SELECT 1 FROM comentario_denuncias
         WHERE comentario_id = ? AND denunciante_id = ? AND status = 'pendente'
       )`,
      [comentarioId, denuncianteId, motivo, comentarioId, denuncianteId]
    );
    res.status(201).json({ mensagem: "Denúncia enviada. Obrigado por ajudar a manter a comunidade segura." });
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") return res.status(409).json({ erro: "Você já denunciou este comentário." });
    console.error("Erro ao denunciar comentário:", erro.message);
    res.status(500).json({ erro: "Não foi possível enviar a denúncia." });
  }
});

app.delete("/api/comments/:id", exigirLogin, async (req, res) => {
  try {
    const comentarioId = req.params.id;
    if (!/^\d+$/.test(comentarioId)) return res.status(400).json({ erro: "ID de comentário inválido." });
    const [comentarios] = await pool.execute("SELECT usuario_id FROM comentarios WHERE id = ?", [comentarioId]);
    if (!comentarios.length) return res.status(404).json({ erro: "Comentário não encontrado." });

    const dono = Number(comentarios[0].usuario_id) === Number(req.session.usuario.id);
    if (!dono) {
      const autorizacao = await consultarPermissao(req, "comments:delete:any");
      if (autorizacao.status !== 200) {
        return autorizacao.status === 401
          ? res.status(401).json({ erro: "Você precisa estar logado." })
          : res.status(503).json({ erro: "Serviço de autorização indisponível." });
      }
      if (!autorizacao.permitido) return res.status(403).json({ erro: "Acesso negado" });
    }

    const [resultado] = await pool.execute("DELETE FROM comentarios WHERE id = ?", [comentarioId]);
    if (!resultado.affectedRows) return res.status(404).json({ erro: "Comentário não encontrado." });
    res.json({ mensagem: "Comentário removido." });
  } catch (erro) {
    console.error("Erro ao remover comentário:", erro.message);
    res.status(500).json({ erro: "Não foi possível remover o comentário." });
  }
});

function adminFiltros(req) {
  const search = req.query.search?.trim() || "";
  const movieId = req.query.movieId || "";
  const from = req.query.from ? validarDataFiltro(req.query.from) : null;
  const to = req.query.to ? validarDataFiltro(req.query.to) : null;
  const status = req.query.status || "";
  const reportedOnly = req.query.reportedOnly === "true";
  const filtros = [];
  const parametros = [];

  if (search) { filtros.push("c.texto LIKE ?"); parametros.push(`%${search}%`); }
  if (movieId) {
    if (!/^\d+$/.test(movieId)) throw new Error("Filtro de filme inválido.");
    filtros.push("c.tmdb_movie_id = ?"); parametros.push(movieId);
  }
  if ((req.query.from && !from) || (req.query.to && !to)) throw new Error("Filtro de data inválido.");
  if (from) { filtros.push("c.criado_em >= ?"); parametros.push(`${from} 00:00:00`); }
  if (to) { filtros.push("c.criado_em < DATE_ADD(?, INTERVAL 1 DAY)"); parametros.push(`${to} 00:00:00`); }
  if (status && !["pendente", "resolvida", "ignorada"].includes(status)) throw new Error("Status inválido.");
  if (status) {
    filtros.push("EXISTS (SELECT 1 FROM comentario_denuncias ds WHERE ds.comentario_id = c.id AND ds.status = ?)");
    parametros.push(status);
  }
  if (reportedOnly) filtros.push("EXISTS (SELECT 1 FROM comentario_denuncias dp WHERE dp.comentario_id = c.id AND dp.status = 'pendente')");
  return { where: filtros.length ? `WHERE ${filtros.join(" AND ")}` : "", parametros };
}

app.get("/api/admin/reports/count", exigirPermissao("admin:moderate"), async (req, res) => {
  try {
    const [[resultado]] = await pool.execute("SELECT COUNT(*) AS pendentes FROM comentario_denuncias WHERE status = 'pendente'");
    res.json({ pendentes: Number(resultado.pendentes) });
  } catch (erro) {
    console.error("Erro ao contar denúncias:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar o contador." });
  }
});

app.get("/api/admin/comments", exigirPermissao("admin:moderate"), async (req, res) => {
  try {
    const { where, parametros } = adminFiltros(req);
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "10", 10), 1), 50);
    const offset = (page - 1) * limit;
    const [comentarios] = await pool.execute(
      `SELECT c.id, c.tmdb_movie_id, c.texto, c.criado_em, c.usuario_id,
              u.nome AS usuario_nome,
              COUNT(CASE WHEN d.status = 'pendente' THEN 1 END) AS denuncias_pendentes,
              GROUP_CONCAT(DISTINCT CASE WHEN d.status = 'pendente' THEN d.motivo END SEPARATOR '||') AS motivos
       FROM comentarios c INNER JOIN usuarios u ON u.id = c.usuario_id
       LEFT JOIN comentario_denuncias d ON d.comentario_id = c.id
       ${where}
       GROUP BY c.id, c.tmdb_movie_id, c.texto, c.criado_em, c.usuario_id, u.nome
       ORDER BY c.criado_em DESC LIMIT ? OFFSET ?`,
      [...parametros, limit, offset]
    );
    const [[totalResultado]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM comentarios c ${where}`,
      parametros
    );
    const dados = enriquecerTitulos(comentarios, await obterTitulosFilmes()).map((item) => ({
      ...item,
      denuncias_pendentes: Number(item.denuncias_pendentes),
      motivos: item.motivos ? item.motivos.split("||") : []
    }));
    res.json({ comentarios: dados, pagina: page, limite: limit, total: Number(totalResultado.total), paginas: Math.ceil(Number(totalResultado.total) / limit) });
  } catch (erro) {
    const status = ["Filtro de filme inválido.", "Filtro de data inválido.", "Status inválido."].includes(erro.message) ? 400 : 500;
    console.error("Erro ao buscar moderação:", erro.message);
    res.status(status).json({ erro: status === 400 ? erro.message : "Não foi possível carregar a moderação." });
  }
});

app.get("/api/admin/reports", exigirPermissao("admin:moderate"), async (req, res) => {
  try {
    const [denuncias] = await pool.execute(
      `SELECT d.id, d.comentario_id, d.denunciante_id, d.motivo, d.criado_em,
              d.status, d.analisado_em, d.analisado_por, c.texto, c.tmdb_movie_id,
              u.nome AS denunciante_nome, autor.nome AS autor_nome
       FROM comentario_denuncias d INNER JOIN comentarios c ON c.id = d.comentario_id
       INNER JOIN usuarios u ON u.id = d.denunciante_id
       INNER JOIN usuarios autor ON autor.id = c.usuario_id
       ORDER BY d.criado_em DESC LIMIT 100`
    );
    res.json({ denuncias: enriquecerTitulos(denuncias, await obterTitulosFilmes()) });
  } catch (erro) {
    console.error("Erro ao buscar denúncias:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar as denúncias." });
  }
});

app.patch("/api/admin/reports/:id", exigirPermissao("admin:moderate"), async (req, res) => {
  try {
    const status = req.body.status;
    if (!/^\d+$/.test(req.params.id) || !["ignorada", "resolvida"].includes(status)) {
      return res.status(400).json({ erro: "Denúncia ou status inválido." });
    }
    const [resultado] = await pool.execute(
      `UPDATE comentario_denuncias SET status = ?, analisado_em = NOW(), analisado_por = ? WHERE id = ?`,
      [status, req.session.usuario.id, req.params.id]
    );
    if (!resultado.affectedRows) return res.status(404).json({ erro: "Denúncia não encontrada." });
    res.json({ mensagem: "Denúncia atualizada." });
  } catch (erro) {
    console.error("Erro ao atualizar denúncia:", erro.message);
    res.status(500).json({ erro: "Não foi possível atualizar a denúncia." });
  }
});

app.get("/api/poster", async (req, res) => {
  try {
    const imagePath = req.query.path;
    if (!imagePath || !/^\/[\w-]+\.[\w-]+$/.test(imagePath)) return res.status(400).send("Imagem não informada.");
    const resposta = await fetch(`https://image.tmdb.org/t/p/w500${imagePath}`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    });
    if (!resposta.ok) return res.status(resposta.status).send("Não foi possível carregar a imagem.");
    res.setHeader("Content-Type", resposta.headers.get("content-type") || "image/jpeg");
    res.send(Buffer.from(await resposta.arrayBuffer()));
  } catch (erro) {
    console.error("Erro ao carregar poster:", erro.message);
    res.status(500).send("Erro ao carregar imagem.");
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", servico: "catalogo" });
  } catch {
    res.status(500).json({ status: "erro" });
  }
});

app.listen(PORT, async () => {
  console.log(`Site disponível em http://localhost:${PORT}`);
  try {
    const conexao = await pool.getConnection();
    console.log("Conexão com o MariaDB/MySQL realizada com sucesso.");
    conexao.release();
  } catch (erro) {
    console.error("Não foi possível conectar ao MariaDB/MySQL:", erro.message);
  }
});
