# Operação, backup e recuperação

Este documento descreve procedimentos operacionais para ambientes de desenvolvimento e homologação. A existência dos scripts não significa que um backup esteja agendado ou que a restauração tenha sido executada no ambiente do mantenedor.

## Pré-requisitos

- MariaDB 10.11+ ou MySQL 8+ e utilitários `mariadb-dump`/`mysqldump`, `mariadb` e `gzip`.
- Conta de banco com permissões compatíveis com dump e restauração.
- Diretório de backup fora da pasta pública e fora do repositório.
- Armazenamento externo ou serviço de backup com criptografia, controle de acesso e retenção definidos.

Crie um arquivo de credenciais protegido, por exemplo `~/.my.cnf`:

```ini
[client]
host=127.0.0.1
port=3306
user=usuario_backup
password=senha_forte
```

Proteja-o: `chmod 600 ~/.my.cnf`. Não versione esse arquivo nem informe senha na linha de comando.

## Gerar backup

```bash
DB_NAME=maos_que_ajudam \
DB_CNF_FILE="$HOME/.my.cnf" \
BACKUP_DIR="$HOME/backups/maos-que-ajudam" \
BACKUP_RETENTION_DAYS=30 \
bash scripts/backup-db.sh
```

O script usa transação consistente para tabelas InnoDB, inclui rotinas, triggers e eventos, comprime o dump, valida o arquivo gzip, aplica permissões restritas e remove arquivos locais acima da retenção configurada. Faça cópia adicional em armazenamento independente; retenção local não protege contra falha ou perda do próprio servidor.

## Agendamento

Configure o agendador do sistema operacional ou do provedor para executar o comando diariamente. O agendamento deve usar caminhos absolutos, ambiente controlado, usuário de serviço e envio de alertas em caso de falha. Não há agendamento automático embutido no repositório.

## Restaurar

**Atenção:** a restauração pode substituir tabelas e dados do banco informado. Primeiro restaure em ambiente isolado e confirme a integridade do arquivo e a compatibilidade da versão do banco.

```bash
CONFIRM_RESTORE=YES \
DB_CNF_FILE="$HOME/.my.cnf" \
bash scripts/restore-db.sh "$HOME/backups/maos-que-ajudam/maos_que_ajudam-AAAAMMDDTHHMMSSZ.sql.gz"
```

Após a importação:

1. Execute `SELECT COUNT(*)` nas tabelas principais e confira os registros esperados.
2. Verifique chaves estrangeiras, saldos e últimas movimentações.
3. Inicie a API e valide `/api/health/ready`.
4. Execute `npm test` em ambiente de teste e faça um teste funcional de login e consulta.
5. Registre data, duração, origem do backup, responsável e resultado do teste.

## Frequência e objetivos

A instituição responsável deve aprovar RPO (perda máxima de dados aceitável), RTO (tempo máximo para recuperação), retenção e localização geográfica dos backups. Como ponto de partida para homologação, pode-se testar backup diário e restauração mensal; isso não é garantia de adequação a uma operação real.

## Monitoramento

- Monitore `GET /api/health/live` para disponibilidade do processo.
- Monitore `GET /api/health/ready` para disponibilidade conjunta da API e banco.
- Colete logs estruturados e correlacione falhas por `X-Request-Id`.
- Configure alertas externos para indisponibilidade, erros 5xx, falha de backup, espaço em disco e expiração de certificados TLS.
- Não envie tokens, senhas, dados pessoais ou conteúdo de doações para logs de monitoramento.

O provedor de hospedagem, domínio, TLS, armazenamento e serviço de alertas ainda precisa ser escolhido e configurado pelo responsável pela implantação.
