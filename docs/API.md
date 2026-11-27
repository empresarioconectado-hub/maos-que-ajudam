# Referência da API

A API utiliza HTTP e JSON. A URL local padrão é `http://localhost:3000`. Todos os endpoints, exceto verificações de saúde e login, exigem o cabeçalho `Authorization: Bearer <token>`. O token expira em oito horas.

## Saúde

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/health/live` | Confirma que o processo está ativo, sem consultar o banco |
| GET | `/api/health/ready` | Verifica a disponibilidade do banco |
| GET | `/api/health` | Retorna o estado da API, banco e horário |

## Autenticação

### `POST /api/auth/login`

Corpo: `{ "email": "admin@exemplo.com", "senha": "senha-configurada" }`. Retorna token Bearer, duração de validade e dados básicos do usuário. Credenciais incorretas retornam `401`; excesso de tentativas retorna `429`.

### `GET /api/auth/me`

Retorna o perfil da conta autenticada. Contas inativas não podem acessar o recurso.

Perfis: `administrador` e `operador`. A exclusão de doadores exige perfil `administrador`; operações de cadastro e gestão de doações podem ser realizadas por ambos.

## Doadores

Os endpoints de consulta, cadastro, atualização e exclusão permanecem compatíveis com o contrato anterior.

### Listagem simples

`GET /api/doadores` retorna um array, preservando a resposta utilizada pela interface atual.

### Pesquisa e paginação

`GET /api/doadores?page=1&limit=20&q=ana`

Quando `page` ou `limit` é informado, ou quando existe o parâmetro `q`, a resposta passa a ser:

```json
{
  "data": [
    {
      "id_doador": 1,
      "nome": "Ana Souza",
      "email": "ana@example.com",
      "telefone": null,
      "data_cadastro": "2026-11-27 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- `page`: página iniciada em 1; padrão 1.
- `limit`: registros por página; padrão 20 e máximo 100.
- `q`: pesquisa parcial por nome, e-mail ou telefone; máximo 100 caracteres.
- Parâmetros inválidos retornam `400`.

## Itens

### `GET /api/itens`

Retorna o catálogo ordenado por categoria e nome.

## Estoque

- `GET /api/estoque`: saldo atual, limite mínimo e indicador de reposição.
- `GET /api/estoque/movimentacoes?limit=50`: histórico recente de entradas e saídas.
- `POST /api/estoque/movimentacoes`: registra ajuste manual de entrada ou saída; exige perfil `administrador`. A operação de saldo, movimentação e auditoria é transacional.
- `PATCH /api/estoque/{id}/limite-minimo`: configura o limite de alerta; zero desativa o alerta e exige perfil `administrador`.

## Doações

### `GET /api/doacoes`

Retorna doações com os dados resumidos do doador e seus itens. Sem parâmetros, mantém a resposta em array para compatibilidade. Com `page` e/ou `limit`, retorna `data` e metadados `pagination`; o limite padrão é 20 e o máximo é 100.

### `POST /api/doacoes`

Registra uma doação e os respectivos itens em uma transação. O banco confirma toda a operação ou reverte as alterações em caso de falha.

## Relatórios

- `GET /api/relatorios/resumo`: indicadores agregados para o painel.
- `GET /api/relatorios/doacoes.csv`: exportação CSV com neutralização de conteúdo que poderia ser interpretado como fórmula em planilhas.

O relatório em PDF é gerado pela interface por meio da impressão do navegador; na janela de impressão, selecione “Salvar como PDF”.

## Erros e rastreabilidade

As respostas de erro seguem o formato:

```json
{
  "erro": "Descrição destinada ao cliente",
  "requestId": "identificador-da-requisicao"
}
```

O identificador também é enviado no cabeçalho `X-Request-Id` e permite correlacionar a resposta com os registros do servidor. Detalhes internos, SQL, credenciais e stack traces não são enviados ao cliente.

| Código | Significado |
|---|---|
| 200 | Consulta ou atualização concluída |
| 201 | Registro criado |
| 204 | Exclusão concluída, sem corpo |
| 400 | Entrada inválida |
| 401 | Token ausente, inválido ou expirado / credenciais incorretas |
| 403 | Perfil sem permissão para a operação |
| 429 | Limite de tentativas de login excedido |
| 404 | Recurso ou rota não encontrado |
| 409 | Conflito de integridade ou duplicidade |
| 413 | Corpo acima do limite de 100 KB |
| 500 | Falha interna |

O arquivo `openapi.yaml` contém o contrato OpenAPI disponível. `api.http` reúne requisições para testes manuais.


## Gestão de estoque

### `GET /api/estoque`

Lista os itens do catálogo e seus saldos atuais. Itens ainda sem movimentação são apresentados com saldo zero.

### `GET /api/estoque/movimentacoes?limit=50`

Lista as movimentações mais recentes. O parâmetro `limit` aceita valores inteiros entre 1 e 200.

## Ciclo de vida das doações

### `PATCH /api/doacoes/{id}/status`

Corpo:

```json
{ "status": "recebida" }
```

Transições aceitas:

- `registrada → recebida`: adiciona os itens ao estoque.
- `registrada → cancelada`: encerra a doação sem movimentar estoque.
- `recebida → distribuida`: baixa do estoque as quantidades da doação.

Transições fora dessas regras retornam HTTP 409. A distribuição também retorna 409 se algum item não possuir saldo suficiente. Atualização do status, saldo, movimentação e auditoria são executados na mesma transação.

## Relatórios

- `GET /api/relatorios/resumo`: indicadores gerais e quantidades por status.
- `GET /api/relatorios/doacoes.csv`: exportação CSV do histórico de doações e itens.

A exportação neutraliza prefixos de fórmulas em campos textuais para reduzir o risco de CSV Injection em planilhas. O histórico de doações também oferece comprovante para impressão pelo navegador, com opção de salvar como PDF no diálogo de impressão. Esse recurso não gera um arquivo PDF no servidor.
