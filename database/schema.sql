-- Projeto Integrador Extensionista II - Mãos que Ajudam
-- Modelo relacional da Aula 2 (MySQL/MariaDB).
-- Script inicial nao destrutivo: nao apaga banco nem registros existentes.
-- Para banco novo, execute este arquivo com um usuario autorizado a criar banco.

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS maos_que_ajudam
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE maos_que_ajudam;

CREATE TABLE IF NOT EXISTS doador (
  id_doador INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(100) NULL,
  telefone VARCHAR(20) NULL,
  data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doador_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS limite_login (
  chave CHAR(64) NOT NULL PRIMARY KEY,
  tentativas INT UNSIGNED NOT NULL DEFAULT 0,
  janela_inicio DATETIME NOT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_limite_login_janela (janela_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(60) NOT NULL,
  UNIQUE KEY uq_categoria_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  unidade VARCHAR(20) NOT NULL DEFAULT 'unidade',
  UNIQUE KEY uq_item_categoria_nome (id_categoria, nome),
  CONSTRAINT fk_item_categoria
    FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doacao (
  id_doacao INT AUTO_INCREMENT PRIMARY KEY,
  id_doador INT NOT NULL,
  data_doacao DATE NOT NULL,
  observacao VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'registrada',
  CONSTRAINT chk_doacao_status CHECK (status IN ('registrada', 'recebida', 'distribuida', 'cancelada')),
  CONSTRAINT fk_doacao_doador
    FOREIGN KEY (id_doador) REFERENCES doador (id_doador)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_doacao_data (data_doacao),
  KEY idx_doacao_doador (id_doador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doacao_item (
  id_doacao INT NOT NULL,
  id_item INT NOT NULL,
  quantidade INT NOT NULL,
  PRIMARY KEY (id_doacao, id_item),
  CONSTRAINT chk_doacao_item_quantidade CHECK (quantidade > 0),
  CONSTRAINT fk_doacao_item_doacao
    FOREIGN KEY (id_doacao) REFERENCES doacao (id_doacao)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_doacao_item_item
    FOREIGN KEY (id_item) REFERENCES item (id_item)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_doacao_item_item (id_item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relacionamentos:
-- doador 1:N doacao
-- categoria 1:N item
-- doacao N:N item, resolvido pela tabela associativa doacao_item.


-- Estruturas complementares de gestão operacional.
CREATE TABLE IF NOT EXISTS estoque (
  id_item INT PRIMARY KEY,
  quantidade_atual INT NOT NULL DEFAULT 0,
  quantidade_minima INT NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_estoque_quantidade CHECK (quantidade_atual >= 0),
  CONSTRAINT chk_estoque_quantidade_minima CHECK (quantidade_minima >= 0),
  CONSTRAINT fk_estoque_item FOREIGN KEY (id_item) REFERENCES item (id_item) ON UPDATE CASCADE ON DELETE RESTRICT
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
  CONSTRAINT fk_movimentacao_item FOREIGN KEY (id_item) REFERENCES item (id_item) ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_movimentacao_item_data (id_item, criado_em),
  KEY idx_movimentacao_referencia (origem, id_referencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
  entidade VARCHAR(50) NOT NULL,
  id_entidade BIGINT NOT NULL,
  acao VARCHAR(50) NOT NULL,
  detalhes JSON NULL,
  id_usuario INT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auditoria_entidade (entidade, id_entidade),
  KEY idx_auditoria_data (criado_em),
  KEY idx_auditoria_usuario (id_usuario),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO estoque (id_item, quantidade_atual)
SELECT id_item, 0 FROM item
ON DUPLICATE KEY UPDATE id_item = VALUES(id_item);
