require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const app = express();

const PORT = process.env.PORT || 3000;

// ===============================
// CONFIGURAÇÃO DO BANCO
// ===============================

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

// ===============================
// MIDDLEWARES
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

app.use(express.static("public"));

// ===============================
// FUNÇÃO PARA VERIFICAR LOGIN
// ===============================

function exigirLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({
      erro: "Você precisa estar logado."
    });
  }

  next();
}

// ===============================
// TMDB
// ===============================

async function buscarTomHanks() {
  const token = process.env.TMDB_API_KEY;

  if (!token) {
    throw new Error("TMDB_API_KEY não configurada.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    accept: "application/json"
  };

  // 1. Encontrar Tom Hanks
  const pessoaResponse = await fetch(
    "https://api.themoviedb.org/3/search/person?query=Tom%20Hanks&language=pt-BR",
    {
      headers
    }
  );

  if (!pessoaResponse.ok) {
    throw new Error(
      `Erro ao buscar Tom Hanks na TMDB: ${pessoaResponse.status}`
    );
  }

  const pessoaData = await pessoaResponse.json();

  const pessoa = pessoaData.results?.find(
    (item) => item.name?.toLowerCase() === "tom hanks"
  );

  if (!pessoa) {
    throw new Error("Tom Hanks não encontrado na TMDB.");
  }

  // 2. Buscar filmes de Tom Hanks
  const filmesResponse = await fetch(
    `https://api.themoviedb.org/3/person/${pessoa.id}/movie_credits?language=pt-BR`,
    {
      headers
    }
  );

  if (!filmesResponse.ok) {
    throw new Error(
      `Erro ao buscar filmes de Tom Hanks: ${filmesResponse.status}`
    );
  }

  const filmesData = await filmesResponse.json();

  // 3. Preparar os dados para o frontend
  return (filmesData.cast || [])
    .filter((filme) => filme.id && filme.title)
    .sort((a, b) => {
      const dataA = a.release_date || "";
      const dataB = b.release_date || "";

      return dataB.localeCompare(dataA);
    })
    .map((filme) => ({
      id: filme.id,
      titulo: filme.title,
      sinopse: filme.overview || "Sinopse não disponível.",
      poster: filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : null,
      poster_path: filme.poster_path,
      data_lancamento: filme.release_date || null
    }));
}

// ===============================
// CADASTRO
// ===============================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, email e senha são obrigatórios."
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        erro: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const [usuarios] = await pool.execute(
      "SELECT id FROM usuarios WHERE email = ?",
      [emailNormalizado]
    );

    if (usuarios.length > 0) {
      return res.status(409).json({
        erro: "Este email já está cadastrado."
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await pool.execute(
      `INSERT INTO usuarios (nome, email, senha_hash)
       VALUES (?, ?, ?)`,
      [nome.trim(), emailNormalizado, senhaHash]
    );

    req.session.usuario = {
      id: resultado.insertId,
      nome: nome.trim(),
      email: emailNormalizado
    };

    res.status(201).json({
      mensagem: "Cadastro realizado com sucesso.",
      usuario: req.session.usuario
    });
  } catch (erro) {
    console.error("Erro no cadastro:", erro);

    res.status(500).json({
      erro: "Erro interno ao realizar cadastro."
    });
  }
});

// ===============================
// LOGIN
// ===============================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: "Email e senha são obrigatórios."
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, senha_hash
       FROM usuarios
       WHERE email = ?`,
      [emailNormalizado]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        erro: "Email ou senha incorretos."
      });
    }

    const usuario = usuarios[0];

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

    if (!senhaValida) {
      return res.status(401).json({
        erro: "Email ou senha incorretos."
      });
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email
    };

    res.json({
      mensagem: "Login realizado com sucesso.",
      usuario: req.session.usuario
    });
  } catch (erro) {
    console.error("Erro no login:", erro);

    res.status(500).json({
      erro: "Erro interno ao realizar login."
    });
  }
});

// ===============================
// LOGOUT
// ===============================

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((erro) => {
    if (erro) {
      console.error("Erro ao fazer logout:", erro);

      return res.status(500).json({
        erro: "Não foi possível fazer logout."
      });
    }

    res.clearCookie("connect.sid");

    res.json({
      mensagem: "Logout realizado com sucesso."
    });
  });
});

// ===============================
// USUÁRIO LOGADO
// ===============================

app.get("/api/auth/me", (req, res) => {
  if (!req.session.usuario) {
    return res.json({
      logado: false
    });
  }

  res.json({
    logado: true,
    usuario: req.session.usuario
  });
});

// ===============================
// FILMES DO TOM HANKS
// ===============================

app.get("/api/movies", exigirLogin, async (req, res) => {
  try {
    const filmes = await buscarTomHanks();

    res.json({
      filmes
    });
  } catch (erro) {
    console.error("Erro TMDB:", erro);

    res.status(500).json({
      erro: "Não foi possível carregar os filmes da TMDB."
    });
  }
});

// ===============================
// FAVORITOS DO USUÁRIO LOGADO
// ===============================

app.get("/api/favorites", exigirLogin, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    const [favoritos] = await pool.execute(
      `SELECT
        id,
        tmdb_movie_id,
        titulo,
        poster_path,
        criado_em
       FROM favoritos
       WHERE usuario_id = ?
       ORDER BY criado_em DESC`,
      [usuarioId]
    );

    res.json({
      favoritos
    });
  } catch (erro) {
    console.error("Erro ao buscar favoritos:", erro);

    res.status(500).json({
      erro: "Não foi possível carregar seus favoritos."
    });
  }
});

// ===============================
// ADICIONAR FAVORITO
// ===============================

app.post("/api/favorites", exigirLogin, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    const {
      tmdb_movie_id,
      titulo,
      poster_path
    } = req.body;

    if (!tmdb_movie_id || !titulo) {
      return res.status(400).json({
        erro: "ID e título do filme são obrigatórios."
      });
    }

    await pool.execute(
      `INSERT INTO favoritos
        (usuario_id, tmdb_movie_id, titulo, poster_path)
       VALUES (?, ?, ?, ?)`,
      [
        usuarioId,
        tmdb_movie_id,
        titulo,
        poster_path || null
      ]
    );

    res.status(201).json({
      mensagem: "Filme adicionado aos favoritos."
    });
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        erro: "Este filme já está nos seus favoritos."
      });
    }

    console.error("Erro ao adicionar favorito:", erro);

    res.status(500).json({
      erro: "Não foi possível adicionar o favorito."
    });
  }
});

// ===============================
// REMOVER FAVORITO
// ===============================

app.delete(
  "/api/favorites/:id",
  exigirLogin,
  async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      const favoritoId = req.params.id;

      const [resultado] = await pool.execute(
        `DELETE FROM favoritos
         WHERE id = ?
         AND usuario_id = ?`,
        [favoritoId, usuarioId]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          erro: "Favorito não encontrado."
        });
      }

      res.json({
        mensagem: "Favorito removido."
      });
    } catch (erro) {
      console.error("Erro ao remover favorito:", erro);

      res.status(500).json({
        erro: "Não foi possível remover o favorito."
      });
    }
  }
);

// ===============================
// COMENTÁRIOS
// ===============================

app.get(
  "/api/comments/:movieId",
  exigirLogin,
  async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      const movieId = req.params.movieId;

      const [comentarios] = await pool.execute(
        `SELECT
          id,
          tmdb_movie_id,
          texto,
          criado_em
         FROM comentarios
         WHERE usuario_id = ?
         AND tmdb_movie_id = ?
         ORDER BY criado_em DESC`,
        [usuarioId, movieId]
      );

      res.json({
        comentarios
      });
    } catch (erro) {
      console.error("Erro ao buscar comentários:", erro);

      res.status(500).json({
        erro: "Não foi possível carregar os comentários."
      });
    }
  }
);

// ===============================
// ADICIONAR COMENTÁRIO
// ===============================

app.post(
  "/api/comments",
  exigirLogin,
  async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;

      const {
        tmdb_movie_id,
        texto
      } = req.body;

      if (!tmdb_movie_id || !texto?.trim()) {
        return res.status(400).json({
          erro: "Filme e comentário são obrigatórios."
        });
      }

      const [resultado] = await pool.execute(
        `INSERT INTO comentarios
          (usuario_id, tmdb_movie_id, texto)
         VALUES (?, ?, ?)`,
        [
          usuarioId,
          tmdb_movie_id,
          texto.trim()
        ]
      );

      res.status(201).json({
        mensagem: "Comentário salvo.",
        id: resultado.insertId
      });
    } catch (erro) {
      console.error("Erro ao adicionar comentário:", erro);

      res.status(500).json({
        erro: "Não foi possível salvar o comentário."
      });
    }
  }
);

// ===============================
// REMOVER COMENTÁRIO
// ===============================

app.delete(
  "/api/comments/:id",
  exigirLogin,
  async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      const comentarioId = req.params.id;

      const [resultado] = await pool.execute(
        `DELETE FROM comentarios
         WHERE id = ?
         AND usuario_id = ?`,
        [comentarioId, usuarioId]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          erro: "Comentário não encontrado."
        });
      }

      res.json({
        mensagem: "Comentário removido."
      });
    } catch (erro) {
      console.error("Erro ao remover comentário:", erro);

      res.status(500).json({
        erro: "Não foi possível remover o comentário."
      });
    }
  }
);

// ===============================
// TESTE DA CONEXÃO COM O BANCO
// ===============================

async function testarBanco() {
  try {
    const conexao = await pool.getConnection();

    console.log("Conexão com o MariaDB/MySQL realizada com sucesso.");

    conexao.release();
  } catch (erro) {
    console.error(
      "Não foi possível conectar ao MariaDB/MySQL:",
      erro.message
    );
  }
}

// ===============================
// INICIAR SERVIDOR
// ===============================

app.listen(PORT, async () => {
  console.log(`Site disponível em http://localhost:${PORT}`);

  await testarBanco();
});