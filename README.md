# Mãos que Ajudam

Sistema web para organizar o cadastro de doadores, consultar o catálogo de itens e registrar doações. O projeto foi desenvolvido no contexto do Projeto Integrador Extensionista II (PIE II), com foco na aplicação prática de modelagem relacional, desenvolvimento web e integração entre frontend, API REST e banco de dados.

## Funcionalidades

- Cadastro, consulta, edição e exclusão de doadores.
- Pesquisa de doadores por nome, e-mail ou telefone.
- Paginação opcional da listagem de doadores.
- Consulta do catálogo de itens por categoria.
- Registro de doações com data, observação e múltiplos itens.
- Histórico de doações.
- Indicadores de doadores, itens e doações.
- Validação de dados no backend e transação para registrar doações.
- Verificações de liveness e readiness da API.
- Identificador de requisição para rastrear erros.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | HTML, CSS e JavaScript |
| Build | Vite+ |
| API | Node.js 22 e Express 5 |
| Banco | MariaDB / MySQL |
| Driver | mysql2/promise |
| Configuração | dotenv |
| Testes | Node.js Test Runner |
| CI | GitHub Actions |
| Contrato | OpenAPI 3.0.3 |

## Requisitos

- Node.js 22 e npm.
- MariaDB 10.11+ ou MySQL 8+.
- Git.

## Instalação local

```bash
git clone https://github.com/empresarioconectado-hub/maos-que-ajudam.git
cd maos-que-ajudam
npm install
mariadb -u root -p < database/schema.sql
cp .env.example .env
```

Configure o arquivo `.env`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=maos_app
DB_PASSWORD=sua_senha_local
DB_NAME=maos_que_ajudam
PORT=3000
```

Crie um usuário de banco dedicado e conceda apenas as permissões necessárias. Não use a conta administrativa em uma instalação compartilhada.

Em terminais separados, execute:

```bash
npm run api
npm run dev
```

A interface ficará disponível na URL exibida pelo Vite (normalmente `http://localhost:5173`) e a API em `http://localhost:3000`.

Para dados fictícios de demonstração, execute opcionalmente:

```bash
mariadb -u root -p < database/seed.sql
```

## Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/health` | Saúde da API e banco |
| GET | `/api/health/live` | Liveness do processo |
| GET | `/api/health/ready` | Readiness do banco |
| GET/POST | `/api/doadores` | Listagem e cadastro |
| GET/PUT/DELETE | `/api/doadores/:id` | Consulta, edição e exclusão |
| GET | `/api/itens` | Catálogo |
| GET/POST | `/api/doacoes` | Consulta e registro de doações |

A listagem de doadores aceita `page`, `limit` e `q`. Exemplo: `GET /api/doadores?page=1&limit=20&q=ana`. O limite máximo é 100. Sem esses parâmetros, a API preserva o array utilizado pelo frontend atual.

Consulte [docs/API.md](docs/API.md) e [openapi.yaml](openapi.yaml) para o contrato e exemplos.

## Testes e build

```bash
npm test
npm run build
```

Os testes atuais cobrem validações de entrada, normalização e regras da paginação. O workflow de CI executa os testes e o build. Testes unitários não substituem testes de integração com MariaDB ou testes ponta a ponta em navegador.

## Banco de dados

O modelo relacional contém as tabelas `doador`, `categoria`, `item`, `doacao` e `doacao_item`. O schema está em [database/schema.sql](database/schema.sql); os dados fictícios estão em [database/seed.sql](database/seed.sql).

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Banco de dados](docs/DATABASE.md)
- [Contribuição](docs/CONTRIBUTING.md)
- [Segurança](docs/SECURITY.md)

## Segurança e limitações

A API ainda não implementa autenticação ou autorização. Também não possui controle de estoque, distribuição de itens, trilha de auditoria de alterações de negócio, migrações versionadas ou testes de integração automatizados. Os cabeçalhos HTTP e identificadores de requisição são medidas básicas, não uma certificação de segurança.

Não exponha a API publicamente nem utilize dados pessoais reais antes de implementar controle de acesso, HTTPS, política de CORS adequada, gestão de segredos, backups testados, monitoramento e revisão de privacidade/LGPD. A adequação à LGPD depende também de decisões operacionais e jurídicas sobre finalidade, base legal, retenção e direitos dos titulares.

## Contexto

Projeto desenvolvido como parte do Projeto Integrador Extensionista II, no curso de Análise e Desenvolvimento de Sistemas.

## Licença

Nenhuma licença de distribuição foi definida. Até que uma licença seja incluída, todos os direitos permanecem reservados aos respectivos titulares.
