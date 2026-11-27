-- Migration 003: contas de acesso e perfis.
-- Segura para reexecução; não cria usuário ou senha padrão.
USE maos_que_ajudam;

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'operador',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_email (email),
  CONSTRAINT chk_usuario_perfil CHECK (perfil IN ('administrador', 'operador')),
  CONSTRAINT chk_usuario_ativo CHECK (ativo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vincula os novos eventos de auditoria à conta autenticada, preservando
-- registros históricos caso uma conta seja removida posteriormente.
SET @col_auditoria_usuario = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'auditoria'
    AND COLUMN_NAME = 'id_usuario'
);
SET @sql_auditoria_usuario = IF(
  @col_auditoria_usuario = 0,
  'ALTER TABLE auditoria ADD COLUMN id_usuario INT NULL, ADD KEY idx_auditoria_usuario (id_usuario)',
  'SELECT 1'
);
PREPARE stmt_auditoria_usuario FROM @sql_auditoria_usuario;
EXECUTE stmt_auditoria_usuario;
DEALLOCATE PREPARE stmt_auditoria_usuario;

SET @fk_auditoria_usuario = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'auditoria'
    AND CONSTRAINT_NAME = 'fk_auditoria_usuario'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql_fk_auditoria_usuario = IF(
  @fk_auditoria_usuario = 0,
  'ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_fk_auditoria_usuario FROM @sql_fk_auditoria_usuario;
EXECUTE stmt_fk_auditoria_usuario;
DEALLOCATE PREPARE stmt_fk_auditoria_usuario;
