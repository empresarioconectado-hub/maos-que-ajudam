# Segurança

## Situação atual

O Mãos que Ajudam é um projeto acadêmico e não deve ser exposto publicamente nem utilizado com dados pessoais reais. A API exige token Bearer para os recursos de negócio. O login utiliza hash de senha scrypt, tokens assinados por HMAC-SHA-256 com expiração de oito horas e perfis `administrador` e `operador`. A exclusão de doadores é restrita ao administrador.

## Controles implementados

- Consultas SQL parametrizadas e validação de entradas no backend.
- Limite de 100 KB para corpos JSON.
- Cabeçalhos básicos de proteção HTTP e identificador de requisição.
- Tratamento centralizado de erros sem exposição de SQL ou stack trace ao cliente.
- Integridade referencial e restrições no banco.
- Transações para registro de doação e atualização conjunta de status, estoque, movimentações e auditoria.
- Validação de transições de status e bloqueio de saldo negativo.
- Ajustes manuais e configuração de limites de estoque restritos a administradores, com auditoria.
- Neutralização de conteúdo perigoso na exportação CSV para reduzir CSV Injection.
- Auditoria da criação e das mudanças de status de doações.
- Limitação em memória de tentativas de login por endereço IP.
- Segredo de assinatura obrigatório na inicialização, com tamanho mínimo de 32 bytes.
- Provisionamento inicial de contas por comando administrativo, sem senha padrão.

## Limitações relevantes

- Não há recuperação de senha, MFA ou revogação individual imediata de tokens já emitidos.
- A auditoria registra a conta que executou a operação, mas não registra endereço IP nem agente do usuário.
- Tokens são validados contra o estado atual da conta em cada requisição; não há logout/revogação individual por token.
- O limitador de login é local ao processo e não compartilha estado entre instâncias.
- Não há política CORS explícita por allowlist nem proteção distribuída contra abuso.
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

1. Adicionar MFA e política de revogação de tokens/sessões.
2. Avaliar o registro de endereço IP e agente do usuário na auditoria, com minimização e retenção compatíveis com a LGPD.
3. Configurar HTTPS, CORS por allowlist e rate limiting distribuído.
4. Utilizar gestão segura e rotação de segredos.
5. Implementar backup automatizado e testar restauração.
6. Configurar monitoramento e alertas.
7. Realizar análise de dependências e testes de segurança.
8. Formalizar os procedimentos de privacidade e LGPD.

## Comunicação de vulnerabilidades

Não publique credenciais, tokens, dados pessoais ou detalhes exploráveis em issues públicas. Solicite ao mantenedor um canal privado antes de compartilhar detalhes técnicos.
