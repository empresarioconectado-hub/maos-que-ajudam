import "dotenv/config";
import express from "express";
import pool from "./db.js";
import { HttpError } from "./erros.js";
import doadoresRoutes from "./routes/doadores.js";
import doacoesRoutes from "./routes/doacoes.js";
import itensRoutes from "./routes/itens.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (req, res) => {
  const [rows] = await pool.execute("SELECT 1 AS conectado");

  return res.json({
    status: "ok",
    database: rows[0].conectado === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/doadores", doadoresRoutes);
app.use("/api/itens", itensRoutes);
app.use("/api/doacoes", doacoesRoutes);

// Resposta padronizada para endpoints inexistentes.
app.use((req, res, next) => {
  next(new HttpError(404, "Rota não encontrada"));
});

// Tratamento centralizado: nao expõe SQL, credenciais ou stack trace ao cliente.
app.use((erro, req, res, _next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({
      erro: "JSON inválido no corpo da requisição",
    });
  }

  if (erro.type === "entity.too.large") {
    return res.status(413).json({
      erro: "Corpo da requisição excede o limite permitido",
    });
  }

  if (erro.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      erro: "E-mail já cadastrado ou registro duplicado",
    });
  }

  if (erro.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({
      erro: "Não é possível excluir este registro porque existem vínculos",
    });
  }

  if (erro.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      erro: "Doador ou item não encontrado",
    });
  }

  if (erro instanceof HttpError) {
    return res.status(erro.status).json({ erro: erro.message });
  }

  if (Number.isInteger(erro.status) && erro.status >= 400 && erro.status < 500) {
    return res.status(erro.status).json({
      erro: "Requisição inválida",
    });
  }

  console.error("Erro interno:", erro);
  return res.status(500).json({
    erro: "Erro interno no servidor",
  });
});

app.listen(PORT, () => {
  console.log("API executando em http://localhost:" + PORT);
});
