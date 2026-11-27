import { Router } from "express";
import pool from "../db.js";
import { HttpError } from "../erros.js";
import { validarDoacao } from "../validacao.js";
import { validarTransicaoStatus } from "../regras-doacao.js";

const router = Router();
const STATUS_VALIDOS = new Set(["recebida", "distribuida", "cancelada"]);

router.get("/", async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT d.id_doacao, d.data_doacao, d.observacao, d.status, " +
    "dr.id_doador, dr.nome AS nome_doador, " +
    "i.id_item, i.nome AS nome_item, i.unidade, di.quantidade " +
    "FROM doacao d " +
    "INNER JOIN doador dr ON dr.id_doador = d.id_doador " +
    "LEFT JOIN doacao_item di ON di.id_doacao = d.id_doacao " +
    "LEFT JOIN item i ON i.id_item = di.id_item " +
    "ORDER BY d.data_doacao DESC, d.id_doacao DESC, i.nome ASC"
  );

  const doacoes = new Map();
  for (const row of rows) {
    if (!doacoes.has(row.id_doacao)) {
      doacoes.set(row.id_doacao, {
        id_doacao: row.id_doacao,
        data_doacao: row.data_doacao,
        observacao: row.observacao,
        status: row.status,
        doador: { id_doador: row.id_doador, nome: row.nome_doador },
        itens: [],
      });
    }
    if (row.id_item !== null) {
      doacoes.get(row.id_doacao).itens.push({
        id_item: row.id_item,
        nome: row.nome_item,
        quantidade: row.quantidade,
        unidade: row.unidade,
      });
    }
  }
  return res.json(Array.from(doacoes.values()));
});

router.post("/", async (req, res) => {
  const mensagemErro = validarDoacao(req.body);
  if (mensagemErro) throw new HttpError(400, mensagemErro);

  const { id_doador, data_doacao, observacao, itens } = req.body;
  const conexao = await pool.getConnection();
  let iniciou = false;
  try {
    await conexao.beginTransaction();
    iniciou = true;
    const [resultado] = await conexao.execute(
      "INSERT INTO doacao (id_doador, data_doacao, observacao, status) VALUES (?, ?, ?, 'registrada')",
      [id_doador, data_doacao, observacao?.trim() || null]
    );
    const idDoacao = resultado.insertId;

    for (const item of itens) {
      await conexao.execute(
        "INSERT INTO doacao_item (id_doacao, id_item, quantidade) VALUES (?, ?, ?)",
        [idDoacao, item.id_item, item.quantidade]
      );
    }

    await conexao.execute(
      "INSERT INTO auditoria (entidade, id_entidade, acao, detalhes) VALUES ('doacao', ?, 'criada', ?)",
      [idDoacao, JSON.stringify({ id_doador, quantidade_itens: itens.length })]
    );
    await conexao.commit();
    iniciou = false;
    return res.status(201).json({
      mensagem: "Doação registrada com sucesso",
      id_doacao: idDoacao,
      status: "registrada",
    });
  } catch (error) {
    if (iniciou) {
      try { await conexao.rollback(); } catch (rollbackError) {
        console.error("Falha ao reverter transação:", rollbackError.message);
      }
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new HttpError(400, "Doador ou item não encontrado");
    }
    throw error;
  } finally {
    conexao.release();
  }
});

// Transições válidas: registrada -> recebida/cancelada; recebida -> distribuida.
// A movimentação do estoque e a auditoria são confirmadas na mesma transação.
router.patch("/:id/status", async (req, res) => {
  const idTexto = req.params.id;
  const id = Number(idTexto);
  if (!/^[1-9]\d*$/.test(idTexto) || !Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "ID da doação inválido");
  const { status } = req.body ?? {};
  if (!STATUS_VALIDOS.has(status)) {
    throw new HttpError(400, "Status inválido. Utilize recebida, distribuida ou cancelada");
  }

  const conexao = await pool.getConnection();
  let iniciou = false;
  try {
    await conexao.beginTransaction();
    iniciou = true;
    const [doacoes] = await conexao.execute(
      "SELECT id_doacao, status FROM doacao WHERE id_doacao = ? FOR UPDATE", [id]
    );
    if (!doacoes.length) throw new HttpError(404, "Doação não encontrada");
    const atual = doacoes[0].status;
    validarTransicaoStatus(atual, status);

    const [itens] = await conexao.execute(
      "SELECT id_item, quantidade FROM doacao_item WHERE id_doacao = ? ORDER BY id_item FOR UPDATE", [id]
    );
    if (status !== "cancelada" && itens.length === 0) {
      throw new HttpError(409, "Não é possível avançar uma doação sem itens registrados");
    }
    if (status === "recebida" || status === "distribuida") {
      for (const item of itens) {
        await conexao.execute(
          "INSERT INTO estoque (id_item, quantidade_atual) VALUES (?, 0) ON DUPLICATE KEY UPDATE id_item = VALUES(id_item)",
          [item.id_item]
        );
        const [estoques] = await conexao.execute(
          "SELECT quantidade_atual FROM estoque WHERE id_item = ? FOR UPDATE", [item.id_item]
        );
        if (status === "distribuida" && estoques[0].quantidade_atual < item.quantidade) {
          throw new HttpError(409, `Estoque insuficiente para o item ${item.id_item}`);
        }
        const delta = status === "recebida" ? item.quantidade : -item.quantidade;
        await conexao.execute(
          "UPDATE estoque SET quantidade_atual = quantidade_atual + ? WHERE id_item = ?",
          [delta, item.id_item]
        );
        await conexao.execute(
          "INSERT INTO movimentacao_estoque (id_item, tipo, quantidade, origem, id_referencia) VALUES (?, ?, ?, 'doacao', ?)",
          [item.id_item, status === "recebida" ? "entrada" : "saida", item.quantidade, id]
        );
      }
    }

    await conexao.execute("UPDATE doacao SET status = ? WHERE id_doacao = ?", [status, id]);
    await conexao.execute(
      "INSERT INTO auditoria (entidade, id_entidade, acao, detalhes) VALUES ('doacao', ?, 'status_alterado', ?)",
      [id, JSON.stringify({ anterior: atual, novo: status })]
    );
    await conexao.commit();
    iniciou = false;
    return res.json({ id_doacao: id, status });
  } catch (error) {
    if (iniciou) {
      try { await conexao.rollback(); } catch (rollbackError) {
        console.error("Falha ao reverter transação:", rollbackError.message);
      }
    }
    throw error;
  } finally {
    conexao.release();
  }
});

export default router;
