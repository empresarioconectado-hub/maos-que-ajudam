import { HttpError } from "./erros.js";

const TRANSICOES = {
  registrada: new Set(["recebida", "cancelada"]),
  recebida: new Set(["distribuida"]),
  distribuida: new Set(),
  cancelada: new Set(),
};

export function validarTransicaoStatus(atual, proximo) {
  if (!TRANSICOES[atual]?.has(proximo)) {
    throw new HttpError(409, `Transição de status não permitida: ${atual} → ${proximo}`);
  }
}
