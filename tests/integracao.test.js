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

  const live = await request("/api/health/live");
  assert.equal(live.status, 200);
  assert.ok(live.body.status === "ok");
  const responseWithId = await fetch(base + "/api/health/live");
  assert.match(responseWithId.headers.get("x-request-id") || "", /^[0-9a-f-]{36}$/i);
  assert.equal(responseWithId.headers.get("x-content-type-options"), "nosniff");
  const health = await request("/api/health/ready");
  assert.equal(health.status, 200);
  assert.equal(health.body.database, "connected");

  const email = `integracao-${Date.now()}@exemplo.test`;
  const cadastro = await request("/api/doadores", {
    method: "POST",
    body: JSON.stringify({ nome: "=2+2", email }),
  });
  assert.equal(cadastro.status, 201);
  const idDoador = cadastro.body.id_doador;
  const duplicado = await request("/api/doadores", {
    method: "POST",
    body: JSON.stringify({ nome: "Duplicado", email }),
  });
  assert.equal(duplicado.status, 409);

  const estoqueAntes = await request("/api/estoque");
  const saldoInicial = estoqueAntes.body.find(item => item.id_item === 1)?.quantidade_atual ?? 0;
  const [doacoesAntesRollback] = await pool.execute(
    "SELECT COUNT(*) AS total FROM doacao WHERE id_doador = ?", [idDoador],
  );
  const rollback = await request("/api/doacoes", {
    method: "POST",
    body: JSON.stringify({
      id_doador: idDoador,
      data_doacao: new Date().toISOString().slice(0, 10),
      itens: [{ id_item: 1, quantidade: 1 }, { id_item: 2147483647, quantidade: 1 }],
    }),
  });
  assert.equal(rollback.status, 400);
  const [doacoesAposRollback] = await pool.execute(
    "SELECT COUNT(*) AS total FROM doacao WHERE id_doador = ?", [idDoador],
  );
  assert.equal(doacoesAposRollback[0].total, doacoesAntesRollback[0].total);

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
  assert.equal(itemEntrada.quantidade_atual, saldoInicial + 2);

  const distribuicao = await request(`/api/doacoes/${doacao.body.id_doacao}/status`, {
    method: "PATCH", body: JSON.stringify({ status: "distribuida" }),
  });
  assert.equal(distribuicao.status, 200);
  const estoqueAposDistribuicao = await request("/api/estoque");
  const itemAposDistribuicao = estoqueAposDistribuicao.body.find(item => item.id_item === 1);
  assert.equal(itemAposDistribuicao.quantidade_atual, saldoInicial);

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
  const [movimentacoes] = await pool.execute(
    "SELECT tipo, quantidade FROM movimentacao_estoque WHERE origem = 'doacao' AND id_referencia = ? ORDER BY id_movimentacao",
    [doacao.body.id_doacao],
  );
  assert.deepEqual(movimentacoes.map(m => [m.tipo, m.quantidade]), [["entrada", 2], ["saida", 2]]);

  const exportacao = await fetch(base + "/api/relatorios/doacoes.csv");
  assert.equal(exportacao.status, 200);
  assert.match(exportacao.headers.get("content-type"), /text\\/csv/);
  const csv = await exportacao.text();
  assert.match(csv, /'=2\\+2/);
});
