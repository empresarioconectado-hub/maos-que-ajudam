import test from "node:test";
import assert from "node:assert/strict";
import { gerarHashSenha, verificarSenha, emitirToken, autenticar } from "../server/auth.js";

process.env.AUTH_SECRET = "segredo-exclusivo-para-testes-com-mais-de-32-bytes";

test("gera hash de senha com salt e verifica somente a senha correta", async () => {
  const hash = await gerarHashSenha("Senha-forte-para-teste-2026!");
  assert.match(hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(await verificarSenha("Senha-forte-para-teste-2026!", hash), true);
  assert.equal(await verificarSenha("outra-senha", hash), false);
  assert.equal(await verificarSenha("senha", "hash-invalido"), false);
});

test("rejeita senhas abaixo e acima do limite", async () => {
  await assert.rejects(() => gerarHashSenha("curta"), { status: 400 });
  await assert.rejects(() => gerarHashSenha("x".repeat(129)), { status: 400 });
});

test("valida assinatura e expiração do token bearer", () => {
  const token = emitirToken({
    id_usuario: 7,
    email: "admin@exemplo.test",
    perfil: "administrador",
  }, Math.floor(Date.now() / 1000));
  const req = {
    get: () => `Bearer ${token}`,
    requestId: "teste-request-id",
  };
  let chamado = false;
  const res = {
    status(codigo) { this.codigo = codigo; return this; },
    json(corpo) { this.corpo = corpo; return this; },
  };
  autenticar(req, res, () => { chamado = true; });
  assert.equal(chamado, true);
  assert.equal(req.usuario.id_usuario, 7);
  assert.equal(req.usuario.perfil, "administrador");

  const invalido = { get: () => "Bearer token.invalido", requestId: "req" };
  chamado = false;
  autenticar(invalido, res, () => { chamado = true; });
  assert.equal(chamado, false);
  assert.equal(res.codigo, 401);
});
