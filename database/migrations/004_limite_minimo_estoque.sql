-- Migration 004: limites mínimos de estoque e alertas.
-- Segura para reexecução em MariaDB 10.11+.
USE maos_que_ajudam;

SET @col_minimo_existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estoque'
    AND COLUMN_NAME = 'quantidade_minima'
);
SET @sql_minimo = IF(
  @col_minimo_existe = 0,
  'ALTER TABLE estoque ADD COLUMN quantidade_minima INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt_minimo FROM @sql_minimo;
EXECUTE stmt_minimo;
DEALLOCATE PREPARE stmt_minimo;

SET @chk_minimo_existe = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estoque'
    AND CONSTRAINT_NAME = 'chk_estoque_quantidade_minima'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @sql_chk_minimo = IF(
  @chk_minimo_existe = 0,
  'ALTER TABLE estoque ADD CONSTRAINT chk_estoque_quantidade_minima CHECK (quantidade_minima >= 0)',
  'SELECT 1'
);
PREPARE stmt_chk_minimo FROM @sql_chk_minimo;
EXECUTE stmt_chk_minimo;
DEALLOCATE PREPARE stmt_chk_minimo;
