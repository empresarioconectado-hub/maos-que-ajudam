import { Router } from "express";
import { createHmac } from "node:crypto";
import pool from "../db.js";
import { HttpError } from "../erros.js";
import { autenticar, emitirToken, verificarSenha, validarToken } from "../auth.js";

const router = Router();
const MAX_TENTATIVAS_LOGIN = 10;

async function reservarTentativaLogin(req, res, next) {
  const endereco = req.ip || req.socket.remoteAddress || "desconhecido";
  const chave = createHmac("sha256", process.env.AUTH_SECRET).update(endereco).digest("hex");

  await pool.execute("DELETE FROM limite_login WHERE janela_inicio < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)");
  await pool.execute(
    "INSERT INTO limite_login (chave, tentativas, janela_inicio) " +
    "VALUES (?, 1, UTC_TIMESTAMP()) " +
    "ON DUPLICATE KEY UPDATE " +
    "tentativas = IF(janela_inicio <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), 1, tentativas + 1), " +
    "janela_inicio = IF(janela_inicio <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), UTC_TIMESTAMP(), janela_inicio)",
    [chave]
  );
  const [registros] = await pool.execute(
    "SELECT tentativas, GREATEST(1, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), " +
    "DATE_ADD(janela_inicio, INTERVAL 15 MINUTE))) AS aguardar " +
    "FROM limite_login WHERE chave = ?",
    [chave]
  );
  if (registros[0].tentativas > MAX_TENTATIVAS_LOGIN) {
    res.set("Retry-After", String(registros[0].aguardar));
    return res.status(429).json({
      erro: "Muitas tentativas de acesso. Aguarde antes de tentar novamente.",
      requestId: req.requestId,
    });
  }
  req.chaveLimiteLogin = chave;
  return next();
}

router.post("/login", reservarTentativaLogin, async (req, res) => {
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
    throw new HttpError(401, "E-mail ou senha incorretos");
  }

  await pool.execute("DELETE FROM limite_login WHERE chave = ?", [req.chaveLimiteLogin]);
  const token = emitirToken(usuario);
  const identidade = validarToken(token);
  await pool.execute(
    "INSERT INTO sessao_usuario (id_sessao, id_usuario, expira_em) " +
    "VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))",
    [identidade.id_sessao, usuario.id_usuario]
  );

  return res.json({
    token,
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

router.get("/me", autenticar, (req, res) => res.json(req.usuario));

router.post("/logout", autenticar, async (req, res) => {
  await pool.execute(
    "UPDATE sessao_usuario SET revogado_em = UTC_TIMESTAMP() " +
    "WHERE id_sessao = ? AND revogado_em IS NULL",
    [req.idSessao]
  );
  return res.status(204).end();
});

router.post("/logout-all", autenticar, async (req, res) => {
  await pool.execute(
    "UPDATE sessao_usuario SET revogado_em = UTC_TIMESTAMP() " +
    "WHERE id_usuario = ? AND revogado_em IS NULL",
    [req.usuario.id_usuario]
  );
  return res.status(204).end();
});

export default router;
