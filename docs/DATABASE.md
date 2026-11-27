# Banco de dados

## SGBD e convenções

O projeto utiliza MariaDB/MySQL com mecanismo InnoDB e codificação `utf8mb4`. O schema padrão é `maos_que_ajudam`.

A estrutura está definida em `database/schema.sql`. Os dados fictícios opcionais estão em `database/seed.sql`.

## Modelo relacional

```text
DOADOR (1) -------- (N) DOACAO
                         |
                         | (1)
                         |
                         (N)
                    DOACAO_ITEM
                         (N)
                         |
                         | (1)
                         |
                       ITEM (N) -------- (1) CATEGORIA
```

O relacionamento entre doação e item é muitos-para-muitos e é resolvido pela tabela associativa `doacao_item`. A quantidade do item pertence ao relacionamento, por isso é armazenada nessa tabela.

## Tabelas

### `doador`

| Campo | Tipo | Regra |
|---|---|---|
| `id_doador` | INT | Chave primária, incremento automático |
| `nome` | VARCHAR(150) | Obrigatório |
| `email` | VARCHAR(100) | Opcional, único quando informado |
| `telefone` | VARCHAR(20) | Opcional |
| `data_cadastro` | TIMESTAMP | Obrigatório, valor padrão atual |

### `categoria`

| Campo | Tipo | Regra |
|---|---|---|
| `id_categoria` | INT | Chave primária, incremento automático |
| `nome` | VARCHAR(60) | Obrigatório e único |

### `item`

| Campo | Tipo | Regra |
|---|---|---|
| `id_item` | INT | Chave primária, incremento automático |
| `id_categoria` | INT | FK para `categoria` |
| `nome` | VARCHAR(150) | Obrigatório |
| `unidade` | VARCHAR(20) | Obrigatório, padrão `unidade` |

A combinação de categoria e nome do item é única.

### `doacao`

| Campo | Tipo | Regra |
|---|---|---|
| `id_doacao` | INT | Chave primária, incremento automático |
| `id_doador` | INT | FK para `doador` |
| `data_doacao` | DATE | Obrigatório |
| `observacao` | VARCHAR(255) | Opcional |
| `status` | VARCHAR(20) | `registrada`, `recebida`, `distribuida` ou `cancelada` |

Há índice para a data e para a chave estrangeira do doador.

### `doacao_item`

| Campo | Tipo | Regra |
|---|---|---|
| `id_doacao` | INT | Parte da chave primária composta e FK |
| `id_item` | INT | Parte da chave primária composta e FK |
| `quantidade` | INT | Obrigatória e maior que zero |

A chave primária composta impede que o mesmo item seja inserido duas vezes na mesma doação. A quantidade deve ser positiva.

## Integridade referencial

- A exclusão de uma categoria com itens vinculados é restringida.
- A exclusão de um doador com doações vinculadas é restringida.
- A exclusão de um item presente em doações é restringida.
- A exclusão de uma doação remove seus registros associados em `doacao_item` por cascata.
- Atualizações de chaves referenciadas utilizam `ON UPDATE CASCADE`.

A API traduz conflitos de integridade conhecidos em respostas HTTP adequadas. As restrições no banco continuam sendo a proteção final dos relacionamentos.

## Criação e carga inicial

Crie a estrutura:

```bash
mariadb -u root -p < database/schema.sql
```

Carregue os dados fictícios, se necessário:

```bash
mariadb -u root -p < database/seed.sql
```

O script de carga utiliza inserções que evitam duplicar categorias, doador de demonstração e itens quando executado novamente.

## Configuração de acesso

A aplicação obtém as configurações por variáveis de ambiente:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

O usuário da aplicação deve receber apenas as permissões necessárias ao schema. Não utilize a conta administrativa do SGBD na configuração de execução.

## Evolução do schema

O script atual é destinado à criação inicial. Não substitui uma ferramenta de migração para mudanças futuras em bancos já utilizados. Alterações estruturais em ambientes persistentes devem ser versionadas, revisadas e testadas antes da aplicação.


## Gestão operacional (extensão)

O modelo original do PIE II foi preservado. A gestão operacional foi acrescentada com estruturas complementares:

### `estoque`

Mantém o saldo atual por item. O saldo não é alterado no simples registro de uma doação; ele é atualizado somente quando o recebimento é confirmado ou a distribuição é concluída.

### `movimentacao_estoque`

Registra cada entrada ou saída, com item, quantidade, origem e referência à doação quando aplicável. As movimentações originadas por mudança de status são gravadas na mesma transação da atualização do saldo.

### `auditoria`

Registra a criação da doação e as transições de status, armazenando detalhes em JSON. A tabela não deve ser usada como substituta de trilha de auditoria de autenticação: a aplicação ainda não identifica operadores porque não possui login e controle de acesso.

### Migração em bancos existentes

Para uma base já criada com a versão anterior do schema, faça backup e execute uma única vez:

```bash
mariadb -u root -p maos_que_ajudam < database/migrations/002_gestao_operacional.sql
```

A migração adiciona o status padrão `registrada`, cria as tabelas complementares e inicializa saldo zero para os itens existentes. Não a execute novamente após sucesso, pois a alteração da coluna e da constraint não é idempotente.

Para bancos novos, utilize o `database/schema.sql` atualizado; não execute a migração 002 novamente.
