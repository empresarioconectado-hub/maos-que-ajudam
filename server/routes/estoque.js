import { Router } from "express";
import pool from "../db.js";
import { HttpError } from "../erros.js";

const router = Router();

router.get("/", async (_req, res) => {
  const [rows] = await pool.execute(
    "SELECT i.id_item, i.nome, i.unidade, c.nome AS categoria, " +
    "COALESCE(e.quantidade_atual, 0) AS quantidade_atual, e.atualizado_em " +
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

export default router;
