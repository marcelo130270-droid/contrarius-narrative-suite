# Análise de Arquitetura — Storyteller Suite

> **Licença e créditos originais preservados:** O projeto Storyteller Suite é distribuído sob a licença MIT. Todos os direitos de autoria do código-fonte original pertencem aos seus respectivos criadores. Este documento é exclusivamente analítico e não modifica nenhum arquivo do repositório.

---

## Sumário

1. [Ponto de entrada do plugin](#1-ponto-de-entrada-do-plugin)
2. [Estrutura das pastas dentro de src](#2-estrutura-das-pastas-dentro-de-src)
3. [Entidades e seus tipos/interfaces](#3-entidades-e-seus-tiposinterfaces)
4. [Serviços de leitura de arquivos Markdown](#4-serviços-de-leitura-de-arquivos-markdown)
5. [Indexação recursiva ou não recursiva](#5-indexação-recursiva-ou-não-recursiva)
6. [Leitura, normalização, validação e escrita de YAML](#6-leitura-normalização-validação-e-escrita-de-yaml)
7. [Criação, movimentação, renomeação e exclusão de arquivos e pastas](#7-criação-movimentação-renomeação-e-exclusão-de-arquivos-e-pastas)
8. [Identificação dos tipos de entidade](#8-identificação-dos-tipos-de-entidade)
9. [Configuração das pastas das entidades](#9-configuração-das-pastas-das-entidades)
10. [Campos obrigatórios e dependências de propriedades](#10-campos-obrigatórios-e-dependências-de-propriedades)
11. [Campos personalizados e modos de serialização](#11-campos-personalizados-e-modos-de-serialização)
12. [Sincronização bidirecional de relações](#12-sincronização-bidirecional-de-relações)
13. [Componentes das interfaces principais](#13-componentes-das-interfaces-principais)
14. [Timeline, Gantt, mapas, galeria, network graph e escrita](#14-timeline-gantt-mapas-galeria-network-graph-e-escrita)
15. [Preservação de nomes, caminhos, YAML desconhecido e corpo Markdown](#15-preservação-de-nomes-caminhos-yaml-desconhecido-e-corpo-markdown)
16. [Testes automatizados existentes](#16-testes-automatizados-existentes)
17. [Pontos de alto risco de conflito com upstream](#17-pontos-de-alto-risco-de-conflito-com-upstream)
18. [Pontos adequados para adaptações isoladas](#18-pontos-adequados-para-adaptações-isoladas)
19. [Arquitetura proposta para extensões Contrarius](#19-arquitetura-proposta-para-extensões-contrarius)

---

## 1. Ponto de entrada do plugin

| Atributo | Valor |
|---|---|
| **Arquivo** | `src/main.ts` |
| **Classe** | `StorytellerSuitePlugin extends Plugin` |
| **Exportação** | `export default class StorytellerSuitePlugin` |
| **Risco** | Alto |

### Responsabilidade

`StorytellerSuitePlugin` é a classe principal do plugin Obsidian. Ela centraliza todo o estado de configuração (`StorytellerSuiteSettings`), registra os comandos, registra as views (Dashboard, Timeline, NetworkGraph, Map, WritingPanel, Campaign, SceneGraph, Analytics), inicializa o `WordCountTracker`, o `TemplateStorageManager`, o `TemplateNoteManager`, o `TimelineTrackManager` e o `EraManager`, e expõe todos os métodos CRUD das entidades (ex: `saveCharacter`, `listLocations`, `deleteEvent`).

### Dependências principais

- `obsidian` (Plugin, TFile, TFolder, Notice, WorkspaceLeaf, debounce)
- `./yaml/EntitySections` (buildFrontmatter, getWhitelistKeys, normalizeEntityType, parseSectionsFromMarkdown, parseFrontmatterFromContent)
- `./utils/YamlSerializer` (stringifyYamlWithLogging, validateFrontmatterPreservation)
- `./services/EntitySyncService`
- `./folders/FolderResolver`
- Todos os modals, views e utilitários do projeto

### Justificativa do risco (Alto)

O arquivo possui mais de 364 KB e contém a implementação de todos os métodos CRUD para mais de 15 tipos de entidade. Qualquer atualização do upstream que altere a interface `Plugin` do Obsidian ou a forma como `metadataCache`, `vault.modify`, ou `vault.read` funcionam afeta diretamente este arquivo. Patches locais nele têm alto risco de conflito de merge.

---

## 2. Estrutura das pastas dentro de src

```
src/
├── main.ts                      ← Ponto de entrada; classe principal do plugin
├── types.ts                     ← Todas as interfaces TypeScript das entidades
├── StorytellerSuiteSettingTab.ts ← Aba de configurações do plugin
│
├── commands/
│   └── SaveNoteAsTemplateCommand.ts
│
├── compile/
│   ├── CompileEngine.ts         ← Orquestrador de compilação de manuscrito
│   ├── SceneOrderManager.ts     ← Ordenação de cenas no manuscrito
│   ├── WordCountTracker.ts      ← Rastreamento de contagem de palavras
│   ├── steps.ts                 ← Passos de compilação embutidos
│   └── index.ts
│
├── components/
│   └── LocationPicker.ts        ← Seletor de localização reutilizável
│
├── extensions/
│   ├── BranchBlockExtension.ts  ← Extensão CodeMirror para blocos ```branch
│   └── LedgerEditorExtension.ts ← Extensão CodeMirror para blocos ```ledger
│
├── folders/
│   └── FolderResolver.ts        ← Resolução centralizada de caminhos de pasta
│
├── i18n/
│   ├── strings.ts               ← Função t() e registro de locales
│   └── locales/                 ← Arquivos de tradução (en, de, es, fr, zh, pt…)
│
├── import/
│   ├── EntityExtractor.ts       ← Extração de entidades de documentos importados
│   ├── ImportManager.ts         ← Orquestrador de importação
│   ├── ImportTypes.ts           ← Tipos de importação
│   └── parsers/                 ← Parsers por formato (Docx, Epub, Fountain, Html,
│                                   Json, Markdown, Odt, Pdf, PlainText, Rtf)
│
├── leaflet/
│   ├── EntityLinker.ts          ← Liga entidades a marcadores no mapa
│   ├── EntityMarkerDiscovery.ts ← Descobre marcadores via frontmatter
│   ├── MapEntityRenderer.ts     ← Renderiza entidades no mapa Leaflet
│   ├── ObsidianTileLayer.ts     ← Camada de tiles customizada
│   ├── TileGenerator.ts         ← Gerador de tiles para imagens grandes
│   ├── processor.ts             ← Processador de bloco de código de mapa (depreciado)
│   ├── renderer.ts              ← Renderizador Leaflet
│   ├── types.ts                 ← Tipos específicos do Leaflet
│   └── utils/
│       ├── RasterCoords.ts      ← Conversão de coordenadas raster
│       └── parser.ts            ← Parser de frontmatter de mapa
│
├── modals/                      ← ~85 modals (um por tipo de entidade/ação)
│   ├── entity/                  ← Componentes reutilizáveis de modal de entidade
│   ├── ui/                      ← Modals genéricos (ConfirmModal, PromptModal)
│   └── utils/                   ← Utilitários de layout de modal
│
├── services/
│   ├── EntitySyncService.ts     ← Sincronização bidirecional de relações
│   └── LocationService.ts       ← Serviço auxiliar de localização
│
├── templates/
│   ├── TemplateApplicator.ts    ← Aplicação de templates a entidades
│   ├── TemplateEntityRegistry.ts← Registro de templates por entidade
│   ├── TemplateLinkFields.ts    ← Campos de link em templates
│   ├── TemplateMigrator.ts      ← Migração de templates legados
│   ├── TemplateNoteManager.ts   ← Gerenciamento de notas de template
│   ├── TemplateStorageManager.ts← Armazenamento persistente de templates
│   ├── TemplateTypes.ts         ← Tipos de template
│   ├── TemplateValidator.ts     ← Validação de templates
│   ├── VariableSubstitution.ts  ← Substituição de variáveis em templates
│   ├── modals/                  ← Modals do sistema de templates
│   └── prebuilt/                ← Templates embutidos (Fantasy, Cyberpunk, etc.)
│
├── tutorial/
│   └── StorytellerGuideContent.ts ← Conteúdo do guia de onboarding
│
├── utils/
│   ├── BranchParser.ts          ← Parser de blocos branch (fluxo de campanha)
│   ├── CharacterSheetGenerator.ts← Gerador de fichas de personagem
│   ├── CharacterSheetTemplates.ts← Templates de fichas de personagem
│   ├── ConflictDetector.ts      ← Detecção de conflitos de timeline
│   ├── dataview.ts              ← Integração com plugin DataView
│   ├── DateParsing.ts           ← Parser de datas flexível (BCE incluso)
│   ├── DiceRoller.ts            ← Rolagem de dados para campanha
│   ├── EntityTemplates.ts       ← Seções de template por tipo de entidade
│   ├── EraManager.ts            ← Gerenciamento de eras da timeline
│   ├── frontmatter.ts           ← Parser de frontmatter específico para mapas
│   ├── GraphUtils.ts            ← Utilitários do grafo de rede
│   ├── HtmlSanitize.ts          ← Sanitização de HTML
│   ├── ImageSelectionHelper.ts  ← Seleção de imagens da galeria
│   ├── ItemOwnership.ts         ← Lógica de posse de itens
│   ├── LedgerParser.ts          ← Parser de entradas de razão (ledger)
│   ├── LocationMigration.ts     ← Migração de dados legados de localização
│   ├── log.ts                   ← Logger interno
│   ├── MapHierarchyManager.ts   ← Hierarquia de mapas
│   ├── MapManager.ts            ← Gerenciamento de mapas
│   ├── MapModalHelper.ts        ← Auxiliar de modal de mapa
│   ├── PlatformUtils.ts         ← Detecção de plataforma (mobile/desktop)
│   ├── StoryBoardGenerator.ts   ← Gerador de canvas Obsidian (storyboard)
│   ├── SvgImageUtils.ts         ← Utilitários de imagem SVG
│   ├── TagEventGenerator.ts     ← Gerador de eventos por tag
│   ├── TagTimelineGenerator.ts  ← Gerador de timeline por tag
│   ├── TemplateBackgrounds.ts   ← Fundos de templates
│   ├── TemplatePlaceholders.ts  ← Placeholders de templates
│   ├── TemplatePreviewRenderer.ts← Renderizador de preview de template
│   ├── TimelineControlsBuilder.ts← Construtor de controles da timeline
│   ├── TimelineFilterBuilder.ts ← Construtor de filtros da timeline
│   ├── TimelineRenderer.ts      ← Renderizador principal da timeline
│   ├── TimelineTrackManager.ts  ← Gerenciamento de faixas da timeline
│   ├── WikiLinks.ts             ← Utilitários de wiki links ([[…]])
│   └── YamlSerializer.ts        ← Serialização YAML com preservação de vazios
│
├── views/
│   ├── AnalyticsDashboardView.ts← View de análise do manuscrito
│   ├── CampaignView.ts          ← View de campanha de RPG
│   ├── DashboardView.ts         ← Dashboard principal (abas/tabs)
│   ├── MapView.ts               ← View de mapa interativo (Leaflet)
│   ├── NetworkGraphRenderer.ts  ← Renderizador Cytoscape do grafo de rede
│   ├── NetworkGraphView.ts      ← View do grafo de rede
│   ├── NetworkGraphView.backup.ts← Backup de versão anterior (não usado)
│   ├── SceneGraphView.ts        ← View do grafo de cenas (storyboard)
│   ├── TimelineView.ts          ← View da timeline
│   ├── WritingPanelView.ts      ← Painel de escrita
│   ├── WritingViewRenderers.ts  ← Renderizadores do painel de escrita
│   └── dashboard/
│       ├── controllers/         ← Controladores por aba do dashboard
│       ├── DashboardMutationRunner.ts
│       ├── DashboardRefreshCoordinator.ts
│       ├── DashboardStateSnapshot.ts
│       ├── DashboardTabController.ts
│       └── rendering/
│           └── WritingListRenderer.ts
│
└── yaml/
    └── EntitySections.ts        ← Whitelist de frontmatter, buildFrontmatter, parseSections
```

---

## 3. Entidades e seus tipos/interfaces

Todas as interfaces são definidas em `src/types.ts`.

| Entidade | Interface | Campo `name` obrigatório | Campo `id` | Campo `storyId` |
|---|---|---|---|---|
| Personagem | `Character` | Sim | Opcional | Não |
| Localização | `Location` | Sim | Opcional | Não |
| Evento | `Event` | Sim | Opcional | Não |
| Item/Objeto | `PlotItem` | Sim | Opcional | Não |
| Referência | `Reference` | Sim | Opcional | Não |
| Capítulo | `Chapter` | Sim | Opcional | Não |
| Cena | `Scene` | Sim | Opcional | Não |
| Livro | `Book` | Sim | Opcional | Não |
| Mapa | `StoryMap` | Sim | Opcional | Não |
| Cultura | `Culture` | Sim | Opcional | Não |
| Economia | `Economy` | Sim | Opcional | Não |
| Sistema de Magia | `MagicSystem` | Sim | Opcional | Não |
| Compêndio | `CompendiumEntry` | Sim | Opcional | Não |
| Grupo/Facção | `Group` | Sim | **Obrigatório** | **Obrigatório** |
| Sessão de Campanha | `CampaignSession` | Sim | Opcional | **Obrigatório** |
| História | `Story` | Sim | **Obrigatório** | N/A |
| Imagem de Galeria | `GalleryImage` | Não | **Obrigatório** | Não |
| Foco do Timeline | `TimelineFork` | Sim | **Obrigatório** | Não |
| Link de Causalidade | `CausalityLink` | Não | **Obrigatório** | Não |
| Conflito de Timeline | `TimelineConflict` | Não | **Obrigatório** | Não |
| Era de Timeline | `TimelineEra` | Sim | **Obrigatório** | Não |
| Faixa de Timeline | `TimelineTrack` | Sim | **Obrigatório** | Não |
| Rascunho de Manuscrito | `StoryDraft` | Sim | **Obrigatório** | **Obrigatório** |

### Sub-interfaces relevantes

| Interface | Uso |
|---|---|
| `TypedRelationship` | Relação tipada entre entidades no grafo de rede |
| `GraphNode` / `GraphEdge` | Nós e arestas do grafo de rede |
| `MapMarker` / `MapLayer` / `MapBinding` | Marcadores, camadas e ligações de mapa |
| `EntityRef` | Referência de entidade dentro de uma localização |
| `GroupMemberDetails` | Membro detalhado de um grupo/facção |
| `SceneBranch` | Ramo de escolha em cena de campanha |
| `EncounterTable` | Tabela de encontros em cena de campanha |
| `CompileWorkflow` / `CompileStepConfig` | Fluxo de compilação de manuscrito |
| `StoryDraft` / `IndentedSceneRef` | Rascunho de manuscrito com ordenação de cenas |
| `PartyMemberState` / `CampaignGroupStanding` | Estado de campanha |

---

## 4. Serviços de leitura de arquivos Markdown

### 4.1 Leitura via Obsidian Vault API

**Arquivo:** `src/main.ts` (métodos `list*` e `load*`)

O plugin lê entidades diretamente do vault Obsidian usando:

- `app.vault.getMarkdownFiles()` — lista todos os arquivos `.md` do vault
- `app.metadataCache.getFileCache(file)` — obtém frontmatter cacheado (primário)
- `app.vault.cachedRead(file)` — leitura com cache do conteúdo do arquivo
- `parseFrontmatterFromContent(content)` — fallback quando o cache do Obsidian está desatualizado

**Fluxo de leitura de uma entidade:**

```
app.vault.getMarkdownFiles()
  → filtrar por pasta da entidade (via FolderResolver)
  → getRawFrontmatterForFile(file)
      → app.metadataCache.getFileCache(file).frontmatter  (1º tentativa)
      → parseFrontmatterFromContent(content)              (fallback)
  → normalizeEntityCustomFields()
  → normalizeFrontmatterEntityReferences()
  → parseSectionsFromMarkdown(content)                   (corpo Markdown)
```

### 4.2 Leitura do corpo Markdown (seções)

**Arquivo:** `src/yaml/EntitySections.ts` — função `parseSectionsFromMarkdown()`

A função divide o corpo do arquivo em seções usando os cabeçalhos `##`. Cada seção é armazenada em um `Record<string, string>` onde a chave é o nome da seção sem o `##`. Os campos de corpo longo (description, backstory, history, outcome, etc.) são armazenados nas seções e **nunca** no frontmatter YAML.

**Mapeamento seção ↔ campo de entidade** (definido em `src/utils/EntityTemplates.ts`, `BODY_SECTION_FIELD_MAP`):

| Tipo de Entidade | Seção Markdown | Campo da Interface |
|---|---|---|
| character | Description | `description` |
| character | Backstory | `backstory` |
| location | Description | `description` |
| location | History | `history` |
| event | Description | `description` |
| event | Outcome | `outcome` |
| item | Description | `description` |
| item | History | `history` |
| culture | Description, Values, Religion, Social Structure, History, Naming Conventions, Customs | campos correspondentes |
| economy | Description, Industries, Taxation | campos correspondentes |
| magicSystem | Description, Rules, Source, Costs, Limitations, Training, History | campos correspondentes |
| scene | Content | `content` |

### 4.3 Leitura de dados de frontmatter para mapas

**Arquivo:** `src/utils/frontmatter.ts` — função `readFrontmatter()`

Lê campos específicos de mapas (`location`, `mapmarker`, `mapmarkers`, `mapoverlay`) do frontmatter via `app.metadataCache`.

---

## 5. Indexação recursiva ou não recursiva

### Indexação padrão: NÃO recursiva

O padrão do plugin é **não recursivo**. A leitura de entidades filtra arquivos `.md` que estão diretamente na pasta configurada para cada tipo de entidade, sem entrar em subpastas.

**Trecho relevante em `src/main.ts`:**
```typescript
const files = this.app.vault.getMarkdownFiles().filter(file => {
    const path = normalizePath(file.path);
    return scanPaths.some(folder => path.startsWith(`${folder}/`));
});
```

O uso de `path.startsWith(`${folder}/`)` inclui **subpastas implicitamente** — qualquer arquivo em qualquer nível abaixo da pasta será incluído. Portanto, na prática, a indexação **é recursiva por natureza do filtro**.

### Caso especial: `{bookName}` (capítulos e cenas)

**Arquivo:** `src/main.ts` — método `getReferenceScanPaths()`

Quando a pasta de capítulos ou cenas usa o placeholder `{bookName}`, o plugin escaneia múltiplas pastas: uma por livro registrado + uma pasta sem livro associado. Este é o único caso onde múltiplos caminhos são explicitamente varridos.

### Indexação de grupos

Grupos são armazenados em `plugin.settings.groups` (memória/JSON), não como arquivos Markdown individuais. A sincronização com o vault é feita via `syncGroupsFromVault()`, que monitora criação/edição de arquivos `.md` na pasta de grupos.

---

## 6. Leitura, normalização, validação e escrita de YAML

### 6.1 Leitura

**Arquivo:** `src/yaml/EntitySections.ts` — `parseFrontmatterFromContent()`

```typescript
export function parseFrontmatterFromContent(content: string): Record<string, unknown> | undefined
```

Faz parse manual do bloco `---…---` inicial do arquivo usando `parseYaml()` do Obsidian. É o fallback quando o cache do Obsidian está desatualizado.

**Normalização pós-leitura** (`src/main.ts`):

- `normalizeFrontmatterEntityReferences()` — remove wiki links `[[…]]` dos campos de referência, resolve IDs vs. nomes
- `normalizeEntityCustomFields()` — move campos não whitelistados para `customFields`
- `stripWikiLink()` — strip de `[[…]]` em campos escalares

### 6.2 Whitelist e construção do frontmatter

**Arquivo:** `src/yaml/EntitySections.ts` — `buildFrontmatter()` e `FRONTMATTER_WHITELISTS`

Cada tipo de entidade possui um `Set<string>` de chaves permitidas no frontmatter. A função `buildFrontmatter()` garante:

1. **Nunca remove** campos que existiam no frontmatter original (preservação não-destrutiva)
2. Filtra campos nulos/undefined que **não** existiam originalmente
3. Filtra strings com `\n` (strings longas vão para seções `##`)
4. Filtra arrays vazios e objetos vazios que **não** existiam originalmente
5. Aplica wiki links `[[…]]` nos campos `WIKI_LINK_ARRAY_FIELDS` e `WIKI_LINK_SCALAR_FIELDS`
6. Mantém a ordem dos campos conforme o frontmatter original

**Assinatura:**
```typescript
export function buildFrontmatter(
  entityType: EntityType,
  source: Record<string, unknown>,
  preserveKeys?: Set<string>,
  options?: {
    customFieldsMode?: 'flatten' | 'nested';
    originalFrontmatter?: Record<string, unknown>;
    omitOriginalKeys?: Iterable<string>;
  }
): Record<string, unknown>
```

### 6.3 Serialização YAML

**Arquivo:** `src/utils/YamlSerializer.ts`

| Função | Responsabilidade |
|---|---|
| `stringifyYamlWithEmptyFields()` | Serializa com preservação de strings vazias (`""`) usando marcador temporário |
| `validateFrontmatterPreservation()` | Valida que nenhum campo existente é perdido na serialização |
| `stringifyYamlWithLogging()` | Versão com logging para depuração |

A serialização usa `stringifyYaml()` do Obsidian e aplica pós-processamento de regex para substituir o marcador `__EMPTY_STRING_MARKER__` por `""`.

### 6.4 Escrita

**Arquivo:** `src/main.ts` — métodos `save*` (ex: `saveCharacter`, `saveLocation`)

Fluxo de escrita:
```
entidade → buildFrontmatter() → stringifyYamlWithLogging() → reconstrução do arquivo
         → "---\n" + yaml + "---\n" + body (seções reconstruídas)
         → app.vault.modify(file, content)
```

O corpo é reconstruído via `getTemplateSections()` de `src/utils/EntityTemplates.ts`, que gera os blocos `## Seção\ncontent\n` no formato correto.

---

## 7. Criação, movimentação, renomeação e exclusão de arquivos e pastas

### 7.1 Criação de arquivo

**Arquivo:** `src/main.ts` — métodos `save*` com flag de criação

```typescript
// Cria o arquivo se não existe
const file = this.app.vault.getAbstractFileByPath(filePath);
if (!file) {
    await this.app.vault.create(filePath, content);
} else {
    await this.app.vault.modify(file as TFile, content);
}
```

A pasta da entidade é criada automaticamente via `app.vault.createFolder()` antes da criação do arquivo, se não existir.

### 7.2 Criação de pastas

**Arquivo:** `src/main.ts` — método `ensureEntityFolders()`

Chamado durante `onload()` para criar todas as pastas de entidade se não existirem. Pode ser desabilitado pela configuração `disableAutoFolderCreation`.

### 7.3 Renomeação de arquivo

O arquivo é renomeado quando `name` de uma entidade muda. O novo caminho é calculado via:

```typescript
const newFilePath = `${folder}/${toSafeFileName(entity.name)}.md`;
await this.app.fileManager.renameFile(file, newFilePath);
```

`toSafeFileName()` em `src/yaml/EntitySections.ts` remove caracteres ilegais (`< > : " / \ | ? *`).

### 7.4 Exclusão de arquivo

**Arquivo:** `src/main.ts` — métodos `delete*`

```typescript
const file = this.app.vault.getAbstractFileByPath(filePath);
if (file) {
    await this.app.vault.trash(file, true); // move para lixeira do sistema
}
```

Após a exclusão, `EntitySyncService.handleEntityDeletion()` é chamado para remover todas as referências à entidade deletada nos outros arquivos.

### 7.5 Movimentação

Não existe operação explícita de movimentação de entidade entre pastas. A "movimentação" ocorre indiretamente via renomeação do arquivo (quando o `name` muda e o novo caminho difere do anterior).

---

## 8. Identificação dos tipos de entidade

**Arquivo:** `src/yaml/EntitySections.ts` — função `normalizeEntityType()` e campo `entityType`

Todo arquivo Markdown de entidade recebe o campo `entityType` no frontmatter ao ser criado/salvo pelo plugin:

```yaml
---
entityType: character
name: Aragorn
---
```

A função `normalizeEntityType()` normaliza variações de escrita:

```typescript
if (raw === 'magicsystem' || raw === 'magic-system' || raw === 'magic_system') return 'magicSystem';
if (raw === 'compendiumentry' || raw === 'compendium-entry' || raw === 'compendium_entry') return 'compendiumEntry';
if (raw === 'campaignsession' || raw === 'campaign-session' || raw === 'campaign_session') return 'campaignSession';
```

A função `isStampedEntityTypeCompatible()` verifica compatibilidade entre o `entityType` lido do arquivo e o tipo esperado, retornando `true` se o arquivo não possui `entityType` (legado) ou se os tipos são compatíveis.

Os tipos canônicos são definidos em `export type EntityType` no mesmo arquivo:
`character`, `location`, `event`, `item`, `reference`, `chapter`, `scene`, `map`, `culture`, `faction`, `economy`, `magicSystem`, `compendiumEntry`, `book`, `campaignSession`.

---

## 9. Configuração das pastas das entidades

**Arquivo:** `src/folders/FolderResolver.ts` — classe `FolderResolver`

### Modos de configuração (em ordem de prioridade)

| Prioridade | Modo | Configuração |
|---|---|---|
| 1 | Pastas personalizadas por entidade | `enableCustomEntityFolders: true` + paths individuais |
| 2 | Template de pasta raiz | `storyRootFolderTemplate` com `{storyName}`, `{storySlug}`, `{storyId}`, `{bookName}` |
| 3 | Modo de história única | `enableOneStoryMode: true` + `oneStoryBaseFolder` |
| 4 | Padrão multi-história | `StorytellerSuite/Stories/{storyName}/{EntityType}/` |

### Pastas padrão (modo multi-história)

```
StorytellerSuite/Stories/{storyName}/Characters/
StorytellerSuite/Stories/{storyName}/Locations/
StorytellerSuite/Stories/{storyName}/Events/
StorytellerSuite/Stories/{storyName}/Items/
StorytellerSuite/Stories/{storyName}/References/
StorytellerSuite/Stories/{storyName}/Chapters/
StorytellerSuite/Stories/{storyName}/Scenes/
StorytellerSuite/Stories/{storyName}/Maps/
StorytellerSuite/Stories/{storyName}/Cultures/
StorytellerSuite/Stories/{storyName}/Factions/
StorytellerSuite/Stories/{storyName}/Economies/
StorytellerSuite/Stories/{storyName}/MagicSystems/
StorytellerSuite/Stories/{storyName}/Groups/
StorytellerSuite/Stories/{storyName}/Compendium/
StorytellerSuite/Stories/{storyName}/Books/
StorytellerSuite/Stories/{storyName}/Sessions/
```

### Método principal

```typescript
getEntityFolder(type: EntityFolderType, context?: { bookName?: string }): string
```

Lança `Error` se não há história ativa quando necessário. Use `tryGetEntityFolder()` para versão sem exceção.

---

## 10. Campos obrigatórios e dependências de propriedades

### Campo `name`

**Obrigatório em todas as entidades.** É a chave primária de referência entre entidades (a maioria usa nome, não ID). O arquivo `.md` recebe o nome sanitizado como filename: `toSafeFileName(entity.name) + ".md"`.

### Campo `id`

**Opcional na maioria das entidades, obrigatório em** `Group`, `Story`, `GalleryImage`, `TimelineFork`, `CausalityLink`, `TimelineConflict`, `TimelineEra`, `TimelineTrack`, `StoryDraft`.

Para entidades de arquivo, o `id` é gerado automaticamente se ausente (via `crypto.randomUUID()` ou equivalente). Campos que usam ID para referência (`currentLocationId`, `chapterId`, `parentLocationId`, etc.) têm fallback para nome quando o ID não é encontrado.

### Campo `storyId`

**Obrigatório em** `Group` e `CampaignSession`.

Grupos são específicos por história (`storyId` é a chave de isolamento). Sessões de campanha precisam do `storyId` para resolução de contexto.

### Campo `entityType`

**Escrito automaticamente** pelo plugin em cada save. Não é obrigatório no arquivo (legado suportado), mas é inserido na próxima escrita. Usado para validação de compatibilidade.

### Dependências de propriedades críticas

| Campo | Entidade | Depende de |
|---|---|---|
| `bookId` / `bookName` | Chapter, Scene | Livro existente no vault |
| `chapterId` / `chapterName` | Scene | Capítulo existente no vault |
| `currentLocationId` | Character | Localização existente no vault |
| `parentLocationId` | Location | Localização pai existente no vault |
| `correspondingMapId` | Location | Mapa existente no vault |
| `correspondingLocationId` | StoryMap | Localização existente no vault |
| `storyId` | Group, CampaignSession | História existente em settings |
| `dependencies` | Event | Eventos existentes no vault (por ID) |
| `partyCharacterIds` | CampaignSession | Personagens existentes no vault |

---

## 11. Campos personalizados e modos de serialização

**Arquivo:** `src/main.ts` — `normalizeEntityCustomFields()` e `src/yaml/EntitySections.ts` — `buildFrontmatter()`

### Interface

```typescript
customFields?: Record<string, string>
```

Presente em: Character, Location, Event, PlotItem, Culture, Economy, MagicSystem, CompendiumEntry, Group, Book, StoryMap.

### Modos de serialização (configuração `customFieldsMode`)

| Modo | Comportamento | Configuração padrão |
|---|---|---|
| `flatten` | Cada campo customizado é promovido para o nível raiz do frontmatter (ex: `myField: value`) | **Sim** |
| `nested` | Campos ficam dentro de um objeto `customFields` no frontmatter (ex: `customFields:\n  myField: value`) | Não |

**No modo `flatten`**, campos conflitantes com a whitelist da entidade ou com campos de nível superior já existentes são mantidos em `customFields` (sem promoção) para evitar colisões.

### Normalização de entrada

Ao **carregar** uma entidade, `normalizeEntityCustomFields()` varre o frontmatter e move para `customFields` qualquer chave que não esteja na whitelist da entidade e seja uma string escalar não-multilinha. Isso garante que campos adicionados manualmente pelo usuário no frontmatter apareçam editáveis nos modals.

### Campos multilinha

Strings contendo `\n` nunca são escritas no frontmatter — ficam nas seções `##` do corpo Markdown.

---

## 12. Sincronização bidirecional de relações

**Arquivo:** `src/services/EntitySyncService.ts` — classe `EntitySyncService`

### Mecanismo

O `EntitySyncService` é instanciado por `StorytellerSuitePlugin` e chamado em cada operação `save*`. Ele mantém um array `relationshipMappings` com ~35 mapeamentos declarativos do tipo:

```typescript
interface RelationshipMapping {
    sourceType: EntityType;
    sourceField: string;
    targetType: EntityType;
    targetField: string;
    bidirectional: boolean;
    isArray?: boolean;
    transform?: (value, sourceEntity) => SyncValue;
    reverseTransform?: (value, targetEntity) => SyncValue;
}
```

### Fluxo

1. `syncEntity(entityType, newEntity, oldEntity)` é chamado após cada save
2. Detecta diferenças entre `newEntity` e `oldEntity` nos campos mapeados
3. Para itens adicionados: chama `addToTarget()` — adiciona referência no arquivo alvo
4. Para itens removidos: chama `removeFromTarget()` — remove referência no arquivo alvo
5. Previne recursão via `syncInProgress: Set<string>` e flag `_skipSync` nas entidades
6. Após salvar: propaga renomeações via `propagateSourceRename()`

### Proteção anti-loop

```typescript
if (this.syncInProgress.has(syncKey)) return;
this.syncInProgress.add(syncKey);
try { ... } finally { this.syncInProgress.delete(syncKey); }
```

Além disso, `saveEntity()` interno define `entity._skipSync = true` para que o save secundário não dispare uma nova rodada de sync.

### Principais relações bidirecionais mapeadas

| Origem | Campo | ↔ | Destino | Campo |
|---|---|---|---|---|
| Event | `characters` | ↔ | Character | `events` |
| Character | `currentLocationId` | ↔ | Location | `entityRefs` |
| Item | `currentOwner` | ↔ | Character | `ownedItems` |
| Event | `items` | ↔ | PlotItem | `associatedEvents` |
| Culture | `linkedCharacters` | ↔ | Character | `cultures` |
| Economy | `linkedCharacters` | ↔ | Character | `linkedEconomies` |
| MagicSystem | `linkedCharacters` | ↔ | Character | `magicSystems` |
| Chapter | `linkedCharacters` | ↔ | Character | `linkedChapters` |
| Scene | `linkedCharacters` | ↔ | Character | `linkedScenes` |
| Location | `parentLocationId` | ↔ | Location | `childLocationIds` |
| Scene | `setupScenes` | ↔ | Scene | `payoffScenes` |
| CompendiumEntry | `linkedCharacters` | ↔ | Character | `compendiumEntries` |

### Propagação hierárquica de `entityRefs`

Quando uma entidade é adicionada a `Location.entityRefs`, o service propaga essa referência recursivamente para todos os locais pais na hierarquia (`parentLocationId`). Na remoção, verifica se nenhum filho ainda referencia a entidade antes de remover do pai.

---

## 13. Componentes das interfaces principais

### 13.1 Dashboard (`DashboardView`)

**Arquivo:** `src/views/DashboardView.ts`

- `VIEW_TYPE_DASHBOARD = 'storyteller-dashboard-view'`
- Estrutura de abas (tabs) com `DashboardTabController`
- Cada aba tem um controlador próprio em `src/views/dashboard/controllers/`
- Controladores: BooksController, CampaignController, CharactersController, CompendiumController, CulturesController, EconomiesController, EventsController, ItemsController, LocationsController, MagicSystemsController, MapsController, ReferencesController, WritingController
- `DashboardRefreshCoordinator` coordena atualizações reativas
- `DashboardMutationRunner` executa mutações com refresh automático
- `DashboardStateSnapshot` captura/restaura estado de scroll e seleção

### 13.2 Modals de entidade

~85 modals em `src/modals/`. Cada entidade tem pelo menos:
- `*Modal.ts` — criação/edição completa
- `*SuggestModal.ts` — seletor de entidade existente
- `*ListModal.ts` — listagem com filtros

Componentes reutilizáveis:
- `ResponsiveModal.ts` — base para modals responsivos (mobile/desktop)
- `entity/EntityCustomFieldsEditor.ts` — editor de campos personalizados
- `entity/EntityGroupSelector.ts` — seletor de grupos
- `ui/ConfirmModal.ts` — modal de confirmação genérico
- `ui/PromptModal.ts` — modal de entrada de texto

### 13.3 Settings Tab

**Arquivo:** `src/StorytellerSuiteSettingTab.ts`

Renderiza a aba de configurações do plugin no Obsidian. Expõe todas as opções de `StorytellerSuiteSettings`.

---

## 14. Timeline, Gantt, mapas, galeria, network graph e escrita

### 14.1 Timeline

**Arquivos:** `src/views/TimelineView.ts`, `src/utils/TimelineRenderer.ts`

- View registrada como `VIEW_TYPE_TIMELINE = 'storyteller-timeline-view'`
- Renderiza eventos em ordem cronológica usando `vis-timeline` (biblioteca npm)
- Suporte a: modo Gantt, agrupamento por localização/grupo/personagem/faixa, filtros, eras, forks de timeline
- Estado persistido via `TimelineUIState` (ganttMode, groupMode, narrativeOrder, filtros, etc.)
- `TimelineControlsBuilder` constrói a toolbar; `TimelineFilterBuilder` constrói os filtros
- Conflitos detectados por `ConflictDetector` em `src/utils/ConflictDetector.ts`

**Ordem narrativa vs. cronológica:**
- Campo `narrativeSequence?: number` em `Event` define a ordem narrativa
- Campo `narrativeMarkers` permite marcar flashbacks e flash-forwards
- O toggle `narrativeOrder` em `TimelineUIState` alterna entre as duas ordens

### 14.2 Gantt

Modo dentro da `TimelineView`. Ativado pelo toggle `ganttMode: boolean` em `TimelineUIState`. Usa o mesmo `TimelineRenderer` com opções distintas do `vis-timeline`. Configurações: `ganttShowProgressBars`, `ganttDefaultDuration`, `ganttArrowStyle`.

### 14.3 Mapas

**Arquivos:** `src/views/MapView.ts`, `src/leaflet/*`

- View registrada como `VIEW_TYPE_MAP = 'storyteller-map-view'`
- Baseado em **Leaflet** (biblioteca npm `leaflet ^1.9.4`)
- Suporte a mapas de imagem (pixel-based) e mapas reais (OpenStreetMap tiles)
- `TileGenerator` gera tiles para imagens grandes (threshold configurável em pixels)
- `EntityLinker` vincula entidades do vault a marcadores no mapa
- `EntityMarkerDiscovery` descobre marcadores via frontmatter (`location`, `mapmarker`, `mapmarkers`)
- `ObsidianTileLayer` implementa camada de tiles customizada

### 14.4 Galeria

**Arquivo:** `src/modals/GalleryModal.ts` (e modals auxiliares)

- Metadados da galeria armazenados em `plugin.settings.galleryData` (JSON, não em arquivos)
- Imagens reais permanecem no vault; apenas os metadados são gerenciados
- Modos de escopo: `vault` (todas as imagens) ou `book` (por livro)
- Campo `storyIds` em `GalleryImage` para scoping por história

### 14.5 Network Graph

**Arquivos:** `src/views/NetworkGraphView.ts`, `src/views/NetworkGraphRenderer.ts`

- View registrada como `VIEW_TYPE_NETWORK_GRAPH = 'storyteller-network-graph-view'`
- Baseado em **Cytoscape.js** (biblioteca npm `cytoscape ^3.30.0`)
- Filtra por tipos de entidade, intervalos de data, grupos
- `GraphNode` e `GraphEdge` são as interfaces de dados do grafo
- Arestas tipadas via `TypedRelationship` com cor por tipo de relação

### 14.6 Escrita (WritingPanel)

**Arquivo:** `src/views/WritingPanelView.ts`, `src/views/WritingViewRenderers.ts`

- View registrada como `VIEW_TYPE_WRITING_PANEL = 'storyteller-writing-panel-view'`
- Lista capítulos/cenas em ordem com drag-and-drop
- Integrado ao `CompileEngine` para compilação de manuscrito

**SceneGraph (Storyboard):**
- **Arquivo:** `src/views/SceneGraphView.ts`
- View registrada como `VIEW_TYPE_SCENE_GRAPH`
- Visualização do grafo de cenas (kanban/canvas) via `StoryBoardGenerator`

### 14.7 Compilação de manuscrito

**Arquivo:** `src/compile/CompileEngine.ts`

- Pipeline de etapas (scene → join → manuscript)
- Etapas embutidas em `src/compile/steps.ts`: strip-frontmatter, prepend-scene-title, remove-wikilinks, insert-separator, concatenate, export-markdown, export-html, etc.
- Suporte a etapas personalizadas em JavaScript (armazenadas em `customCompileSteps`)
- `SceneOrderManager` mantém a ordem de cenas por rascunho (`StoryDraft`)
- `WordCountTracker` rastreia contagem de palavras e progresso diário

---

## 15. Preservação de nomes, caminhos, YAML desconhecido e corpo Markdown

### 15.1 Nomes de arquivo

Ao renomear uma entidade, o arquivo `.md` é renomeado usando `app.fileManager.renameFile()`. O novo nome é `toSafeFileName(entity.name) + ".md"`. O nome original é sobrescrito. **Não há preservação do nome original do arquivo** se ele difere de `entity.name`.

### 15.2 Caminhos

Caminhos são calculados dinamicamente via `FolderResolver`. Se a pasta de uma entidade muda nas configurações, os arquivos **não** são movidos automaticamente — apenas novas escritas usarão o novo caminho.

### 15.3 YAML desconhecido (campos não whitelistados)

**Política: preservação não-destrutiva** (implementada em `buildFrontmatter()`):

```typescript
// Preserve ALL fields from originalFrontmatter that weren't already processed
// This ensures user-added fields are NEVER deleted, even if empty
if (originalFrontmatter) {
    for (const [key, value] of Object.entries(originalFrontmatter)) {
        if (key === 'position') continue; // campo interno Obsidian
        if (key.startsWith('_')) continue; // flags de runtime
        if (omitOriginalKeys.has(key)) continue;
        if (key in output) continue;
        output[key] = value; // preservado sem modificação
    }
}
```

Campos não whitelistados que não são strings escalares simples (ex: arrays, objetos complexos) são preservados **no frontmatter** sem alteração. Strings escalares não whitelistadas são movidas para `customFields` na normalização de entrada.

### 15.4 Corpo Markdown

O corpo Markdown **não é preservado** entre as seções conhecidas e um conteúdo que não se enquadra em nenhuma seção `##`. O texto antes do primeiro `##` e qualquer conteúdo fora de seções mapeadas pode ser perdido ao reescrever o arquivo.

As seções `##` conhecidas são reconstruídas a partir dos campos da entidade. O conteúdo das seções é preservado desde que o campo correspondente da entidade seja carregado corretamente.

**Blocos especiais preservados via extensões CodeMirror:**
- ` ```branch ` — fluxo de campanha (`BranchBlockExtension.ts`)
- ` ```ledger ` — entradas de razão (`LedgerEditorExtension.ts`)
- ` ```encounter ` — tabelas de encontro

---

## 16. Testes automatizados existentes

**Framework:** Vitest 1.6.0

**Localização:** `test/`

| Arquivo de Teste | Cobertura |
|---|---|
| `test/compile/WordCountTracker.test.ts` | Rastreamento de contagem de palavras |
| `test/folders/FolderResolver.test.ts` | Resolução de caminhos de pasta |
| `test/integration/empty-fields-preservation.test.ts` | Preservação de campos vazios no YAML |
| `test/templates/TemplateStorageManager.test.ts` | Armazenamento de templates |
| `test/utils/DateParsing.test.ts` | Parsing de datas (BCE, fuzzy, etc.) |
| `test/utils/EntityTemplates.test.ts` | Templates de seção por tipo de entidade |
| `test/utils/YamlSerializer.test.ts` | Serialização YAML com strings vazias |
| `test/yaml/EntitySections.test.ts` | Whitelist de frontmatter e buildFrontmatter |

**Mock:** `test/__mocks__/obsidian.ts` — mock da API do Obsidian para testes unitários

**Testes E2E e IA:** Scripts disponíveis (WDIO e Playwright), mas dependem de setup específico de ambiente.

**Cobertura atual:** Foca nos utilitários puros (sem dependência do Obsidian). A lógica de CRUD em `main.ts` **não possui testes automatizados** — dependeria de mocks mais elaborados do `App` Obsidian.

---

## 17. Pontos de alto risco de conflito com atualizações do upstream

### 17.1 `src/main.ts` — RISCO ALTO

**Justificativa:** Arquivo monolítico de >364 KB com toda a lógica CRUD. Qualquer atualização de feature pelo upstream (novo tipo de entidade, novo campo, nova opção de configuração) modifica este arquivo. Patches locais nele têm quase certeza de conflito de merge a cada release.

### 17.2 `src/yaml/EntitySections.ts` — RISCO ALTO

**Justificativa:** Contém as whitelists de frontmatter para todos os tipos de entidade. Quando o upstream adiciona novos campos a entidades existentes, este arquivo é modificado. Whitelists personalizadas locais entrarão em conflito.

### 17.3 `src/types.ts` — RISCO ALTO

**Justificativa:** Interfaces TypeScript de todas as entidades. Adições de campos pelo upstream geram conflitos com extensões de interface locais.

### 17.4 `src/services/EntitySyncService.ts` — RISCO MÉDIO

**Justificativa:** Mapeamentos de relações bidirecionais. Novos tipos de entidade ou novas relações adicionadas pelo upstream exigem adições ao array `relationshipMappings`, que é um ponto de conflito frequente.

### 17.5 `src/folders/FolderResolver.ts` — RISCO BAIXO

**Justificativa:** Arquivo relativamente estável. Mudanças ocorrem apenas quando novos tipos de entidade são adicionados (mapeamento de pasta). A lógica de resolução de caminho é independente e raramente muda.

### 17.6 `src/utils/YamlSerializer.ts` — RISCO BAIXO

**Justificativa:** Utilitário puro sem dependências das entidades. Modificado raramente pelo upstream.

### 17.7 Views (`src/views/*`) — RISCO MÉDIO

**Justificativa:** Views grandes como `DashboardView` e `TimelineView` são modificadas frequentemente para features UI. Personalizações de UI locais entrarão em conflito.

---

## 18. Pontos adequados para adaptações isoladas

### 18.1 `src/folders/FolderResolver.ts` — EXTENSÍVEL

Aceita opções via `FolderResolverOptions`. Subclassar ou injetar um resolver customizado via `getFolderResolver()` em `main.ts` é o ponto mais limpo para adaptar estrutura de pastas.

### 18.2 `src/utils/YamlSerializer.ts` — ESTÁVEL

Funções puras, sem efeitos colaterais. Pode ser estendida com funções adicionais sem risco de conflito.

### 18.3 `src/yaml/EntitySections.ts` — EXTENSÍVEL (com cuidado)

`buildFrontmatter()` aceita `preserveKeys` adicional. Um adapter pode injetar campos adicionais via esse parâmetro sem modificar o arquivo.

### 18.4 `src/i18n/locales/pt.json.template` — ADAPTAÇÃO ISOLADA

O arquivo de tradução para português está como template. Criar `pt.json` baseado nele é completamente isolado.

### 18.5 `src/compile/steps.ts` — EXTENSÍVEL

O sistema de compile steps é registro-based. Novos passos de compilação podem ser registrados via `compileEngine.registerStep()` sem modificar o arquivo.

### 18.6 `src/templates/prebuilt/*` — ADAPTAÇÃO ISOLADA

Templates embutidos são arquivos TypeScript independentes. Adicionar novos arquivos de templates nesta pasta não gera conflitos.

### 18.7 `src/services/EntitySyncService.ts` — EXTENSÍVEL (com cuidado)

O array `relationshipMappings` pode ser estendido via subclasse ou patch mínimo. O risco é médio apenas se o upstream adicionar novas relações no mesmo array.

---

## 19. Arquitetura proposta para extensões Contrarius

Esta seção propõe a arquitetura para extensões específicas do projeto Contrarius, respeitando os princípios de leitura não-destrutiva e escrita não-destrutiva do plugin original.

### Princípios de design

1. **Nunca modificar arquivos do upstream** — todas as extensões ficam em arquivos separados
2. **Herdar via composição**, não via herança de classes do plugin
3. **Campos adicionais via `customFields`** — não estender whitelists diretamente
4. **Indexação própria** — manter índice Contrarius separado do índice do plugin
5. **Ordem cronológica e narrativa** resolvidas no layer Contrarius, não no plugin

---

### 19.1 `ContrariusSchemaAdapter`

**Arquivo proposto:** `src-contrarius/schema/ContrariusSchemaAdapter.ts`

```
Responsabilidade: Adaptar as interfaces do Storyteller Suite para o schema
Contrarius, sem modificar as interfaces originais. Atua como camada de
tradução bidirecional.

Dependências:
  - src/types.ts (Character, Event, Location, Scene, etc.) — leitura apenas
  - src/yaml/EntitySections.ts (buildFrontmatter, getWhitelistKeys) — leitura apenas
  - src-contrarius/schema/ContrariusTypes.ts

Risco: Baixo
Justificativa: Arquivo novo, sem dependência de modificação do upstream.
O risco surge apenas se o upstream renomear interfaces em types.ts.
```

**Responsabilidades:**
- Converter `Character` → `ContrariusPersonagem`, `Event` → `ContrariusEvento`, etc.
- Mapear `customFields` do plugin para campos Contrarius tipados
- Produzir `customFields` Contrarius para injeção na escrita de volta

**Campos Contrarius via customFields** (estratégia segura):

```yaml
# Campos Contrarius armazenados em customFields (modo flatten)
consciencia_nivel: "3"
retrovida_referencia: "retrovida-001"
ordem_narrativa_contrarius: "7"
codigo_estavel: "CN-2024-001"
```

---

### 19.2 `Consciência`

**Arquivo proposto:** `src-contrarius/consciencia/ConscienciaService.ts`

```
Responsabilidade: Gerenciar o estado de consciência narrativa das entidades
(personagens, localizações, eventos). Registra grau de consciência, nível
de acesso à informação e estado de revelação para cada entidade.

Dependências:
  - StorytellerSuitePlugin (listCharacters, listEvents, listLocations) — leitura
  - ContrariusSchemaAdapter
  - src-contrarius/storage/ContrariusSettingsManager.ts (armazenamento separado)

Risco: Baixo
Justificativa: Arquivo novo que usa apenas a API de leitura do plugin.
```

**Campos propostos (via customFields no arquivo da entidade):**

```yaml
consciencia_nivel: "latente|ativo|pleno"
consciencia_gatilhos: "[[EventoX]], [[LocalY]]"
consciencia_data_ativacao: "2034-03-15"
```

**Estratégia de armazenamento:** O índice completo de consciência é mantido em um arquivo JSON separado (`Contrarius/consciencia-index.json`), não nos arquivos de entidade. Os arquivos de entidade recebem apenas os campos resumidos via `customFields`.

---

### 19.3 `Retrovida`

**Arquivo proposto:** `src-contrarius/retrovida/RetrovidaService.ts`

```
Responsabilidade: Gerenciar linhas de vida retroativas — eventos que
ocorreram antes do ponto de entrada narrativo. Suporta datação BCE
(antes da era comum) e datas fictícias.

Dependências:
  - src/utils/DateParsing.ts (parseEventDate, toMillis) — leitura
  - StorytellerSuitePlugin (listEvents) — leitura
  - ContrariusSchemaAdapter

Risco: Baixo
Justificativa: Arquivo novo. Usa DateParsing.ts que é utilitário estável.
```

**Relação com `Event`:** Eventos de retrovida são eventos normais do plugin com campo `customFields.retrovida: "true"` e `customFields.retrovida_referencia`. O `RetrovidaService` filtra e ordena esses eventos.

---

### 19.4 Indexação recursiva

**Arquivo proposto:** `src-contrarius/indexing/RecursiveEntityIndex.ts`

```
Responsabilidade: Construir e manter um índice recursivo de entidades
que suporte pesquisa por subpastas, hierarquias de localização, e
relações transitivas.

Dependências:
  - StorytellerSuitePlugin (listLocations, listCharacters, etc.) — leitura
  - app.vault.getMarkdownFiles() — leitura
  - FolderResolver — leitura

Risco: Baixo
Justificativa: Arquivo novo. Não modifica nada, apenas indexa.
```

**Estratégia:** O índice é construído em memória no `onload()` e atualizado via eventos `vault.on('modify')` e `vault.on('rename')`. Armazena um `Map<string, EntityRef[]>` de caminho de pasta → entidades.

---

### 19.5 Códigos estáveis

**Arquivo proposto:** `src-contrarius/codes/StableCodeService.ts`

```
Responsabilidade: Atribuir e resolver códigos estáveis (ex: "CN-2024-001")
para entidades, independentemente de renomeações. Os códigos são armazenados
em customFields e nunca mudam após atribuição.

Dependências:
  - StorytellerSuitePlugin (listCharacters, saveCharacter, etc.)
  - ContrariusSchemaAdapter

Risco: Baixo
Justificativa: Arquivo novo. Usa apenas customFields para persistência.
```

**Campo:** `codigo_estavel: "CN-2024-001"` em `customFields`.

**Índice reverso:** Mapa `codigo → filePath` mantido em `Contrarius/stable-codes.json`.

---

### 19.6 Leitura não-destrutiva

**Arquivo proposto:** `src-contrarius/io/NonDestructiveReader.ts`

```
Responsabilidade: Ler arquivos de entidade sem modificar qualquer conteúdo,
preservando YAML desconhecido, corpo Markdown e ordem dos campos.

Dependências:
  - app.vault.cachedRead(file) — leitura
  - src/yaml/EntitySections.ts (parseFrontmatterFromContent, parseSectionsFromMarkdown)
  - src/utils/WikiLinks.ts (stripWikiLink) — leitura

Risco: Baixo
Justificativa: Arquivo novo. Operações de leitura pura.
```

**Garantias:**
- Retorna o frontmatter raw sem normalização
- Retorna as seções sem mapeamento para campos de entidade
- Nunca chama `vault.modify()` ou `vault.create()`

---

### 19.7 Escrita não-destrutiva

**Arquivo proposto:** `src-contrarius/io/NonDestructiveWriter.ts`

```
Responsabilidade: Escrever campos específicos em um arquivo de entidade
sem afetar outros campos do frontmatter, o corpo Markdown ou a ordem
dos campos existentes.

Dependências:
  - NonDestructiveReader
  - src/yaml/EntitySections.ts (buildFrontmatter — para mesclagem)
  - src/utils/YamlSerializer.ts (stringifyYamlWithEmptyFields)
  - app.vault.modify(file, content)

Risco: Médio
Justificativa: Escreve no vault. Risco de conflito com o plugin
se ambos escreverem no mesmo arquivo simultaneamente. Implementar
debounce e verificação de hash antes de escrever.
```

**Estratégia:**
1. Ler o frontmatter atual com `NonDestructiveReader`
2. Mesclar apenas os campos Contrarius (em `customFields`)
3. Preservar todos os outros campos via `originalFrontmatter`
4. Reconstruir o arquivo completo com `buildFrontmatter()` do plugin (passando `originalFrontmatter`)
5. Escrever via `vault.modify()`

---

### 19.8 Ordem cronológica

**Arquivo proposto:** `src-contrarius/ordering/ChronologicalOrderService.ts`

```
Responsabilidade: Ordenar eventos em ordem cronológica estrita,
suportando datas BCE, datas fictícias (não-ISO), e granularidades
variadas (apenas ano, ano+mês, data completa).

Dependências:
  - src/utils/DateParsing.ts (parseEventDate, toMillis) — leitura
  - StorytellerSuitePlugin (listEvents) — leitura
  - RetrovidaService

Risco: Baixo
Justificativa: Arquivo novo. DateParsing.ts é utilitário estável
e testado (test/utils/DateParsing.test.ts).
```

**Campo relevante em Event:** `dateTime?: string` (formato flexível).

**Ordem de retrovida:** Eventos com `retrovida: "true"` são ordenados antes do ponto zero da narrativa usando a mesma lógica de `toMillis()`.

---

### 19.9 Ordem narrativa

**Arquivo proposto:** `src-contrarius/ordering/NarrativeOrderService.ts`

```
Responsabilidade: Ordenar eventos pela sequência narrativa (como aparecem
na história, independente da ordem cronológica). Suporta flashbacks,
flash-forwards e não-linearidade.

Dependências:
  - StorytellerSuitePlugin (listEvents, listScenes) — leitura
  - ChronologicalOrderService

Risco: Baixo
Justificativa: Arquivo novo. O campo narrativeSequence já existe
em Event (src/types.ts). Apenas leitura desse campo.
```

**Campos relevantes em `Event`:**
- `narrativeSequence?: number` — índice na sequência narrativa
- `narrativeMarkers.isFlashback?: boolean`
- `narrativeMarkers.isFlashforward?: boolean`
- `narrativeMarkers.narrativeDate?: string`

**Campos Contrarius adicionais (via customFields):**
- `ordem_narrativa_contrarius: "7"` — para ordenação Contrarius específica

---

### 19.10 Auditor de consistência

**Arquivo proposto:** `src-contrarius/audit/ConsistencyAuditor.ts`

```
Responsabilidade: Verificar a consistência do mundo narrativo,
incluindo: inconsistências de timeline, referências quebradas,
consciências não resolvidas, retrografias sem evento correspondente,
e relações bidirecionais faltando.

Dependências:
  - StorytellerSuitePlugin (listCharacters, listEvents, listLocations, etc.)
  - src/utils/ConflictDetector.ts (DetectedConflict) — leitura
  - RetrovidaService
  - ConscienciaService
  - RecursiveEntityIndex

Risco: Baixo
Justificativa: Arquivo novo. Apenas leitura e geração de relatório.
```

**Saída:** Um arquivo `Contrarius/audit-report.md` com lista de inconsistências categorizadas por severidade (crítica, média, baixa).

**Verificações propostas:**
1. Relações bidirecionais faltando (ex: Character A tem B em `relationships`, mas B não tem A)
2. Referências quebradas (ex: `currentLocationId` aponta para localização deletada)
3. Eventos sem data com `narrativeSequence` definido mas sem `dateTime`
4. Retrovidas sem evento de ativação correspondente
5. Consciências em nível "pleno" sem evento gatilho
6. Capítulos sem cenas associadas
7. Cenas com `includeInCompile: false` mas com `linkedScenes` (inconsistência de exclusão)

---

### 19.11 Integração futura com o Scrivener

**Arquivo proposto:** `src-contrarius/scrivener/ScrivenerBridgeService.ts`

```
Responsabilidade: Importar e exportar dados no formato Scrivener (.scriv),
mapeando entidades Contrarius para documentos Scrivener e vice-versa.

Dependências:
  - src/import/parsers/XmlParser.ts (a criar)
  - ContrariusSchemaAdapter
  - NonDestructiveWriter
  - ChronologicalOrderService
  - NarrativeOrderService

Risco: Médio
Justificativa: Arquivo novo, mas envolve parsing de formato proprietário
Scrivener. O formato .scriv (XML + pasta de arquivos RTF) pode mudar
entre versões do Scrivener. A escrita de volta para .scriv deve ser
feita com extremo cuidado para não corromper o projeto Scrivener.
```

**Estratégia de integração:**

| Direção | Operação | Abordagem |
|---|---|---|
| Scrivener → Contrarius | Importação | Parser XML do `binder.scrivx` + RTF de cada documento |
| Contrarius → Scrivener | Exportação | Geração de RTF via template; não modificar o .scriv diretamente |

**Mapeamento de tipos:**

| Scrivener | Contrarius |
|---|---|
| Manuscript > Folder | Livro / Capítulo |
| Manuscript > Text | Cena |
| Research > Folder | Entidade (Character, Location, etc.) |
| Research > Text | Arquivo Markdown de entidade |
| Label | `status` da cena |
| Status | `emotion` ou campo customizado |

**Restrição crítica:** A integração com Scrivener deve ser **unidirecional na fase inicial** (Scrivener → Contrarius apenas), para evitar corrupção do projeto Scrivener original. A exportação de volta ao Scrivener deve gerar um novo projeto independente, nunca sobrescrever o original.

---

## Tabela Consolidada de Riscos

| Arquivo / Componente | Risco | Justificativa |
|---|---|---|
| `src/main.ts` | Alto | Monolítico; modificado em toda release com novas features |
| `src/types.ts` | Alto | Interfaces centrais; novas entidades/campos geram conflitos |
| `src/yaml/EntitySections.ts` | Alto | Whitelist de frontmatter; alterada a cada novo campo de entidade |
| `src/services/EntitySyncService.ts` | Médio | Mapeamentos de relação; cresce com novos tipos de entidade |
| `src/views/DashboardView.ts` | Médio | UI frequentemente atualizada; personalizações entram em conflito |
| `src/views/TimelineView.ts` | Médio | UI com muitos estados; atualizações de vis-timeline causam mudanças |
| `src/folders/FolderResolver.ts` | Baixo | Estável; muda apenas com novos tipos de entidade |
| `src/utils/YamlSerializer.ts` | Baixo | Utilitário puro; raramente modificado |
| `src/utils/DateParsing.ts` | Baixo | Utilitário puro; testado; raramente modificado |
| `src/compile/CompileEngine.ts` | Baixo | Extensível por registro; núcleo estável |
| `src/i18n/locales/pt.json.template` | Baixo | Template de tradução; extensão isolada |
| `src/templates/prebuilt/*` | Baixo | Templates embutidos; extensão por adição de arquivo |

---

*Documento gerado em 2026-06-28 a partir de análise direta do repositório na branch `docs/architecture-analysis`.*
*Versão do plugin analisada: 1.8.17 (conforme `package.json` e commits recentes).*
