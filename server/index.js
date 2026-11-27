import "dotenv/config";
import app from "./app.js";
import pool from "./db.js";

const PORT = Number(process.env.PORT || 3000);
if (typeof process.env.AUTH_SECRET !== "string" || Buffer.byteLength(process.env.AUTH_SECRET) < 32) {
  throw new Error("Configure AUTH_SECRET com ao menos 32 bytes antes de iniciar a API");
}
if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT deve ser um inteiro entre 1 e 65535");
}

const servidor = app.listen(PORT, () => {
  console.log(`API executando na porta ${PORT}`);
});

let encerrando = false;
async function encerrar(sinal) {
  if (encerrando) return;
  encerrando = true;
  console.log(`Recebido ${sinal}; encerrando a API...`);
  servidor.close(async erro => {
    try {
      if (erro) throw erro;
      await pool.end();
      process.exitCode = 0;
    } catch (falha) {
      console.error("Falha ao encerrar a API:", falha.message);
      process.exitCode = 1;
    }
  });
}
process.once("SIGINT", () => encerrar("SIGINT"));
process.once("SIGTERM", () => encerrar("SIGTERM"));
