# Referência da API

## Informações gerais

- Base URL local: `http://localhost:3000`
- Formato de entrada: JSON
- Formato de saída: JSON, exceto respostas HTTP 204
- Contrato: `openapi.yaml` (OpenAPI 3.0.3)

A API não possui autenticação nesta versão. Deve ser utilizada somente em ambiente local ou controlado.

## Saúde

### `GET /api/health`

Verifica a disponibilidade da API e executa uma consulta simples no banco.

Resposta `200`:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-11-27T12:00:00.000Z"
}
```

## Doadores

### `GET /api/doadores`

Retorna a lista de doadores, ordenada pelo nome.

### `GET /api/doadores/{id}`

Retorna um doador. O identificador deve ser um inteiro positivo.

### `POST /api/doadores`

Cadastra um doador.

Corpo:

```json
{
  "nome": "Ana Souza",
  "email": "ana@example.com",
  "telefone": "11999999999"
}
```

O nome é obrigatório. E-mail e telefone são opcionais e podem ser enviados como texto vazio conforme a normalização da aplicação. O e-mail, quando informado, deve respeitar o formato esperado e não pode estar cadastrado em outro registro.

Resposta de sucesso: `201 Created`, com o objeto do doador criado.

### `PUT /api/doadores/{id}`

Atualiza os dados cadastrais do doador. O corpo segue o mesmo formato do cadastro. Retorna `200 OK` com o registro atualizado.

### `DELETE /api/doadores/{id}`

Exclui o doador quando não existem doações associadas.

Resposta de sucesso: `204 No Content`. Se houver doações vinculadas, a exclusão é bloqueada e a API retorna `409 Conflict`.

## Itens

### `GET /api/itens`

Retorna o catálogo ordenado por categoria e nome.

Exemplo de resposta:

```json
[
  {
    "id_item": 1,
    "nome": "Arroz 5 kg",
    "unidade": "pacote",
    "id_categoria": 1,
    "categoria": "Alimento"
  }
]
```

## Doações

### `GET /api/doacoes`

Retorna doações com dados resumidos do doador e lista de itens.

Exemplo:

```json
[
  {
    "id_doacao": 12,
    "data_doacao": "2026-11-27",
    "observacao": "Arrecadação comunitária",
    "doador": {
      "id_doador": 1,
      "nome": "Ana Souza"
    },
    "itens": [
      {
        "id_item": 1,
        "nome": "Arroz 5 kg",
        "quantidade": 4,
        "unidade": "pacote"
      }
    ]
  }
]
```

### `POST /api/doacoes`

Registra uma doação e seus itens em uma única transação.

Corpo:

```json
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

Regras principais:

- O doador deve existir.
- A data deve ser válida.
- A lista de itens deve conter pelo menos um item.
- Cada item deve existir no catálogo.
- Cada quantidade deve ser um inteiro positivo.
- Um mesmo item não deve aparecer mais de uma vez na lista.

Resposta de sucesso: `201 Created`.

```json
{
  "mensagem": "Doação registrada com sucesso",
  "id_doacao": 12
}
```

Se uma referência não existir ou uma inserção falhar, a transação é revertida.

## Códigos HTTP

| Código | Significado no projeto |
|---|---|
| 200 | Consulta ou atualização concluída |
| 201 | Registro criado |
| 204 | Exclusão concluída, sem corpo |
| 400 | Entrada inválida ou referência informada não encontrada no registro da doação |
| 404 | Recurso ou rota não encontrado |
| 409 | Duplicidade ou conflito de integridade |
| 413 | Corpo da requisição excedeu 100 KB |
| 500 | Falha interna não prevista |

As respostas de erro são objetos JSON com a propriedade `erro`. A mensagem é destinada ao cliente e não deve conter SQL, credenciais ou stack trace.

## Testes manuais

O arquivo `api.http` contém exemplos executáveis com a extensão REST Client do VS Code. Alguns cenários dependem dos dados presentes no banco; ajuste os IDs antes da execução.
