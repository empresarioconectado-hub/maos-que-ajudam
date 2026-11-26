-- ============================================================
-- PROJETO INTEGRADOR EXTENSIONISTA II
-- ONG: Mãos que Ajudam
-- Arquivo: database/schema.sql
-- Banco de dados: maos_que_ajudam
-- SGBD: MySQL / MariaDB
--
-- ATENCAO: este script apaga e recria o banco informado.
-- Execute apenas em ambiente de desenvolvimento/testes.
-- ============================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS maos_que_ajudam;

CREATE DATABASE maos_que_ajudam
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE maos_que_ajudam;

-- ============================================================
-- TABELA: doador
-- Cadastro minimo de pessoas que realizam doacoes.
-- ============================================================

CREATE TABLE doador (
    id_doador INT AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(150) NULL,
    telefone VARCHAR(20) NULL,

    PRIMARY KEY (id_doador),
    UNIQUE KEY uq_doador_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: categoria
-- Classificacao dos itens recebidos pela ONG.
-- ============================================================

CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NULL,

    PRIMARY KEY (id_categoria),
    UNIQUE KEY uq_categoria_nome (nome)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: item
-- Cada item pertence a uma categoria (categoria 1:N item).
-- ============================================================

CREATE TABLE item (
    id_item INT AUTO_INCREMENT,
    id_categoria INT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(255) NULL,
    unidade VARCHAR(30) NOT NULL DEFAULT 'unidade',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id_item),
    UNIQUE KEY uq_item_nome_categoria (nome, id_categoria),

    CONSTRAINT fk_item_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: doacao
-- Cada doacao pertence a um doador (doador 1:N doacao).
-- O historico impede a exclusao de doadores vinculados.
-- ============================================================

CREATE TABLE doacao (
    id_doacao INT AUTO_INCREMENT,
    id_doador INT NOT NULL,
    data_doacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'registrada',

    PRIMARY KEY (id_doacao),

    CONSTRAINT chk_doacao_status
        CHECK (status IN ('registrada', 'recebida', 'cancelada')),

    CONSTRAINT fk_doacao_doador
        FOREIGN KEY (id_doador)
        REFERENCES doador (id_doador)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA ASSOCIATIVA: doacao_item
-- Resolve o relacionamento N:N entre doacao e item.
-- A quantidade e um atributo do relacionamento.
-- Os itens da doacao sao excluidos se a doacao for excluida.
-- O cadastro do item e preservado para proteger o historico.
-- ============================================================

CREATE TABLE doacao_item (
    id_doacao INT NOT NULL,
    id_item INT NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (id_doacao, id_item),

    CONSTRAINT chk_doacao_item_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT fk_doacao_item_doacao
        FOREIGN KEY (id_doacao)
        REFERENCES doacao (id_doacao)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_doacao_item_item
        FOREIGN KEY (id_item)
        REFERENCES item (id_item)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
