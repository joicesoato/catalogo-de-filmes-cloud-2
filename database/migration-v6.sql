-- Atividade 7 — Plano Premium com Stripe em modo de teste.
-- Aplicar uma única vez no banco já existente; preserva usuários e dados.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS premium_updated_at TIMESTAMP NULL;
