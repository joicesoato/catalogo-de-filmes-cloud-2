require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
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
const { registrarAuditoria } = require("./services/audit");
const { uploadObject, deleteObject, getObject, checkMinio } = require("./services/minio");

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
// Stripe exige o corpo bruto para validar a assinatura do webhook.
app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signatureHeader = req.get("stripe-signature") || "";
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado.");
    return res.status(503).json({ erro: "Webhook de pagamento não configurado." });
  }

  try {
    const timestamp = signatureHeader.match(/(?:^|,)\s*t=(\d+)/)?.[1];
    const signatures = [...signatureHeader.matchAll(/(?:^|,)\s*v1=([a-f0-9]+)/gi)].map((item) => item[1]);
    if (!timestamp || signatures.length === 0 || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ erro: "Assinatura Stripe inválida." });
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      return res.status(400).json({ erro: "Assinatura Stripe expirada." });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${req.body.toString("utf8")}`, "utf8")
      .digest();
    const valid = signatures.some((candidate) => {
      const received = Buffer.from(candidate, "hex");
      return received.length === expected.length && crypto.timingSafeEqual(received, expected);
    });
    if (!valid) return res.status(400).json({ erro: "Assinatura Stripe inválida." });

    const event = JSON.parse(req.body.toString("utf8"));
    const object = event.data?.object || {};
    const idUsuario = Number(object.metadata?.user_id || object.client_reference_id || 0);

    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const paid = object.payment_status === "paid" || object.payment_status === "no_payment_required";
      const subscriptionId = typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
      const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
      if (paid && Number.isInteger(idUsuario) && idUsuario > 0 && subscriptionId) {
        await pool.execute(
          `UPDATE usuarios
           SET premium = TRUE, stripe_customer_id = ?, stripe_subscription_id = ?, premium_updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [customerId || null, subscriptionId, idUsuario]
        );
        console.info(`Plano Premium ativado para usuário ${idUsuario}.`);
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscriptionId = object.id;
      const statusPremium = event.type !== "customer.subscription.deleted" &&
        ["active", "trialing"].includes(object.status);
      if (Number.isInteger(idUsuario) && idUsuario > 0 && subscriptionId) {
        await pool.execute(
          `UPDATE usuarios
           SET premium = ?, stripe_customer_id = ?, stripe_subscription_id = ?, premium_updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [statusPremium, typeof object.customer === "string" ? object.customer : object.customer?.id || null, subscriptionId, idUsuario]
        );
      } else if (subscriptionId) {
        await pool.execute(
          `UPDATE usuarios SET premium = ?, premium_updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = ?`,
          [statusPremium, subscriptionId]
        );
      }
    }

    return res.json({ recebido: true });
  } catch (erro) {
    console.error("Erro ao processar webhook Stripe:", erro.message);
    return res.status(400).json({ erro: "Não foi possível processar o evento Stripe." });
  }
});

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
app.use(express.static("public", { index: false }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente mais tarde." }
});

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";
const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || "http://log-service:3002";
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

function validarImagemPerfil(buffer, mimeType) {
  if (!ALLOWED_PROFILE_IMAGES.has(mimeType)) return false;
  if (!buffer || buffer.length === 0 || buffer.length > MAX_PROFILE_IMAGE_BYTES) return false;
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/gif") return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function extrairMultipart(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  const match = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundaryValue = match?.[1] || match?.[2]?.trim();
  if (!boundaryValue) return null;

  const boundary = Buffer.from(`--${boundaryValue}`);
  let cursor = buffer.indexOf(boundary);
  if (cursor < 0) return null;
  cursor += boundary.length;

  while (cursor < buffer.length) {
    // Final multipart boundary.
    if (buffer.subarray(cursor, cursor + 2).equals(Buffer.from("--"))) return null;
    if (buffer.subarray(cursor, cursor + 2).equals(Buffer.from("\r\n"))) cursor += 2;

    const nextBoundary = buffer.indexOf(boundary, cursor);
    if (nextBoundary < 0) return null;

    let part = buffer.subarray(cursor, nextBoundary);
    if (part.subarray(-2).equals(Buffer.from("\r\n"))) part = part.subarray(0, -2);

    const separator = part.indexOf(Buffer.from("\r\n\r\n"));
    if (separator >= 0) {
      const headers = part.subarray(0, separator).toString("latin1");
      const body = part.subarray(separator + 4);
      const dispositionLine = headers
        .split("\r\n")
        .find((line) => /^content-disposition:/i.test(line));
      const name = dispositionLine?.match(/(?:^|;)\s*name="([^"]*)"/i)?.[1];
      const filename = dispositionLine?.match(/(?:^|;)\s*filename="([^"]*)"/i)?.[1] || "";
      const mimeType = headers.match(/^content-type:\s*([^\r\n]+)/im)?.[1]?.trim().toLowerCase() || "";

      if (name === "foto" && filename) {
        return { name, filename, mimeType, buffer: body };
      }
    }

    cursor = nextBoundary + boundary.length;
  }

  return null;
}

function validarIdUsuario(req, res) {
  if (!/^\d+$/.test(req.params.id)) {
    res.status(400).json({ erro: "ID de usuário inválido." });
    return null;
  }
  const alvo = Number(req.params.id);
  const logado = Number(req.session.usuario.id);
  if (alvo !== logado) {
    void registrarAuditoria(req, "access_denied_403", { permissao: "profile:manage:own", usuario_alvo: alvo });
    res.status(403).json({ erro: "Você só pode editar o próprio perfil." });
    return null;
  }
  return alvo;
}

const metricas = new Map();

function enviarSwaggerUi(res, specUrl) {
  res.removeHeader("Content-Security-Policy");
  res.type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Swagger UI</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>window.onload=()=>SwaggerUIBundle({url:"${specUrl}",dom_id:"#swagger-ui",deepLinking:true,presets:[SwaggerUIBundle.presets.apis,SwaggerUIBundle.SwaggerUIStandalonePreset],layout:"BaseLayout"});</script></body></html>`);
}

app.get("/api/openapi.json", (req, res) => res.sendFile(path.join(__dirname, "docs", "openapi-app.json")));
app.get("/api/docs", (req, res) => enviarSwaggerUi(res, "/api/openapi.json"));

app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const rota = req.route?.path || req.path || "unknown";
    const chave = `${req.method} ${rota} ${res.statusCode}`;
    const atual = metricas.get(chave) || { count: 0, totalMs: 0 };
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    atual.count += 1;
    atual.totalMs += duracaoMs;
    metricas.set(chave, atual);
  });
  next();
});
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
    void registrarAuditoria(req, "login", { resultado: "sucesso" });
    res.json({ mensagem: dados.mensagem, usuario: dados.usuario });
  } catch (erro) {
    console.error("Erro ao chamar auth-service:", erro.message);
    res.status(503).json({ erro: "Serviço de autenticação indisponível." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const usuarioId = req.session.usuario?.id;
  req.session.destroy((erro) => {
    if (erro) {
      console.error("Erro ao fazer logout:", erro.message);
      return res.status(500).json({ erro: "Não foi possível fazer logout." });
    }
    res.clearCookie("connect.sid");
    if (usuarioId) void registrarAuditoria({ session: { usuario: { id: usuarioId } }, ip: req.ip }, "logout");
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

app.get("/api/profile/:id/avatar", exigirLogin, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ erro: "ID de usuário inválido." });
    }

    const usuarioId = Number(req.params.id);

    const [usuarios] = await pool.execute(
      "SELECT avatar_object_key FROM usuarios WHERE id = ?",
      [usuarioId]
    );

    if (!usuarios.length || !usuarios[0].avatar_object_key) {
      return res.status(404).json({ erro: "Foto de perfil não encontrada." });
    }

    const resposta = await getObject(usuarios[0].avatar_object_key);

    res.setHeader(
      "Content-Type",
      resposta.headers.get("content-type") || "application/octet-stream"
    );

    const buffer = Buffer.from(await resposta.arrayBuffer());
    res.send(buffer);
  } catch (erro) {
    console.error("Erro ao carregar avatar:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar a foto de perfil." });
  }
});

app.get("/api/profile/:id", exigirLogin, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: "ID de usuário inválido." });
    const usuarioId = Number(req.params.id);
    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, role, bio, avatar_object_key, premium, criado_em
       FROM usuarios WHERE id = ?`,
      [usuarioId]
    );
    if (!usuarios.length) return res.status(404).json({ erro: "Perfil não encontrado." });

    const [favoritos] = await pool.execute(
      `SELECT id, tmdb_movie_id, titulo, poster_path, criado_em
       FROM favoritos WHERE usuario_id = ? ORDER BY criado_em DESC`,
      [usuarioId]
    );
    const usuario = usuarios[0];
    const dono = Number(usuario.id) === Number(req.session.usuario.id);
    res.json({
      perfil: {
        id: usuario.id,
        nome: usuario.nome,
        ...(dono ? { email: usuario.email } : {}),
        role: usuario.role,
        premium: Boolean(usuario.premium),
        bio: usuario.bio || "",
        avatar_url: usuario.avatar_object_key
          ? `/api/profile/${usuario.id}/avatar`
          : null,
        criado_em: usuario.criado_em
      },
      favoritos
    });
  } catch (erro) {
    console.error("Erro ao buscar perfil:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar o perfil." });
  }
});

app.patch("/api/profile/:id", exigirLogin, async (req, res) => {
  try {
    const usuarioId = validarIdUsuario(req, res);
    if (!usuarioId) return;

    const nome = typeof req.body.nome === "string" ? req.body.nome.trim() : "";
    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
    if (nome.length < 2 || nome.length > 100) {
      return res.status(400).json({ erro: "O nome deve ter entre 2 e 100 caracteres." });
    }
    if (bio.length > 280) {
      return res.status(400).json({ erro: "A bio pode ter no máximo 280 caracteres." });
    }

    await pool.execute(
      `UPDATE usuarios SET nome = ?, bio = ? WHERE id = ?`,
      [nome, bio || null, usuarioId]
    );
    req.session.usuario.nome = nome;
    void registrarAuditoria(req, "profile_update", { usuario_id: usuarioId });
    res.json({ mensagem: "Perfil atualizado com sucesso." });
  } catch (erro) {
    console.error("Erro ao atualizar perfil:", erro.message);
    res.status(500).json({ erro: "Não foi possível atualizar o perfil." });
  }
});

app.post(
  "/api/profile/:id/avatar",
  exigirLogin,
  express.raw({ type: "multipart/form-data", limit: "5.5mb" }),
  async (req, res) => {
  try {
    const usuarioId = validarIdUsuario(req, res);
    if (!usuarioId) return;

    const arquivo = extrairMultipart(req.body, req.get("content-type") || "");
    if (!arquivo || arquivo.name !== "foto" || !arquivo.filename) {
      return res.status(400).json({ erro: "Envie uma imagem no campo foto." });
    }
    if (!validarImagemPerfil(arquivo.buffer, arquivo.mimeType)) {
      return res.status(400).json({ erro: "Apenas imagens JPEG, PNG, WEBP ou GIF de até 5 MB são aceitas." });
    }

    const extensao = ALLOWED_PROFILE_IMAGES.get(arquivo.mimeType);
    const objectKey = `profiles/${usuarioId}/${crypto.randomUUID()}.${extensao}`;
    const [usuarios] = await pool.execute(
      "SELECT avatar_object_key FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    const avatarAnterior = usuarios[0]?.avatar_object_key || null;

    await uploadObject(objectKey, arquivo.buffer, arquivo.mimeType);
    try {
      await pool.execute(
        "UPDATE usuarios SET avatar_object_key = ? WHERE id = ?",
        [objectKey, usuarioId]
      );
    } catch (erroBanco) {
      await deleteObject(objectKey).catch(() => {});
      throw erroBanco;
    }

    if (avatarAnterior && avatarAnterior !== objectKey) {
      await deleteObject(avatarAnterior).catch((erro) => console.error("Erro ao remover avatar anterior:", erro.message));
    }

    res.status(201).json({
      mensagem: "Foto de perfil atualizada.",
      avatar_url: `/api/profile/${usuarioId}/avatar`
    });
  } catch (erro) {
    console.error("Erro no upload do perfil:", erro.message);
    res.status(500).json({ erro: "Não foi possível salvar a foto de perfil." });
  }
});

// Cria uma Checkout Session no Stripe. Os dados do cartão são coletados somente pelo Stripe.
app.post("/api/premium/checkout", exigirLogin, async (req, res) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripeSecret || !priceId) {
    return res.status(503).json({ erro: "Checkout indisponível: configure STRIPE_SECRET_KEY e STRIPE_PRICE_ID." });
  }

  try {
    const usuarioId = Number(req.session.usuario.id);
    const [rows] = await pool.execute(
      "SELECT id, nome, email, premium FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    if (!rows.length) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (Boolean(rows[0].premium)) return res.status(409).json({ erro: "Este usuário já possui o Plano Premium." });

    const baseUrl = String(process.env.APP_URL || "").replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(baseUrl)) {
      return res.status(500).json({ erro: "APP_URL precisa ser uma URL pública válida." });
    }

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", priceId);
    form.set("line_items[0][quantity]", "1");
    form.set("success_url", `${baseUrl}/profile/${usuarioId}?premium=success`);
    form.set("cancel_url", `${baseUrl}/profile/${usuarioId}?premium=cancelled`);
    form.set("client_reference_id", String(usuarioId));
    form.set("customer_email", rows[0].email);
    form.set("metadata[user_id]", String(usuarioId));
    form.set("subscription_data[metadata][user_id]", String(usuarioId));

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form,
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok || !data.url) {
      console.error("Stripe Checkout falhou:", data.error?.message || response.status);
      return res.status(502).json({ erro: "Não foi possível iniciar o checkout do Stripe. Verifique a configuração do plano." });
    }

    void registrarAuditoria(req, "premium_checkout_created", { checkout_session_id: data.id });
    return res.json({ url: data.url });
  } catch (erro) {
    console.error("Erro ao criar checkout Stripe:", erro.message);
    return res.status(502).json({ erro: "Não foi possível conectar ao Stripe." });
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
    void registrarAuditoria(req, "favorite_add", { tmdb_movie_id: Number(tmdb_movie_id), titulo: titulo.trim() });
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
    void registrarAuditoria(req, "favorite_remove", { favorito_id: Number(req.params.id) });
    res.json({ mensagem: "Favorito removido." });
  } catch (erro) {
    console.error("Erro ao remover favorito:", erro.message);
    res.status(500).json({ erro: "Não foi possível remover o favorito." });
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
    void registrarAuditoria(req, "comment_create", { comentario_id: resultado.insertId, tmdb_movie_id: Number(tmdb_movie_id) });
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
      if (!autorizacao.permitido) {
        void registrarAuditoria(req, "access_denied_403", { permissao: "comments:delete:any", comentario_id: Number(comentarioId) });
        return res.status(403).json({ erro: "Acesso negado" });
      }
    }

    const [resultado] = await pool.execute("DELETE FROM comentarios WHERE id = ?", [comentarioId]);
    if (!resultado.affectedRows) return res.status(404).json({ erro: "Comentário não encontrado." });
    void registrarAuditoria(req, "comment_delete", { comentario_id: Number(comentarioId) });
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

app.get("/api/admin/logs", exigirPermissao("admin:moderate"), async (req, res) => {
  try {
    const limite = Math.min(Math.max(Number.parseInt(req.query.limit || "50", 10), 1), 100);
    const resposta = await fetch(`${LOG_SERVICE_URL}/logs?limit=${limite}`, {
      headers: { "X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET || "" },
      signal: AbortSignal.timeout(3000)
    });
    const dados = await resposta.json();
    res.status(resposta.status).json(dados);
  } catch (erro) {
    console.error("Erro ao consultar auditoria:", erro.message);
    res.status(503).json({ erro: "Serviço de logs indisponível." });
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
  const dependencias = {};
  let pronto = true;

  try {
    await pool.query("SELECT 1");
    dependencias.database = "ok";
  } catch {
    dependencias.database = "indisponivel";
    pronto = false;
  }

  for (const [nome, url] of [["auth_service", `${AUTH_SERVICE_URL}/health`], ["log_service", `${LOG_SERVICE_URL}/health`]]) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(2000) });
      dependencias[nome] = resposta.ok ? "ok" : "indisponivel";
      if (!resposta.ok) pronto = false;
    } catch {
      dependencias[nome] = "indisponivel";
      pronto = false;
    }
  }

  try {
    dependencias.minio = (await checkMinio()) ? "ok" : "indisponivel";
    if (dependencias.minio !== "ok") pronto = false;
  } catch {
    dependencias.minio = "indisponivel";
    pronto = false;
  }

  res.status(pronto ? 200 : 503).json({
    status: pronto ? "ok" : "erro",
    servico: "catalogo",
    dependencias
  });
});

app.get("/metrics", (req, res) => {
  const linhas = [
    "# HELP http_requests_total Total de requisições HTTP por método, rota e status.",
    "# TYPE http_requests_total counter"
  ];

  for (const [chave, valor] of metricas.entries()) {
    const [metodo, ...resto] = chave.split(" ");
    const status = resto.pop();
    const rota = resto.join(" ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    linhas.push(`http_requests_total{method="${metodo}",route="${rota}",status="${status}"} ${valor.count}`);
  }

  linhas.push("# HELP http_request_duration_ms_sum Soma da duração das requisições em milissegundos.");
  linhas.push("# TYPE http_request_duration_ms_sum counter");
  for (const [chave, valor] of metricas.entries()) {
    const [metodo, ...resto] = chave.split(" ");
    const status = resto.pop();
    const rota = resto.join(" ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    linhas.push(`http_request_duration_ms_sum{method="${metodo}",route="${rota}",status="${status}"} ${valor.totalMs.toFixed(2)}`);
  }

  res.type("text/plain").send(`${linhas.join("\n")}\n`);
});

const frontendDist = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendDist, { index: false }));
app.get(/^(?!\/api(?:\/|$)|\/health$|\/metrics$).*/, (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
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
