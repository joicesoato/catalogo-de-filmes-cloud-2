const AUTH_SERVICE_URL =
	process.env.AUTH_SERVICE_URL || "http://auth-service:3001";

function exigirLogin(req, res, next) {
	if (!req.session.usuario || !req.session.authToken) {
		return res.status(401).json({
			erro: "Você precisa estar logado."
		});
	}

	next();
}

async function consultarPermissao(req, permissao) {
	if (!req.session.usuario || !req.session.authToken) {
		return { status: 401, permitido: false };
	}

	const resposta = await fetch(`${AUTH_SERVICE_URL}/authorize`, {
				headers: {
					Authorization: `Bearer ${req.session.authToken}`,
					"X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET || ""
				}
			});

	if (!resposta.ok) {
		return { status: resposta.status === 401 ? 401 : 503, permitido: false };
	}

	const dados = await resposta.json();
	return {
		status: 200,
		permitido: dados.permissoes?.includes(permissao),
		dados
	};
}

function exigirPermissao(permissao) {
	return async (req, res, next) => {
		try {
			const resultado = await consultarPermissao(req, permissao);

			if (resultado.status === 401) {
				return res.status(401).json({ erro: "Você precisa estar logado." });
			}

			if (!resultado.permitido) {
				return res.status(403).json({ erro: "Acesso negado" });
			}

			req.autorizacao = resultado.dados;
			next();
		} catch (erro) {
			console.error("Erro ao consultar autorização:", erro.message);
			res.status(503).json({ erro: "Serviço de autorização indisponível." });
		}
	};
}

module.exports = { exigirLogin, exigirPermissao, consultarPermissao };
