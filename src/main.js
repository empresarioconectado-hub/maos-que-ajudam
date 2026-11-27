import "./style.css";

const app = document.querySelector("#app");
const state = {
  doadores: [], itens: [], doacoes: [], estoque: [], resumo: null,
  editando: null, itemSelecionado: [], aba: "inicio",
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
    headers: { ...(opcoes.body ? { "Content-Type": "application/json" } : {}), ...(opcoes.headers || {}) },
  });
  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!resposta.ok) {
    const erro = new Error(dados?.erro || dados?.message || `Erro HTTP ${resposta.status}`);
    erro.status = resposta.status;
    erro.requestId = resposta.headers.get("X-Request-Id") || dados?.requestId;
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
  const [doadores, itens, doacoes, estoque, resumo] = await Promise.all([
    api("/api/doadores"), api("/api/itens"), api("/api/doacoes"),
    api("/api/estoque"), api("/api/relatorios/resumo"),
  ]);
  state.doadores = doadores;
  state.itens = itens;
  state.doacoes = doacoes;
  state.estoque = estoque;
  state.resumo = resumo;
  render();
}
function mudarAba(aba) {
  state.aba = aba;
  render();
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
      <div class="status"><span class="ponto"></span> API conectada</div>
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
        <div class="cabecalho-secao historico-titulo"><div><h2>Últimas doações</h2><p>Registros mais recentes.</p></div><a class="botao secundario" href="/api/relatorios/doacoes.csv">Exportar CSV</a></div>
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
        ${state.doadores.map(d => `<tr><td>${d.id_doador}</td><td>${esc(d.nome)}</td><td>${esc(d.email || "—")}</td><td>${esc(d.telefone || "—")}</td><td>${esc(d.data_cadastro || "—")}</td><td class="acoes-tabela"><button class="link" data-editar="${d.id_doador}">Editar</button><button class="link perigo" data-excluir="${d.id_doador}">Excluir</button></td></tr>`).join("") || '<tr><td colspan="6" class="vazio">Nenhum doador cadastrado.</td></tr>'}
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
        <div class="cabecalho-secao historico-titulo"><div><h2>Histórico de doações</h2><p>Atualize o andamento conforme o recebimento e a distribuição.</p></div><a class="botao secundario" href="/api/relatorios/doacoes.csv">Exportar CSV</a></div>
        ${renderHistorico(state.doacoes)}
      </section>
      <section class="painel" id="painel-estoque" ${state.aba !== "estoque" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Estoque</h2><p>O saldo aumenta quando uma doação é recebida e diminui quando é distribuída.</p></div><button class="botao secundario" id="atualizar-estoque">Atualizar</button></div>
        <div class="tabela-wrap"><table><thead><tr><th>Item</th><th>Categoria</th><th>Unidade</th><th>Saldo atual</th><th>Atualizado em</th></tr></thead><tbody>
        ${state.estoque.map(i => `<tr><td>${esc(i.nome)}</td><td>${esc(i.categoria)}</td><td>${esc(i.unidade)}</td><td><strong>${i.quantidade_atual}</strong></td><td>${esc(i.atualizado_em || "—")}</td></tr>`).join("") || '<tr><td colspan="5" class="vazio">Nenhum item no estoque.</td></tr>'}
        </tbody></table></div>
      </section>
      <section class="painel" id="painel-catalogo" ${state.aba !== "catalogo" ? "hidden" : ""}>
        <div class="cabecalho-secao"><div><h2>Catálogo de itens</h2><p>Itens disponíveis para compor uma doação.</p></div></div>
        <div class="grade-itens">${state.itens.map(i => `<article class="item-card"><span>${esc(i.categoria)}</span><h3>${esc(i.nome)}</h3><p>Unidade: ${esc(i.unidade)}</p><small>Código #${i.id_item}</small></article>`).join("") || '<p class="vazio">Nenhum item cadastrado no catálogo.</p>'}</div>
      </section>
      <footer>Projeto Integrador Extensionista II · Mãos que Ajudam</footer>
    </main>`;

  app.querySelectorAll("[data-aba]").forEach(b => b.addEventListener("click", () => mudarAba(b.dataset.aba)));
  document.querySelector("#atualizar")?.addEventListener("click", () => carregar().catch(e => aviso(e.message, "erro")));
  document.querySelector("#atualizar-doadores")?.addEventListener("click", () => carregar().catch(e => aviso(e.message, "erro")));
  document.querySelector("#atualizar-estoque")?.addEventListener("click", () => carregar().catch(e => aviso(e.message, "erro")));
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
}
function renderHistorico(doacoes) {
  return `<div class="historico">${doacoes.map(d => {
    const proxima = d.status === "registrada" ? [["recebida", "Confirmar recebimento"], ["cancelada", "Cancelar"]] :
      d.status === "recebida" ? [["distribuida", "Confirmar distribuição"]] : [];
    return `<article class="doacao"><div><strong>Doação #${d.id_doacao}</strong><span>${esc(d.data_doacao)} · ${esc(d.doador?.nome || "Doador")}</span><span class="status-doacao status-${esc(d.status)}">${esc(d.status)}</span>${d.observacao ? `<p>${esc(d.observacao)}</p>` : ""}</div><div><ul>${(d.itens || []).map(i => `<li>${esc(i.nome)}: ${i.quantidade} ${esc(i.unidade)}</li>`).join("") || "<li>Sem itens</li>"}</ul><div class="acoes-status">${proxima.map(([status, label]) => `<button class="botao ${status === "cancelada" ? "secundario" : "primario"}" data-id="${d.id_doacao}" data-status="${status}">${label}</button>`).join("")}</div></div></article>`;
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
async function alterarStatus(id, status) {
  const mensagens = { recebida: "Confirmar recebimento? Os itens serão adicionados ao estoque.", distribuida: "Confirmar distribuição? Os itens serão baixados do estoque.", cancelada: "Cancelar esta doação?" };
  if (!confirm(mensagens[status])) return;
  try {
    await api(`/api/doacoes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await carregar();
    aviso("Status atualizado e estoque sincronizado.");
  } catch (e) { aviso(e.message, "erro"); }
}
async function iniciar() {
  app.innerHTML = '<main class="carregando"><h1>Mãos que Ajudam</h1><p>Conectando ao sistema...</p></main>';
  try { await api("/api/health/ready"); await carregar(); }
  catch (e) {
    app.innerHTML = `<main class="falha"><h1>Mãos que Ajudam</h1><p>Não foi possível carregar os dados do sistema.</p><p>${esc(e.message)}</p><button class="botao primario" id="tentar">Tentar novamente</button></main>`;
    document.querySelector("#tentar").addEventListener("click", iniciar);
  }
}
iniciar();
