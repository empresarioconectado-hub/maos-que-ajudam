import { Router } from "express";
import pool from "../db.js";
import { HttpError } from "../erros.js";
import { exigirPerfil } from "../auth.js";

const router = Router();
const MAX_INT = 2147483647;

function validarId(valor) {
  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id <= MAX_INT ? id : null;
}

router.get("/", async (_req, res) => {
  const [rows] = await pool.execute(
    "SELECT i.id_item, i.nome, i.unidade, c.nome AS categoria, " +
    "COALESCE(e.quantidade_atual, 0) AS quantidade_atual, " +
    "COALESCE(e.quantidade_minima, 0) AS quantidade_minima, " +
    "CASE WHEN COALESCE(e.quantidade_minima, 0) > 0 " +
    "AND COALESCE(e.quantidade_atual, 0) <= e.quantidade_minima THEN 1 ELSE 0 END AS estoque_baixo, " +
    "e.atualizado_em " +
    "FROM item i INNER JOIN categoria c ON c.id_categoria = i.id_categoria " +
    "LEFT JOIN estoque e ON e.id_item = i.id_item " +
    "ORDER BY c.nome, i.nome"
  );
  return res.json(rows);
});

router.get("/movimentacoes", async (req, res) => {
  const limiteTexto = req.query.limit;
  const limite = limiteTexto === undefined ? 50 : Number(limiteTexto);
  if ((limiteTexto !== undefined && (typeof limiteTexto !== "string" || !/^[1-9]\d*$/.test(limiteTexto))) || !Number.isSafeInteger(limite) || limite < 1 || limite > 200) {
    throw new HttpError(400, "O parâmetro limit deve ser um inteiro entre 1 e 200");
  }
  const [rows] = await pool.execute(
    "SELECT m.id_movimentacao, m.id_item, i.nome AS nome_item, i.unidade, " +
    "m.tipo, m.quantidade, m.origem, m.id_referencia, m.observacao, m.criado_em " +
    "FROM movimentacao_estoque m INNER JOIN item i ON i.id_item = m.id_item " +
    "ORDER BY m.criado_em DESC, m.id_movimentacao DESC LIMIT ?",
    [limite]
  );
  return res.json(rows);
});

// Ajustes manuais são restritos a administradores e deixam movimentação e auditoria.
router.post("/movimentacoes", exigirPerfil("administrador"), async (req, res) => {
  const { id_item, tipo, quantidade, observacao } = req.body ?? {};
  if (!Number.isSafeInteger(id_item) || id_item < 1 || id_item > MAX_INT) {
    throw new HttpError(400, "Informe um item válido");
  }
  if (!["entrada", "saida"].includes(tipo)) {
    throw new HttpError(400, "Tipo de movimentação deve ser entrada ou saida");
  }
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > MAX_INT) {
    throw new HttpError(400, "A quantidade deve ser um inteiro positivo dentro do limite permitido");
  }
  if (observacao !== undefined && observacao !== null &&
      (typeof observacao !== "string" || observacao.trim().length > 255)) {
    throw new HttpError(400, "A observação deve ter até 255 caracteres");
  }

  const conexao = await pool.getConnection();
  let iniciou = false;
  try {
    await conexao.beginTransaction();
    iniciou = true;
    const [itens] = await conexao.execute(
      "SELECT id_item FROM item WHERE id_item = ? FOR UPDATE", [id_item]
    );
    if (!itens.length) throw new HttpError(404, "Item não encontrado");

    await conexao.execute(
      "INSERT INTO estoque (id_item, quantidade_atual) VALUES (?, 0) " +
      "ON DUPLICATE KEY UPDATE id_item = VALUES(id_item)",
      [id_item]
    );
    const [estoques] = await conexao.execute(
      "SELECT quantidade_atual FROM estoque WHERE id_item = ? FOR UPDATE", [id_item]
    );
    const saldoAtual = Number(estoques[0].quantidade_atual);
    if (tipo === "saida" && saldoAtual < quantidade) {
      throw new HttpError(409, "Estoque insuficiente para esta saída");
    }
    if (tipo === "entrada" && saldoAtual > MAX_INT - quantidade) {
      throw new HttpError(409, "A entrada excede a capacidade numérica do estoque");
    }

    const delta = tipo === "entrada" ? quantidade : -quantidade;
    const saldoNovo = saldoAtual + delta;
    await conexao.execute(
      "UPDATE estoque SET quantidade_atual = quantidade_atual + ? WHERE id_item = ?",
      [delta, id_item]
    );
    await conexao.execute(
      "INSERT INTO movimentacao_estoque (id_item, tipo, quantidade, origem, observacao) " +
      "VALUES (?, ?, ?, 'ajuste_manual', ?)",
      [id_item, tipo, quantidade, observacao?.trim() || null]
    );
    await conexao.execute(
      "INSERT INTO auditoria (entidade, id_entidade, acao, detalhes, id_usuario) " +
      "VALUES ('estoque', ?, 'ajuste_manual', ?, ?)",
      [id_item, JSON.stringify({ tipo, quantidade, saldo_anterior: saldoAtual, saldo_novo: saldoNovo, observacao: observacao?.trim() || null }), req.usuario.id_usuario]
    );
    await conexao.commit();
    iniciou = false;
    return res.status(201).json({ id_item, tipo, quantidade, quantidade_atual: saldoNovo });
  } catch (erro) {
    if (iniciou) {
      try { await conexao.rollback(); } catch (rollbackError) {
        console.error("Falha ao reverter ajuste de estoque:", rollbackError.message);
      }
    }
    throw erro;
  } finally {
    conexao.release();
  }
});

// Define o limite de alerta; zero desativa o alerta para o item.
router.patch("/:id/limite-minimo", exigirPerfil("administrador"), async (req, res) => {
  const id = validarId(req.params.id);
  if (!id) throw new HttpError(400, "ID do item inválido");
  const { quantidade_minima } = req.body ?? {};
  if (!Number.isSafeInteger(quantidade_minima) || quantidade_minima < 0 || quantidade_minima > MAX_INT) {
    throw new HttpError(400, "A quantidade mínima deve ser um inteiro entre zero e o limite permitido");
  }

  const conexao = await pool.getConnection();
  let iniciou = false;
  try {
    await conexao.beginTransaction();
    iniciou = true;
    const [itens] = await conexao.execute("SELECT id_item FROM item WHERE id_item = ? FOR UPDATE", [id]);
    if (!itens.length) throw new HttpError(404, "Item não encontrado");
    await conexao.execute(
      "INSERT INTO estoque (id_item, quantidade_atual, quantidade_minima) VALUES (?, 0, ?) " +
      "ON DUPLICATE KEY UPDATE quantidade_minima = VALUES(quantidade_minima)",
      [id, quantidade_minima]
    );
    await conexao.execute(
      "INSERT INTO auditoria (entidade, id_entidade, acao, detalhes, id_usuario) " +
      "VALUES ('estoque', ?, 'limite_minimo_alterado', ?, ?)",
      [id, JSON.stringify({ quantidade_minima }), req.usuario.id_usuario]
    );
    const [[estoque]] = await conexao.execute(
      "SELECT quantidade_atual, quantidade_minima FROM estoque WHERE id_item = ?", [id]
    );
    await conexao.commit();
    iniciou = false;
    return res.json({ id_item: id, ...estoque });
  } catch (erro) {
    if (iniciou) {
      try { await conexao.rollback(); } catch (rollbackError) {
        console.error("Falha ao reverter limite mínimo:", rollbackError.message);
      }
    }
    throw erro;
  } finally {
    conexao.release();
  }
});

export default router;
