# Plano Técnico — Adaptador Contrarius: Fase 1 (Somente Leitura)

> **Branch:** `feature/schema-adapter`
> **Data:** 2026-06-28
> **Versão base do upstream:** Storyteller Suite 1.8.17
> **Escopo:** indexação e normalização de leitura — sem escrita no Vault, sem integração com telas.

---

## Sumário

1. [Premissas e estado do repositório](#1-premissas-e-estado-do-repositório)
2. [Lista completa dos 21 arquivos propostos](#2-lista-completa-dos-21-arquivos-propostos)
   - 2.1 [Arquivos de produção (8)](#21-arquivos-de-produção-8)
   - 2.2 [Fixtures fictícias (6)](#22-fixtures-fictícias-6)
   - 2.3 [Arquivos de teste (8)](#23-arquivos-de-teste-8)
3. [Arquivos existentes que seriam modificados](#3-arquivos-existentes-que-seriam-modificados)
4. [Interfaces TypeScript propostas](#4-interfaces-typescript-propostas)
5. [Estrutura dos objetos normalizados](#5-estrutura-dos-objetos-normalizados)
6. [Regras do adaptador](#6-regras-do-adaptador)
7. [Doze critérios objetivos de aceite](#7-doze-critérios-objetivos-de-aceite)
8. [Dez commits propostos](#8-dez-commits-propostos)
9. [Fase 1A — mínimo implementável](#9-fase-1a--mínimo-implementável)

---

## 1. Premissas e estado do repositório

| Item | Estado |
|---|---|
| Branch ativa | `feature/schema-adapter` |
| Working tree | Limpa (zero arquivos staged, unstaged ou untracked) |
| Diretório `src/contrarius/` | **Inexistente** — será criado do zero |
| Diretório `src-contrarius/` | **Inexistente** |
| `tsconfig.json` inclui `src/**/*.ts` | Sim — `src/contrarius/` entrará automaticamente no escopo de compilação |
| `noImplicitAny` no tsconfig raiz | `false` — os módulos Contrarius adotarão estrito internamente mesmo assim |
| Framework de testes | Vitest 1.6.0 (`tsconfig.vitest.json`) |
| Mock Obsidian existente | `test/__mocks__/obsidian.ts` — cobre `TFile`, `TFolder`, `parseYaml`, `normalizePath` |

**Pastas canônicas do Vault Contrarius Enantios** (somente leitura — nunca renomear nem mover):

```
02_Consciencias/    → entidade: consciencia
03_Retrovidas/      → entidade: retrovida
04_Relacoes/        → entidade: relacao
05_Eventos/         → entidade: evento
06_Lugares/         → entidade: lugar
```

---

## 2. Lista completa dos 21 arquivos propostos

### 2.1 Arquivos de produção (8)

---

#### `src/contrarius/types.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Define todas as interfaces TypeScript das entidades Contrarius e tipos auxiliares do índice. É o contrato tipado da camada Contrarius. |
| **Principais exports** | `ContrariusBase`, `ContrariusTipoEntidade`, `Consciencia`, `Retrovida`, `Evento`, `Lugar`, `Relacao`, `ContrariusEntidade`, `ContrariusIndex`, `IndexError` |
| **Dependências internas** | Nenhuma |
| **Motivo** | Separar o schema Contrarius de `src/types.ts` do upstream elimina todo risco de conflito de merge em TypeScript. Consolida o contrato em um único arquivo revisável isoladamente. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo, sem dependência de `src/types.ts`. |

---

#### `src/contrarius/normalize.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Funções puras de coerção e normalização de valores lidos do frontmatter YAML: strings, listas, números, booleanos, links Obsidian e resolução de aliases. Sem efeitos colaterais, sem dependência de I/O. |
| **Principais exports** | `stripObsidianLink`, `normStr`, `normList`, `normNum`, `normBool`, `primeiroPresente` |
| **Dependências internas** | Nenhuma |
| **Motivo** | Centralizar a lógica de coerção em funções testáveis de forma completamente isolada. Toda entidade usa as mesmas regras de normalização sem duplicação. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo, zero imports do upstream. |

---

#### `src/contrarius/reader.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Leitura não-destrutiva do frontmatter de um arquivo via API do Obsidian. Nunca chama `vault.modify()` nem `vault.create()`. Expõe uma interface `ReaderDeps` para injeção de dependência nos testes. |
| **Principais exports** | `ReaderDeps`, `ContrariusReader` (classe ou função fábrica) |
| **Dependências internas** | `src/yaml/EntitySections.ts` → `parseFrontmatterFromContent` (import de leitura, sem modificação) |
| **Motivo** | Encapsular as chamadas a `app.metadataCache.getFileCache()` e `app.vault.cachedRead()` em um único ponto substituível por mock nos testes. Garante que nenhuma leitura do adaptador dispare escrita acidental. |
| **Risco de conflito com upstream** | **Baixo** — depende de `parseFrontmatterFromContent` de `EntitySections.ts`. Se o upstream renomear essa função, o erro de compilação é isolado neste arquivo. Mitigação alternativa: copiar a implementação localmente (é uma função pequena que usa apenas `parseYaml` do Obsidian). |

---

#### `src/contrarius/indexer.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Indexador recursivo das pastas canônicas Contrarius. Percorre `app.vault.getMarkdownFiles()` filtrando por prefixo de pasta, lê cada arquivo via `ContrariusReader`, delega a normalização ao parser da entidade correspondente e produz um `ContrariusIndex` em memória. Erros de arquivo individual são coletados sem interromper os demais. |
| **Principais exports** | `buildContrariusIndex(app, reader): Promise<ContrariusIndex>` |
| **Dependências internas** | `src/contrarius/types.ts`, `src/contrarius/reader.ts`, `src/contrarius/entities/consciencia.ts`, `src/contrarius/entities/retrovida.ts`, `src/contrarius/entities/evento.ts`, `src/contrarius/entities/lugar.ts`, `src/contrarius/entities/relacao.ts` |
| **Motivo** | Ponto de integração entre o reader e os parsers de entidade. Isola a lógica de varredura de pastas do código de normalização. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. Usa `app.vault.getMarkdownFiles()` que é uma API estável do Obsidian. |

---

#### `src/contrarius/entities/consciencia.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Normaliza o frontmatter raw de um arquivo de Consciência para o tipo `Consciencia`. Resolve aliases, preenche padrões, coleta campos desconhecidos e avisos. |
| **Principais exports** | `normalizarConsciencia(fm: Record<string, unknown>, filePath: string): Consciencia` |
| **Dependências internas** | `src/contrarius/types.ts`, `src/contrarius/normalize.ts` |
| **Motivo** | Isolar os campos, aliases e regras específicos de Consciência. Evita um parser monolítico. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. |

---

#### `src/contrarius/entities/retrovida.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Normaliza o frontmatter raw de Retrovida para o tipo `Retrovida`. Resolve os aliases `consc_id | consciencia`, `nomes | nome`, `pov | historicidade`. |
| **Principais exports** | `normalizarRetrovida(fm: Record<string, unknown>, filePath: string): Retrovida` |
| **Dependências internas** | `src/contrarius/types.ts`, `src/contrarius/normalize.ts` |
| **Motivo** | Aliases críticos de Retrovida são numerosos e específicos — um arquivo dedicado mantém a lógica legível e testável separadamente. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. |

---

#### `src/contrarius/entities/evento.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Normaliza o frontmatter raw de Evento para o tipo `Evento`. Resolve `id_evento | codigo | id` com fallback para basename. Coerce `ano_ordem` para número. |
| **Principais exports** | `normalizarEvento(fm: Record<string, unknown>, filePath: string): Evento` |
| **Dependências internas** | `src/contrarius/types.ts`, `src/contrarius/normalize.ts` |
| **Motivo** | Evento possui o maior número de campos e os aliases de identificador mais complexos. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. |

---

#### `src/contrarius/entities/lugar.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Normaliza o frontmatter raw de Lugar para o tipo `Lugar`. Resolve `nome preferido | nome_atual | nome` (chave com espaço incluída). Resolve `id_lugar | codigo | id` com fallback para basename. |
| **Principais exports** | `normalizarLugar(fm: Record<string, unknown>, filePath: string): Lugar` |
| **Dependências internas** | `src/contrarius/types.ts`, `src/contrarius/normalize.ts` |
| **Motivo** | O alias `"nome preferido"` (chave com espaço) é um caso especial que merece tratamento explícito e teste dedicado. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. |

---

#### `src/contrarius/entities/relacao.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Normaliza o frontmatter raw de Relação para o tipo `Relacao`. Strip de links Obsidian em `consciencia_1`, `consciencia_2`, `a`, `b`. Fallback de `id` para basename. |
| **Principais exports** | `normalizarRelacao(fm: Record<string, unknown>, filePath: string): Relacao` |
| **Dependências internas** | `src/contrarius/types.ts`, `src/contrarius/normalize.ts` |
| **Motivo** | Relação tem campos com links Obsidian nos papéis A e B — o strip precisa ser explícito e testado. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. |

---

#### `src/contrarius/index.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Barrel de exportação pública do módulo `contrarius`. Re-exporta tudo que consumidores externos precisarão importar sem conhecer a estrutura interna de pastas. |
| **Principais exports** | Re-exporta `types.ts`, `indexer.ts` e as funções públicas dos parsers de entidade. |
| **Dependências internas** | Todos os arquivos de `src/contrarius/` |
| **Motivo** | Estabilidade de API pública: se a organização interna de pastas mudar, o ponto de import externo permanece `src/contrarius/index.ts`. |
| **Risco de conflito com upstream** | **Nulo** — arquivo novo. |

---

### 2.2 Fixtures fictícias (5)

As fixtures são arquivos `.md` com frontmatter YAML inteiramente fictício — nomes e dados que não existem em nenhum Vault real. Servem exclusivamente para testes unitários.

---

#### `test/contrarius/__fixtures__/consciencia-basica.md`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Fixture deliberadamente mínima de Consciência, incluindo um campo desconhecido, `grupocarma` com link Obsidian e `reaparece` como booleano. |
| **Motivo** | Exercitar strip de links em listas, normalização de booleano e preservação de campos desconhecidos em um único arquivo de fixture. |

```markdown
---
nome: Aristarco Velmonte
ident_extraf:
  - Aris
grupocarma:
  - "[[C-002]]"
reaparece: true
xyz_desconhecido: valor-teste
---
```

---

#### `test/contrarius/__fixtures__/retrovida-completa.md`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Fixture de Retrovida usando o alias `consciencia` (em vez de `consc_id`) e `historicidade` (em vez de `pov`). |
| **Motivo** | Exercitar a resolução de aliases na Retrovida. |

```markdown
---
consciencia: Aristarco Velmonte
vida: "1820-1891"
nomes:
  - Pietro Mancini
  - Piero Mancini
nascimento: "1820"
morte: "1891"
livro:
  - Livro I
periodo:
  - Século XIX
nucleo_geo:
  - Itália do Norte
mov_historico:
  - Risorgimento
historicidade: pov externo
holopensenes:
  - paz
religiao:
  - Catolicismo
classe_social:
  - burguesia
---
```

---

#### `test/contrarius/__fixtures__/evento-completo.md`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Fixture de Evento com campo `id_evento` explícito, `ano_ordem` numérico e participantes com links Obsidian. |
| **Motivo** | Exercitar alias `id_evento`, coerção de `ano_ordem` para número e strip de links em listas. |

```markdown
---
id_evento: EVT-001
titulo: O Encontro de Bolonha
data: "1849-03-15"
data_inicio: "1849-03-14"
data_fim: "1849-03-16"
ano_ordem: 1849
periodo:
  - Séc. XIX
local:
  - "[[Bolonha]]"
participantes:
  - "[[Pietro Mancini]]"
  - "[[Elisabetta Ferrini]]"
retrovidas:
  - "[[retrovida-aristarco-1820]]"
livro:
  - Livro I
nucleo_geo:
  - Itália
---
```

---

#### `test/contrarius/__fixtures__/lugar-basico.md`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Fixture de Lugar com campo `nome preferido` (chave com espaço) e lista `nomes_historicos`. |
| **Motivo** | Exercitar o alias de chave com espaço e listas de nomes históricos. |

```markdown
---
tipo: lugar
nome preferido: Bolonha Medieval
nome_atual: Bolonha
nomes_historicos:
  - Bononia
  - Bolonha Papal
categoria_lugar:
  - cidade
coordenadas: "44.4949° N, 11.3426° E"
nucleo_geo:
  - Itália
---
```

---

#### `test/contrarius/__fixtures__/relacao-basica.md`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Fixture de Relação com links Obsidian em `consciencia_2` e campos de data parciais. |
| **Motivo** | Exercitar strip de links em campos de papel e datas incompletas. |

```markdown
---
consciencia_1: Aristarco Velmonte
consciencia_2: "[[Mirela Voss]]"
tipo_relacao: mestre-discípulo
intensidade: alta
inicio: "1847"
fim: "1891"
livro:
  - Livro I
---
```

---

### 2.3 Arquivos de teste (8)

---

#### `test/contrarius/normalize.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa exaustivamente todas as funções de `normalize.ts`. |
| **Cobertura obrigatória** | `normStr` com null/undefined/string/número/objeto; `normList` com string única/array/null; `normNum` com string numérica/texto/null; `normBool` com variações PT/EN/booleano nativo; `stripObsidianLink` com link simples, link com rótulo, colchetes vazios; `primeiroPresente` com campo presente, ausente, vazio, zero, false. |
| **Dependências** | `src/contrarius/normalize.ts` |

---

#### `test/contrarius/reader.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa o `ContrariusReader` com mocks da API Obsidian. |
| **Cobertura obrigatória** | Cache presente retorna frontmatter; cache nulo dispara fallback para `cachedRead`; arquivo sem bloco `---` retorna null; frontmatter vazio retorna `{}`; nenhum método de escrita do mock é chamado. |
| **Dependências** | `src/contrarius/reader.ts`, mock de `App`/`Vault`/`MetadataCache` |

---

#### `test/contrarius/entities/consciencia.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa `normalizarConsciencia` com fixtures e frontmatters inline. |
| **Cobertura obrigatória** | Todos os campos canônicos; campo `tipo` divergente gera aviso mas preserva tipo da pasta; links em `ident_extraf` são stripped; lista YAML vs string única produz `string[]`; campos ausentes produzem `[]` ou `""`; campos desconhecidos aparecem em `camposDesconhecidos`. |
| **Dependências** | `src/contrarius/entities/consciencia.ts`, `src/contrarius/normalize.ts` |

---

#### `test/contrarius/entities/retrovida.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa `normalizarRetrovida` com aliases e campos ausentes. |
| **Cobertura obrigatória** | `consc_id` tem precedência sobre `consciencia`; `consciencia` funciona quando `consc_id` ausente; `nomes` tem precedência sobre `nome`; `pov` tem precedência sobre `historicidade`; ausência de ambos os aliases produz `""`. |
| **Dependências** | `src/contrarius/entities/retrovida.ts` |

---

#### `test/contrarius/entities/evento.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa `normalizarEvento` com aliases de identificador e coerção numérica. |
| **Cobertura obrigatória** | `id_evento` tem precedência; `codigo` é fallback de `id_evento`; `id` é fallback de `codigo`; basename é fallback final; `ano_ordem: "1849"` → `1849` (número); `ano_ordem: "abc"` → `null` com aviso; links em `participantes` são stripped. |
| **Dependências** | `src/contrarius/entities/evento.ts` |

---

#### `test/contrarius/entities/lugar.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa `normalizarLugar` incluindo chave com espaço. |
| **Cobertura obrigatória** | `"nome preferido"` tem precedência; `nome_atual` é fallback; `nome` é fallback final; basename como último fallback para `id`; `nomes_historicos` como lista. |
| **Dependências** | `src/contrarius/entities/lugar.ts` |

---

#### `test/contrarius/entities/relacao.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa `normalizarRelacao` com links e datas. |
| **Cobertura obrigatória** | `[[Mirela Voss]]` → `"Mirela Voss"` em `consciencia_2`; campos `a`/`b` com e sem links; `id` ausente → basename; `livro` como string única vira `["Livro I"]`. |
| **Dependências** | `src/contrarius/entities/relacao.ts` |

---

#### `test/contrarius/indexer.test.ts`

| Atributo | Valor |
|---|---|
| **Responsabilidade** | Testa `buildContrariusIndex` com vault mockado contendo múltiplos arquivos. |
| **Cobertura obrigatória** | Arquivo malformado em `05_Eventos/` não interrompe indexação dos demais; contagem correta de `erros`; arquivos fora das pastas canônicas são ignorados; resultado do índice tem as entidades indexadas nos Maps corretos; nenhum método de escrita do vault mock é invocado. |
| **Dependências** | `src/contrarius/indexer.ts`, mock de vault com lista de `TFile` |

---

## 3. Arquivos existentes que seriam modificados

**Nenhum arquivo existente é modificado na Fase 1.**

Esta decisão é intencional e estrutural:

- `src/main.ts` — **não modificado.** A integração do indexador ao `onload()` pertence a uma fase posterior.
- `src/types.ts` — **não modificado.** As interfaces Contrarius vivem em `src/contrarius/types.ts`.
- `src/yaml/EntitySections.ts` — **não modificado.** `parseFrontmatterFromContent` é apenas importada, não alterada.
- `src/folders/FolderResolver.ts` — **não modificado.** O indexador usa as pastas canônicas fixas do Vault Contrarius, não as configurações do Storyteller.
- `tsconfig.json` — **não modificado.** O glob `src/**/*.ts` já inclui `src/contrarius/` automaticamente.
- `test/__mocks__/obsidian.ts` — **não modificado.** O mock existente é suficiente para os testes desta fase.
- Qualquer outro arquivo do upstream — **não modificado.**

---

## 4. Interfaces TypeScript propostas

As interfaces abaixo são propostas de documentação. Serão implementadas em `src/contrarius/types.ts` em um commit futuro.

```typescript
// ═══════════════════════════════════════════════════════════════
// src/contrarius/types.ts
// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// Tipo canônico de entidade — derivado da pasta ou do campo `tipo`
// ──────────────────────────────────────────────────────────────
export type ContrariusTipoEntidade =
  | 'consciencia'
  | 'retrovida'
  | 'evento'
  | 'lugar'
  | 'relacao';

// ──────────────────────────────────────────────────────────────
// Base compartilhada por todas as entidades Contrarius
// ──────────────────────────────────────────────────────────────
export interface ContrariusBase {
  /** Caminho do arquivo .md normalizado — identificador estável de sistema. */
  filePath: string;
  /** Tipo da entidade inferido pela pasta canônica. */
  tipoEntidade: ContrariusTipoEntidade;
  /** Frontmatter raw preservado integralmente antes de qualquer normalização. */
  frontmatterRaw: Record<string, unknown>;
  /** Campos presentes no frontmatter que não foram mapeados para nenhum campo tipado. */
  camposDesconhecidos: Record<string, unknown>;
  /** Avisos não-fatais gerados durante a normalização deste arquivo. */
  avisos: string[];
}

// ──────────────────────────────────────────────────────────────
// 1. Consciência
// ──────────────────────────────────────────────────────────────
export interface Consciencia extends ContrariusBase {
  tipoEntidade: 'consciencia';
  /** Basename do arquivo .md sem extensão — identificador estável de sistema. */
  id: string;
  nome: string;
  /** Campo: ident_extraf */
  identExtraf: string[];
  nucleoGeo: string[];
  religiao: string[];
  holopensenes: string[];
  grupocarma: string[];
  reaparece: boolean;
}

// ──────────────────────────────────────────────────────────────
// 2. Retrovida
// ──────────────────────────────────────────────────────────────
export interface Retrovida extends ContrariusBase {
  tipoEntidade: 'retrovida';
  /**
   * Referência à Consciência proprietária.
   * Aliases em ordem de precedência: consc_id → consciencia
   */
  conscId: string;
  vida: string;
  /**
   * Nomes usados nesta encarnação.
   * Aliases em ordem de precedência: nomes → nome
   */
  nomes: string[];
  nascimento: string;
  morte: string;
  livro: string[];
  periodo: string[];
  nucleoGeo: string[];
  movHistorico: string[];
  /**
   * Ponto de vista / historicidade da retrovida.
   * Aliases em ordem de precedência: pov → historicidade
   */
  pov: string;
  holopensenes: string[];
  religiao: string[];
  classeSocial: string[];
}

// ──────────────────────────────────────────────────────────────
// 3. Evento
// ──────────────────────────────────────────────────────────────
export interface Evento extends ContrariusBase {
  tipoEntidade: 'evento';
  /**
   * Identificador do evento.
   * Aliases em ordem de precedência: id_evento → codigo → id → basename
   */
  id: string;
  titulo: string;
  data: string;
  dataInicio: string;
  dataFim: string;
  /** null quando ausente ou não-numérico (aviso emitido). */
  anoOrdem: number | null;
  periodo: string[];
  local: string[];
  participantes: string[];
  retrovidas: string[];
  livro: string[];
  nucleoGeo: string[];
  holopensenes: string[];
  religiao: string[];
  movHistorico: string[];
  eventosAnteriores: string[];
  eventosPosteriores: string[];
}

// ──────────────────────────────────────────────────────────────
// 4. Lugar
// ──────────────────────────────────────────────────────────────
export interface Lugar extends ContrariusBase {
  tipoEntidade: 'lugar';
  /**
   * Identificador do lugar.
   * Aliases em ordem de precedência: id_lugar → codigo → id → basename
   */
  id: string;
  /**
   * Nome preferido / canônico do lugar.
   * Aliases em ordem de precedência: "nome preferido" → nome_atual → nome
   */
  nome: string;
  nomeAtual: string;
  nomesHistoricos: string[];
  categoriaLugar: string[];
  coordenadas: string;
  coordenadasGoogleEarth: string;
  sistemaGeodesico: string;
  nucleoGeo: string[];
  periodo: string[];
  livros: string[];
  lugaresRelacionados: string[];
}

// ──────────────────────────────────────────────────────────────
// 5. Relação
// ──────────────────────────────────────────────────────────────
export interface Relacao extends ContrariusBase {
  tipoEntidade: 'relacao';
  /** Aliases em ordem de precedência: id → basename */
  id: string;
  a: string;
  b: string;
  consciencia1: string;
  consciencia2: string;
  tipoRelacao: string;
  intensidade: string;
  inicio: string;
  fim: string;
  livro: string[];
}

// ──────────────────────────────────────────────────────────────
// Union type de todas as entidades
// ──────────────────────────────────────────────────────────────
export type ContrariusEntidade =
  | Consciencia
  | Retrovida
  | Evento
  | Lugar
  | Relacao;

// ──────────────────────────────────────────────────────────────
// Resultado completo da indexação
// ──────────────────────────────────────────────────────────────
export interface ContrariusIndex {
  consciencias: Map<string, Consciencia>;
  retrovidas:   Map<string, Retrovida>;
  eventos:      Map<string, Evento>;
  lugares:      Map<string, Lugar>;
  relacoes:     Map<string, Relacao>;
  erros:        IndexError[];
}

// ──────────────────────────────────────────────────────────────
// Erro de indexação por arquivo
// ──────────────────────────────────────────────────────────────
export interface IndexError {
  filePath: string;
  mensagem: string;
  campo?: string;
}
```

```typescript
// ═══════════════════════════════════════════════════════════════
// src/contrarius/normalize.ts — assinaturas das funções públicas
// ═══════════════════════════════════════════════════════════════

/** Remove colchetes de links Obsidian. [[Nome]] → "Nome". [[Arquivo|Rótulo]] → "Arquivo". */
export function stripObsidianLink(v: string): string

/** Coerce qualquer valor para string normalizada. null/undefined/"" → "". */
export function normStr(v: unknown): string

/** Coerce qualquer valor para string[]. String única → [string]. null/undefined → []. */
export function normList(v: unknown): string[]

/** Coerce para number. Não-numérico → null. */
export function normNum(v: unknown): number | null

/** Coerce para boolean. "true"/"sim"/"yes"/"1" → true. Demais → false. */
export function normBool(v: unknown): boolean

/**
 * Retorna o primeiro valor presente entre as chaves fornecidas.
 * "Presente" = não undefined, não null, não "".
 * Retorna undefined se nenhuma chave produzir valor.
 */
export function primeiroPresente(
  fm: Record<string, unknown>,
  chaves: string[]
): unknown
```

```typescript
// ═══════════════════════════════════════════════════════════════
// src/contrarius/reader.ts — interface de injeção de dependência
// ═══════════════════════════════════════════════════════════════

/** Interface de dependências injetáveis — permite mock completo nos testes. */
export interface ReaderDeps {
  /** Caminho primário: MetadataCache do Obsidian. Retorna null enquanto o cache não populou. */
  getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null;
  /** Caminho de fallback: lê o conteúdo bruto quando getFileCache não fornece frontmatter. */
  cachedRead:   (file: TFile) => Promise<string>;
  /** Interpreta o bloco YAML extraído do conteúdo bruto no caminho de fallback. Importado do pacote obsidian. */
  parseYaml:    (yaml: string) => Record<string, unknown>;
}

/**
 * Lê o frontmatter de um arquivo sem nenhuma modificação.
 *
 * Garantias:
 *   - Nunca chama vault.modify() ou vault.create().
 *   - Retorna null quando o arquivo não contém bloco frontmatter.
 *   - Retorna uma cópia rasa do objeto retornado pelo cache — nunca uma referência
 *     mutável ao objeto interno do MetadataCache.
 *   - Falhas de parsing são registradas como aviso; não interrompem indexações futuras.
 *
 * Estratégia:
 *   1. Caminho primário: deps.getFileCache(file).frontmatter (síncrono, via MetadataCache).
 *   2. Fallback: deps.cachedRead(file) → extrai bloco ---...--- → deps.parseYaml() do pacote obsidian.
 */
export async function lerFrontmatter(
  file: TFile,
  deps: ReaderDeps
): Promise<Record<string, unknown> | null>
```

```typescript
// ═══════════════════════════════════════════════════════════════
// src/contrarius/indexer.ts — assinatura pública
// ═══════════════════════════════════════════════════════════════

/**
 * Percorre as pastas canônicas Contrarius no vault e constrói
 * o índice completo em memória. Erros de arquivo individual
 * são coletados em ContrariusIndex.erros sem interromper
 * a indexação dos demais arquivos.
 */
export async function buildContrariusIndex(
  vault: { getMarkdownFiles(): TFile[] },
  deps: ReaderDeps
): Promise<ContrariusIndex>
```

---

## 5. Estrutura dos objetos normalizados

Esta seção descreve as invariantes garantidas após a normalização de cada entidade, independentemente do conteúdo do frontmatter de origem.

### 5.1 Invariantes universais (todas as entidades)

| Campo | Invariante |
|---|---|
| `filePath` | Sempre string não-vazia. Normalizado via `normalizePath()` do Obsidian. |
| `tipoEntidade` | Sempre um dos cinco valores canônicos. Nunca `undefined`. |
| `frontmatterRaw` | Cópia profunda do frontmatter antes de qualquer coerção. Imutável. |
| `camposDesconhecidos` | Contém apenas campos que não foram mapeados para nenhum campo tipado. Nunca modificado. |
| `avisos` | Array de strings, possivelmente vazio. Nunca `undefined`. |
| Listas (`string[]`) | Sempre array, nunca null/undefined. Itens vazios removidos. Links Obsidian stripped. |
| Strings escalares | Sempre `string`, nunca null/undefined. Ausente → `""`. |
| `id` | Sempre não-vazio. Se nenhum campo explícito presente, usa o basename do arquivo. |

### 5.2 Consciência normalizada

```
Consciencia {
  filePath:            "02_Consciencias/aristarco-velmonte.md"
  tipoEntidade:        "consciencia"
  id:                  "aristarco-velmonte"           // basename
  nome:                "Aristarco Velmonte"
  identExtraf:         ["Aris", "O Errante"]
  nucleoGeo:           ["Europa Central"]
  religiao:            ["Catolicismo"]
  holopensenes:        []                             // lista vazia → []
  grupocarma:          ["C-002"]                      // link stripped
  reaparece:           true                           // booleano
  frontmatterRaw:      { tipo: "consciencia", nome: ..., grupocarma: ["[[C-002]]"], reaparece: true }
  camposDesconhecidos: {}
  avisos:              []
}
```

### 5.3 Retrovida normalizada

```
Retrovida {
  filePath:            "03_Retrovidas/retrovida-aristarco-1820.md"
  tipoEntidade:        "retrovida"
  conscId:             "Aristarco Velmonte"           // alias: consciencia → consc_id
  vida:                "1820-1891"
  nomes:               ["Pietro Mancini", "Piero Mancini"]
  nascimento:          "1820"
  morte:               "1891"
  livro:               ["Livro I"]
  periodo:             ["Século XIX"]
  nucleoGeo:           ["Itália do Norte"]
  movHistorico:        ["Risorgimento"]
  pov:                 "pov externo"                  // alias: historicidade → pov
  holopensenes:        ["paz"]
  religiao:            ["Catolicismo"]
  classeSocial:        ["burguesia"]
  frontmatterRaw:      { consciencia: "Aristarco Velmonte", historicidade: "pov externo", ... }
  camposDesconhecidos: {}
  avisos:              []
}
```

### 5.4 Evento normalizado

```
Evento {
  filePath:              "05_Eventos/o-encontro-de-bolonha.md"
  tipoEntidade:          "evento"
  id:                    "EVT-001"                    // alias: id_evento presente
  titulo:                "O Encontro de Bolonha"
  data:                  "1849-03-15"
  dataInicio:            "1849-03-14"
  dataFim:               "1849-03-16"
  anoOrdem:              1849                         // coercido de string para number
  periodo:               ["Séc. XIX"]
  local:                 ["Bolonha"]                  // links stripped
  participantes:         ["Pietro Mancini", "Elisabetta Ferrini"]
  retrovidas:            ["retrovida-aristarco-1820"]
  livro:                 ["Livro I"]
  nucleoGeo:             ["Itália"]
  holopensenes:          []
  religiao:              []
  movHistorico:          []
  eventosAnteriores:     []
  eventosPosteriores:    []
  frontmatterRaw:        { id_evento: "EVT-001", participantes: ["[[Pietro Mancini]]", ...], ... }
  camposDesconhecidos:   {}
  avisos:                []
}
```

### 5.5 Lugar normalizado

```
Lugar {
  filePath:              "06_Lugares/bolonha-medieval.md"
  tipoEntidade:          "lugar"
  id:                    "bolonha-medieval"           // basename (nenhum alias explícito na fixture)
  nome:                  "Bolonha Medieval"           // alias: "nome preferido"
  nomeAtual:             "Bolonha"
  nomesHistoricos:       ["Bononia", "Bolonha Papal"]
  categoriaLugar:        ["cidade"]
  coordenadas:           "44.4949° N, 11.3426° E"
  coordenadasGoogleEarth: ""
  sistemaGeodesico:      ""
  nucleoGeo:             ["Itália"]
  periodo:               []
  livros:                []
  lugaresRelacionados:   []
  frontmatterRaw:        { "nome preferido": "Bolonha Medieval", nome_atual: "Bolonha", ... }
  camposDesconhecidos:   {}
  avisos:                []
}
```

### 5.6 Relação normalizada

```
Relacao {
  filePath:            "04_Relacoes/aristarco-mirela.md"
  tipoEntidade:        "relacao"
  id:                  "aristarco-mirela"             // basename
  a:                   ""
  b:                   ""
  consciencia1:        "Aristarco Velmonte"
  consciencia2:        "Mirela Voss"                  // [[Mirela Voss]] → stripped
  tipoRelacao:         "mestre-discípulo"
  intensidade:         "alta"
  inicio:              "1847"
  fim:                 "1891"
  livro:               ["Livro I"]
  frontmatterRaw:      { consciencia_2: "[[Mirela Voss]]", ... }
  camposDesconhecidos: {}
  avisos:              []
}
```

---

## 6. Regras do adaptador

### 6.1 Identificação por pasta canônica

A pasta canônica é a regra primária e nunca é sobrescrita por dados do frontmatter:

```
normalizePath(file.path).startsWith("02_Consciencias/") → 'consciencia'
normalizePath(file.path).startsWith("03_Retrovidas/")   → 'retrovida'
normalizePath(file.path).startsWith("04_Relacoes/")     → 'relacao'
normalizePath(file.path).startsWith("05_Eventos/")      → 'evento'
normalizePath(file.path).startsWith("06_Lugares/")      → 'lugar'
```

O uso de `startsWith` garante recursividade natural — qualquer subpasta dentro de uma pasta canônica é incluída automaticamente.

### 6.2 Identificação pela propriedade `tipo`

O campo `tipo` no frontmatter é usado apenas como **refinamento e verificação**. As variações aceitas são:

| Valor no frontmatter | Tipo canônico resultante |
|---|---|
| `consciencia`, `consciência` | `'consciencia'` |
| `retrovida` | `'retrovida'` |
| `evento` | `'evento'` |
| `lugar`, `local` | `'lugar'` |
| `relacao`, `relação`, `relacionamento` | `'relacao'` |

**Regra de conflito:** se `tipo` do frontmatter diverge do tipo inferido pela pasta, a pasta vence e um aviso é adicionado a `ContrariusBase.avisos`. A indexação continua normalmente. Nunca é um erro fatal.

### 6.3 Precedência entre campos alternativos (aliases)

A resolução usa `primeiroPresente(fm, aliases)`: percorre a lista de aliases em ordem e retorna o primeiro valor que não seja `undefined`, `null` ou `""`.

| Entidade | Campo normalizado | Aliases (ordem de precedência) |
|---|---|---|
| Retrovida | `conscId` | `consc_id` → `consciencia` |
| Retrovida | `nomes` | `nomes` → `nome` |
| Retrovida | `pov` | `pov` → `historicidade` |
| Evento | `id` | `id_evento` → `codigo` → `id` → basename |
| Evento | `titulo` | `titulo` → `name` → `nome` |
| Lugar | `id` | `id_lugar` → `codigo` → `id` → basename |
| Lugar | `nome` | `"nome preferido"` → `nome_atual` → `nome` |
| Relacao | `id` | `id` → basename |

**Chaves com espaços** (`"nome preferido"`): são acessadas diretamente via `fm["nome preferido"]` — o frontmatter YAML suporta chaves entre aspas.

**Basename como último fallback para `id`:** garante que todo registro tenha `id` não-vazio mesmo em arquivos completamente sem campos de identidade explícitos.

### 6.4 Códigos estáveis

Na Fase 1 (somente leitura), **nenhum código estável é gerado**. O adaptador:

- Registra `codigo_contrarius` em `camposDesconhecidos` se já existir no frontmatter.
- Não gera, não atribui, não escreve nenhum código estável.

A estratégia para fases futuras (documentada para orientar o design):

- Código gerado uma única vez, nunca modificado após atribuição.
- Armazenado em `customFields.codigo_contrarius` no frontmatter via `NonDestructiveWriter` (fase futura).
- Índice reverso `codigo → filePath` mantido em memória durante a sessão.
- O basename continua sendo o identificador de sistema; o código é um identificador semântico externo.

### 6.5 Normalização de valores

| Tipo de valor | Regra |
|---|---|
| **String** | `null`/`undefined`/ausente → `""`. Qualquer não-string → `String(v).trim()`. Links Obsidian stripped. |
| **Lista** | `null`/`undefined`/ausente → `[]`. String única → `["valor"]`. Array → cada elemento por `normStr`. Itens vazios após normalização são removidos. |
| **Número** | String numérica → número. `null`/`undefined`/não-numérico → `null` (aviso emitido). |
| **Booleano** | `true`/`"true"`/`"sim"`/`"yes"`/`"1"` → `true`. Qualquer outro → `false`. |
| **Link Obsidian** | `[[Nome]]` → `"Nome"`. `[[Arquivo\|Rótulo]]` → `"Arquivo"`. `[[]]` → `""`. |
| **Campos desconhecidos** | Copiados para `camposDesconhecidos` sem nenhuma coerção. Nunca removidos. |

### 6.6 Tratamento de erros e avisos

Dois níveis de diagnóstico, ambos não-fatais para a indexação global:

**Aviso (`warning`)** — armazenado em `ContrariusBase.avisos[]`:
- Campo `tipo` divergente da pasta canônica.
- Campo numérico (`ano_ordem`) contendo valor não-numérico.
- Alias de identificador não encontrado (fallback para basename usado).
- Campo semanticamente importante ausente (ex: `Retrovida.conscId === ""`).

**Erro de indexação** — armazenado em `ContrariusIndex.erros[]`:
- Exceção ao ler o arquivo (`vault.cachedRead` falhou).
- Frontmatter malformado que impede o parse (`parseFrontmatterFromContent` lançou exceção).
- Qualquer `Error` não previsto durante a normalização.

**Garantia de continuidade:**
```
para cada arquivo:
  try {
    ler → normalizar → adicionar ao índice
  } catch (err) {
    adicionar a index.erros → pular este arquivo → continuar próximo
  }
```

Nenhuma exceção em um arquivo individual pode interromper a indexação dos demais.

---

## 7. Doze critérios objetivos de aceite

A implementação está completa quando **todos** os critérios abaixo são simultaneamente verdadeiros:

| # | Critério | Como verificar |
|---|---|---|
| **A1** | `npm test` passa sem erros com os novos testes em `test/contrarius/` | `vitest run` com saída verde |
| **A2** | Nenhum arquivo fora de `src/contrarius/` e `test/contrarius/` foi modificado | `git diff --name-only \| grep -v "src/contrarius\|test/contrarius"` retorna vazio |
| **A3** | Nenhum arquivo do Vault é modificado durante indexação | Mock de vault sem `modify`/`create` nos testes não produz erro de "método não encontrado" |
| **A4** | Campos desconhecidos preservados em `camposDesconhecidos` | Fixture com `xyz_desconhecido: foo` → `entidade.camposDesconhecidos.xyz_desconhecido === "foo"` |
| **A5** | Arquivo com frontmatter inválido não interrompe indexação dos demais | Teste com dois arquivos: um malformado + um válido → índice contém o válido + `erros.length === 1` |
| **A6** | Aliases resolvidos corretamente | Fixture com `consc_id: X` e fixture com `consciencia: Y` → ambas produzem `conscId` preenchido |
| **A7** | Links Obsidian stripped em todos os campos | `[[Pietro Mancini]]` → `"Pietro Mancini"` em qualquer campo de qualquer entidade |
| **A8** | Listas YAML e strings únicas produzem `string[]` | `"valor"` → `["valor"]`; `["a","b"]` → `["a","b"]`; ausente → `[]` |
| **A9** | `id` sempre preenchido mesmo sem campo explícito | Arquivo `foo-bar.md` sem nenhum campo de id → `entidade.id === "foo-bar"` |
| **A10** | Tipo inferido pela pasta prevalece sobre `tipo` divergente com aviso | Arquivo em `05_Eventos/` com `tipo: lugar` → `tipoEntidade === 'evento'` + `avisos.length > 0` |
| **A11** | TypeScript compila sem erros em `src/contrarius/` | `tsc --noEmit` com zero erros nos novos arquivos |
| **A12** | Nenhum `any` explícito nos módulos Contrarius | `grep -rn ": any\|as any\| any;" src/contrarius/` retorna vazio (exceto comentários justificados) |

---

## 8. Dez commits propostos

Os commits seguem a ordem de dependência: tipos → funções puras → I/O → entidades individuais → integração.

---

### Commit 1 — `feat(contrarius): add ContrariusTypes`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/types.ts` |
| **Objetivo** | Estabelecer o contrato tipado completo antes de qualquer implementação. Permite revisão isolada das interfaces. |
| **Testes correspondentes** | Nenhum neste commit — o arquivo não contém lógica. A compilação sem erros é a verificação. |
| **Critérios satisfeitos** | A11 (parcial) |

---

### Commit 2 — `feat(contrarius): add normalize utilities + tests`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/normalize.ts`, `test/contrarius/normalize.test.ts` |
| **Objetivo** | Implementar e testar todas as funções puras de coerção. Fundação de todos os parsers de entidade. |
| **Testes correspondentes** | `test/contrarius/normalize.test.ts` — cobertura completa de `normStr`, `normList`, `normNum`, `normBool`, `stripObsidianLink`, `primeiroPresente`. |
| **Critérios satisfeitos** | A7, A8, A12 (parcial) |

---

### Commit 3 — `feat(contrarius): add NonDestructive reader + tests`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/reader.ts`, `test/contrarius/reader.test.ts` |
| **Objetivo** | Encapsular chamadas à API Obsidian com garantia de não-escrita. Ponto de maior risco de dependência do upstream. |
| **Testes correspondentes** | `test/contrarius/reader.test.ts` — mock de metadataCache, fallback para cachedRead, arquivo sem frontmatter. |
| **Critérios satisfeitos** | A3 |

---

### Commit 4 — `feat(contrarius): add Consciencia parser + fixtures`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/entities/consciencia.ts`, `test/contrarius/__fixtures__/consciencia-basica.md`, `test/contrarius/entities/consciencia.test.ts` |
| **Objetivo** | Primeiro parser completo de entidade com fixtures reais e testes. Valida a arquitetura por tipo específico. |
| **Testes correspondentes** | `test/contrarius/entities/consciencia.test.ts` — campos completos, campos ausentes, tipo divergente, links, camposDesconhecidos. |
| **Critérios satisfeitos** | A4, A7, A8, A9, A10 (para Consciência) |

---

### Commit 5 — `feat(contrarius): add Retrovida parser + fixtures`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/entities/retrovida.ts`, `test/contrarius/__fixtures__/retrovida-completa.md`, `test/contrarius/entities/retrovida.test.ts` |
| **Objetivo** | Parser de Retrovida com foco nos aliases críticos `consc_id/consciencia`, `nomes/nome`, `pov/historicidade`. |
| **Testes correspondentes** | `test/contrarius/entities/retrovida.test.ts` — cobertura explícita de cada alias em isolamento e combinação. |
| **Critérios satisfeitos** | A6 (para Retrovida), A8 |

---

### Commit 6 — `feat(contrarius): add Evento parser + fixtures`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/entities/evento.ts`, `test/contrarius/__fixtures__/evento-completo.md`, `test/contrarius/entities/evento.test.ts` |
| **Objetivo** | Parser de Evento com ênfase nos aliases de identificador e coerção numérica de `ano_ordem`. |
| **Testes correspondentes** | `test/contrarius/entities/evento.test.ts` — `id_evento`/`codigo`/`id`/basename, `ano_ordem` válido e inválido, links em participantes. |
| **Critérios satisfeitos** | A6 (para Evento), A7, A9 |

---

### Commit 7 — `feat(contrarius): add Lugar parser + fixtures`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/entities/lugar.ts`, `test/contrarius/__fixtures__/lugar-basico.md`, `test/contrarius/entities/lugar.test.ts` |
| **Objetivo** | Parser de Lugar com tratamento explícito da chave com espaço `"nome preferido"`. |
| **Testes correspondentes** | `test/contrarius/entities/lugar.test.ts` — `"nome preferido"` vs `nome_atual` vs `nome`, fallback para basename. |
| **Critérios satisfeitos** | A6 (para Lugar), A9 |

---

### Commit 8 — `feat(contrarius): add Relacao parser + fixtures`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/entities/relacao.ts`, `test/contrarius/__fixtures__/relacao-basica.md`, `test/contrarius/entities/relacao.test.ts` |
| **Objetivo** | Parser de Relação com strip de links Obsidian nos campos de papel. |
| **Testes correspondentes** | `test/contrarius/entities/relacao.test.ts` — links em `consciencia_1`/`consciencia_2`/`a`/`b`, `livro` como string única. |
| **Critérios satisfeitos** | A7 (para Relação) |

---

### Commit 9 — `feat(contrarius): add recursive indexer + tests`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/indexer.ts`, `test/contrarius/indexer.test.ts` |
| **Objetivo** | Integrar todos os parsers em uma varredura recursiva das pastas canônicas. Validar resiliência a erros e ausência de escrita. |
| **Testes correspondentes** | `test/contrarius/indexer.test.ts` — múltiplos arquivos mockados, arquivo malformado não interrompe demais, arquivos fora das pastas ignorados, vault sem `modify`/`create`. |
| **Critérios satisfeitos** | A1, A2, A3, A5 |

---

### Commit 10 — `feat(contrarius): add barrel export`

| Item | Detalhe |
|---|---|
| **Arquivos** | `src/contrarius/index.ts` |
| **Objetivo** | Estabilizar a API pública do módulo. Consumidores futuros importam de um único ponto, isolados da organização interna de pastas. |
| **Testes correspondentes** | Nenhum adicional — a compilação sem erros e os testes existentes são suficientes. |
| **Critérios satisfeitos** | A11, A12 |

---

## 9. Fase 1A — mínimo implementável

A Fase 1A define o subconjunto mínimo funcional que entrega valor verificável sem nenhuma dependência de fases posteriores.

### Objetivo da Fase 1A

Provar que o adaptador consegue ler um arquivo de Consciência e um arquivo de Retrovida do Vault Contrarius e produzir objetos tipados normalizados, com cobertura de teste passando — sem nenhuma escrita, sem integração com telas, sem o indexador completo.

### Restrições da Fase 1A

- No máximo **6 arquivos de produção**
- No máximo **2 fixtures**
- No máximo **3 arquivos de teste**
- **Zero** arquivos existentes modificados
- **Zero** integração com telas do Storyteller
- **Zero** escrita no Vault

---

### 9.1 Arquivos exatos da Fase 1A

**Produção (5 arquivos):**

| # | Caminho | Papel |
|---|---|---|
| 1 | `src/contrarius/types.ts` | Interfaces `ContrariusBase`, `ContrariusTipoEntidade`, `Consciencia`, `Retrovida`, `ContrariusIndex`, `IndexError` — apenas essas, sem Evento/Lugar/Relação |
| 2 | `src/contrarius/normalize.ts` | Todas as 6 funções puras: `stripObsidianLink`, `normStr`, `normList`, `normNum`, `normBool`, `primeiroPresente` |
| 3 | `src/contrarius/reader.ts` | `ReaderDeps`, `lerFrontmatter` |
| 4 | `src/contrarius/entities/consciencia.ts` | `normalizarConsciencia` |
| 5 | `src/contrarius/entities/retrovida.ts` | `normalizarRetrovida` |

> O sexto slot fica em reserva, mas não é obrigatório usar. Se necessário, pode ser `src/contrarius/index.ts` como barrel.

**Fixtures (2 arquivos):**

| # | Caminho |
|---|---|
| 1 | `test/contrarius/__fixtures__/consciencia-basica.md` |
| 2 | `test/contrarius/__fixtures__/retrovida-completa.md` |

**Testes (3 arquivos):**

| # | Caminho |
|---|---|
| 1 | `test/contrarius/normalize.test.ts` |
| 2 | `test/contrarius/entities/consciencia.test.ts` |
| 3 | `test/contrarius/entities/retrovida.test.ts` |

---

### 9.2 Funções e interfaces exatas da Fase 1A

**`src/contrarius/types.ts`** — exports obrigatórios nesta fase:
- `ContrariusTipoEntidade` (apenas `'consciencia' | 'retrovida'` são necessários; os demais podem ser declarados mas sem parsers correspondentes)
- `ContrariusBase`
- `Consciencia`
- `Retrovida`
- `IndexError`
- `ContrariusIndex` — **escopo restrito da Fase 1A** (somente os dois tipos implementados):

```typescript
interface ContrariusIndex {
  consciencias: Consciencia[];
  retrovidas:   Retrovida[];
  erros:        IndexError[];
  // eventos, lugares e relacoes serão acrescentados quando seus tipos forem implementados
}
```

> A definição completa de `ContrariusIndex` (seção 4) inclui todos os cinco maps; na Fase 1A usa-se esta versão reduzida até que os parsers de Evento, Lugar e Relação sejam implementados.

**`src/contrarius/normalize.ts`** — exports obrigatórios:
- `stripObsidianLink(v: string): string`
- `normStr(v: unknown): string`
- `normList(v: unknown): string[]`
- `normNum(v: unknown): number | null`
- `normBool(v: unknown): boolean`
- `primeiroPresente(fm: Record<string, unknown>, chaves: string[]): unknown`

**`src/contrarius/reader.ts`** — exports obrigatórios:
- `ReaderDeps` (interface, com `getFileCache`, `cachedRead` e `parseYaml`)
- `lerFrontmatter(file: TFile, deps: ReaderDeps): Promise<Record<string, unknown> | null>`

**`src/contrarius/entities/consciencia.ts`** — export obrigatório:
- `normalizarConsciencia(fm: Record<string, unknown>, filePath: string): Consciencia`

**`src/contrarius/entities/retrovida.ts`** — export obrigatório:
- `normalizarRetrovida(fm: Record<string, unknown>, filePath: string): Retrovida`

---

### 9.3 Testes exatos da Fase 1A

**`test/contrarius/normalize.test.ts`** — casos obrigatórios:

```
normStr(null)          → ""
normStr(undefined)     → ""
normStr("  ")          → ""
normStr(42)            → "42"
normStr("[[Link]]")    → "Link"   // via normStr que chama stripObsidianLink
normList(null)         → []
normList("único")      → ["único"]
normList(["a","b"])    → ["a","b"]
normList(["[[X]]"])    → ["X"]
normNum("42")          → 42
normNum("abc")         → null
normNum(null)          → null
normBool(true)         → true
normBool("sim")        → true
normBool("false")      → false
normBool(null)         → false
primeiroPresente({a:""}, ["a","b"])    → undefined  // a é vazio
primeiroPresente({a:"x"}, ["a","b"])   → "x"
primeiroPresente({b:"y"}, ["a","b"])   → "y"        // a ausente, b presente
primeiroPresente({}, ["a","b"])        → undefined
```

**`test/contrarius/entities/consciencia.test.ts`** — casos obrigatórios:

```
fixture consciencia-basica.md →
  → id === "consciencia-basica"
  → nome === "Aristarco Velmonte"
  → identExtraf === ["Aris"]
  → grupocarma === ["C-002"]                    // link stripped de "[[C-002]]"
  → reaparece === true                          // booleano
  → camposDesconhecidos.xyz_desconhecido === "valor-teste"

frontmatter inline { nome: "X" } →
  → identExtraf === []
  → reaparece === false                         // booleano ausente → false
  → avisos === []

frontmatter com tipo divergente { tipo: "evento", nome: "X" } →
  → tipoEntidade === "consciencia"    // pasta prevalece
  → avisos.length > 0
```

**`test/contrarius/entities/retrovida.test.ts`** — casos obrigatórios:

```
fixture retrovida-completa.md → Retrovida com todos os campos
  → conscId === "Aristarco Velmonte"       // via alias "consciencia"
  → nomes === ["Pietro Mancini", "Piero Mancini"]
  → pov === "pov externo"                  // via alias "historicidade"

{ consc_id: "A", consciencia: "B" } →
  → conscId === "A"                        // consc_id tem precedência

{ consciencia: "B" } →
  → conscId === "B"                        // fallback para consciencia

{ nomes: ["X","Y"], nome: "Z" } →
  → nomes === ["X","Y"]                    // nomes tem precedência

{ nome: "Z" } →
  → nomes === ["Z"]                        // fallback para nome

{ pov: "P", historicidade: "H" } →
  → pov === "P"                            // pov tem precedência

{ historicidade: "H" } →
  → pov === "H"                            // fallback para historicidade
```

---

### 9.4 Comandos de validação da Fase 1A

```bash
# 1. Verificar que somente os arquivos corretos foram criados
git status --short

# 2. Compilar sem erros
npx tsc --noEmit

# 3. Executar os testes da Fase 1A
npx vitest run test/contrarius/normalize.test.ts test/contrarius/entities/consciencia.test.ts test/contrarius/entities/retrovida.test.ts

# 4. Executar toda a suite para garantir que nada quebrou
npm test

# 5. Verificar ausência de `any` explícito
grep -rn ": any\|as any" src/contrarius/

# 6. Confirmar que nenhum arquivo do upstream foi modificado
git diff --name-only | grep -v "src/contrarius\|test/contrarius"
```

---

### 9.5 Critérios de aceite específicos da Fase 1A

| # | Critério | Verificação |
|---|---|---|
| **1A-A1** | 3 arquivos de teste passam sem erros | `vitest run test/contrarius/` → verde |
| **1A-A2** | Suite completa não regride | `npm test` → sem novas falhas |
| **1A-A3** | TypeScript compila sem erros | `tsc --noEmit` → saída vazia |
| **1A-A4** | Aliases de Retrovida resolvidos corretamente | Casos `consc_id/consciencia`, `nomes/nome`, `pov/historicidade` passam |
| **1A-A5** | Links Obsidian stripped em listas | `grupocarma: ["[[C-002]]"]` → `grupocarma: ["C-002"]` no objeto normalizado |
| **1A-A6** | `reaparece` normalizado como booleano | `consciencia-basica.md` com `reaparece: true` → `reaparece === true` (boolean); ausente → `false` |
| **1A-A7** | Campos desconhecidos preservados | Campo extra no frontmatter aparece em `camposDesconhecidos` |
| **1A-A8** | `id` preenchido mesmo sem campo explícito | Basename do arquivo aparece em `id` quando nenhum alias presente |
| **1A-A9** | Nenhum `any` explícito nos arquivos de produção | `grep -rn ": any\|as any" src/contrarius/` → vazio |
| **1A-A10** | Zero arquivos do upstream modificados | `git diff --name-only \| grep -v contrarius` → vazio |

---

### 9.6 O que fica deliberadamente fora da Fase 1A

As seguintes funcionalidades são **explicitamente excluídas** da Fase 1A e fazem parte de fases subsequentes:

| Exclusão | Fase prevista |
|---|---|
| Parsers de Evento, Lugar e Relação | Fase 1 (commits 6–8) |
| Indexador recursivo (`indexer.ts`) | Fase 1 (commit 9) |
| Fixtures de Evento, Lugar e Relação | Fase 1 (commits 6–8) |
| Barrel export (`index.ts`) | Fase 1 (commit 10) |
| Integração com `src/main.ts` (registro no `onload`) | Fase 2 |
| Qualquer tela, painel, tab ou view do Storyteller | Fase 2 |
| Geração ou atribuição de códigos estáveis | Fase 3 |
| Escrita no Vault (`vault.modify`, `vault.create`) | Fase 3 |
| Relações bidirecionais entre entidades | Fase 4 |
| Timeline, mapas, network graph Contrarius | Fase 4 |
| Integração com `EntitySyncService` do upstream | Fase 4 |
| Sincronização com Scrivener | Fase 5 |

---

*Documento gerado em 2026-06-28 com base na análise de `docs/ARCHITECTURE_ANALYSIS.md` e no estado do repositório na branch `feature/schema-adapter`.*
*Versão do upstream analisada: Storyteller Suite 1.8.17.*
