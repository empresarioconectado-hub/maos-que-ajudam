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
