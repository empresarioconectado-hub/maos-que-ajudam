# Segurança

## Escopo atual

O Mãos que Ajudam é um projeto acadêmico e não deve ser considerado pronto para exposição pública ou operação com dados reais. A versão atual não implementa autenticação ou autorização, portanto qualquer pessoa com acesso à API pode tentar executar as operações disponíveis.

## Controles existentes

- Consultas ao banco com parâmetros.
- Validação de dados no backend.
- Limite de 100 KB para o corpo JSON.
- Tratamento centralizado de erros.
- Respostas externas sem exposição de stack trace ou detalhes SQL.
- Restrições de integridade no banco de dados.
- Arquivo `.env.example` sem credenciais válidas.

Esses controles reduzem riscos específicos, mas não substituem uma revisão de segurança de aplicação.

## Cuidados para execução local

- Mantenha o arquivo `.env` fora do controle de versão.
- Utilize um usuário de banco exclusivo para a aplicação, com privilégios mínimos.
- Não reutilize senhas pessoais ou administrativas.
- Não publique a API diretamente na internet.
- Utilize dados fictícios durante desenvolvimento e avaliação.
- Mantenha Node.js, dependências e SGBD atualizados.

## Requisitos antes de produção

Antes de qualquer implantação pública, devem ser avaliados e implementados, no mínimo:

- Autenticação e autorização por perfil.
- HTTPS e configuração segura de cookies/sessões, se aplicável.
- Política de CORS restritiva conforme os domínios autorizados.
- Rate limiting e proteção contra abuso.
- Gestão de segredos fora do repositório.
- Logs estruturados sem dados pessoais desnecessários.
- Backup, restauração e retenção de dados.
- Migrações de banco versionadas.
- Testes de segurança e revisão de dependências.
- Adequação à LGPD, incluindo finalidade, base legal, transparência e direitos dos titulares.

## Comunicação de vulnerabilidades

Não publique credenciais, tokens, dados pessoais ou detalhes exploráveis em issues públicas. Para relatar um problema, utilize um canal privado disponibilizado pelo responsável pelo repositório. Caso não exista um canal privado definido, solicite ao mantenedor uma forma segura de contato antes de compartilhar detalhes técnicos.


## Controles técnicos existentes

- Limite de 100 KB para o corpo JSON.
- Cabeçalhos básicos contra MIME sniffing, enquadramento e referência HTTP.
- Cabeçalho `X-Request-Id` para rastrear requisições.
- Respostas de erro sem SQL ou stack trace.
- Consultas SQL parametrizadas.
- Encerramento controlado do servidor e pool de conexões.

Esses controles reduzem alguns riscos, mas não substituem autenticação, autorização, HTTPS, política de CORS, rate limiting, gestão de segredos e monitoramento.

## Itens obrigatórios antes de disponibilizar publicamente

1. Implementar autenticação e autorização por perfil.
2. Definir política de CORS restrita aos domínios autorizados.
3. Publicar somente atrás de HTTPS.
4. Implementar rate limiting distribuído e proteção contra abuso.
5. Definir política de retenção, anonimização e atendimento aos direitos dos titulares.
6. Configurar backup automatizado e testar restauração.
7. Monitorar erros, disponibilidade e eventos de segurança.
8. Revisar dependências e executar análise de vulnerabilidades.
