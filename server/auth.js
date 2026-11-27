import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { HttpError } from "./erros.js";

const scrypt = promisify(scryptCallback);
const TAMANHO_HASH = 64;
const DURACAO_TOKEN_SEGUNDOS = 8 * 60 * 60;

export async function gerarHashSenha(senha) {
  if (typeof senha !== "string" || senha.length < 12 || senha.length > 128) {
    throw new HttpError(400, "A senha deve possuir entre 12 e 128 caracteres");
  }
  const salt = randomBytes(16);
  const derivada = await scrypt(senha, salt, TAMANHO_HASH, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${derivada.toString("hex")}`;
}

export async function verificarSenha(senha, registro) {
  if (typeof senha !== "string" || typeof registro !== "string") return false;
  const [algoritmo, saltHex, hashHex] = registro.split("$");
  if (algoritmo !== "scrypt" || !/^[0-9a-f]{32}$/i.test(saltHex || "") ||
      !/^[0-9a-f]{128}$/i.test(hashHex || "")) return false;
  const hashEsperado = Buffer.from(hashHex, "hex");
  const hashCalculado = await scrypt(senha, Buffer.from(saltHex, "hex"), TAMANHO_HASH, {
    N: 16384, r: 8, p: 1,
  });
  return timingSafeEqual(hashEsperado, hashCalculado);
}

function obterSegredo() {
  const segredo = process.env.AUTH_SECRET;
  if (typeof segredo !== "string" || Buffer.byteLength(segredo) < 32) {
    throw new Error("AUTH_SECRET deve possuir ao menos 32 bytes");
  }
  return segredo;
}

export function emitirToken(usuario, agora = Math.floor(Date.now() / 1000)) {
  const payload = Buffer.from(JSON.stringify({
    sub: usuario.id_usuario,
    email: usuario.email,
    perfil: usuario.perfil,
    iat: agora,
    exp: agora + DURACAO_TOKEN_SEGUNDOS,
  })).toString("base64url");
  const assinatura = createHmac("sha256", obterSegredo()).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
}

export function autenticar(req, res, next) {
  try {
    const cabecalho = req.get("authorization") || "";
    const correspondencia = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(cabecalho);
    if (!correspondencia) throw new HttpError(401, "Autenticação necessária");
    const [payloadCodificado, assinaturaRecebida] = correspondencia[1].split(".");
    const assinaturaEsperada = createHmac("sha256", obterSegredo())
      .update(payloadCodificado).digest("base64url");
    const recebida = Buffer.from(assinaturaRecebida);
    const esperada = Buffer.from(assinaturaEsperada);
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
      throw new HttpError(401, "Token inválido");
    }
    const payload = JSON.parse(Buffer.from(payloadCodificado, "base64url").toString("utf8"));
    const agora = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0 ||
        !["administrador", "operador"].includes(payload.perfil) ||
        !Number.isInteger(payload.exp) || payload.exp <= agora ||
        !Number.isInteger(payload.iat) || payload.iat > agora + 60) {
      throw new HttpError(401, "Token expirado ou inválido");
    }
    req.usuario = { id_usuario: payload.sub, email: payload.email, perfil: payload.perfil };
    return next();
  } catch (erro) {
    if (erro instanceof HttpError) return res.status(erro.status).json({
      erro: erro.message, requestId: req.requestId,
    });
    console.error(JSON.stringify({
      level: "error", message: "Falha ao validar autenticação",
      requestId: req.requestId, error: erro.message,
    }));
    return res.status(503).json({
      erro: "Serviço de autenticação indisponível", requestId: req.requestId,
    });
  }
}

export function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: "Você não possui permissão para esta operação",
        requestId: req.requestId,
      });
    }
    return next();
  };
}
