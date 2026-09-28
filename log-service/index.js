const express = require("express");
const helmet = require("helmet");
const { createClient } = require("redis");

const app = express();
const PORT = Number(process.env.LOG_PORT || 3002);
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || "";
const STREAM = "audit:events";
const MAX_EVENTS = 5000;

const redis = createClient({ url: REDIS_URL });
redis.on("error", (erro) => console.error("Redis:", erro.message));

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false, referrerPolicy: { policy: "same-origin" } }));
app.use(express.json({ limit: "10kb" }));

function autorizado(req) {
  return Boolean(INTERNAL_SERVICE_SECRET) &&
    req.get("X-Internal-Secret") === INTERNAL_SERVICE_SECRET;
}

function inteiroPositivo(valor, fallback = 50, max = 100) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero < 1) return fallback;
  return Math.min(numero, max);
}

function camposParaObjeto(id, campos) {
  const detalhes = campos.detalhes ? JSON.parse(campos.detalhes) : {};
  return {
    id,
    usuario_id: campos.usuario_id ? Number(campos.usuario_id) : null,
    acao: campos.acao,
    timestamp: campos.timestamp,
    ip: campos.ip || null,
    detalhes
  };
}

app.get("/health", async (req, res) => {
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.ping();
    res.json({ status: "ok", servico: "log-service", redis: "ok" });
  } catch (erro) {
    res.status(503).json({ status: "erro", servico: "log-service", redis: "indisponivel" });
  }
});

app.post("/events", async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: "Não autorizado." });

  const { usuario_id, acao, ip, detalhes } = req.body || {};
  if ((usuario_id !== null && usuario_id !== undefined && !Number.isInteger(Number(usuario_id))) ||
      typeof acao !== "string" || !acao.trim() || acao.length > 120) {
    return res.status(400).json({ erro: "Evento de auditoria inválido." });
  }

  try {
    if (!redis.isOpen) await redis.connect();
    await redis.xAdd(STREAM, "*", {
      usuario_id: usuario_id == null ? "" : String(Number(usuario_id)),
      acao: acao.trim(),
      timestamp: new Date().toISOString(),
      ip: typeof ip === "string" ? ip.slice(0, 64) : "",
      detalhes: JSON.stringify(detalhes && typeof detalhes === "object" ? detalhes : {})
    }, { TRIM: { strategy: "MAXLEN", strategyModifier: "~", threshold: MAX_EVENTS } });

    res.status(202).json({ mensagem: "Evento registrado." });
  } catch (erro) {
    console.error("Erro ao registrar evento:", erro.message);
    res.status(503).json({ erro: "Serviço de logs indisponível." });
  }
});

app.get("/logs", async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: "Não autorizado." });

  const limite = inteiroPositivo(req.query.limit);
  try {
    if (!redis.isOpen) await redis.connect();
    const entradas = await redis.xRevRange(STREAM, "+", "-", { COUNT: limite });
    const logs = entradas.map(({ id, message }) => camposParaObjeto(id, message));
    res.json({ logs });
  } catch (erro) {
    console.error("Erro ao consultar logs:", erro.message);
    res.status(503).json({ erro: "Serviço de logs indisponível." });
  }
});

async function iniciar() {
  await redis.connect();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Log Service disponível na porta ${PORT}`);
  });
}

iniciar().catch((erro) => {
  console.error("Não foi possível iniciar o log-service:", erro.message);
  process.exit(1);
});
