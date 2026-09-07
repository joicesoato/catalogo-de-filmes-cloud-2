CREATE TABLE IF NOT EXISTS comentario_denuncias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comentario_id INT NOT NULL,
    denunciante_id INT NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pendente', 'ignorada', 'resolvida') NOT NULL DEFAULT 'pendente',
    analisado_em TIMESTAMP NULL,
    analisado_por INT NULL,
    FOREIGN KEY (comentario_id) REFERENCES comentarios(id) ON DELETE CASCADE,
    FOREIGN KEY (denunciante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (analisado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE KEY unica_denuncia_status (comentario_id, denunciante_id, status),
    INDEX idx_denuncias_comentario (comentario_id),
    INDEX idx_denuncias_denunciante (denunciante_id),
    INDEX idx_denuncias_status (status),
    INDEX idx_denuncias_criado (criado_em)
);