# Diretrizes de contribuição

Estas orientações padronizam alterações no repositório e ajudam a manter o histórico e a qualidade do código.

## Antes de começar

1. Consulte o README e a documentação relacionada à área que será alterada.
2. Verifique as issues abertas para evitar trabalho duplicado.
3. Crie uma branch a partir de `master` para sua alteração.
4. Mantenha o escopo da mudança pequeno e relacionado a um objetivo.

Sugestão de nomes:

- `feature/descricao-curta`
- `fix/descricao-curta`
- `docs/descricao-curta`

## Padrão de commits

Prefira mensagens curtas, no imperativo e com escopo claro. Exemplos:

- `feat: add donor search`
- `fix: validate donation quantity`
- `docs: update installation guide`
- `test: cover donor validation`

## Processo de alteração

1. Implemente a mudança.
2. Atualize a documentação e o contrato OpenAPI quando os endpoints ou formatos forem alterados.
3. Adicione ou ajuste testes para o comportamento modificado.
4. Execute os comandos de verificação:

   ```bash
   npm test
   npm run build
   ```

5. Revise o diff para remover credenciais, arquivos locais, logs e alterações não relacionadas.
6. Abra um pull request com objetivo, resumo, forma de validação e eventuais limitações.

## Critérios para revisão

- A alteração atende ao objetivo descrito.
- A validação ocorre no backend, não apenas na interface.
- Consultas ao banco utilizam parâmetros.
- Regras de integridade são preservadas.
- Operações com múltiplas gravações usam transação quando necessário.
- Erros retornam códigos HTTP coerentes.
- Testes e documentação acompanham a mudança.
- Nenhum segredo ou dado pessoal real é incluído no repositório.

## Relato de problemas

Ao abrir uma issue, informe o comportamento observado, o resultado esperado, os passos para reproduzir e o ambiente utilizado. Remova senhas, tokens e dados pessoais de exemplos e capturas de tela.
