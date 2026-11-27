# Mãos que Ajudam

Sistema web para organizar o cadastro de doadores, o catálogo de itens e o registro de doações de uma organização social. O projeto foi desenvolvido no contexto do Projeto Integrador Extensionista II (PIE II), com foco na aplicação prática de modelagem relacional, desenvolvimento web e integração entre frontend, API REST e banco de dados.

## Visão geral

A aplicação permite manter os dados dos doadores, consultar os itens disponíveis e registrar doações compostas por um ou mais itens. Cada registro mantém o vínculo com o doador e armazena as quantidades dos itens entregues.

### Funcionalidades

- Cadastro, consulta, edição e exclusão de doadores.
- Consulta do catálogo de itens, organizado por categoria.
- Registro de doações com data, observação opcional e múltiplos itens.
- Histórico de doações com identificação do doador e detalhamento dos itens.
- Indicadores com totais de doadores, itens e doações.
- Validação de dados no servidor e tratamento padronizado de erros.
- Verificação de disponibilidade da API e da conexão com o banco.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | HTML, CSS e JavaScript |
| Desenvolvimento e build | Vite+ |
| API | Node.js e Express 5 |
| Banco de dados | MariaDB / MySQL |
| Acesso ao banco | mysql2/promise |
| Configuração | dotenv |
| Testes | Node.js Test Runner |
| Integração contínua | GitHub Actions |
| Contrato da API | OpenAPI 3.0.3 |

## Arquitetura

O projeto adota uma arquitetura simples em três camadas:

1. **Frontend:** interface web responsável pela interação com o usuário.
2. **Backend:** API REST responsável pelas regras de validação, operações e respostas HTTP.
3. **Persistência:** banco relacional responsável pelo armazenamento e integridade dos dados.

O frontend acessa a API por meio de requisições HTTP. Durante o desenvolvimento, o Vite encaminha as chamadas `/api` para o servidor Express.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para o fluxo da aplicação e a organização dos diretórios.

## Modelo de dados

O banco utiliza cinco tabelas:

- `doador`: dados cadastrais dos doadores.
- `categoria`: classificação dos itens.
- `item`: catálogo de itens disponíveis.
- `doacao`: registro principal de cada doação.
- `doacao_item`: tabela associativa que registra os itens e suas quantidades.

Relacionamentos:

- Um doador pode realizar várias doações (1:N).
- Uma categoria pode agrupar vários itens (1:N).
- Uma doação pode conter vários itens, e um item pode aparecer em várias doações (N:N), resolvido por `doacao_item`.

O esquema utiliza chaves primárias, chaves estrangeiras, restrições de unicidade e verificação de quantidade positiva. A exclusão de doadores ou itens com histórico vinculado é restringida pelo banco.

Detalhes: [docs/DATABASE.md](docs/DATABASE.md).

## Requisitos

- Node.js 22.
- npm.
- MariaDB 10.11+ ou MySQL 8+.
- Git.
- Extensão REST Client no Visual Studio Code (opcional, para executar `api.http`).

## Instalação e execução local

### 1. Obter o código e instalar dependências

```bash
git clone https://github.com/empresarioconectado-hub/maos-que-ajudam.git
cd maos-que-ajudam
npm install
```

### 2. Criar o banco de dados

Com um usuário autorizado a criar bancos e tabelas, execute:

```bash
mariadb -u root -p < database/schema.sql
```

O comando também pode ser executado pelo cliente MySQL. O script cria a estrutura caso ela ainda não exista e não contém comandos para apagar tabelas ou registros.

### 3. Carregar dados de demonstração (opcional)

```bash
mariadb -u root -p < database/seed.sql
```

O arquivo inclui categorias, itens e um doador fictício para facilitar a avaliação local. Os comandos foram preparados para evitar duplicações quando executados novamente.

### 4. Configurar variáveis de ambiente

Copie o modelo e edite as credenciais conforme sua instalação:

```bash
cp .env.example .env
```

Exemplo de configuração:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=maos_app
DB_PASSWORD=sua_senha_local
DB_NAME=maos_que_ajudam
PORT=3000
```

Crie previamente o usuário do banco e conceda somente as permissões necessárias ao schema da aplicação. Não utilize credenciais administrativas em uma instalação compartilhada ou publicada.

**Importante:** o arquivo `.env` contém credenciais e não deve ser versionado. O repositório fornece apenas o modelo `.env.example`.

### 5. Iniciar a API

Em um terminal:

```bash
npm run api
```

Por padrão, a API ficará disponível em `http://localhost:3000`.

Verifique a conexão:

```bash
curl http://localhost:3000/api/health
```

A resposta esperada contém `status: "ok"` e `database: "connected"`.

### 6. Iniciar o frontend

Em outro terminal:

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173). O proxy configurado no Vite encaminha as chamadas `/api` para o backend local.

## API REST

A API utiliza JSON e está organizada pelos seguintes recursos:

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica a API e a conexão com o banco |
| GET | `/api/doadores` | Lista os doadores |
| GET | `/api/doadores/:id` | Consulta um doador |
| POST | `/api/doadores` | Cadastra um doador |
| PUT | `/api/doadores/:id` | Atualiza um doador |
| DELETE | `/api/doadores/:id` | Exclui um doador sem vínculos |
| GET | `/api/itens` | Lista itens e categorias |
| GET | `/api/doacoes` | Lista doações com doador e itens |
| POST | `/api/doacoes` | Registra uma doação e seus itens |

### Exemplo: registrar uma doação

```http
POST /api/doacoes
Content-Type: application/json

{
  "id_doador": 1,
  "data_doacao": "2026-11-27",
  "observacao": "Arrecadação comunitária",
  "itens": [
    { "id_item": 1, "quantidade": 4 },
    { "id_item": 4, "quantidade": 2 }
  ]
}
```

O registro principal e seus itens são gravados dentro de uma única transação. Se uma etapa falhar, a operação é revertida para evitar uma doação parcialmente persistida.

O contrato completo está em [openapi.yaml](openapi.yaml). Os exemplos de requisições manuais estão em [api.http](api.http). Consulte [docs/API.md](docs/API.md) para formatos, códigos HTTP e exemplos adicionais.

## Validação e tratamento de erros

A API valida os dados recebidos antes de executar as operações no banco. As consultas utilizam parâmetros, e o tratamento centralizado evita expor detalhes internos ao cliente.

| Código HTTP | Uso |
|---|---|
| 200 | Consulta ou atualização concluída |
| 201 | Recurso criado |
| 204 | Exclusão concluída sem corpo de resposta |
| 400 | Dados inválidos ou referência informada inválida |
| 404 | Recurso ou rota não encontrado |
| 409 | Conflito de unicidade ou exclusão impedida por vínculo |
| 413 | Corpo da requisição acima do limite configurado |
| 500 | Erro interno não tratado |

## Testes e qualidade

Execute os testes automatizados:

```bash
npm test
```

Os testes atuais cobrem funções de validação e normalização de dados. Eles não substituem testes de integração com MariaDB nem testes de interface em navegador.

Para executar os cenários HTTP manualmente:

1. Inicie a API e o banco.
2. Abra `api.http` no VS Code com a extensão REST Client.
3. Execute as requisições na ordem indicada.
4. Ajuste os IDs de doador e item conforme os dados existentes.

O arquivo inclui cenários para cadastro, atualização, exclusão, validação, conflito HTTP 409, referência inexistente e rollback de doação.

### Integração contínua

O workflow em `.github/workflows/ci.yml` é executado em pushes e pull requests direcionados à branch `master`. Atualmente, instala as dependências, prepara o Vite+, executa os testes automatizados e gera o build do frontend.

## Estrutura do repositório

```text
.
├── .github/
│   └── workflows/ci.yml
├── database/
│   ├── schema.sql
│   └── seed.sql
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── DATABASE.md
│   └── SECURITY.md
├── public/
├── server/
│   ├── routes/
│   ├── db.js
│   ├── erros.js
│   ├── index.js
│   └── validacao.js
├── src/
│   ├── main.js
│   └── style.css
├── tests/
│   └── validacao.test.js
├── .env.example
├── api.http
├── openapi.yaml
├── package.json
└── README.md
```

## Documentação complementar

- [Arquitetura e organização do código](docs/ARCHITECTURE.md)
- [Modelo e estrutura do banco de dados](docs/DATABASE.md)
- [Referência de endpoints e exemplos](docs/API.md)
- [Diretrizes de contribuição](docs/CONTRIBUTING.md)
- [Política de segurança](docs/SECURITY.md)

## Escopo e limitações conhecidas

Esta versão é um projeto acadêmico funcional, voltado ao gerenciamento básico de doadores, catálogo e doações. Antes de utilizá-lo em produção, ainda seriam necessários, entre outros pontos:

- Autenticação, autorização e gestão de perfis.
- Proteção contra abuso, rate limiting e política de CORS adequada ao ambiente.
- HTTPS, gestão segura de segredos e configuração de produção.
- Migrações versionadas e estratégia de backup/restauração.
- Testes automatizados de integração da API e testes ponta a ponta.
- Monitoramento, logs estruturados e processo de implantação.
- Revisão de privacidade e definição de retenção dos dados pessoais.

Não há autenticação implementada nesta versão. A API não deve ser exposta publicamente nem utilizada para armazenar dados reais sensíveis sem os controles adicionais.

## Contexto acadêmico

Projeto desenvolvido como parte do Projeto Integrador Extensionista II (PIE II), no curso de Análise e Desenvolvimento de Sistemas. O repositório registra a implementação técnica e os artefatos de apoio à atividade, incluindo esquema SQL, carga de demonstração, API REST, contrato OpenAPI e testes.

## Licença

Nenhuma licença de distribuição foi definida neste repositório. Até que uma licença seja incluída, todos os direitos permanecem reservados aos respectivos titulares.
