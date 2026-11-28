# Segurança

## Classificação e uso previsto

O Mãos que Ajudam é um projeto acadêmico e uma base de desenvolvimento. Não está certificado, não passou por pentest independente e não deve ser exposto publicamente nem receber dados pessoais reais antes de uma avaliação de segurança, privacidade e operação.

## Controles implementados no repositório

- Senhas armazenadas com derivação scrypt e salt aleatório.
- Tokens Bearer assinados com HMAC-SHA-256, expiração de oito horas e identificador único de sessão.
- Sessões persistidas no banco; logout revoga a sessão atual e `POST /api/auth/logout-all` revoga todas as sessões ativas da conta.
- Conta e perfil revalidados no banco em cada requisição protegida.
- Perfis `administrador` e `operador`, com operações sensíveis restritas.
- Consultas SQL parametrizadas, validação de entrada e limites de tamanho do corpo JSON.
- Cabeçalhos de segurança para respostas da API, incluindo CSP restritiva para conteúdo de API, proteção contra MIME sniffing, clickjacking e política de referenciador.
- CORS por allowlist configurável em `CORS_ORIGINS`; chamadas sem cabeçalho Origin continuam permitidas para uso same-origin e clientes HTTP.
- HSTS opcional por `ENABLE_HSTS=1`, somente quando a aplicação estiver atrás de proxy HTTPS confiável.
- Identificador de requisição `X-Request-Id` e tratamento centralizado de erros.
- Auditoria de operações de negócio e transações para alterações de estoque/doações.
- Scripts de backup validado e restauração com confirmação explícita.
- CI com testes, banco MariaDB, reexecução de schema/migrações e build.

## Sessões e autenticação

Cada login cria uma linha em `sessao_usuario`. O identificador da sessão é incluído no token assinado e validado contra o banco em toda requisição protegida. Revogar a sessão invalida o token imediatamente, mesmo antes das oito horas de expiração. Sessões expiradas podem ser removidas periodicamente após o prazo definido pela política de retenção.

O endpoint `POST /api/auth/logout` revoga a sessão apresentada. `POST /api/auth/logout-all` encerra todas as sessões da conta. O frontend executa a revogação no logout normal e também limpa o token local se a API estiver indisponível.

## Limitações ainda existentes

- O limitador de login agora compartilha estado pelo banco entre instâncias da aplicação. Em ambientes de maior escala, complemente com proteção de perímetro (WAF/rate limit do proxy) e monitore a tabela de controle.
- Não há MFA, recuperação de senha por e-mail ou fluxo self-service de redefinição.
- O token do navegador permanece em `sessionStorage`; XSS pode acessá-lo. CSP da API não substitui CSP no servidor que entrega o frontend. A hospedagem do frontend deve enviar sua própria CSP, preferencialmente com nonce/hash e sem `unsafe-inline`.
- Não há HTTPS configurado pelo código: certificado, redirecionamento HTTP→HTTPS, renovação TLS e HSTS dependem do domínio/proxy/hospedagem.
- CORS precisa ser configurado com os domínios reais do frontend. Não habilite curingas para uma aplicação autenticada.
- O CI possui um fluxo E2E inicial em Chromium para login, carregamento do painel e revogação no logout; ainda falta ampliar cobertura dos fluxos de negócio, análise DAST e pentest independente.
- Backup e restauração possuem scripts, mas o agendamento, armazenamento externo, criptografia em repouso, alertas e testes regulares precisam ser configurados no ambiente operacional.
- Não há monitoramento externo ou gestão centralizada de logs.
- A adequação à LGPD depende de decisões institucionais e jurídicas sobre finalidade, base legal, minimização, transparência, retenção, descarte e atendimento aos titulares; consulte o inventário inicial em [PRIVACY.md](PRIVACY.md), que ainda exige preenchimento e aprovação institucional.

## Configuração recomendada

Gere um segredo exclusivo para cada ambiente:

```bash
openssl rand -hex 32
```

Configure no ambiente, nunca no Git:

```dotenv
AUTH_SECRET=valor-aleatorio-com-pelo-menos-32-bytes
CORS_ORIGINS=https://app.exemplo.org
TRUST_PROXY=1
ENABLE_HSTS=1
```

Configure `TRUST_PROXY` com o número exato de saltos confiáveis (por exemplo, `1` para um proxy) ou com os endereços/CIDRs dos proxies conhecidos. Nunca confie em cabeçalhos encaminhados enviados diretamente por clientes. Ative HSTS apenas depois de HTTPS estar funcionando para o domínio e subdomínios cobertos.

## Requisitos obrigatórios antes de produção

1. Implantar frontend e API em domínio controlado, com TLS, redirecionamento HTTPS e CSP no servidor do frontend.
2. Definir CORS com a origem exata do frontend e revisar a confiança no proxy.
3. Configurar WAF/rate limit no perímetro como camada adicional ao limitador compartilhado pelo banco.
4. Implementar MFA e recuperação de senha com canal de entrega seguro, tokens de uso único, expiração e auditoria.
5. Definir armazenamento externo, criptografia, retenção e agendamento dos backups; realizar exercícios de restauração documentados.
6. Configurar monitoramento externo, alertas, retenção de logs e resposta a incidentes.
7. Ampliar a cobertura E2E dos fluxos críticos, executar SAST/DAST, análise de dependências e pentest independente.
8. Formalizar inventário de dados, finalidade, base legal, aviso de privacidade, retenção, descarte e processo de atendimento aos titulares.
9. Revisar privilégios do banco, gestão/rotação de segredos, política de acesso administrativo e segregação de ambientes.

## Comunicação de vulnerabilidades

Não publique credenciais, tokens, dados pessoais ou detalhes exploráveis em issues públicas. Solicite ao mantenedor um canal privado antes de compartilhar detalhes técnicos.
