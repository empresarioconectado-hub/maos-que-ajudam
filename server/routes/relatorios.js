import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/resumo", async (_req, res) => {
  const [[doadores]] = await pool.execute("SELECT COUNT(*) AS total FROM doador");
  const [[itens]] = await pool.execute("SELECT COUNT(*) AS total FROM item");
  const [[doacoes]] = await pool.execute(
    "SELECT COUNT(*) AS total, " +
    "SUM(status = 'registrada') AS registradas, " +
    "SUM(status = 'recebida') AS recebidas, " +
    "SUM(status = 'distribuida') AS distribuidas, " +
    "SUM(status = 'cancelada') AS canceladas FROM doacao"
  );
  const [[estoque]] = await pool.execute(
    "SELECT COALESCE(SUM(quantidade_atual), 0) AS unidades FROM estoque"
  );
  return res.json({
    doadores: Number(doadores.total),
    itens_catalogo: Number(itens.total),
    doacoes: {
      total: Number(doacoes.total || 0),
      registradas: Number(doacoes.registradas || 0),
      recebidas: Number(doacoes.recebidas || 0),
      distribuidas: Number(doacoes.distribuidas || 0),
      canceladas: Number(doacoes.canceladas || 0),
    },
    unidades_em_estoque: Number(estoque.unidades),
  });
});

function campoCsv(valor) {
  let texto = String(valor ?? "");
  // Evita que planilhas interpretem conteúdo fornecido pelo usuário como fórmula.
  if (/^[=+@-]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}

router.get("/doacoes.csv", async (_req, res) => {
  const [rows] = await pool.execute(
    "SELECT d.id_doacao, d.data_doacao, d.status, dr.nome AS doador, " +
    "i.nome AS item, di.quantidade, i.unidade " +
    "FROM doacao d INNER JOIN doador dr ON dr.id_doador = d.id_doador " +
    "INNER JOIN doacao_item di ON di.id_doacao = d.id_doacao " +
    "INNER JOIN item i ON i.id_item = di.id_item " +
    "ORDER BY d.data_doacao DESC, d.id_doacao DESC, i.nome"
  );
  const linhas = [
    ["ID da doação", "Data", "Status", "Doador", "Item", "Quantidade", "Unidade"].join(";"),
    ...rows.map(row => [
      row.id_doacao, row.data_doacao, row.status, row.doador,
      row.item, row.quantidade, row.unidade,
    ].map(campoCsv).join(";")),
  ];
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="relatorio-doacoes.csv"',
  });
  return res.send("\uFEFF" + linhas.join("\r\n"));
});

export default router;
