import "./style.css";

const app = document.querySelector("#app");
const state = { doadores: [], itens: [], doacoes: [], editando: null, itemSelecionado: [] };

const hoje = () => new Date().toISOString().slice(0, 10);
const esc = (valor = "") => String(valor).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]);
const api = async (rota, opcoes = {}) => {
  const resposta = await fetch(rota, { ...opcoes, headers: { "Content-Type":"application/json", ...(opcoes.headers || {}) } });
  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!resposta.ok) throw new Error(dados?.erro || dados?.message || `Erro HTTP ${resposta.status}`);
  return dados;
};
const aviso = (mensagem, tipo = "sucesso") => {
  const el = document.querySelector("#aviso");
  el.textContent = mensagem;
  el.className = `aviso ${tipo}`;
  el.hidden = false;
  window.clearTimeout(aviso.timer);
  aviso.timer = window.setTimeout(() => { el.hidden = true; }, 5000);
};
const carregar = async () => {
  const [doadores, itens, doacoes] = await Promise.all([
    api("/api/doadores"), api("/api/itens"), api("/api/doacoes")
  ]);
  state.doadores = doadores; state.itens = itens; state.doacoes = doacoes;
  render();
};
const resetFormulario = () => { state.editando = null; document.querySelector("#form-doador")?.reset(); document.querySelector("#cancelar-edicao").hidden = true; document.querySelector("#salvar-doador").textContent = "Cadastrar doador"; };
function render() {
  app.innerHTML = `
    <header class="topo"><div class="marca"><span class="simbolo">♡</span><div><h1>Mãos que Ajudam</h1><p>Gestão de doações e solidariedade</p></div></div><div class="status"><span class="ponto"></span> API conectada</div></header>
    <main>
      <div id="aviso" class="aviso" role="status" hidden></div>
      <section class="resumo">
        <article><span>Doadores cadastrados</span><strong>${state.doadores.length}</strong></article>
        <article><span>Itens no catálogo</span><strong>${state.itens.length}</strong></article>
        <article><span>Doações registradas</span><strong>${state.doacoes.length}</strong></article>
      </section>
      <nav class="abas"><button class="aba ativa" data-aba="doadores">Doadores</button><button class="aba" data-aba="doacoes">Doações</button><button class="aba" data-aba="catalogo">Catálogo de itens</button></nav>
      <section id="painel-doadores" class="painel">
        <div class="cabecalho-secao"><div><h2>Doadores</h2><p>Cadastre e mantenha os dados dos doadores.</p></div><button class="botao secundario" id="atualizar">Atualizar dados</button></div>
        <form id="form-doador" class="formulario">
          <label>Nome completo<input name="nome" maxlength="150" required placeholder="Nome do doador"></label>
          <label>E-mail<input name="email" type="email" maxlength="100" placeholder="email@exemplo.com"></label>
          <label>Telefone<input name="telefone" maxlength="20" placeholder="(11) 99999-9999"></label>
          <div class="acoes"><button class="botao primario" id="salvar-doador" type="submit">Cadastrar doador</button><button class="botao secundario" id="cancelar-edicao" type="button" hidden>Cancelar edição</button></div>
        </form>
        <div class="tabela-wrap"><table><thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>
        ${state.doadores.map(d => `<tr><td>${d.id_doador}</td><td>${esc(d.nome)}</td><td>${esc(d.email || "—")}</td><td>${esc(d.telefone || "—")}</td><td>${esc(d.data_cadastro || "—")}</td><td class="acoes-tabela"><button class="link" data-editar="${d.id_doador}">Editar</button><button class="link perigo" data-excluir="${d.id_doador}">Excluir</button></td></tr>`).join("") || '<tr><td colspan="6" class="vazio">Nenhum doador cadastrado.</td></tr>'}
        </tbody></table></div>
      </section>
      <section id="painel-doacoes" class="painel" hidden>
        <div class="cabecalho-secao"><div><h2>Registrar doação</h2><p>Associe um doador a um ou mais itens do catálogo.</p></div></div>
        <form id="form-doacao" class="formulario">
          <label>Doador<select name="id_doador" required><option value="">Selecione um doador</option>${state.doadores.map(d=>`<option value="${d.id_doador}">${esc(d.nome)}</option>`).join("")}</select></label>
          <label>Data da doação<input name="data_doacao" type="date" value="${hoje()}" required></label>
          <label class="campo-largo">Observação<input name="observacao" maxlength="255" placeholder="Informações adicionais (opcional)"></label>
          <div class="itens-doacao campo-largo"><h3>Itens da doação</h3><div class="adicionar-item"><select id="item-escolhido"><option value="">Selecione um item</option>${state.itens.map(i=>`<option value="${i.id_item}">${esc(i.nome)} — ${esc(i.categoria)} (${esc(i.unidade)})</option>`).join("")}</select><input id="quantidade-item" type="number" min="1" step="1" value="1" aria-label="Quantidade"><button type="button" class="botao secundario" id="adicionar-item">Adicionar item</button></div><ul id="lista-itens">${state.itemSelecionado.map((x,n)=>`<li>${esc(x.nome)} — ${x.quantidade} ${esc(x.unidade)} <button type="button" class="link perigo" data-remover-item="${n}">Remover</button></li>`).join("") || '<li class="vazio">Nenhum item adicionado.</li>'}</ul></div>
          <div class="acoes"><button class="botao primario" type="submit">Registrar doação</button></div>
        </form>
        <div class="cabecalho-secao historico-titulo"><div><h2>Histórico de doações</h2><p>Registros armazenados no banco de dados.</p></div></div>
        <div class="historico">${state.doacoes.map(d=>`<article class="doacao"><div><strong>Doação #${d.id_doacao}</strong><span>${esc(d.data_doacao)} · ${esc(d.doador?.nome || "Doador")}</span>${d.observacao ? `<p>${esc(d.observacao)}</p>` : ""}</div><ul>${(d.itens || []).map(i=>`<li>${esc(i.nome)}: ${i.quantidade} ${esc(i.unidade)}</li>`).join("") || "<li>Sem itens</li>"}</ul></article>`).join("") || '<p class="vazio">Nenhuma doação registrada.</p>'}</div>
      </section>
      <section id="painel-catalogo" class="painel" hidden><div class="cabecalho-secao"><div><h2>Catálogo de itens</h2><p>Itens disponíveis para compor uma doação.</p></div></div><div class="grade-itens">${state.itens.map(i=>`<article class="item-card"><span>${esc(i.categoria)}</span><h3>${esc(i.nome)}</h3><p>Unidade: ${esc(i.unidade)}</p><small>Código #${i.id_item}</small></article>`).join("") || '<p class="vazio">Nenhum item cadastrado no catálogo.</p>'}</div></section>
      <footer>Projeto Integrador Extensionista II · Mãos que Ajudam</footer>
    </main>`;
  app.querySelectorAll("[data-aba]").forEach(b=>b.addEventListener("click",()=>{app.querySelectorAll(".aba").forEach(x=>x.classList.toggle("ativa",x===b));["doadores","doacoes","catalogo"].forEach(n=>document.querySelector("#painel-"+n).hidden=n!==b.dataset.aba);}));
  document.querySelector("#atualizar").addEventListener("click",()=>carregar().catch(e=>aviso(e.message,"erro")));
  document.querySelector("#form-doador").addEventListener("submit", salvarDoador);
  document.querySelector("#cancelar-edicao").addEventListener("click",()=>{resetFormulario();});
  app.querySelectorAll("[data-editar]").forEach(b=>b.addEventListener("click",()=>editarDoador(Number(b.dataset.editar))));
  app.querySelectorAll("[data-excluir]").forEach(b=>b.addEventListener("click",()=>excluirDoador(Number(b.dataset.excluir))));
  document.querySelector("#adicionar-item").addEventListener("click", adicionarItem);
  app.querySelectorAll("[data-remover-item]").forEach(b=>b.addEventListener("click",()=>{state.itemSelecionado.splice(Number(b.dataset.removerItem),1);render();document.querySelector('[data-aba="doacoes"]').click();}));
  document.querySelector("#form-doacao").addEventListener("submit", salvarDoacao);
}
async function salvarDoador(event) {
  event.preventDefault();
  const dados=Object.fromEntries(new FormData(event.currentTarget));
  try {
    if(state.editando) await api("/api/doadores/"+state.editando,{method:"PUT",body:JSON.stringify(dados)});
    else await api("/api/doadores",{method:"POST",body:JSON.stringify(dados)});
    state.editando=null; await carregar(); aviso("Doador salvo com sucesso.");
  } catch(e){aviso(e.message,"erro");}
}
function editarDoador(id) {
  const d=state.doadores.find(x=>x.id_doador===id); if(!d)return;
  state.editando=id; const f=document.querySelector("#form-doador");
  f.elements.nome.value=d.nome; f.elements.email.value=d.email||""; f.elements.telefone.value=d.telefone||"";
  document.querySelector("#salvar-doador").textContent="Salvar alterações";
  document.querySelector("#cancelar-edicao").hidden=false; f.scrollIntoView({behavior:"smooth",block:"center"});
}
async function excluirDoador(id) {
  const d=state.doadores.find(x=>x.id_doador===id);
  if(!confirm(`Deseja excluir o doador "${d?.nome}"? Se houver doações vinculadas, o banco impedirá a exclusão.`))return;
  try { await api("/api/doadores/"+id,{method:"DELETE"}); await carregar(); aviso("Doador excluído."); }
  catch(e){aviso(e.message,"erro");}
}
function adicionarItem() {
  const id=Number(document.querySelector("#item-escolhido").value);
  const quantidade=Number(document.querySelector("#quantidade-item").value);
  const item=state.itens.find(x=>x.id_item===id);
  if(!item){aviso("Selecione um item do catálogo.","erro");return;}
  if(!Number.isInteger(quantidade)||quantidade<=0){aviso("Informe uma quantidade inteira maior que zero.","erro");return;}
  if(state.itemSelecionado.some(x=>x.id_item===id)){aviso("Este item já foi adicionado à doação.","erro");return;}
  state.itemSelecionado.push({id_item:id,nome:item.nome,unidade:item.unidade,quantidade});
  render(); document.querySelector('[data-aba="doacoes"]').click();
}
async function salvarDoacao(event) {
  event.preventDefault();
  if(!state.itemSelecionado.length){aviso("Adicione pelo menos um item à doação.","erro");return;}
  const form=Object.fromEntries(new FormData(event.currentTarget));
  const dados={id_doador:Number(form.id_doador),data_doacao:form.data_doacao,observacao:form.observacao,itens:state.itemSelecionado.map(i=>({id_item:i.id_item,quantidade:i.quantidade}))};
  try { await api("/api/doacoes",{method:"POST",body:JSON.stringify(dados)}); state.itemSelecionado=[]; await carregar(); aviso("Doação registrada com sucesso."); }
  catch(e){aviso(e.message,"erro");}
}
async function iniciar() {
  app.innerHTML='<main class="carregando"><h1>Mãos que Ajudam</h1><p>Conectando ao sistema...</p></main>';
  try { await api("/api/health"); await carregar(); }
  catch(e){app.innerHTML='<main class="falha"><h1>Mãos que Ajudam</h1><p>Não foi possível carregar os dados do sistema.</p><p>'+esc(e.message)+'</p><button class="botao primario" id="tentar">Tentar novamente</button></main>';document.querySelector("#tentar").addEventListener("click",iniciar);}
}
iniciar();
