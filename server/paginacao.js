import { HttpError } from "./erros.js";

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;

export function lerPaginacao(query = {}) {
  const possuiPaginacao = query.page !== undefined || query.limit !== undefined;
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? LIMITE_PADRAO : Number(query.limit);

  if (!Number.isSafeInteger(page) || page < 1) {
    throw new HttpError(400, "O parâmetro page deve ser um inteiro maior que zero");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > LIMITE_MAXIMO) {
    throw new HttpError(400, `O parâmetro limit deve estar entre 1 e ${LIMITE_MAXIMO}`);
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
    total,
    totalPages: Math.ceil(total / limit),
  };
}
