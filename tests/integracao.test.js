import test from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
import pool from "../server/db.js";
import { gerarHashSenha } from "../server/auth.js";

process.env.AUTH_SECRET ||= "segredo-exclusivo-para-testes-com-mais-de-32-bytes";

test("API integra cadastro, recebimento, estoque, distribuição e auditoria", async t => {
  if (process.env.TEST_DATABASE !== "1") {
    t.skip("Defina TEST_DATABASE=1 e configure um banco descartável para executar a integração");
    return;
  }

  const emailOperador = `operador-${Date.now()}@exemplo.test`;
  const hashSenha = await gerarHashSenha("Senha-forte-para-teste-2026!");
  const emailAdmin = `admin-${Date.now()}@exemplo.test`;
  const hashAdmin = await gerarHashSenha("Outra-senha-forte-para-teste-2026!");
  await pool.execute(
    "INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (?, ?, ?, 'operador')",
    ["Operador de teste", emailOperador, hashSenha],
  );
  await pool.execute(
    "INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (?, ?, ?, 'administrador')",
    ["Administrador de teste", emailAdmin, hashAdmin],
  );

  const servidor = app.listen(0);
  await new Promise(resolve => servidor.once("listening", resolve));
  t.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  });

  const base = `http://127.0.0.1:${servidor.address().port}`;
  let token = null;
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };

  const semAutenticacao = await request("/api/doadores");
  assert.equal(semAutenticacao.status, 401);

  const loginInvalido = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: emailOperador, senha: "senha-incorreta" }),
  });
  assert.equal(loginInvalido.status, 401);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: emailOperador, senha: "Senha-forte-para-teste-2026!" }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.usuario.perfil, "operador");
  token = login.body.token;
  const tokenOperador = token;
  assert.ok(token);

  const perfil = await request("/api/auth/me");
  assert.equal(perfil.status, 200);
  assert.equal(perfil.body.email, emailOperador);

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
  const excluirComoOperador = await request(`/api/doadores/${idDoador}`, { method: "DELETE" });
  assert.equal(excluirComoOperador.status, 403);

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

  const historicoLegado = await request("/api/doacoes");
  assert.equal(historicoLegado.status, 200);
  assert.ok(Array.isArray(historicoLegado.body));
  const historicoPaginado = await request("/api/doacoes?page=1&limit=1");
  assert.equal(historicoPaginado.status, 200);
  assert.equal(historicoPaginado.body.data.length, 1);
  assert.ok(historicoPaginado.body.pagination.total >= 1);
  const paginacaoInvalida = await request("/api/doacoes?page=0");
  assert.equal(paginacaoInvalida.status, 400);

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
    "SELECT COUNT(*) AS total, SUM(id_usuario = ?) AS eventos_usuario " +
    "FROM auditoria WHERE entidade = 'doacao' AND id_entidade = ?",
    [login.body.usuario.id_usuario, doacao.body.id_doacao],
  );
  assert.ok(auditoria[0].total >= 2);
  assert.ok(Number(auditoria[0].eventos_usuario) >= 2);
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

  // Administradores podem executar a operação, mas a integridade referencial
  // continua impedindo a exclusão de um doador com doações vinculadas.
  const loginAdmin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: emailAdmin, senha: "Outra-senha-forte-para-teste-2026!" }),
  });
  assert.equal(loginAdmin.status, 200);
  token = loginAdmin.body.token;
  const exclusaoComAdmin = await request(`/api/doadores/${idDoador}`, { method: "DELETE" });
  assert.equal(exclusaoComAdmin.status, 409);

  await pool.execute("UPDATE usuario SET ativo = 0 WHERE email = ?", [emailOperador]);
  token = tokenOperador;
  const acessoContaInativa = await request("/api/doadores");
  assert.equal(acessoContaInativa.status, 401);
});
