import test from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
import pool from "../server/db.js";

test("API integra cadastro, recebimento, estoque, distribuição e auditoria", async t => {
  if (process.env.TEST_DATABASE !== "1") {
    t.skip("Defina TEST_DATABASE=1 e configure um banco descartável para executar a integração");
    return;
  }

  const servidor = app.listen(0);
  await new Promise(resolve => servidor.once("listening", resolve));
  t.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  });

  const base = `http://127.0.0.1:${servidor.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };

  const health = await request("/api/health/ready");
  assert.equal(health.status, 200);
  assert.equal(health.body.database, "connected");

  const email = `integracao-${Date.now()}@exemplo.test`;
  const cadastro = await request("/api/doadores", {
    method: "POST",
    body: JSON.stringify({ nome: "Doador de Integração", email }),
  });
  assert.equal(cadastro.status, 201);
  const idDoador = cadastro.body.id_doador;

  const doacao = await request("/api/doacoes", {
    method: "POST",
    body: JSON.stringify({
      id_doador: idDoador,
      data_doacao: new Date().toISOString().slice(0, 10),
      observacao: "Teste automatizado",
      itens: [{ id_item: 1, quantidade: 2 }],
    }),
  });
  assert.equal(doacao.status, 201);
  assert.equal(doacao.body.status, "registrada");

  const recebimento = await request(`/api/doacoes/${doacao.body.id_doacao}/status`, {
    method: "PATCH", body: JSON.stringify({ status: "recebida" }),
  });
  assert.equal(recebimento.status, 200);

  const estoqueEntrada = await request("/api/estoque");
  const itemEntrada = estoqueEntrada.body.find(item => item.id_item === 1);
  assert.ok(itemEntrada.quantidade_atual >= 2);

  const distribuicao = await request(`/api/doacoes/${doacao.body.id_doacao}/status`, {
    method: "PATCH", body: JSON.stringify({ status: "distribuida" }),
  });
  assert.equal(distribuicao.status, 200);

  const repeticao = await request(`/api/doacoes/${doacao.body.id_doacao}/status`, {
    method: "PATCH", body: JSON.stringify({ status: "distribuida" }),
  });
  assert.equal(repeticao.status, 409);

  const resumo = await request("/api/relatorios/resumo");
  assert.equal(resumo.status, 200);
  assert.ok(resumo.body.doacoes.distribuidas >= 1);

  const [auditoria] = await pool.execute(
    "SELECT COUNT(*) AS total FROM auditoria WHERE entidade = 'doacao' AND id_entidade = ?",
    [doacao.body.id_doacao],
  );
  assert.ok(auditoria[0].total >= 2);
});
