-- Atividade 6 — Perfil e foto de usuário
-- Preserva os usuários existentes e adiciona apenas os dados do perfil.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS bio VARCHAR(280) NULL AFTER role,
  ADD COLUMN IF NOT EXISTS avatar_object_key VARCHAR(500) NULL AFTER bio;
