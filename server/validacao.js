const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarDoador(dados = {}) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return "Dados do doador inválidos";
  }

  const { nome, email, telefone } = dados;

  if (typeof nome !== "string" || nome.trim() === "") {
    return "Nome é obrigatório";
  }

  if (nome.trim().length > 150) {
    return "Nome deve ter no máximo 150 caracteres";
  }

  if (email != null && email !== "") {
    if (typeof email !== "string" || email.trim().length > 100) {
      return "E-mail deve ter no máximo 100 caracteres";
    }

    if (!FORMATO_EMAIL.test(email.trim())) {
      return "E-mail inválido";
    }
  }

  if (telefone != null && telefone !== "") {
    if (typeof telefone !== "string" || telefone.trim().length > 20) {
      return "Telefone deve ter no máximo 20 caracteres";
    }
  }

  return null;
}

export function normalizarDoador(dados) {
  return {
    nome: dados.nome.trim(),
    email: typeof dados.email === "string" && dados.email.trim()
      ? dados.email.trim().toLowerCase()
      : null,
    telefone: typeof dados.telefone === "string" && dados.telefone.trim()
      ? dados.telefone.trim()
      : null,
  };
}

export function validarDoacao(dados = {}) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return "Dados da doação inválidos";
  }

  const { id_doador, data_doacao, observacao, itens } = dados;

  if (!Number.isSafeInteger(id_doador) || id_doador <= 0 || id_doador > 2147483647) {
    return "ID do doador inválido";
  }

  if (
    typeof data_doacao !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data_doacao)
  ) {
    return "Data da doação inválida. Use AAAA-MM-DD";
  }

  const data = new Date(data_doacao + "T00:00:00Z");

  if (
    Number.isNaN(data.getTime()) ||
    data.toISOString().slice(0, 10) !== data_doacao
  ) {
    return "Data da doação inválida";
  }

  if (
    observacao != null &&
    (typeof observacao !== "string" || observacao.length > 255)
  ) {
    return "Observação deve ter no máximo 255 caracteres";
  }

  if (!Array.isArray(itens) || itens.length === 0 || itens.length > 100) {
    return "A doação deve possuir entre 1 e 100 itens";
  }

  const idsItens = new Set();

  for (const item of itens) {
    if (
      !item ||
      typeof item !== "object" ||
      !Number.isSafeInteger(item.id_item) ||
      item.id_item <= 0 || item.id_item > 2147483647
    ) {
      return "ID do item inválido";
    }

    if (!Number.isSafeInteger(item.quantidade) || item.quantidade <= 0 || item.quantidade > 2147483647) {
      return "A quantidade de cada item deve ser um número inteiro positivo";
    }

    if (idsItens.has(item.id_item)) {
      return "Não é permitido repetir itens na mesma doação";
    }

    idsItens.add(item.id_item);
  }

  return null;
}
