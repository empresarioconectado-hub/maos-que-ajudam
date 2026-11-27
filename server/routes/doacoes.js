import { Router } from "express";
import pool from "../db.js";
import { HttpError } from "../erros.js";
import { validarDoacao } from "../validacao.js";

const router = Router();

// GET /api/doacoes - lista doações, doadores e itens relacionados.
router.get("/", async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT d.id_doacao, d.data_doacao, d.observacao, " +
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
        doador: {
          id_doador: row.id_doador,
          nome: row.nome_doador,
        },
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

// POST /api/doacoes - grava doação e itens na mesma transação.
router.post("/", async (req, res) => {
  const mensagemErro = validarDoacao(req.body);
  if (mensagemErro) throw new HttpError(400, mensagemErro);

  const { id_doador, data_doacao, observacao, itens } = req.body;
  const conexao = await pool.getConnection();
  let transacaoIniciada = false;

  try {
    await conexao.beginTransaction();
    transacaoIniciada = true;

    const [resultado] = await conexao.execute(
      "INSERT INTO doacao (id_doador, data_doacao, observacao) " +
      "VALUES (?, ?, ?)",
      [id_doador, data_doacao, observacao ? observacao.trim() : null]
    );

    const idDoacao = resultado.insertId;

    for (const item of itens) {
      await conexao.execute(
        "INSERT INTO doacao_item (id_doacao, id_item, quantidade) " +
        "VALUES (?, ?, ?)",
        [idDoacao, item.id_item, item.quantidade]
      );
    }

    await conexao.commit();
    transacaoIniciada = false;

    return res.status(201).json({
      mensagem: "Doação registrada com sucesso",
      id_doacao: idDoacao,
    });
  } catch (error) {
    if (transacaoIniciada) {
      try {
        await conexao.rollback();
      } catch (erroRollback) {
        console.error("Falha ao reverter transação:", erroRollback.message);
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

export default router;
