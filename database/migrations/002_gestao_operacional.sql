-- Migration 002: gestão operacional de estoque, status e auditoria.
-- Compatível com a versão anterior do schema e segura para reexecução.
-- Faça backup antes de aplicar em uma base com dados persistentes.
USE maos_que_ajudam;

-- O schema atual já pode conter a coluna e a constraint. A verificação no
-- catálogo evita falhas por duplicidade e permite executar a migração novamente.
SET @col_status_existe = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'doacao'
    AND COLUMN_NAME = 'status'
);
SET @sql_status = IF(
  @col_status_existe = 0,
  'ALTER TABLE doacao ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''registrada''',
  'SELECT 1'
);
PREPARE stmt_status FROM @sql_status;
EXECUTE stmt_status;
DEALLOCATE PREPARE stmt_status;

SET @chk_status_existe = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'doacao'
    AND CONSTRAINT_NAME = 'chk_doacao_status'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @sql_chk_status = IF(
  @chk_status_existe = 0,
  'ALTER TABLE doacao ADD CONSTRAINT chk_doacao_status CHECK (status IN (''registrada'', ''recebida'', ''distribuida'', ''cancelada''))',
  'SELECT 1'
);
PREPARE stmt_chk_status FROM @sql_chk_status;
EXECUTE stmt_chk_status;
DEALLOCATE PREPARE stmt_chk_status;

CREATE TABLE IF NOT EXISTS estoque (
  id_item INT PRIMARY KEY,
  quantidade_atual INT NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_estoque_quantidade CHECK (quantidade_atual >= 0),
  CONSTRAINT fk_estoque_item FOREIGN KEY (id_item)
    REFERENCES item (id_item) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimentacao_estoque (
  id_movimentacao BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_item INT NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  quantidade INT NOT NULL,
  origem VARCHAR(30) NOT NULL,
  id_referencia INT NULL,
  observacao VARCHAR(255) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_movimentacao_tipo CHECK (tipo IN ('entrada', 'saida')),
  CONSTRAINT chk_movimentacao_quantidade CHECK (quantidade > 0),
  CONSTRAINT fk_movimentacao_item FOREIGN KEY (id_item)
    REFERENCES item (id_item) ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_movimentacao_item_data (id_item, criado_em),
  KEY idx_movimentacao_referencia (origem, id_referencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
  entidade VARCHAR(50) NOT NULL,
  id_entidade BIGINT NOT NULL,
  acao VARCHAR(50) NOT NULL,
  detalhes JSON NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auditoria_entidade (entidade, id_entidade),
  KEY idx_auditoria_data (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inicializa somente os itens sem saldo cadastrado; não zera estoque existente.
INSERT IGNORE INTO estoque (id_item, quantidade_atual)
SELECT id_item, 0 FROM item;
