import test from "node:test";
import assert from "node:assert/strict";
import { validarTransicaoStatus } from "../server/regras-doacao.js";

test("permite registrar recebimento e cancelamento de doação registrada", () => {
  assert.doesNotThrow(() => validarTransicaoStatus("registrada", "recebida"));
  assert.doesNotThrow(() => validarTransicaoStatus("registrada", "cancelada"));
});

test("permite distribuir somente doação recebida", () => {
  assert.doesNotThrow(() => validarTransicaoStatus("recebida", "distribuida"));
  assert.throws(() => validarTransicaoStatus("registrada", "distribuida"), { status: 409 });
});

test("impede repetir transições e reabrir doações encerradas", () => {
  for (const atual of ["distribuida", "cancelada"]) {
    assert.throws(() => validarTransicaoStatus(atual, "recebida"), { status: 409 });
    assert.throws(() => validarTransicaoStatus(atual, "cancelada"), { status: 409 });
  }
  assert.throws(() => validarTransicaoStatus("recebida", "cancelada"), { status: 409 });
});
