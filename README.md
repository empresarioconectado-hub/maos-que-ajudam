# Mãos que Ajudam

Projeto Integrador Extensionista II — API de apoio à ONG Mãos que Ajudam.

## Tecnologias

- Node.js e Express 5
- MySQL/MariaDB
- mysql2 com consultas parametrizadas
- Vite+ no frontend

## Requisitos

- Node.js 22 ou compatível com as dependências do projeto
- npm
- MySQL 8+ ou MariaDB 10.11+
- Extensão REST Client no VS Code (opcional, para executar \`api.http\`)

## Configuração

1. Instale as dependências:

   \`\`\`bash
   npm install
   \`\`\`

   O comando instala \`dotenv\` e \`mysql2\` e atualiza o \`package-lock.json\` conforme o \`package.json\`.

2. Crie o banco e as tabelas em um banco novo:

   \`\`\`bash
   mariadb -u root -p < database/schema.sql
   \`\`\`

   O script usa \`CREATE DATABASE IF NOT EXISTS\` e \`CREATE TABLE IF NOT EXISTS\`; não contém DROP e não apaga registros. Ele é destinado à criação inicial, não substitui migrações para tabelas já existentes.

3. (Opcional) Insira categorias e itens de demonstração:

   \`\`\`bash
   mariadb -u root -p < database/seed.sql
   \`\`\`

4. Copie \`.env.example\` para \`.env\` e preencha as credenciais locais do MariaDB:

   \`\`\`bash
   cp .env.example .env
   \`\`\`

   Nunca envie o arquivo \`.env\` ao GitHub.

5. Inicie a API:

   \`\`\`bash
   npm run api
   \`\`\`

6. Em outro terminal, inicie o frontend:

   \`\`\`bash
   npm run dev
   \`\`\`

   Acesse http://localhost:5173. A API usa http://localhost:3000.

## Interface web

O frontend disponibiliza uma interface responsiva em `http://localhost:5173` com:
- Cadastro, listagem, edição e exclusão de doadores;
- Consulta do catálogo de itens;
- Registro de doações com seleção de múltiplos itens e quantidades;
- Histórico de doações com identificação do doador e itens registrados;
- Indicadores de quantidade de doadores, itens e doações.

A interface consome as rotas REST da API e apresenta mensagens para erros de validação e conflitos de integridade (por exemplo, tentativa de excluir doador com doação vinculada).

## Modelo relacional

- **doador 1:N doacao**: um doador pode realizar várias doações.
- **categoria 1:N item**: cada item pertence a uma categoria.
- **doacao N:N item**: relacionamento resolvido por \`doacao_item\`, que armazena a quantidade.

As chaves estrangeiras protegem a integridade referencial. O histórico impede excluir doadores vinculados a doações e itens vinculados a registros.

## Endpoints

| Método | Rota | Finalidade |
|---|---|---|
| GET | \`/api/health\` | Verificar API e banco |
| GET | \`/api/doadores\` | Listar doadores |
| GET | \`/api/doadores/:id\` | Consultar doador |
| POST | \`/api/doadores\` | Cadastrar doador |
| PUT | \`/api/doadores/:id\` | Atualizar doador |
| DELETE | \`/api/doadores/:id\` | Excluir doador sem vínculos |
| GET | \`/api/itens\` | Listar catálogo de itens |
| GET | \`/api/doacoes\` | Listar doações com doador e itens |
| POST | \`/api/doacoes\` | Registrar doação e seus itens |

### Exemplo de cadastro de doação

\`\`\`json
{
  "id_doador": 1,
  "data_doacao": "2026-11-27",
  "observacao": "Arrecadação da escola",
  "itens": [
    { "id_item": 1, "quantidade": 4 },
    { "id_item": 4, "quantidade": 6 }
  ]
}
\`\`\`

A rota de doações valida todos os dados e grava a doação e seus itens em uma única transação. Em caso de falha, executa ROLLBACK; em caso de sucesso, COMMIT.

## Validações e segurança

- Consultas SQL usam parâmetros \`?\`; valores recebidos nunca são concatenados ao SQL.
- As consultas selecionam somente os campos necessários, sem \`SELECT *\`.
- Validação no servidor para nome, e-mail, telefone, data, IDs, itens e quantidades.
- E-mail duplicado retorna HTTP 409.
- IDs e dados inválidos retornam HTTP 400.
- Recursos inexistentes retornam HTTP 404.
- Exclusões bloqueadas por chave estrangeira retornam HTTP 409.
- Erros internos retornam mensagem genérica; detalhes técnicos ficam apenas no log do servidor.
- O middleware centralizado trata JSON malformado, payload excessivo, erros de banco e rotas inexistentes.

## Testes manuais

Com a API em execução, abra \`api.http\` no VS Code com a extensão REST Client. Execute as requisições em sequência e ajuste os IDs conforme as respostas do banco. O arquivo inclui testes de CRUD, validação, integridade referencial e rollback.

## Contrato OpenAPI

O contrato da API está em `openapi.yaml` (OpenAPI 3.0.3), incluindo os endpoints de saúde, doadores, catálogo de itens e doações. Ele foi reconstruído com base na implementação atual da Atividade 2 porque o arquivo original do PIE I não estava presente no repositório. Se houver um contrato oficial anterior, compare-o e preserve eventuais convenções exigidas pela disciplina.

## Cenários HTTP 409

O arquivo `api.http` contém dois cenários explícitos:
- Cadastro de doador com e-mail já utilizado (esperado HTTP 409).
- Exclusão de doador que possui doação vinculada (esperado HTTP 409).

Execute o primeiro após a requisição de cadastro com o mesmo e-mail. Para o segundo, ajuste o ID para um doador que realmente possua doação. O resultado depende dos dados existentes no banco.
