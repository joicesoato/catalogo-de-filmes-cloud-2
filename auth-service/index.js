require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = process.env.AUTH_PORT || 3001;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || "chave-temporaria";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

// CADASTRO
app.post("/register", async (req, res) => {
  try {
    const nome = req.body.nome?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const senha = req.body.senha;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, e-mail e senha são obrigatórios."
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        erro: "A senha deve ter pelo menos 6 caracteres."
      });
    }

    const [existentes] = await pool.execute(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        erro: "Este e-mail já está cadastrado."
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const tokenVerificacao = crypto.randomBytes(32).toString("hex");

    const [resultado] = await pool.execute(
      `INSERT INTO usuarios
       (nome, email, senha_hash, role, email_verificado, token_verificacao, verificacao_expira_em)
       VALUES (?, ?, ?, 'usuario', FALSE, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
      [nome, email, senhaHash, tokenVerificacao]
    );

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const linkVerificacao =
      `${appUrl}/api/auth/verify-email?token=${tokenVerificacao}`;

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Confirme seu cadastro - Catálogo de Filmes",
        html: `
          <h2>Confirme seu e-mail</h2>

          <p>Olá, ${nome}!</p>

          <p>
            Seu cadastro no <strong>Catálogo de Filmes</strong> foi realizado.
          </p>

          <p>
            Para ativar sua conta, clique no botão abaixo:
          </p>

          <p>
            <a href="${linkVerificacao}"
               style="
                 display:inline-block;
                 padding:12px 20px;
                 background:#000;
                 color:#fff;
                 text-decoration:none;
                 border-radius:6px;
               ">
              Confirmar meu e-mail
            </a>
          </p>

          <p>
            Este link é válido por <strong>30 minutos</strong>.
          </p>

          <p>
            Se você não realizou este cadastro, ignore este e-mail.
          </p>
        `
      });
    } catch (erroEmail) {
      console.error("Erro ao enviar confirmação:", erroEmail);

      // Remove o usuário se o e-mail não puder ser enviado
      await pool.execute(
        "DELETE FROM usuarios WHERE id = ?",
        [resultado.insertId]
      );

      return res.status(500).json({
        erro: "Não foi possível enviar o e-mail de confirmação."
      });
    }

    res.status(201).json({
      mensagem:
        "Cadastro realizado! Enviamos um e-mail de confirmação. Clique no link recebido para ativar sua conta.",
      usuario: {
        id: resultado.insertId,
        nome,
        email,
        role: "usuario"
      }
    });

  } catch (erro) {
    console.error("Erro no cadastro:", erro);

    res.status(500).json({
      erro: "Erro interno ao realizar cadastro."
    });
  }
});

// CONFIRMAR E-MAIL
app.get("/verify-email", async (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).send("Token de verificação não informado.");
    }

    const [usuarios] = await pool.execute(
      `SELECT id
       FROM usuarios
       WHERE token_verificacao = ?
       AND email_verificado = FALSE
       AND verificacao_expira_em > NOW()`,
      [token]
    );

    if (usuarios.length === 0) {
      return res.status(400).send(`
        <h2>Link inválido ou expirado</h2>
        <p>O link de confirmação é inválido, já foi utilizado ou expirou.</p>
      `);
    }

    await pool.execute(
      `UPDATE usuarios
       SET email_verificado = TRUE,
           token_verificacao = NULL,
           verificacao_expira_em = NULL
       WHERE id = ?`,
      [usuarios[0].id]
    );

    res.json({
      mensagem: "E-mail confirmado com sucesso."
    });

  } catch (erro) {
    console.error("Erro na confirmação:", erro);

    res.status(500).send(
      "Erro interno ao confirmar o e-mail."
    );
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, senha_hash, role, email_verificado
      FROM usuarios
      WHERE email = ?`,
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        erro: "E-mail ou senha inválidos."
      });
    }

    const usuario = usuarios[0];

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

    if (!senhaValida) {
      return res.status(401).json({
        erro: "E-mail ou senha inválidos."
      });
    }

    if (!usuario.email_verificado) {
      return res.status(403).json({
        erro: "E-mail ainda não confirmado. Verifique sua caixa de entrada."
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      mensagem: "Login realizado com sucesso.",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (erro) {
    console.error("Erro no login:", erro);
    res.status(500).json({ erro: "Erro interno no login." });
  }
});

// VALIDAR TOKEN
app.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        erro: "Token não informado."
      });
    }

    const token = auth.substring(7);
    const dados = jwt.verify(token, JWT_SECRET);

    res.json({
      autenticado: true,
      usuario: dados
    });
  } catch (erro) {
    res.status(401).json({
      erro: "Token inválido ou expirado."
    });
  }
});

// ESQUECI A SENHA
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        erro: "Informe o e-mail."
      });
    }

    const [usuarios] = await pool.execute(
      "SELECT id, nome, email FROM usuarios WHERE email = ?",
      [email]
    );

    // Não revela se o e-mail existe
    if (usuarios.length === 0) {
      return res.json({
        mensagem: "Se o e-mail estiver cadastrado, um link será enviado."
      });
    }

    const usuario = usuarios[0];

    const token = crypto.randomBytes(32).toString("hex");

    await pool.execute(
      `INSERT INTO reset_tokens
       (token, usuario_id, criado_em, expira_em, usado)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE), FALSE)`,
      [token, usuario.id]
    );

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const link = `${appUrl}/reset-password.html?token=${token}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: usuario.email,
      subject: "Recuperação de senha - Catálogo de Filmes",
      html: `
        <h2>Recuperação de senha</h2>
        <p>Olá, ${usuario.nome}!</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>O link abaixo é válido por <strong>30 minutos</strong> e pode ser usado apenas uma vez.</p>
        <p>
          <a href="${link}">Redefinir minha senha</a>
        </p>
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
      `
    });

    res.json({
      mensagem: "Se o e-mail estiver cadastrado, um link será enviado."
    });
  } catch (erro) {
    console.error("Erro na recuperação:", erro);
    res.status(500).json({
      erro: "Erro ao enviar e-mail de recuperação."
    });
  }
});

// REDEFINIR SENHA
app.post("/reset-password", async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({
        erro: "Token e nova senha são obrigatórios."
      });
    }

    const [tokens] = await pool.execute(
      `SELECT usuario_id
       FROM reset_tokens
       WHERE token = ?
       AND usado = FALSE
       AND expira_em > NOW()`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        erro: "Token inválido, expirado ou já utilizado."
      });
    }

    const reset = tokens[0];

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await pool.execute(
      "UPDATE usuarios SET senha_hash = ? WHERE id = ?",
      [senhaHash, reset.usuario_id]
    );

    await pool.execute(
      "UPDATE reset_tokens SET usado = TRUE WHERE token = ?",
      [token]
    );

    res.json({
      mensagem: "Senha alterada com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao redefinir senha:", erro);
    res.status(500).json({
      erro: "Erro ao redefinir senha."
    });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      servico: "auth-service"
    });
  } catch {
    res.status(500).json({
      status: "erro"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Auth Service disponível na porta ${PORT}`);
});
