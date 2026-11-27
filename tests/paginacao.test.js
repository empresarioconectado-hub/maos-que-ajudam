import test from "node:test";
import assert from "node:assert/strict";
import { lerPaginacao, montarMetadadosPaginacao } from "../server/paginacao.js";

test("usa valores padrão sem alterar o modo de resposta legado", () => {
  assert.deepEqual(lerPaginacao({}), {
    possuiPaginacao: false, page: 1, limit: 20, offset: 0,
  });
});

test("calcula deslocamento e limita a página", () => {
  assert.deepEqual(lerPaginacao({ page: "3", limit: "10" }), {
    possuiPaginacao: true, page: 3, limit: 10, offset: 20,
  });
});

test("rejeita página e limite inválidos", () => {
  for (const query of [{ page: "0" }, { page: "-1" }, { page: "1.5" }, { limit: "0" }, { limit: "101" }, { limit: "abc" }]) {
    assert.throws(() => lerPaginacao(query), { status: 400 });
  }
});

test("calcula metadados inclusive quando não há resultados", () => {
  assert.deepEqual(montarMetadadosPaginacao(2, 10, 21), {
    page: 2, limit: 10, total: 21, totalPages: 3,
  });
  assert.deepEqual(montarMetadadosPaginacao(1, 20, 0), {
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
});
