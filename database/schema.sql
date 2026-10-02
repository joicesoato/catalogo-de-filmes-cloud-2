CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'usuario',
    bio VARCHAR(280) NULL,
    avatar_object_key VARCHAR(500) NULL,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    token_verificacao CHAR(64),
    verificacao_expira_em TIMESTAMP NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
