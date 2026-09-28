const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || "http://log-service:3002";
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || "";

async function registrarAuditoria(req, acao, detalhes = {}) {
  const usuarioId = req?.session?.usuario?.id ?? null;

  try {
    const resposta = await fetch(`${LOG_SERVICE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_SERVICE_SECRET
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        acao,
        ip: req?.ip || null,
        detalhes
      }),
      signal: AbortSignal.timeout(1500)
    });

    if (!resposta.ok) {
      console.error("Falha ao registrar auditoria:", resposta.status);
    }
  } catch (erro) {
    // Auditoria não deve impedir a operação principal da aplicação.
    console.error("Log de auditoria indisponível:", erro.message);
  }
}

module.exports = { registrarAuditoria };
