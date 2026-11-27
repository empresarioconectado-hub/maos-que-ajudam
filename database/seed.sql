-- Dados iniciais opcionais para desenvolvimento e testes.
-- Pode ser executado mais de uma vez sem duplicar categorias/itens.
USE maos_que_ajudam;

INSERT IGNORE INTO categoria (nome)
VALUES ('Alimento'), ('Higiene'), ('Vestuário');

-- Doador fictício para testes locais; INSERT IGNORE evita duplicação por e-mail.
INSERT IGNORE INTO doador (nome, email, telefone)
VALUES ('Ana Souza', 'ana.souza@exemplo.com', NULL);

INSERT INTO item (id_categoria, nome, unidade)
SELECT c.id_categoria, dados.nome, dados.unidade
FROM (
  SELECT 'Alimento' AS categoria, 'Arroz 5 kg' AS nome, 'pacote' AS unidade
  UNION ALL SELECT 'Alimento', 'Feijão 1 kg', 'pacote'
  UNION ALL SELECT 'Alimento', 'Macarrão 500 g', 'pacote'
  UNION ALL SELECT 'Higiene', 'Sabonete', 'unidade'
  UNION ALL SELECT 'Higiene', 'Creme dental', 'unidade'
  UNION ALL SELECT 'Higiene', 'Shampoo', 'unidade'
  UNION ALL SELECT 'Vestuário', 'Camiseta', 'unidade'
  UNION ALL SELECT 'Vestuário', 'Calça', 'unidade'
  UNION ALL SELECT 'Vestuário', 'Meias', 'par'
) AS dados
INNER JOIN categoria c ON c.nome = dados.categoria
WHERE NOT EXISTS (
  SELECT 1
  FROM item i
  WHERE i.id_categoria = c.id_categoria
    AND i.nome = dados.nome
);
