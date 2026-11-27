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
- `server/auth.js`: derivação e verificação de senhas, assinatura de tokens e autorização por perfil.
- `server/routes/auth.js`: login e consulta da conta autenticada.
- `scripts/criar-usuario.js`: provisionamento inicial de contas, sem credenciais padrão.
- `database/`: schema e carga de demonstração.
- `tests/`: testes unitários e de integração HTTP com MariaDB.

## Disponibilidade

A API expõe verificações distintas:

- `/api/health/live`: indica que o processo HTTP está ativo.
- `/api/health/ready`: confirma que o banco responde.
- `/api/health`: mantém a resposta de saúde utilizada anteriormente.

## Requisições e erros

As rotas de negócio exigem token Bearer. Senhas são armazenadas com scrypt e tokens são assinados por HMAC-SHA-256, expiram em oito horas e têm a conta/perfil revalidado no banco a cada requisição. Cada requisição recebe um identificador UUID no cabeçalho `X-Request-Id`. O identificador também é incluído nas respostas de erro para facilitar a correlação com os logs. O servidor desativa a identificação padrão do Express e envia cabeçalhos básicos de proteção.

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

A aplicação possui autenticação por token, perfis básicos e trilha de auditoria vinculada ao usuário, além de limitação em memória no login. Ainda não possui MFA, recuperação de senha, revogação individual de tokens, rate limiting distribuído ou suíte E2E em navegador. Existe uma migração SQL versionada para a extensão operacional, mas ainda não há gerenciador automatizado de migrações. Os cabeçalhos HTTP implementados são uma camada básica e não substituem HTTPS, política de CORS por ambiente, controle de acesso ou revisão de segurança antes da publicação.


## Gestão operacional

O fluxo de doação possui transições controladas. O registro inicial cria uma doação com status `registrada`, sem alterar o estoque. A confirmação de recebimento gera entradas; a confirmação de distribuição gera saídas. Administradores também podem registrar ajustes manuais e configurar limites mínimos de reposição. O saldo não pode ficar negativo.

A atualização do status, do saldo, da movimentação e do registro de auditoria ocorre em uma única transação InnoDB. Em caso de falha, toda a operação é revertida.

Os relatórios são consultas agregadas no backend. A exportação CSV neutraliza valores que poderiam ser interpretados como fórmulas por planilhas.

## Limitações de segurança

A trilha de auditoria identifica entidade, registro, ação, detalhes e conta autenticada responsável. Ainda não há MFA, recuperação de senha, revogação individual de tokens ou rate limiting distribuído. A aplicação não deve ser exposta publicamente antes de uma revisão operacional e de segurança.
