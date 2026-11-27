# Mãos que Ajudam

Sistema web para organizar o cadastro de doadores, consultar o catálogo de itens e registrar doações. O projeto foi desenvolvido no contexto do Projeto Integrador Extensionista II (PIE II), com foco na aplicação prática de modelagem relacional, desenvolvimento web e integração entre frontend, API REST e banco de dados.

## Funcionalidades

- Cadastro, consulta, edição e exclusão de doadores.
- Pesquisa e paginação opcional de doadores e paginação opcional do histórico de doações.
- Paginação opcional da listagem de doadores.
- Consulta do catálogo de itens por categoria.
- Registro de doações com data, observação e múltiplos itens.
- Histórico de doações com ciclo de status (registrada, recebida, distribuída ou cancelada).
- Controle de saldo por item, com movimentações de entrada e saída vinculadas às doações.
- Trilha de auditoria para criação e alteração de status das doações.
- Dashboard com indicadores operacionais.
- Exportação do histórico em CSV.
- Comprovante de doação pronto para impressão ou salvamento em PDF pelo navegador.
- Validação de dados no backend e transação para registrar doações.
- Verificações de liveness e readiness da API.
- Login com senha protegida por scrypt e token Bearer com expiração de 8 horas.
- Perfis de administrador e operador, com exclusão de doadores restrita ao administrador.
- Limitação de tentativas de login.
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

Configure o arquivo `.env`. Gere `AUTH_SECRET` com `openssl rand -hex 32` e mantenha o valor em segredo:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=maos_app
DB_PASSWORD=sua_senha_local
DB_NAME=maos_que_ajudam
PORT=3000
AUTH_SECRET=gere_um_segredo_aleatorio_com_ao_menos_32_bytes
```

Crie um usuário de banco dedicado e conceda apenas as permissões necessárias. Não use a conta administrativa em uma instalação compartilhada.

Após criar o schema, cadastre o primeiro administrador. Informe os valores no ambiente do comando; não os grave no repositório:

```bash
ADMIN_NAME='Administrador' ADMIN_EMAIL='admin@exemplo.com' ADMIN_PASSWORD='substitua-por-uma-senha-forte' npm run admin:create
```

A senha deve ter de 12 a 128 caracteres. O comando não cria uma senha padrão e falha se o e-mail já estiver cadastrado. Guarde as credenciais em um gerenciador de senhas.

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
| POST | `/api/auth/login` | Autenticação e emissão de token |
| GET | `/api/auth/me` | Dados da conta autenticada |
| GET/POST | `/api/doadores` | Listagem e cadastro |
| GET/PUT/DELETE | `/api/doadores/:id` | Consulta, edição e exclusão |
| GET | `/api/itens` | Catálogo |
| GET/POST | `/api/doacoes` | Consulta e registro de doações |
| GET | `/api/estoque` | Saldos e alertas de reposição |
| GET/POST | `/api/estoque/movimentacoes` | Histórico e ajustes manuais (administrador) |
| PATCH | `/api/estoque/:id/limite-minimo` | Configuração de alerta (administrador) |
| GET | `/api/relatorios/resumo` | Indicadores gerenciais |
| GET | `/api/relatorios/doacoes.csv` | Exportação CSV |
| PATCH | `/api/doacoes/:id/status` | Atualização controlada do ciclo da doação |
| GET | `/api/estoque` | Saldos atuais por item |
| GET | `/api/estoque/movimentacoes` | Histórico de entradas e saídas |
| GET | `/api/relatorios/resumo` | Indicadores operacionais |
| GET | `/api/relatorios/doacoes.csv` | Exportação CSV |

Com exceção das verificações de saúde e do login, os endpoints exigem `Authorization: Bearer <token>`. O token expira em oito horas. Os perfis disponíveis são `administrador` e `operador`; somente administradores podem excluir doadores.

A listagem de doadores aceita `page`, `limit` e `q`. Exemplo: `GET /api/doadores?page=1&limit=20&q=ana`. O limite máximo é 100. Sem esses parâmetros, a API preserva o array utilizado pelo frontend atual.

Consulte [docs/API.md](docs/API.md) e [openapi.yaml](openapi.yaml) para o contrato e exemplos.

## Testes e build

```bash
npm test
npm run build
```

Os testes cobrem hash de senhas, assinatura e expiração de tokens, validações, paginação, regras de transição, autenticação, autorização, rollback transacional, movimentações de estoque, auditoria e exportação CSV. O workflow inicializa MariaDB 10.11, executa o schema duas vezes, reaplica as migrações e roda os testes de integração antes do build. Ainda não há suíte E2E em navegador.

## Banco de dados

O modelo acadêmico original contém `doador`, `categoria`, `item`, `doacao` e `doacao_item`. A extensão operacional adiciona `estoque`, `movimentacao_estoque`, `auditoria` e `usuario` para contas e perfis. O schema completo para bancos novos está em [database/schema.sql](database/schema.sql). Para bancos existentes, faça backup e aplique, em ordem, [a migração 002](database/migrations/002_gestao_operacional.sql) e [a migração 003](database/migrations/003_autenticacao.sql) e [a migração 004](database/migrations/004_limite_minimo_estoque.sql). As migrações podem ser reexecutadas sem duplicar colunas, constraints ou tabelas. Os dados fictícios estão em [database/seed.sql](database/seed.sql).

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Banco de dados](docs/DATABASE.md)
- [Contribuição](docs/CONTRIBUTING.md)
- [Segurança](docs/SECURITY.md)

## Segurança e limitações

A autenticação utiliza tokens Bearer assinados com `AUTH_SECRET`, senhas derivadas por scrypt e perfis de acesso. A trilha de auditoria registra criação e transições de status vinculadas à conta autenticada que executou a operação. As migrações são SQL versionadas e reexecutáveis, mas ainda não há um gerenciador automatizado de migrações. Os cabeçalhos HTTP e identificadores de requisição são medidas básicas, não uma certificação de segurança.

A autenticação implementada é uma base para o projeto, não uma certificação de segurança. Antes de produção, configure HTTPS, CORS por allowlist, rate limiting distribuído, rotação de segredos, backups testados, monitoramento, política de sessão e revisão de privacidade/LGPD. O limitador de login atual é em memória e não substitui proteção distribuída. A adequação à LGPD depende também de decisões operacionais e jurídicas sobre finalidade, base legal, retenção e direitos dos titulares.

## Contexto

Projeto desenvolvido como parte do Projeto Integrador Extensionista II, no curso de Análise e Desenvolvimento de Sistemas.

## Licença

Nenhuma licença de distribuição foi definida. Até que uma licença seja incluída, todos os direitos permanecem reservados aos respectivos titulares.
