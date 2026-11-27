import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/itens - catálogo utilizado no formulário de doação.
router.get("/", async (req, res) => {
  const [itens] = await pool.execute(
    "SELECT i.id_item, i.nome, i.unidade, " +
    "c.id_categoria, c.nome AS categoria " +
    "FROM item i " +
    "INNER JOIN categoria c ON c.id_categoria = i.id_categoria " +
    "ORDER BY c.nome ASC, i.nome ASC"
  );

  return res.json(itens);
});

export default router;
