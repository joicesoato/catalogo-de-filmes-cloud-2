require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

const PORT = process.env.AUTH_PORT || 3001;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 2525),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Teste
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true, service: "auth-service" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false });
  }
});

// Cadastro
app.post("/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, email e senha são obrigatórios.",
      });
    }

    const [existente] = await db.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        erro: "E-mail já cadastrado.",
      });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const [resultado] = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role)
       VALUES (?, ?, ?, 'usuario')`,
      [nome, email, senha_hash]
    );

    res.status(201).json({
      mensagem: "Usuário criado com sucesso.",
      usuario_id: resultado.insertId,
    });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(500).json({ erro: "Erro interno no cadastro." });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const [usuarios] = await db.query(
      "SELECT id, nome, email, senha_hash, role FROM usuarios WHERE email = ?",
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const usuario = usuarios[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    res.json({
      mensagem: "Login realizado com sucesso.",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ erro: "Erro interno no login." });
  }
});

// Solicitar recuperação de senha
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const [usuarios] = await db.query(
      "SELECT id, nome, email FROM usuarios WHERE email = ?",
      [email]
    );

    // Não revela se o e-mail existe
    if (usuarios.length === 0) {
      return res.json({
        mensagem: "Se o e-mail existir, um link será enviado.",
      });
    }

    const usuario = usuarios[0];

    const token = crypto.randomBytes(32).toString("hex");

    await db.query(
      `INSERT INTO reset_tokens
       (token, usuario_id, criado_em, expira_em, usado)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE), FALSE)`,
      [token, usuario.id]
    );

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const link = `${appUrl}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: usuario.email,
      subject: "Recuperação de senha - Catálogo Tom Hanks",
      text: `Olá, ${usuario.nome}!

Clique no link abaixo para redefinir sua senha:

${link}

Este link expira em 30 minutos e só pode ser usado uma vez.`,
    });

    res.json({
      mensagem: "Se o e-mail existir, um link será enviado.",
    });
  } catch (error) {
    console.error("Erro na recuperação:", error);
    res.status(500).json({
      erro: "Erro ao solicitar recuperação de senha.",
    });
  }
});

// Redefinir senha
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