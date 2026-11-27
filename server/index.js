import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import pool from "./db.js";
import { HttpError } from "./erros.js";
import doadoresRoutes from "./routes/doadores.js";
import doacoesRoutes from "./routes/doacoes.js";
import itensRoutes from "./routes/itens.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set({
    "X-Request-Id": req.requestId,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-store",
  });
  next();
});
app.use(express.json({ limit: "100kb", strict: true }));

// Liveness não depende do banco; readiness verifica a dependência de persistência.
app.get("/api/health/live", (_req, res) => res.json({ status: "ok" }));
app.get("/api/health/ready", async (_req, res) => {
  await pool.execute("SELECT 1");
  return res.json({ status: "ok", database: "connected" });
});
app.get("/api/health", async (_req, res) => {
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

app.use((req, res, next) => next(new HttpError(404, "Rota não encontrada")));

app.use((erro, req, res, _next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição", requestId: req.requestId });
  }
  if (erro.type === "entity.too.large") {
    return res.status(413).json({ erro: "Corpo da requisição excede o limite permitido", requestId: req.requestId });
  }
  if (erro.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ erro: "E-mail já cadastrado ou registro duplicado", requestId: req.requestId });
  }
  if (erro.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({ erro: "Não é possível excluir este registro porque existem vínculos", requestId: req.requestId });
  }
  if (erro.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ erro: "Doador ou item não encontrado", requestId: req.requestId });
  }
  if (erro instanceof HttpError) {
    return res.status(erro.status).json({ erro: erro.message, requestId: req.requestId });
  }
  if (Number.isInteger(erro.status) && erro.status >= 400 && erro.status < 500) {
    return res.status(erro.status).json({ erro: "Requisição inválida", requestId: req.requestId });
  }
  console.error(JSON.stringify({
    level: "error",
    message: "Falha não tratada na API",
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: erro.message,
  }));
  return res.status(500).json({ erro: "Erro interno no servidor", requestId: req.requestId });
});

const servidor = app.listen(PORT, () => {
  console.log(`API executando na porta ${PORT}`);
});

async function encerrar(sinal) {
  console.log(`Recebido ${sinal}; encerrando a API...`);
  servidor.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (erro) {
      console.error("Falha ao encerrar o pool:", erro.message);
      process.exit(1);
    }
  });
}
process.once("SIGINT", () => encerrar("SIGINT"));
process.once("SIGTERM", () => encerrar("SIGTERM"));
