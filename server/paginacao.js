import { HttpError } from "./erros.js";

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;

export function lerPaginacao(query = {}) {
  const possuiPaginacao = query.page !== undefined || query.limit !== undefined;
  const pageValido = query.page === undefined || (typeof query.page === "string" && /^[1-9]\\d*$/.test(query.page));
  const limitValido = query.limit === undefined || (typeof query.limit === "string" && /^[1-9]\\d*$/.test(query.limit));
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? LIMITE_PADRAO : Number(query.limit);

  if (!pageValido || !Number.isSafeInteger(page) || page < 1) {
    throw new HttpError(400, "O parâmetro page deve ser um inteiro maior que zero");
  }
  if (!limitValido || !Number.isSafeInteger(limit) || limit < 1 || limit > LIMITE_MAXIMO) {
    throw new HttpError(400, `O parâmetro limit deve estar entre 1 e ${LIMITE_MAXIMO}`);
  }

  if (!Number.isSafeInteger((page - 1) * limit)) {
    throw new HttpError(400, "A combinação de page e limit excede o intervalo permitido");
  }

  return {
    possuiPaginacao,
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function montarMetadadosPaginacao(page, limit, total) {
  return {
    page,
    limit,
    total: Number(total),
    totalPages: Math.ceil(total / limit),
  };
}
