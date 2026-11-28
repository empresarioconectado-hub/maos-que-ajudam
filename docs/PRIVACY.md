# Privacidade e governança de dados

## Status deste documento

Este material é um inventário técnico inicial para apoiar a avaliação institucional da aplicação. Não é aviso de privacidade publicado, parecer jurídico, definição de base legal nem comprovação de conformidade com a LGPD. A instituição controladora deve revisar, aprovar e completar os campos pendentes antes de inserir dados pessoais reais.

## Dados tratados pela aplicação

| Categoria | Campos ou origem | Finalidade operacional | Observações |
|---|---|---|---|
| Dados de doadores | Nome, e-mail opcional e telefone opcional | Identificar doador e permitir contato relacionado à doação | Solicitar somente os dados estritamente necessários |
| Dados de doação | Data, itens, quantidades e observação | Registrar recebimento e distribuição de itens | Evitar inserir dados sensíveis ou informações pessoais desnecessárias em observações |
| Contas de acesso | Nome, e-mail, perfil e hash scrypt da senha | Autenticar operadores e administradores | Senha em texto puro não é armazenada |
| Sessões | UUID de sessão, usuário, expiração e revogação | Manter autenticação e permitir logout/revogação | Sessões expiradas devem ser eliminadas conforme retenção aprovada |
| Controle de tentativas | HMAC do endereço de origem, contador e janela temporal | Reduzir tentativas automatizadas de acesso | O IP bruto não é persistido nesta tabela |
| Auditoria operacional | Tipo/ID do registro, ação, detalhes JSON, usuário e data | Rastrear operações de doação e estoque | Evitar inserir dados pessoais excessivos no campo de detalhes |

## Definições que a instituição precisa aprovar

- **Controlador:** [identificar pessoa jurídica ou instituição responsável].
- **Encarregado/canal de privacidade:** [identificar canal de contato].
- **Operadores e fornecedores:** [listar hospedagem, banco gerenciado, e-mail, monitoramento e backups].
- **Finalidades específicas:** [descrever cada finalidade e justificar os campos utilizados].
- **Base legal aplicável:** [definir com responsável jurídico/privacidade para cada finalidade].
- **Titulares atendidos:** [descrever categorias de pessoas envolvidas].
- **Compartilhamento:** [registrar destinatários, finalidade e salvaguardas].
- **Transferência internacional:** [avaliar localização dos provedores e mecanismos aplicáveis].
- **Retenção:** [definir prazo por categoria e critérios de descarte].
- **Canal de direitos:** [definir processo para solicitações de titulares].
- **Resposta a incidentes:** [definir responsáveis, prazos internos, comunicação e evidências].

## Princípios de implementação

1. Coletar apenas os dados necessários à operação.
2. Não usar dados reais em desenvolvimento, testes ou demonstrações.
3. Não registrar senhas, tokens, conteúdo de autenticação ou dados de doadores em logs.
4. Restringir o acesso por perfil e conceder contas individuais.
5. Revogar acessos quando a pessoa deixar de atuar no projeto.
6. Definir retenção e descarte antes da implantação.
7. Proteger backups e cópias exportadas com controles equivalentes aos do banco.
8. Revisar observações livres, relatórios e exportações para evitar exposição desnecessária.
9. Documentar solicitações dos titulares e a decisão tomada.

## Procedimentos que ainda precisam ser construídos

- Aviso de privacidade acessível aos titulares, com identidade do controlador, finalidades, bases legais, compartilhamentos, retenção e canal de contato.
- Processo autenticado para confirmação de identidade e atendimento de solicitações.
- Rotina aprovada de correção, anonimização, bloqueio ou eliminação quando aplicável.
- Política de retenção para doadores, doações, contas, sessões, auditoria, logs e backups.
- Processo de gestão de incidentes e avaliação de necessidade de comunicação.
- Avaliação de riscos e, se aplicável, Relatório de Impacto à Proteção de Dados Pessoais (RIPD).

## Revisão

Este documento deve ser atualizado quando houver alteração de campos, finalidades, fornecedores, integrações, hospedagem ou períodos de retenção. A aprovação deve ser registrada pelo responsável institucional.
