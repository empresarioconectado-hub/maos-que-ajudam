import "dotenv/config";
import pool from "../server/db.js";
import { gerarHashSenha } from "../server/auth.js";

try {
  const nome = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;
  const perfil = process.env.ADMIN_ROLE || "administrador";

  if (!nome || nome.length > 150) throw new Error("ADMIN_NAME é obrigatório e deve ter até 150 caracteres");
  if (!email || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL deve conter um endereço válido");
  }
  if (!["administrador", "operador"].includes(perfil)) {
    throw new Error("ADMIN_ROLE deve ser administrador ou operador");
  }

  const hash = await gerarHashSenha(senha);
  await pool.execute(
    "INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)",
    [nome, email, hash, perfil]
  );
  console.log(`Usuário ${email} criado com perfil ${perfil}.`);
} catch (erro) {
  console.error("Não foi possível criar o usuário:", erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
