# Arquitetura da aplicação

## Visão geral

O Mãos que Ajudam é uma aplicação web composta por frontend JavaScript, API REST em Node.js/Express e persistência MariaDB/MySQL.

```text
Navegador → Vite / Frontend → API Express → Pool mysql2 → MariaDB
```

## Responsabilidades

- `src/`: interface e interação com a API.
- `server/routes/`: endpoints organizados por recurso.
- `server/validacao.js`: validação e normalização de dados de entrada.
- `server/paginacao.js`: validação de parâmetros e metadados de paginação.
- `server/db.js`: pool de conexões com o banco.
- `database/`: schema e carga de demonstração.
- `tests/`: testes automatizados unitários.

## Disponibilidade

A API expõe verificações distintas:

- `/api/health/live`: indica que o processo HTTP está ativo.
- `/api/health/ready`: confirma que o banco responde.
- `/api/health`: mantém a resposta de saúde utilizada anteriormente.

## Requisições e erros

Cada requisição recebe um identificador UUID no cabeçalho `X-Request-Id). O identificador também é incluído nas respostas de erro para facilitar a correlação com os logs. O servidor desativa a identificação padrão do Express e envia cabeçalhos básicos de proteção.

O encerramento por SIGINT/SIGTERM fecha o servidor HTTP e encerra o pool de conexões para evitar interrupções abruptas durante o desligamento.

## Paginação

A listagem de doadores aceita pesquisa e paginação opcionais. Sem parâmetros, mantém o formato de array utilizado pela versão anterior. Com `page`, `limit` ou `q`, retorna `data` e `pagination`. O limite máximo é 100 registros por página.

## Fluxo transacional de doação

1. A API valida os dados recebidos.
2. Abre uma transação no banco.
3. Insere a doação e seus itens.
4. Confirma a transação se todas as operações forem concluídas.
5. Reverte a transação se ocorrer falha.

## Limites conhecidos

A aplicação ainda não possui autenticação/autorização, estoque operacional, fluxo de distribuição, auditoria de alterações de negócio, migrações versionadas ou testes de integração automatizados com MariaDB. Os cabeçalhos HTTP implementados são uma camada básica e não substituem HTTPS, política de CORS por ambiente, controle de acesso ou uma revisão de segurança antes da publicação.
