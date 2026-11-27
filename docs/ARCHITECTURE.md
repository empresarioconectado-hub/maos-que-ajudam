# Arquitetura da aplicação

## Visão geral

O Mãos que Ajudam é uma aplicação web composta por frontend JavaScript, API REST em Node.js/Express e persistência MariaDB/MySQL.

```text
Navegador → Vite / Frontend → API Express → Pool mysql2 → MariaDB
                                      ├── Autenticação e sessões
                                      ├── Regras de negócio
                                      └── Auditoria
```

## Responsabilidades

- `src/`: interface e interação com a API.
- `server/routes/`: endpoints organizados por recurso.
- `server/validacao.js`: validação e normalização de dados de entrada.
- `server/paginacao.js`: validação de parâmetros e metadados de paginação.
- `server/db.js`: pool de conexões com o banco.
- `server/auth.js`: derivação e verificação de senhas, assinatura de tokens, validação de sessões e autorização por perfil.
- `server/routes/auth.js`: login, consulta da conta, logout e revogação de todas as sessões.
- `scripts/criar-usuario.js`: provisionamento inicial de contas.
- `scripts/backup-db.sh` e `scripts/restore-db.sh`: cópia de segurança e restauração assistidas.
- `database/`: schema, carga de demonstração e migrações versionadas.
- `tests/`: testes unitários e de integração HTTP com MariaDB.
- `.github/workflows/ci.yml`: instalação limpa, banco efêmero, migrações, testes e build.

## Autenticação e ciclo de sessão

O login verifica hash scrypt e emite token HMAC-SHA-256 com validade de oito horas e identificador UUID de sessão. A sessão é persistida em `sessao_usuario`. O middleware valida assinatura, expiração, estado da conta, validade e revogação da sessão a cada requisição protegida. Assim, logout e revogação global têm efeito imediato.

## Segurança de transporte e origem

A API aplica cabeçalhos defensivos e CORS por allowlist via `CORS_ORIGINS`. `TRUST_PROXY` e `ENABLE_HSTS` são opções explícitas de implantação. A API não termina TLS; HTTPS, CSP da aplicação frontend e redirecionamento são responsabilidade do proxy/hospedagem.

## Disponibilidade

- `/api/health/live`: indica que o processo HTTP está ativo.
- `/api/health/ready`: confirma que o banco responde.
- `/api/health`: mantém a resposta de saúde utilizada anteriormente.

## Requisições e erros

Cada requisição recebe UUID no cabeçalho `X-Request-Id`. Erros incluem o identificador para correlação com logs. O encerramento por SIGINT/SIGTERM fecha o servidor HTTP e encerra o pool de conexões.

## Banco e migrações

O modelo acadêmico central é formado por `doador`, `categoria`, `item`, `doacao` e `doacao_item`. As extensões operacionais incluem estoque, movimentações, auditoria, contas e sessões. O schema é idempotente para instalação nova; as migrações numeradas atualizam bancos existentes. O CI reaplica schema, migrações e seed para validar reexecução.

## Fluxo transacional de doação

1. A API valida os dados recebidos.
2. Abre uma transação no banco.
3. Insere a doação e seus itens.
4. Ao receber/distribuir, atualiza o saldo, registra movimentação e auditoria na mesma transação.
5. Confirma a transação se todas as operações forem concluídas.
6. Reverte a transação se ocorrer falha.

## Limitações arquiteturais

O limitador de login é local ao processo, não há MFA nem recuperação de senha, e o frontend ainda mantém token em `sessionStorage`. A implantação HTTPS, CSP do frontend, monitoramento, armazenamento externo de backups, E2E de navegador e governança LGPD exigem configuração ou trabalho adicional antes de produção.
