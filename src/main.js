import "./style.css";

const app = document.querySelector("#app");
const state = {
  doadores: [], itens: [], doacoes: [], estoque: [], movimentacoes: [], resumo: null,
  editando: null, itemSelecionado: [], aba: "inicio",
  token: sessionStorage.getItem("maos_token"), usuario: null,
};

const hoje = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const api = async (rota, opcoes = {}) => {
  const resposta = await fetch(rota, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(opcoes.headers || {}),
    },
  });
  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!resposta.ok) {
    const erro = new Error(dados?.erro || dados?.message || `Erro HTTP ${resposta.status}`);
    erro.status = resposta.status;
    erro.requestId = resposta.headers.get("X-Request-Id") || dados?.requestId;
    if (resposta.status === 401 && state.token) {
      state.token = null;
      state.usuario = null;
      sessionStorage.removeItem("maos_token");
      renderLogin();
    }
    throw erro;
  }
  return dados;
};
const aviso = (mensagem, tipo = "sucesso") => {
  const el = document.querySelector("#aviso");
  if (!el) return;
  el.textContent = mensagem;
  el.className = `aviso ${tipo}`;
  el.hidden = false;
  window.clearTimeout(aviso.timer);
  aviso.timer = window.setTimeout(() => { el.hidden = true; }, 5000);
};
async function carregar() {
  const [doadores, itens, doacoes, estoque, movimentacoes, resumo] = await Promise.all([
    api("/api/doadores"), api("/api/itens"), api("/api/doacoes"),
    api("/api/estoque"), api("/api/estoque/movimentacoes"), api("/api/relatorios/resumo"),
  ]);
  state.doadores = doadores;
  state.itens = itens;
  state.doacoes = doacoes;
  state.estoque = estoque;
  state.movimentacoes = movimentacoes;
  state.resumo = resumo;
  render();
}
function mudarAba(aba) {
  state.aba = aba;
  app.querySelectorAll("[data-aba]").forEach(botao => {
    const ativo = botao.dataset.aba === aba;
    botao.classList.toggle("ativa", ativo);
    botao.setAttribute("aria-current", ativo ? "page" : "false");
  });
  ["inicio", "doadores", "doacoes", "estoque", "catalogo"].forEach(nome => {
    const painel = document.querySelector("#painel-" + nome);
    if (painel) painel.hidden = nome !== aba;
  });
}
function render() {
  const resumo = state.resumo || { doadores: 0, itens_catalogo: 0, unidades_em_estoque: 0, doacoes: {} };
  const abas = [
    ["inicio", "Visão geral"], ["doadores", "Doadores"], ["doacoes", "Doações"],
    ["estoque", "Estoque"], ["catalogo", "Catálogo"],
  ];
  app.innerHTML = `
    <header class="topo">
      <div class="marca"><span class="simbolo" aria-hidden="true">♡</span><div><h1>Mãos que Ajudam</h1><p>Gestão de doações e solidariedade</p></div></div>
      <div class="acoes-conta"><span class="status"><span class="ponto"></span> API conectada · ${esc(state.usuario?.nome || "")}</span><button class="botao sair" id="sair" type="button">Sair</button></div>
    </header>
    <main>
      <div id="aviso" class="aviso" role="status" aria-live="polite" hidden></div>
      <nav class="abas" aria-label="Navegação principal">
        ${abas.map(([id, nome]) => `<button class="aba ${state.aba === id ? "ativa" : ""}" data-aba="${id}" aria-current="${state.aba === id ? "page" : "false"}">${nome}</button>`).join("")}
      </nav>
      <section class="painel" id="painel-inicio" ${state.aba !== "inicio" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Visão geral</h2><p>Acompanhamento das operações registradas no sistema.</p></div><button class="botao secundario" id="atualizar">Atualizar dados</button></div>
        <section class="resumo">
          <article><span>Doadores cadastrados</span><strong>${resumo.doadores}</strong></article>
          <article><span>Doações registradas</span><strong>${resumo.doacoes.total || 0}</strong></article>
          <article><span>Itens no catálogo</span><strong>${resumo.itens_catalogo}</strong></article>
          <article><span>Unidades em estoque</span><strong>${resumo.unidades_em_estoque}</strong></article>
        </section>
        <div class="status-grid">
          <article><span>Registradas</span><strong>${resumo.doacoes.registradas || 0}</strong></article>
          <article><span>Recebidas</span><strong>${resumo.doacoes.recebidas || 0}</strong></article>
          <article><span>Distribuídas</span><strong>${resumo.doacoes.distribuidas || 0}</strong></article>
          <article><span>Canceladas</span><strong>${resumo.doacoes.canceladas || 0}</strong></article>
        </div>
        <div class="cabecalho-secao historico-titulo"><div><h2>Últimas doações</h2><p>Registros mais recentes.</p></div><div class="acoes-relatorio"><button class="botao secundario" type="button" data-exportar-csv>Exportar CSV</button><button class="botao secundario" type="button" data-imprimir-relatorio>Salvar relatório em PDF</button></div></div>
        ${renderHistorico(state.doacoes.slice(0, 5))}
      </section>
      <section class="painel" id="painel-doadores" ${state.aba !== "doadores" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Doadores</h2><p>Cadastre e mantenha os dados dos doadores.</p></div><button class="botao secundario" id="atualizar-doadores">Atualizar dados</button></div>
        <form id="form-doador" class="formulario">
          <label>Nome completo<input name="nome" maxlength="150" required placeholder="Nome do doador" autocomplete="name"></label>
          <label>E-mail<input name="email" type="email" maxlength="100" placeholder="email@exemplo.com" autocomplete="email"></label>
          <label>Telefone<input name="telefone" maxlength="20" placeholder="(11) 99999-9999" autocomplete="tel"></label>
          <div class="acoes"><button class="botao primario" id="salvar-doador" type="submit">Cadastrar doador</button><button class="botao secundario" id="cancelar-edicao" type="button" hidden>Cancelar edição</button></div>
        </form>
        <div class="tabela-wrap"><table><thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>
        ${state.doadores.map(d => `<tr><td>${d.id_doador}</td><td>${esc(d.nome)}</td><td>${esc(d.email || "—")}</td><td>${esc(d.telefone || "—")}</td><td>${esc(d.data_cadastro || "—")}</td><td class="acoes-tabela"><button class="link" data-editar="${d.id_doador}">Editar</button>${state.usuario?.perfil === "administrador" ? `<button class="link perigo" data-excluir="${d.id_doador}">Excluir</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6" class="vazio">Nenhum doador cadastrado.</td></tr>'}
        </tbody></table></div>
      </section>
      <section class="painel" id="painel-doacoes" ${state.aba !== "doacoes" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Registrar doação</h2><p>Associe um doador a um ou mais itens do catálogo.</p></div></div>
        <form id="form-doacao" class="formulario">
          <label>Doador<select name="id_doador" required><option value="">Selecione um doador</option>${state.doadores.map(d => `<option value="${d.id_doador}">${esc(d.nome)}</option>`).join("")}</select></label>
          <label>Data da doação<input name="data_doacao" type="date" value="${hoje()}" required></label>
          <label class="campo-largo">Observação<input name="observacao" maxlength="255" placeholder="Informações adicionais (opcional)"></label>
          <div class="itens-doacao campo-largo"><h3>Itens da doação</h3><div class="adicionar-item"><select id="item-escolhido"><option value="">Selecione um item</option>${state.itens.map(i => `<option value="${i.id_item}">${esc(i.nome)} — ${esc(i.categoria)} (${esc(i.unidade)})</option>`).join("")}</select><input id="quantidade-item" type="number" min="1" max="2147483647" step="1" value="1" aria-label="Quantidade"><button type="button" class="botao secundario" id="adicionar-item">Adicionar item</button></div>
          <ul>${state.itemSelecionado.map((x,n) => `<li>${esc(x.nome)} — ${x.quantidade} ${esc(x.unidade)} <button type="button" class="link perigo" data-remover-item="${n}">Remover</button></li>`).join("") || '<li class="vazio">Nenhum item adicionado.</li>'}</ul></div>
          <div class="acoes"><button class="botao primario" type="submit">Registrar doação</button></div>
        </form>
        <div class="cabecalho-secao historico-titulo"><div><h2>Histórico de doações</h2><p>Atualize o andamento conforme o recebimento e a distribuição.</p></div><button class="botao secundario" type="button" data-exportar-csv>Exportar CSV</button></div>
        ${renderHistorico(state.doacoes)}
      </section>
      <section class="painel" id="painel-estoque" ${state.aba !== "estoque" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Estoque</h2><p>Saldo, entradas, saídas e alertas de reposição por item.</p></div><button class="botao secundario" id="atualizar-estoque">Atualizar</button></div>
        ${state.usuario?.perfil === "administrador" ? `<div class="formularios-estoque">
          <form id="form-ajuste-estoque" class="formulario">
            <h3>Ajuste manual de estoque</h3>
            <label>Item<select name="id_item" required><option value="">Selecione</option>${state.itens.map(i => `<option value="${i.id_item}">${esc(i.nome)}</option>`).join("")}</select></label>
            <label>Movimentação<select name="tipo" required><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label>
            <label>Quantidade<input name="quantidade" type="number" min="1" max="2147483647" step="1" required></label>
            <label>Observação<input name="observacao" maxlength="255" placeholder="Motivo do ajuste"></label>
            <button class="botao primario" type="submit">Registrar movimentação</button>
          </form>
          <form id="form-limite-estoque" class="formulario">
            <h3>Limite mínimo / alerta</h3>
            <label>Item<select name="id_item" required><option value="">Selecione</option>${state.itens.map(i => `<option value="${i.id_item}">${esc(i.nome)}</option>`).join("")}</select></label>
            <label>Quantidade mínima<input name="quantidade_minima" type="number" min="0" max="2147483647" step="1" value="0" required></label>
            <p class="ajuda">O alerta aparece quando o saldo fica igual ou abaixo do limite. Zero desativa o alerta.</p>
            <button class="botao secundario" type="submit">Salvar limite</button>
          </form>
        </div>` : ""}
        <div class="tabela-wrap"><table><thead><tr><th>Item</th><th>Categoria</th><th>Unidade</th><th>Saldo atual</th><th>Mínimo</th><th>Alerta</th><th>Atualizado em</th></tr></thead><tbody>
        ${state.estoque.map(i => `<tr><td>${esc(i.nome)}</td><td>${esc(i.categoria)}</td><td>${esc(i.unidade)}</td><td><strong>${i.quantidade_atual}</strong></td><td>${i.quantidade_minima}</td><td>${Number(i.estoque_baixo) ? '<span class="alerta-estoque">Repor estoque</span>' : '<span class="normal-estoque">Normal</span>'}</td><td>${esc(i.atualizado_em || "—")}</td></tr>`).join("") || '<tr><td colspan="7" class="vazio">Nenhum item no estoque.</td></tr>'}
        </tbody></table></div>
        <div class="cabecalho-secao historico-titulo"><div><h2>Movimentações recentes</h2><p>Entradas e saídas de doações e ajustes manuais auditados.</p></div></div>
        <div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Item</th><th>Movimento</th><th>Quantidade</th><th>Origem</th><th>Referência</th></tr></thead><tbody>
        ${state.movimentacoes.map(m => `<tr><td>${esc(m.criado_em)}</td><td>${esc(m.nome_item)}</td><td>${esc(m.tipo)}</td><td>${m.quantidade} ${esc(m.unidade)}</td><td>${esc(m.origem)}</td><td>${esc(m.id_referencia ?? "—")}</td></tr>`).join("") || '<tr><td colspan="6" class="vazio">Nenhuma movimentação registrada.</td></tr>'}
        </tbody></table></div>
      </section>
      <section class="painel" id="painel-catalogo" ${state.aba !== "catalogo" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Catálogo de itens</h2><p>Itens disponíveis para compor uma doação.</p></div></div>
        <div class="grade-itens">${state.itens.map(i => `<article class="item-card"><span>${esc(i.categoria)}</span><h3>${esc(i.nome)}</h3><p>Unidade: ${esc(i.unidade)}</p><small>Código #${i.id_item}</small></article>`).join("") || '<p class="vazio">Nenhum item cadastrado no catálogo.</p>'}</div>
      </section>
      <footer>Projeto Integrador Extensionista II · Mãos que Ajudam</footer>
    </main>`;

  document.querySelector("#sair")?.addEventListener("click", () => {
    state.token = null;
    state.usuario = null;
    sessionStorage.removeItem("maos_token");
    renderLogin();
  });
  app.querySelectorAll("[data-exportar-csv]").forEach(b => b.addEventListener("click", async () => {
    try { await exportarCSV(); }
    catch (erro) { aviso(erro.message, "erro"); }
  }));
  app.querySelectorAll("[data-imprimir-relatorio]").forEach(b => b.addEventListener("click", () => {
    try { imprimirRelatorio(); }
    catch (erro) { aviso(erro.message, "erro"); }
  }));
  app.querySelectorAll("[data-aba]").forEach(b => b.addEventListener("click", () => mudarAba(b.dataset.aba)));
  document.querySelector("#atualizar")?.addEventListener("click", () => carregar().catch(e => aviso(e.message, "erro")));
  document.querySelector("#atualizar-doadores")?.addEventListener("click", () => carregar().catch(e => aviso(e.message, "erro")));
  document.querySelector("#atualizar-estoque")?.addEventListener("click", () => carregar().catch(e => aviso(e.message, "erro")));
  document.querySelector("#form-ajuste-estoque")?.addEventListener("submit", salvarAjusteEstoque);
  document.querySelector("#form-limite-estoque")?.addEventListener("submit", salvarLimiteEstoque);
  document.querySelector("#form-doador")?.addEventListener("submit", salvarDoador);
  document.querySelector("#cancelar-edicao")?.addEventListener("click", resetFormulario);
  app.querySelectorAll("[data-editar]").forEach(b => b.addEventListener("click", () => editarDoador(Number(b.dataset.editar))));
  app.querySelectorAll("[data-excluir]").forEach(b => b.addEventListener("click", () => excluirDoador(Number(b.dataset.excluir))));
  document.querySelector("#adicionar-item")?.addEventListener("click", adicionarItem);
  app.querySelectorAll("[data-remover-item]").forEach(b => b.addEventListener("click", () => {
    state.itemSelecionado.splice(Number(b.dataset.removerItem), 1);
    render();
  }));
  document.querySelector("#form-doacao")?.addEventListener("submit", salvarDoacao);
  app.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => alterarStatus(Number(b.dataset.id), b.dataset.status)));
  app.querySelectorAll("[data-comprovante]").forEach(b => b.addEventListener("click", () => imprimirComprovante(Number(b.dataset.comprovante))));
}
function renderHistorico(doacoes) {
  return `<div class="historico">${doacoes.map(d => {
    const proxima = d.status === "registrada" ? [["recebida", "Confirmar recebimento"], ["cancelada", "Cancelar"]] :
      d.status === "recebida" ? [["distribuida", "Confirmar distribuição"]] : [];
    return `<article class="doacao"><div><strong>Doação #${d.id_doacao}</strong><span>${esc(d.data_doacao)} · ${esc(d.doador?.nome || "Doador")}</span><span class="status-doacao status-${esc(d.status)}">${esc(d.status)}</span>${d.observacao ? `<p>${esc(d.observacao)}</p>` : ""}</div><div><ul>${(d.itens || []).map(i => `<li>${esc(i.nome)}: ${i.quantidade} ${esc(i.unidade)}</li>`).join("") || "<li>Sem itens</li>"}</ul><div class="acoes-status"><button class="botao secundario" data-comprovante="${d.id_doacao}">Comprovante / imprimir</button>${proxima.map(([status, label]) => `<button class="botao ${status === "cancelada" ? "secundario" : "primario"}" data-id="${d.id_doacao}" data-status="${status}">${label}</button>`).join("")}</div></div></article>`;
  }).join("") || '<p class="vazio">Nenhuma doação registrada.</p>'}</div>`;
}
function resetFormulario() {
  state.editando = null;
  document.querySelector("#form-doador")?.reset();
  const cancelar = document.querySelector("#cancelar-edicao");
  if (cancelar) cancelar.hidden = true;
  const salvar = document.querySelector("#salvar-doador");
  if (salvar) salvar.textContent = "Cadastrar doador";
}
async function salvarDoador(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(event.currentTarget));
  try {
    if (state.editando) await api(`/api/doadores/${state.editando}`, { method: "PUT", body: JSON.stringify(dados) });
    else await api("/api/doadores", { method: "POST", body: JSON.stringify(dados) });
    resetFormulario();
    await carregar();
    aviso("Doador salvo com sucesso.");
  } catch (e) { aviso(e.message, "erro"); }
}
function editarDoador(id) {
  const d = state.doadores.find(x => x.id_doador === id);
  if (!d) return;
  state.editando = id;
  const f = document.querySelector("#form-doador");
  f.elements.nome.value = d.nome;
  f.elements.email.value = d.email || "";
  f.elements.telefone.value = d.telefone || "";
  document.querySelector("#salvar-doador").textContent = "Salvar alterações";
  document.querySelector("#cancelar-edicao").hidden = false;
  f.scrollIntoView({ behavior: "smooth", block: "center" });
}
async function excluirDoador(id) {
  const d = state.doadores.find(x => x.id_doador === id);
  if (!confirm(`Deseja excluir o doador "${d?.nome}"? Se houver doações vinculadas, a exclusão será bloqueada.`)) return;
  try { await api(`/api/doadores/${id}`, { method: "DELETE" }); await carregar(); aviso("Doador excluído."); }
  catch (e) { aviso(e.message, "erro"); }
}
function adicionarItem() {
  const id = Number(document.querySelector("#item-escolhido").value);
  const quantidade = Number(document.querySelector("#quantidade-item").value);
  const item = state.itens.find(x => x.id_item === id);
  if (!item) return aviso("Selecione um item do catálogo.", "erro");
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > 2147483647) return aviso("Informe uma quantidade inteira válida.", "erro");
  if (state.itemSelecionado.some(x => x.id_item === id)) return aviso("Este item já foi adicionado à doação.", "erro");
  state.itemSelecionado.push({ id_item: id, nome: item.nome, unidade: item.unidade, quantidade });
  render();
}
async function salvarDoacao(event) {
  event.preventDefault();
  if (!state.itemSelecionado.length) return aviso("Adicione pelo menos um item à doação.", "erro");
  const form = Object.fromEntries(new FormData(event.currentTarget));
  const dados = {
    id_doador: Number(form.id_doador), data_doacao: form.data_doacao,
    observacao: form.observacao,
    itens: state.itemSelecionado.map(i => ({ id_item: i.id_item, quantidade: i.quantidade })),
  };
  try {
    await api("/api/doacoes", { method: "POST", body: JSON.stringify(dados) });
    state.itemSelecionado = [];
    await carregar();
    aviso("Doação registrada. Confirme o recebimento para atualizar o estoque.");
  } catch (e) { aviso(e.message, "erro"); }
}

function imprimirComprovante(id) {
  const doacao = state.doacoes.find(item => item.id_doacao === id);
  if (!doacao) return aviso("Doação não encontrada para emissão do comprovante.", "erro");
  const itens = (doacao.itens || []).map(item =>
    `<tr><td>${esc(item.nome)}</td><td>${item.quantidade}</td><td>${esc(item.unidade)}</td></tr>`
  ).join("");
  const janela = window.open("", "_blank");
  if (!janela) return aviso("Permita janelas pop-up para imprimir o comprovante.", "erro");
  janela.opener = null;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante de doação #${id}</title>
    <style>body{font:14px Arial,sans-serif;color:#222;max-width:760px;margin:40px auto;padding:0 24px}h1{color:#155b45}small{color:#666}.linha{border-top:1px solid #ddd;margin:20px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}footer{margin-top:48px;color:#666;font-size:12px}@media print{button{display:none}body{margin:0}}</style></head><body>
    <h1>Mãos que Ajudam</h1><h2>Comprovante de doação #${id}</h2>
    <p><strong>Doador:</strong> ${esc(doacao.doador?.nome || "Não informado")}</p>
    <p><strong>Data:</strong> ${esc(doacao.data_doacao)}</p><p><strong>Status:</strong> ${esc(doacao.status)}</p>
    ${doacao.observacao ? `<p><strong>Observação:</strong> ${esc(doacao.observacao)}</p>` : ""}
    <div class="linha"></div><table><thead><tr><th>Item</th><th>Quantidade</th><th>Unidade</th></tr></thead><tbody>${itens}</tbody></table>
    <footer>Documento gerado pelo sistema Mãos que Ajudam. Este comprovante registra os dados existentes no momento da emissão.</footer>
    <button onclick="window.print()">Imprimir / salvar em PDF</button></body></html>`);
  janela.document.close();
  janela.focus();
}

async function alterarStatus(id, status) {
  const mensagens = { recebida: "Confirmar recebimento? Os itens serão adicionados ao estoque.", distribuida: "Confirmar distribuição? Os itens serão baixados do estoque.", cancelada: "Cancelar esta doação?" };
  if (!confirm(mensagens[status])) return;
  try {
    await api(`/api/doacoes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await carregar();
    aviso("Status atualizado e estoque sincronizado.");
  } catch (e) { aviso(e.message, "erro"); }
}
function imprimirRelatorio() {
  const janela = window.open("", "_blank");
  if (!janela) throw new Error("Permita a abertura de janelas para gerar o relatório.");
  janela.opener = null;
  const linhas = state.doacoes.flatMap(doacao => {
    const itens = doacao.itens?.length ? doacao.itens : [null];
    return itens.map(item => `<tr>
      <td>${doacao.id_doacao}</td>
      <td>${esc(doacao.data_doacao)}</td>
      <td>${esc(doacao.doador?.nome || "—")}</td>
      <td>${esc(item?.nome || "—")}</td>
      <td>${item ? `${item.quantidade} ${esc(item.unidade || "")}` : "—"}</td>
      <td>${esc(doacao.status)}</td>
    </tr>`).join("");
  }).join("");
  const geradoEm = new Date().toLocaleString("pt-BR");
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Relatório de doações — Mãos que Ajudam</title>
    <style>
      body{font:14px Arial,sans-serif;color:#24352b;margin:28px}
      h1{font-size:22px;margin:0 0 6px;color:#155b45}
      p{color:#617168;margin:4px 0 18px}
      .indicadores{display:flex;gap:24px;margin:18px 0}
      .indicadores strong{display:block;font-size:20px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #dce5df;padding:8px;text-align:left}
      th{background:#edf4ef}
      @media print{body{margin:12mm}.nao-imprimir{display:none}}
    </style></head><body>
    <h1>Mãos que Ajudam — Relatório de doações</h1>
    <p>Gerado em ${esc(geradoEm)}</p>
    <div class="indicadores">
      <div><strong>${state.doacoes.length}</strong>Doações registradas</div>
      <div><strong>${state.doacoes.filter(d => d.status === "recebida").length}</strong>Recebidas</div>
      <div><strong>${state.doacoes.filter(d => d.status === "distribuida").length}</strong>Distribuídas</div>
      <div><strong>${state.doacoes.filter(d => d.status === "cancelada").length}</strong>Canceladas</div>
    </div>
    <table><thead><tr><th>ID</th><th>Data</th><th>Doador</th><th>Item</th><th>Quantidade</th><th>Status</th></tr></thead>
    <tbody>${linhas || '<tr><td colspan="6">Nenhuma doação registrada.</td></tr>'}</tbody></table>
    <p class="nao-imprimir">Use a opção “Salvar como PDF” na janela de impressão.</p>
    <script>window.addEventListener("load",()=>window.print());</script>
    </body></html>`);
  janela.document.close();
}
async function salvarAjusteEstoque(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(event.currentTarget));
  dados.id_item = Number(dados.id_item);
  dados.quantidade = Number(dados.quantidade);
  try {
    await api("/api/estoque/movimentacoes", { method: "POST", body: JSON.stringify(dados) });
    await carregar();
    aviso("Movimentação de estoque registrada.", "sucesso");
  } catch (erro) { aviso(erro.message, "erro"); }
}
async function salvarLimiteEstoque(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(event.currentTarget));
  const id = Number(dados.id_item);
  const quantidade_minima = Number(dados.quantidade_minima);
  try {
    await api(`/api/estoque/${id}/limite-minimo`, {
      method: "PATCH", body: JSON.stringify({ quantidade_minima }),
    });
    await carregar();
    aviso("Limite mínimo atualizado.", "sucesso");
  } catch (erro) { aviso(erro.message, "erro"); }
}
async function exportarCSV() {
  const resposta = await fetch("/api/relatorios/doacoes.csv", {
    headers: { Authorization: `Bearer ${state.token}` },
  });
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => ({}));
    throw new Error(dados.erro || "Não foi possível exportar o relatório.");
  }
  const arquivo = await resposta.blob();
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "relatorio-doacoes.csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderLogin(mensagem = "") {
  app.innerHTML = `<main class="login-wrap"><form id="form-login" class="login-card">
    <div class="marca-login"><span class="simbolo" aria-hidden="true">♡</span><div><h1>Mãos que Ajudam</h1><p>Gestão de doações e solidariedade</p></div></div>
    <h2>Acesse sua conta</h2><p class="login-descricao">Entre com as credenciais fornecidas pelo administrador.</p>
    ${mensagem ? `<div class="aviso erro" role="alert">${esc(mensagem)}</div>` : ""}
    <label>E-mail<input name="email" type="email" autocomplete="username" maxlength="100" required></label>
    <label>Senha<input name="senha" type="password" autocomplete="current-password" maxlength="128" required></label>
    <button class="botao primario" type="submit">Entrar</button>
  </form></main>`;
  document.querySelector("#form-login").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Validando...";
    try {
      const dados = Object.fromEntries(new FormData(form));
      const resultado = await api("/api/auth/login", {
        method: "POST", body: JSON.stringify(dados),
      });
      state.token = resultado.token;
      state.usuario = resultado.usuario;
      sessionStorage.setItem("maos_token", resultado.token);
      await api("/api/auth/me");
      await api("/api/health/ready");
      await carregar();
    } catch (erro) {
      renderLogin(erro.message || "Não foi possível entrar.");
    }
  });
}
async function iniciar() {
  if (!state.token) return renderLogin();
  app.innerHTML = '<main class="carregando"><h1>Mãos que Ajudam</h1><p>Validando acesso...</p></main>';
  try {
    state.usuario = await api("/api/auth/me");
    await api("/api/health/ready");
    await carregar();
  } catch (erro) {
    if (erro.status === 401) return renderLogin("Sua sessão expirou. Entre novamente.");
    app.innerHTML = `<main class="falha"><h1>Mãos que Ajudam</h1><p>Não foi possível carregar os dados do sistema.</p><p>${esc(erro.message)}</p><button class="botao primario" id="tentar">Tentar novamente</button><button class="botao secundario" id="voltar-login">Voltar ao login</button></main>`;
    document.querySelector("#tentar").addEventListener("click", iniciar);
    document.querySelector("#voltar-login").addEventListener("click", () => {
      state.token = null;
      state.usuario = null;
      sessionStorage.removeItem("maos_token");
      renderLogin();
    });
  }
}
iniciar();
