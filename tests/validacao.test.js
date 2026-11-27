import test from "node:test";
import assert from "node:assert/strict";
import { normalizarDoador, validarDoador, validarDoacao } from "../server/validacao.js";

test("aceita e normaliza um doador válido", () => {
  assert.equal(validarDoador({ nome: "  Ana Souza  ", email: " ANA@EXEMPLO.COM ", telefone: " 11999999999 " }), null);
  assert.deepEqual(normalizarDoador({ nome: "  Ana Souza  ", email: " ANA@EXEMPLO.COM ", telefone: " 11999999999 " }), {
    nome: "Ana Souza",
    email: "ana@exemplo.com",
    telefone: "11999999999",
  });
});

test("rejeita nome ausente, vazio ou acima do limite", () => {
  assert.match(validarDoador({ nome: " " }), /obrigatório/);
  assert.match(validarDoador({ nome: "A".repeat(151) }), /150/);
});

test("rejeita e-mail e telefone inválidos", () => {
  assert.match(validarDoador({ nome: "Ana", email: "email-invalido" }), /E-mail inválido/);
  assert.match(validarDoador({ nome: "Ana", email: "a".repeat(101) + "@exemplo.com" }), /100/);
  assert.match(validarDoador({ nome: "Ana", telefone: "1".repeat(21) }), /20/);
});

test("aceita doação com data válida e itens distintos", () => {
  assert.equal(validarDoacao({
    id_doador: 1,
    data_doacao: "2026-11-27",
    observacao: "Arrecadação",
    itens: [{ id_item: 1, quantidade: 2 }, { id_item: 2, quantidade: 1 }],
  }), null);
});

test("rejeita doação sem itens, com data impossível ou identificador inválido", () => {
  assert.match(validarDoacao({ id_doador: 1, data_doacao: "2026-02-30", itens: [{ id_item: 1, quantidade: 1 }] }), /Data da doação inválida/);
  assert.match(validarDoacao({ id_doador: 0, data_doacao: "2026-11-27", itens: [{ id_item: 1, quantidade: 1 }] }), /ID do doador inválido/);
  assert.match(validarDoacao({ id_doador: 1, data_doacao: "2026-11-27", itens: [] }), /pelo menos um item/);
});

test("rejeita quantidade não positiva, item inválido ou item repetido", () => {
  const base = { id_doador: 1, data_doacao: "2026-11-27" };
  assert.match(validarDoacao({ ...base, itens: [{ id_item: 1, quantidade: 0 }] }), /quantidade/);
  assert.match(validarDoacao({ ...base, itens: [{ id_item: 0, quantidade: 1 }] }), /ID do item/);
  assert.match(validarDoacao({ ...base, itens: [{ id_item: 1, quantidade: 1 }, { id_item: 1, quantidade: 2 }] }), /repetir itens/);
});

test("rejeita observação acima do limite", () => {
  assert.match(validarDoacao({
    id_doador: 1,
    data_doacao: "2026-11-27",
    observacao: "x".repeat(256),
    itens: [{ id_item: 1, quantidade: 1 }],
  }), /255/);
});
