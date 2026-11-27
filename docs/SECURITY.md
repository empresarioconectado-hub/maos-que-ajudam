# Segurança

## Situação atual

O Mãos que Ajudam é um projeto acadêmico e não deve ser exposto publicamente nem utilizado com dados pessoais reais. A API ainda não possui autenticação ou autorização. Portanto, qualquer pessoa com acesso à rede onde o serviço está publicado pode tentar executar as operações disponíveis.

## Controles implementados

- Consultas SQL parametrizadas e validação de entradas no backend.
- Limite de 100 KB para corpos JSON.
- Cabeçalhos básicos de proteção HTTP e identificador de requisição.
- Tratamento centralizado de erros sem exposição de SQL ou stack trace ao cliente.
- Integridade referencial e restrições no banco.
- Transações para registro de doação e atualização conjunta de status, estoque, movimentações e auditoria.
- Validação de transições de status e bloqueio de saldo negativo.
- Neutralização de conteúdo perigoso na exportação CSV para reduzir CSV Injection.
- Auditoria da criação e das mudanças de status de doações.

## Limitações relevantes

- Não há login, sessão, recuperação de senha ou controle de perfil.
- A auditoria não identifica o operador, pois não existe identidade autenticada.
- Não há rate limiting, política CORS restritiva ou proteção contra abuso.
- Não há implantação HTTPS, gestão de segredos em ambiente de produção ou monitoramento externo.
- A adequação à LGPD depende de definição institucional de finalidade, base legal, retenção, transparência e atendimento aos titulares.

## Cuidados para desenvolvimento

- Mantenha `.env` fora do controle de versão.
- Utilize usuário de banco exclusivo e com privilégios mínimos.
- Utilize dados fictícios.
- Não publique a API diretamente na internet.
- Faça backup antes de executar migrações.
- Não compartilhe credenciais ou dados pessoais em issues.

## Requisitos antes de produção

1. Definir perfis e permissões com os responsáveis pelo processo.
2. Implementar autenticação e autorização, incluindo proteção das rotas de escrita e auditoria.
3. Configurar HTTPS, CORS por allowlist e rate limiting.
4. Utilizar gestão segura de segredos.
5. Implementar backup automatizado e testar restauração.
6. Configurar monitoramento e alertas.
7. Realizar análise de dependências e testes de segurança.
8. Formalizar os procedimentos de privacidade e LGPD.

## Comunicação de vulnerabilidades

Não publique credenciais, tokens, dados pessoais ou detalhes exploráveis em issues públicas. Solicite ao mantenedor um canal privado antes de compartilhar detalhes técnicos.
