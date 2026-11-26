import "./style.css";

document.querySelector("#app").innerHTML = `
  <main>
    <h1>Mãos que Ajudam</h1>
    <p>Status da API: <strong id="api-status">Verificando...</strong></p>
    <p id="api-time"></p>
  </main>
`;

async function checkApi() {
  const statusElement = document.querySelector("#api-status");
  const timeElement = document.querySelector("#api-time");

  try {
    const response = await fetch("/api/health");

    if (!response.ok) {
      throw new Error("Falha na comunicação com a API");
    }

    const data = await response.json();

    statusElement.textContent = data.status;
    timeElement.textContent = `Data e hora: ${new Date(data.timestamp).toLocaleString("pt-BR")}`;
  } catch (error) {
    statusElement.textContent = "Erro";
    timeElement.textContent = "Não foi possível conectar à API.";
    console.error(error);
  }
}

checkApi();
