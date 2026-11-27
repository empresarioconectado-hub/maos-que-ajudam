import { Router } from "express";
import pool from "../db.js";
import { HttpError } from "../erros.js";
import { autenticar, emitirToken, verificarSenha } from "../auth.js";

const router = Router();
const tentativasLogin = new Map();
const JANELA_LOGIN_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS_LOGIN = 10;

function limitarTentativasLogin(req, res, next) {
  const agora = Date.now();
  const chave = req.ip || req.socket.remoteAddress || "desconhecido";
  let registro = tentativasLogin.get(chave);
  if (!registro || agora >= registro.expiraEm) {
    registro = { quantidade: 0, expiraEm: agora + JANELA_LOGIN_MS };
    tentativasLogin.set(chave, registro);
  }
  if (registro.quantidade >= MAX_TENTATIVAS_LOGIN) {
    res.set("Retry-After", String(Math.ceil((registro.expiraEm - agora) / 1000)));
    return res.status(429).json({
      erro: "Muitas tentativas de acesso. Aguarde antes de tentar novamente.",
      requestId: req.requestId,
    });
  }
  req.chaveLimiteLogin = chave;
  if (tentativasLogin.size > 10000) {
    for (const [ip, item] of tentativasLogin) {
      if (agora >= item.expiraEm) tentativasLogin.delete(ip);
    }
  }
  return next();
}

function registrarFalhaLogin(req) {
  const agora = Date.now();
  const registro = tentativasLogin.get(req.chaveLimiteLogin) || {
    quantidade: 0, expiraEm: agora + JANELA_LOGIN_MS,
  };
  registro.quantidade += 1;
  tentativasLogin.set(req.chaveLimiteLogin, registro);
}

router.post("/login", limitarTentativasLogin, async (req, res) => {
  const { email, senha } = req.body ?? {};
  if (typeof email !== "string" || email.trim().length > 100 ||
      typeof senha !== "string" || senha.length > 128) {
    throw new HttpError(400, "Informe e-mail e senha válidos");
  }

  const [usuarios] = await pool.execute(
    "SELECT id_usuario, nome, email, senha_hash, perfil, ativo " +
    "FROM usuario WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const usuario = usuarios[0];
  const senhaValida = usuario
    ? await verificarSenha(senha, usuario.senha_hash)
    : await verificarSenha(senha, "scrypt$00000000000000000000000000000000$" + "0".repeat(128));
  if (!usuario || !usuario.ativo || !senhaValida) {
    registrarFalhaLogin(req);
    throw new HttpError(401, "E-mail ou senha incorretos");
  }
  tentativasLogin.delete(req.chaveLimiteLogin);

  return res.json({
    token: emitirToken(usuario),
    tipo: "Bearer",
    expira_em: 28800,
    usuario: {
      id_usuario: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  });
});

router.get("/me", autenticar, async (req, res) => {
  const [usuarios] = await pool.execute(
    "SELECT id_usuario, nome, email, perfil, ativo FROM usuario WHERE id_usuario = ?",
    [req.usuario.id_usuario]
  );
  if (!usuarios.length || !usuarios[0].ativo) {
    throw new HttpError(401, "Conta inativa ou não encontrada");
  }
  const { ativo, ...usuario } = usuarios[0];
  return res.json(usuario);
});

export default router;
