-- Migration 005: sessões revogáveis por dispositivo.
-- Segura para reexecução e compatível com MariaDB 10.11 / MySQL 8.
USE maos_que_ajudam;

CREATE TABLE IF NOT EXISTS sessao_usuario (
  id_sessao CHAR(36) NOT NULL PRIMARY KEY,
  id_usuario INT NOT NULL,
  expira_em DATETIME NOT NULL,
  revogado_em DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
  KEY idx_sessao_usuario_expiracao (id_usuario, expira_em),
  KEY idx_sessao_expiracao (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
