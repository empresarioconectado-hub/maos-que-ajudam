import test from "node:test";
import assert from "node:assert/strict";
import { gerarHashSenha, verificarSenha, emitirToken, validarToken } from "../server/auth.js";

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

test("valida assinatura, integridade e expiração do token bearer", () => {
  const agora = Math.floor(Date.now() / 1000);
  const token = emitirToken({ id_usuario: 7 }, agora);
  assert.deepEqual(validarToken(token, agora + 1), { id_usuario: 7 });
  assert.throws(() => validarToken(token + "x", agora + 1), { status: 401 });
  assert.throws(() => validarToken(token, agora + 8 * 60 * 60), { status: 401 });
  assert.throws(() => validarToken("token.invalido", agora), { status: 401 });
});
