import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import pool from "./db.js";
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
    iat: agora,
    exp: agora + DURACAO_TOKEN_SEGUNDOS,
  })).toString("base64url");
  const assinatura = createHmac("sha256", obterSegredo()).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
}

export function validarToken(token, agora = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string") throw new HttpError(401, "Token inválido");
  const partes = token.split(".");
  if (partes.length !== 2 || !partes.every(parte => /^[A-Za-z0-9_-]+$/.test(parte))) {
    throw new HttpError(401, "Token inválido");
  }
  const [payloadCodificado, assinaturaRecebida] = partes;
  const assinaturaEsperada = createHmac("sha256", obterSegredo())
    .update(payloadCodificado).digest("base64url");
  const recebida = Buffer.from(assinaturaRecebida);
  const esperada = Buffer.from(assinaturaEsperada);
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
    throw new HttpError(401, "Token inválido");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadCodificado, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(401, "Token inválido");
  }
  if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0 ||
      !Number.isInteger(payload.exp) || payload.exp <= agora ||
      !Number.isInteger(payload.iat) || payload.iat > agora + 60 ||
      payload.exp - payload.iat > DURACAO_TOKEN_SEGUNDOS) {
    throw new HttpError(401, "Token expirado ou inválido");
  }
  return { id_usuario: payload.sub };
}

export async function autenticar(req, res, next) {
  let identidade;
  try {
    const cabecalho = req.get("authorization") || "";
    const correspondencia = /^Bearer (.+)$/.exec(cabecalho);
    if (!correspondencia) throw new HttpError(401, "Autenticação necessária");
    identidade = validarToken(correspondencia[1]);
  } catch (erro) {
    if (erro instanceof HttpError) {
      return res.status(erro.status).json({ erro: erro.message, requestId: req.requestId });
    }
    console.error(JSON.stringify({
      level: "error", message: "Falha ao validar assinatura de autenticação",
      requestId: req.requestId, error: erro.message,
    }));
    return res.status(503).json({ erro: "Serviço de autenticação indisponível", requestId: req.requestId });
  }

  try {
    // Consulta o estado atual da conta em cada requisição: desativação e mudança
    // de perfil passam a valer imediatamente, sem aguardar a expiração do token.
    const [usuarios] = await pool.execute(
      "SELECT id_usuario, nome, email, perfil, ativo FROM usuario WHERE id_usuario = ?",
      [identidade.id_usuario]
    );
    if (!usuarios.length || !usuarios[0].ativo) {
      return res.status(401).json({ erro: "Conta inativa ou não encontrada", requestId: req.requestId });
    }
    const { ativo, ...usuario } = usuarios[0];
    req.usuario = usuario;
    return next();
  } catch (erro) {
    console.error(JSON.stringify({
      level: "error", message: "Falha ao consultar conta autenticada",
      requestId: req.requestId, error: erro.message,
    }));
    return res.status(503).json({ erro: "Não foi possível validar a conta neste momento", requestId: req.requestId });
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
