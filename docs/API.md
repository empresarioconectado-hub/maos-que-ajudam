# Referência da API

A API utiliza HTTP e JSON. A URL local padrão é `http://localhost:3000`.

## Saúde

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/health/live` | Confirma que o processo está ativo, sem consultar o banco |
| GET | `/api/health/ready` | Verifica a disponibilidade do banco |
| GET | `/api/health` | Retorna o estado da API, banco e horário |

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

## Doações

### `GET /api/doacoes`

Retorna doações com os dados resumidos do doador e seus itens.

### `POST /api/doacoes`

Registra uma doação e os respectivos itens em uma transação. O banco confirma toda a operação ou reverte as alterações em caso de falha.

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
| 404 | Recurso ou rota não encontrado |
| 409 | Conflito de integridade ou duplicidade |
| 413 | Corpo acima do limite de 100 KB |
| 500 | Falha interna |

O arquivo `openapi.yaml` contém o contrato OpenAPI disponível. `api.http` reúne requisições para testes manuais.
