import { Router } from "express";
import pool from "../db.js";
import { HttpError } from "../erros.js";
import { normalizarDoador, validarDoador } from "../validacao.js";

const router = Router();

function validarId(valor) {
  if (!/^[1-9]\d*$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) ? id : null;
}

const CAMPOS_DOADOR =
  "id_doador, nome, email, telefone, data_cadastro";

// GET /api/doadores
router.get("/", async (req, res) => {
  const [doadores] = await pool.execute(
    "SELECT " + CAMPOS_DOADOR + " FROM doador ORDER BY nome ASC"
  );

  return res.json(doadores);
});

// GET /api/doadores/:id
router.get("/:id", async (req, res) => {
  const id = validarId(req.params.id);
  if (!id) throw new HttpError(400, "ID inválido");

  const [doadores] = await pool.execute(
    "SELECT " + CAMPOS_DOADOR + " FROM doador WHERE id_doador = ?",
    [id]
  );

  if (doadores.length === 0) {
    throw new HttpError(404, "Doador não encontrado");
  }

  return res.json(doadores[0]);
});

// POST /api/doadores
router.post("/", async (req, res) => {
  const mensagemErro = validarDoador(req.body);
  if (mensagemErro) throw new HttpError(400, mensagemErro);

  const dados = normalizarDoador(req.body);

  const [resultado] = await pool.execute(
    "INSERT INTO doador (nome, email, telefone) VALUES (?, ?, ?)",
    [dados.nome, dados.email, dados.telefone]
  );

  const [doadores] = await pool.execute(
    "SELECT " + CAMPOS_DOADOR + " FROM doador WHERE id_doador = ?",
    [resultado.insertId]
  );

  return res.status(201).json(doadores[0]);
});

// PUT /api/doadores/:id
router.put("/:id", async (req, res) => {
  const id = validarId(req.params.id);
  if (!id) throw new HttpError(400, "ID inválido");

  const mensagemErro = validarDoador(req.body);
  if (mensagemErro) throw new HttpError(400, mensagemErro);

  const [existentes] = await pool.execute(
    "SELECT id_doador FROM doador WHERE id_doador = ?",
    [id]
  );

  if (existentes.length === 0) {
    throw new HttpError(404, "Doador não encontrado");
  }

  const dados = normalizarDoador(req.body);

  await pool.execute(
    "UPDATE doador SET nome = ?, email = ?, telefone = ? WHERE id_doador = ?",
    [dados.nome, dados.email, dados.telefone, id]
  );

  const [doadores] = await pool.execute(
    "SELECT " + CAMPOS_DOADOR + " FROM doador WHERE id_doador = ?",
    [id]
  );

  return res.json(doadores[0]);
});

// DELETE /api/doadores/:id
router.delete("/:id", async (req, res) => {
  const id = validarId(req.params.id);
  if (!id) throw new HttpError(400, "ID inválido");

  const [resultado] = await pool.execute(
    "DELETE FROM doador WHERE id_doador = ?",
    [id]
  );

  if (resultado.affectedRows === 0) {
    throw new HttpError(404, "Doador não encontrado");
  }

  return res.status(204).end();
});

export default router;
