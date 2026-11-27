# Arquitetura da aplicação

## Objetivo

O Mãos que Ajudam é uma aplicação web para manter doadores, consultar o catálogo de itens e registrar doações. A implementação separa a interface, a API e a persistência para manter responsabilidades claras e facilitar a evolução do sistema.

## Visão lógica

```text
Navegador
   |
   | HTTP / JSON
   v
Frontend (Vite + JavaScript)
   |
   | /api/*
   v
API REST (Node.js + Express)
   |
   | mysql2/promise
   v
MariaDB / MySQL
```

No ambiente de desenvolvimento, o servidor Vite atende a interface e encaminha as requisições iniciadas por `/api` para o Express. O backend escuta, por padrão, na porta 3000.

## Responsabilidades

### Interface — `src/`

- Renderiza as áreas de doadores, doações e catálogo.
- Envia e recebe dados em JSON por meio da API.
- Apresenta mensagens de sucesso e falha.
- Mantém o estado de interface necessário durante a navegação.

### API — `server/`

- Expõe os endpoints REST.
- Valida e normaliza dados de entrada.
- Executa consultas parametrizadas.
- Controla transações para registrar doações e seus itens.
- Converte erros conhecidos em respostas HTTP padronizadas.

### Persistência — `database/`

- Define tabelas, relacionamentos, restrições e índices.
- Fornece dados opcionais de demonstração.
- Utiliza InnoDB para suportar transações e integridade referencial.

## Fluxo de registro de doação

1. O usuário seleciona um doador, uma data e pelo menos um item.
2. O frontend envia os dados para `POST /api/doacoes`.
3. A API valida os campos e os itens.
4. O backend inicia uma transação no banco.
5. Insere o registro em `doacao` e cada item em `doacao_item`.
6. Se todas as inserções forem concluídas, confirma a transação (`COMMIT`).
7. Se ocorrer falha, reverte a transação (`ROLLBACK`) e devolve uma resposta de erro.

Esse fluxo evita que o banco mantenha o registro principal sem os respectivos itens quando uma operação falha.

## Organização dos diretórios

| Caminho | Responsabilidade |
|---|---|
| `src/` | Interface web e estilos |
| `public/` | Recursos estáticos |
| `server/index.js` | Inicialização do Express e middlewares |
| `server/routes/` | Rotas de doadores, itens e doações |
| `server/validacao.js` | Validação e normalização de dados |
| `server/erros.js` | Classe de erro HTTP da aplicação |
| `server/db.js` | Pool de conexões MariaDB/MySQL |
| `database/schema.sql` | Estrutura relacional |
| `database/seed.sql` | Dados fictícios de demonstração |
| `tests/` | Testes automatizados |
| `openapi.yaml` | Contrato da API |
| `api.http` | Requisições para testes manuais |

## Decisões técnicas

- **API REST e JSON:** interface e backend se comunicam por HTTP, com recursos organizados por domínio.
- **Pool de conexões:** o módulo de banco reutiliza conexões e limita o número simultâneo.
- **Consultas parametrizadas:** valores externos são enviados separadamente da instrução SQL.
- **Integridade no banco:** chaves estrangeiras e restrições protegem relacionamentos mesmo quando uma operação não passa pela interface.
- **Transação nas doações:** o registro e seus itens formam uma única unidade lógica.
- **Contrato OpenAPI:** descreve endpoints, parâmetros, corpos e respostas esperadas.

## Limites da arquitetura atual

A aplicação ainda não implementa autenticação, autorização, segregação por organização, camada de serviços independente, migrações versionadas ou configuração completa de produção. A estrutura atual é adequada ao escopo acadêmico e pode evoluir com esses componentes quando houver requisitos definidos.
