# GEMINI.md — Diretrizes Permanentes de Desenvolvimento, Padronização e Proteção (ImpulsoWeb10)

Este documento estabelece as regras obrigatórias, padrões arquiteturais e protocolos de segurança para a criação, manutenção, personalização e atualização de sites e projetos web da **ImpulsoWeb10**.

---

## 1. Compatibilidade e Arquitetura de Projetos
- **Respeito à Stack Existente:** A estrutura deste guia é uma referência e não uma exigência cega para forçar reestruturações em sites legados.
- **Identificação Prévia:** Antes de editar qualquer projeto, identifique se ele utiliza HTML/CSS/JS estático, PHP, Node.js ou outra arquitetura.
- **Zero Inchaço Tecnológico:** Nunca introduza `package.json`, Node.js, ferramentas de build complexas ou dependências externas pesadas quando o projeto for baseado em arquivos simples (HTML/CSS/JS puro).

## 2. Proteção Estrutural e Visual
- **Proibição de Reescrever Sites Inteiros:** Nunca recrie um site inteiro quando uma alteração pontual, correção de bug ou ajuste de conteúdo for suficiente.
- **Preservação de Layout:** Nunca modifique o design aprovado, paleta de cores, tipografia ou identidade visual sem autorização explícita.
- **Integridade de Elementos:** Preserve rigorosamente HTML, CSS, JavaScript, animações, menus, rodapés, modais e funcionalidades já existentes.
- **Dados Comerciais Sagrados:** Não altere links, números de telefone, endereços, horários de atendimento ou textos comerciais sem necessidade justificada e autorização prévia.

## 3. Padrões de Rodapé (Footer), Privacidade e Conformidade
No rodapé (footer) de todos os projetos comerciais, é obrigatório garantir os seguintes elementos:
- 🔒 **Política de Privacidade:** Incluir link visível apontando para uma página dedicada ou modal contendo informações claras sobre o tratamento de dados pessoais conforme a LGPD.
- 🍪 **Política de Cookies:** Deve estar presente no rodapé (pode ser uma página própria ou uma seção explicativa estruturada dentro da própria Política de Privacidade), detalhando os cookies, scripts e serviços de terceiros utilizados.
- 🛡️ **Segurança do Site:** Garantir a implementação completa e obrigatória de protocolo seguro **HTTPS** (certificado SSL ativo), cabeçalhos de segurança adequados e boas práticas contra exposição de dados, sem a necessidade de uma página específica para isso no menu.

## 4. SEO, Metadados e Marcação
- **Preservação SEO:** Mantenha intactos títulos (`<title>`), meta descrições, tags `canonical`, dados estruturados (Schema.org), sitemaps, arquivos `robots.txt` e configurações de indexação.
- **Realismo de Desempenho:** Jamais garanta posicionamento no Google, segurança absoluta ou aprovação total no Core Web Vitals sem evidências reais obtidas por auditoria.

## 5. Gestão de Imagens, Licenciamento e Otimização WebP
- **Bancos Gratuitos e Licenciados:** Utilize apenas bancos de imagens gratuitos com licença compatível para uso comercial. Verifique termos, registre as fontes e evite imagens com marcas d'água ou sem licença clara.
- **Armazenamento Local:** Sempre que viável, salve as imagens autorizadas diretamente na estrutura de arquivos do projeto.
- **Conversão Real para WebP:** Converta imagens para o formato `.webp` utilizando ferramentas reais de compressão/conversão (como Squoosh, Sharp ou similares), sem apenas renomear a extensão do arquivo.
- **Validação de Mídia:** Confira se os caminhos dos arquivos existem, se carregam corretamente e possuem o tipo MIME adequado.
- **Preservação de Ativos Reais:** Preserve as dimensões visuais, proporção, texto alternativo (`alt`) e identidade visual. **Nunca** substitua logotipos oficiais ou fotos reais de produtos/serviços do cliente por imagens genéricas de banco.

## 6. Segurança, Dependências e Estilos
- **Código Seguro:** Evite vulnerabilidades de segurança (ex: XSS, exposição de credenciais, chaves de API em repositórios públicos ou código inseguro).
- **Evitar Conflitos:** Previna conflitos de escopo CSS, exceções JavaScript e incompatibilidades entre navegadores.
- **Soluções de Produção Adequadas:** Proibido o uso de soluções inadequadas para ambiente de produção (como carregar o Tailwind CSS via script CDN diretamente em projetos que exigem performance e compilação de estilos).
- **Dependências Externas:** Não introduza bibliotecas ou scripts externos de terceiros sem justificativa técnica sólida.

## 7. Diagnóstico de Erros no Console
Ao se depurar avisos ou erros no console do navegador:
- Identifique com precisão o arquivo de origem, a linha, o stack trace e o impacto real do problema.
- Diferencie erros críticos de execução, falhas de rede, avisos inofensivos de CSS e mensagens informativas do sistema.
- **Não** presuma que todo aviso (warning) seja um defeito bloqueante.
- **Não** altere código perfeitamente funcional apenas para suprimir mensagens de logs de terceiros.
- **Não** desative recursos ou mecanismos de segurança nativos do navegador. Valide a causa raiz antes de aplicar qualquer correção.

## 8. Controle de Regressão e Segurança de Alterações
- **Estado Original:** Confirme e registre o comportamento ou o estado original antes de tocar no código.
- **Menor Impacto:** Faça sempre a menor alteração possível para atingir o objetivo ("surgical changes").
- **Exclusão com Cuidado:** Nunca elimine trechos de código ou arquivos sem investigar detalhadamente suas dependências.
- **Arquivos Compartilhados:** Evite modificar arquivos globais ou compartilhados sem avaliar rigorosamente o impacto cascata em outros sites do portfólio.
- **Modificações Reversíveis:** Crie alterações pequenas, documentadas e totalmente reversíveis. Apresente um resumo claro ou diff das alterações.

## 9. Testes e Validação Real
- **Proibido Falsos Positivos:** Nunca declare testes realizados quando eles não foram executados de fato.
- **Uso do Script de Verificação:** Utilize o script de validação (`verify.js`) estritamente se ele for compatível com a tecnologia do projeto atual.
- **Testes Manuais Obrigatórios:** Valide visualmente a responsividade, o funcionamento de formulários e os links principais no navegador antes de liberar qualquer entrega.

## 10. Política de Publicação em Produção
- **Zero Publicação Direta Cega:** Nunca publique mudanças diretamente em produção sem autorização explícita do cliente ou gestor.
- **Uso de Branches:** Em ambientes de versionamento (como Git/GitHub), prepare as alterações em uma branch de trabalho dedicada ou utilize Pull Requests / propostas de alteração.
