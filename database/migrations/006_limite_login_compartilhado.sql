-- Migration 006: controle compartilhado de tentativas de login.
-- A chave é HMAC do endereço de origem; o IP bruto não é persistido.
USE maos_que_ajudam;

CREATE TABLE IF NOT EXISTS limite_login (
  chave CHAR(64) NOT NULL PRIMARY KEY,
  tentativas INT UNSIGNED NOT NULL DEFAULT 0,
  janela_inicio DATETIME NOT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_limite_login_janela (janela_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
