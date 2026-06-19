# Lista de Tarefas (TODO)

## Batch Video Upload & Editor Reordering
- [x] Executar migrações SQLite / D1 para colunas `upload_status` e novos índices de ordenação.
- [x] Implementar rota API `/api/admin/courses/batch-import` para criar em lote módulos e aulas sob uma transação atômica.
- [x] Atualizar a rota `/api/admin/courses` (PATCH) para suportar reordenação global (`type: 'reorder'`) e atualizações dinâmicas de aulas (título, descrição, `upload_status`).
- [x] Criar componente `<BatchUploadModal>` para importar diretórios contendo vídeos recursivamente (usando Bunny TUS, concorrência de 3 envios e retry manual).
- [x] Adicionar tela premium de sucesso e conclusão no uploader em lote com resumo estatístico.
- [x] Desenvolver sistema nativo HTML5 Drag & Drop no `<CourseEditor>` para reordenação de módulos e aulas (incluindo transferência entre módulos e drop zones vazias).
- [x] Adicionar feedback visual premium (indicadores de inserção, opacidade gradual de arraste, destaque de bordas nas drop-zones, handles de toque/grip).
- [x] Sincronizar o status de upload individual (`upload_status = 'completed'`) no banco de dados SQLite/D1 após o sucesso de cada vídeo.
- [x] Corrigir o positioning de centralização dos modais (`fixed inset-0`) isolando-os do container animado `animate-page-enter`.
- [x] Implementar controle colapsável nas headers dos módulos com animação e chevrons indicativos.
- [x] Desenvolver menu alternativo de movimentação por clique ("Mover para outro módulo") nos cards de aula com persistência automática no banco.
- [x] Criar rota API `DELETE` no `/api/admin/courses` para remoção atômica de módulos e aulas (individual e lote).
- [x] Criar barra de ações em lote flutuante (floating toolbar) com ações de "Mover em lote" e "Excluir em lote".
- [x] Adicionar botões individuais de exclusão (`Trash2`) para aulas e módulos.
- [x] Validar compilação e hot reload local.

## Checkboxes Customizadas & Refatoração de Upload em Lote
- [x] Instalar o componente Checkbox oficial do Shadcn v4 (`npx shadcn add checkbox`) baseado na biblioteca `@base-ui/react`.
- [x] Estilizar o checkbox com cores escuras/laranja neon e glows, adicionando suporte limpo a estado indeterminado (ícone `Minus`) e selecionado (ícone `Check`).
- [x] Implementar o botão "Upload em Lote" global no cabeçalho da página para importação estruturada de pastas (criação automática de módulos e lições).
- [x] Configurar o modal para modo local quando ativado em módulos específicos (permitindo seleção de múltiplos vídeos soltos
- [x] Corrigir transição de tema claro/escuro no CSS
  - [x] Ajustar seletores em `src/app/globals.css`
  - [x] Remover transições globais de SVGs, círculos e elementos de formulário genéricos
- [/] Integrar tela de configurações no Dashboard principal (`src/components/dashboard-client.tsx`)
  - [/] Modificar links da barra lateral (desktop) para atualizar a aba ativar em qualquer parte da área (card) da aula, fornecendo cursor `pointer` no hover (e impedindo a propagação de cliques nos botões de ação).
- [x] Remover a descrição descritiva automática `"Vídeoaula enviada via upload em lote."`, deixando a descrição em branco (`null`) por padrão.

## Melhorias de Usabilidade no Painel Admin
- [x] Envolver o card de curso inteiro do painel principal ("Seus Cursos de Forró") em um componente Next.js `<Link>` para torná-lo 100% clicável.
- [x] Tornar toda a barra de cabeçalho do módulo clicável para colapsar/expandir, adicionando cursor `pointer` e impedindo propagação de eventos no GripVertical, renomear, checkboxes e botões de ação.
- [x] Adicionar diferenciação de cor e contraste visual no cabeçalho de cada módulo (`bg-[#141420]`) em relação ao fundo padrão do container.

## Ajustes de Pesquisa, Upload e Estilo
- [x] Corrigir erros de JSX e imports de tipos no compilation check do TypeScript.
- [x] Remover reload completo ao fechar/concluir o modal de upload em lote.
- [x] Adicionar barra de pesquisa por nome da aula/submódulo no Aluno (`lesson-viewer.tsx`).
- [x] Adicionar barra de pesquisa por nome da aula/submódulo no Admin (`course-editor.tsx`).
- [x] Agrupar resultados da pesquisa por Módulo de origem nos dois painéis.
- [x] Permitir buscar e listar submódulos inteiros pesquisando por seu nome.
- [x] Substituir a aparência de caixa/card dos submódulos por uma tabulação com indicador em árvore (`border-l-2 ml-6`).

## Nova Etapa: Transições, Anotações nos Vídeos & Melhores Controles de Submódulo
- [ ] Implementar CSS keyframes e animações para Accordion (Base UI) no `globals.css` (slide suave para cima e para baixo).
- [ ] Substituir o renderizador condicional `{isExpanded && ...}` dos submódulos no player por uma animação de Grid CSS (`grid-rows-[0fr]` para `grid-rows-[1fr]`) super fluida.
- [ ] Criar a tabela `lesson_notes` no banco de dados local SQLite (`db/schema.sql` e `apply-local-migration.js`) e no Cloudflare D1 remoto (`apply-remote-migration.js`).
- [ ] Criar os endpoints da API backend `/api/notes` (GET para listar, POST para criar, DELETE para deletar) com validação de permissões e segurança por usuário/admin.
- [ ] Adicionar suporte a `seekTrigger` no `<VideoPlayer>` para receber minutagem e avançar/retroceder a reprodução.
- [ ] Implementar a interface de Anotações em `lesson-viewer.tsx`: formulário para criar nota no tempo atual, opção pública/privada, listagem cronológica com busca/filtro e botões de pular para o tempo da nota.
- [ ] Desenvolver lista de sugestões de submódulos existentes no modal de criação e formulário inline de edição de aulas em `course-editor.tsx` para evitar erros de digitação e duplicatas ao mover aulas.
- [ ] Rodar validações locais, testes de compilação de produção e documentar os resultados.
