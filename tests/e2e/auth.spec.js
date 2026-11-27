import { test, expect } from "@playwright/test";

test("administrador entra, visualiza o painel e encerra a sessão no servidor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();

  await page.getByLabel("E-mail").fill("e2e-admin@exemplo.test");
  await page.getByLabel("Senha").fill("Senha-E2E-forte-2026!");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();

  const token = await page.evaluate(() => sessionStorage.getItem("maos_token"));
  expect(token).toBeTruthy();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();

  const resposta = await page.evaluate(async tokenAntigo => {
    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenAntigo}` },
    });
    return response.status;
  }, token);
  expect(resposta).toBe(401);
});
