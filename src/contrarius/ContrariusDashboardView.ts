import {
  App,
  ItemView,
  Notice,
  parseYaml,
  setIcon,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from 'obsidian';
import { indexarContrarius } from './indexer';
import type {
  Consciencia,
  ContrariusBase,
  ContrariusIndex,
  Evento,
  Lugar,
  Relacao,
  Retrovida,
} from './types';
import {
  construirCronologiaDupla,
  type CronologiaDuplaContrarius,
  type ItemCronologiaContrarius,
  type ModoCronologiaContrarius,
  type ProblemaCronologiaContrarius,
} from './timeline-model';
import {
  construirRoteiroNarrativo,
  type CapituloRoteiroNarrativo,
  type CenaRoteiroNarrativo,
  type EntradaRoteiroNarrativo,
  type ItemRoteiroNarrativo,
  type LivroRoteiroNarrativo,
} from './narrative-outline-model';
import {
  construirVisaoCronologia,
  rotuloProblemaCronologia,
  TODOS_OS_LIVROS_CRONOLOGIA,
  type FiltroVisaoCronologia,
  type LinhaCronologiaContrarius,
  type OpcaoLivroCronologia,
  type VisaoCronologiaContrarius,
} from './timeline-view-model';
import {
  agruparDiagnosticos,
  agruparRetrovidasPorConsciencia,
  construirDiagnosticos,
  construirResumo,
  contarDiagnosticosPorCategoria,
  filtrarConsciencias,
  filtrarEventos,
  filtrarGruposDiagnostico,
  filtrarLugares,
  filtrarRelacoes,
  filtrarRetrovidas,
  nomeConsciencia,
  nomeEvento,
  nomeLugar,
  nomeRelacao,
  nomeRetrovida,
  type ContrariusDashboardTab,
  type FiltroDiagnostico,
  type FiltroNaturezaConsciencial,
  type GrupoDiagnostico,
} from './dashboard-model';
import {
  buildEntityDetail,
  createEntityKey,
  type ContrariusEntityKey,
  type ContrariusRelatedItem,
  type ContrariusUnresolvedReference,
} from './entity-details-model';
import {
  abrirDetalheRaiz,
  criarEstadoNavegacaoDetalhe,
  navegarParaDetalhe,
  rotuloTipoEntidade,
  temFichaDetalhadaNestaFase,
  voltarDetalhe,
  type ContrariusDetailNavigationState,
} from './entity-details-view-model';
import {
  construirPlanoNarrativo,
  editarItemPlanoNarrativo,
  gerarAlteracoesPlanoNarrativo,
  moverItemPlanoNarrativo,
  renumerarPlanoNarrativo,
  restaurarItemPlanoNarrativo,
  restaurarPlanoNarrativo,
  SEM_LIVRO_PLANO_NARRATIVO,
  TODOS_OS_LIVROS_PLANO_NARRATIVO,
  type ItemPlanoNarrativo,
  type PlanoNarrativo,
  type ProblemaPlanoNarrativo,
} from './narrative-order-model';
import {
  descreverErroSalvamentoNarrativo,
  executarSalvamentoNarrativo,
  ErroSalvamentoNarrativo,
  prepararSalvamentoNarrativo,
  type ArmazenamentoNotasNarrativas,
  type DescricaoErroSalvamentoNarrativo,
} from './narrative-order-write-service';
import { adicionarFrontmatterMinimoEvento } from './evento-frontmatter-scaffold';
import {
  gerarMarkdownRoteiroNarrativo,
  type DadosExportacaoRoteiroNarrativo,
  type EventoExportacaoNarrativa,
  type ProblemaExportacaoNarrativa,
} from './narrative-outline-export-model';
import {
  gerarPacoteScrivenerMarkdown,
  type DadosPacoteScrivener,
  type EventoExportacaoScrivener,
  type ProblemaExportacaoScrivener,
} from './scrivener-export-model';
import {
  validarPacoteScrivenerMarkdown,
  resumirValidacaoPacoteScrivener,
} from './scrivener-export-validation-model';
import {
  compararPacoteScrivenerRetornado,
  type ArquivoPacoteScrivenerRetornado,
  type DadosComparacaoPacoteScrivener,
} from './scrivener-return-compare-model';
import {
  gerarPlanoPreImportacaoScrivener,
  type ArquivoScrivenerPreImportacao,
  type DadosPlanoPreImportacaoScrivener,
  type NotaOriginalPreImportacao,
} from './scrivener-preimport-plan-model';

export const VIEW_TYPE_CONTRARIUS_DASHBOARD = 'contrarius-knowledge-dashboard';

const TAB_LABELS: ReadonlyArray<{ id: ContrariusDashboardTab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'consciencias', label: 'Consciências' },
  { id: 'retrovidas', label: 'Retrovidas' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'cronologia', label: 'Cronologia' },
  { id: 'lugares', label: 'Lugares' },
  { id: 'relacoes', label: 'Relações' },
  { id: 'erros', label: 'Diagnóstico' },
];

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles);
}

function joinValues(values: readonly string[], fallback = '—'): string {
  const filtered = values.map((value) => value.trim()).filter((value) => value !== '');
  return filtered.length > 0 ? filtered.join(' · ') : fallback;
}

function formatYear(value: number | null): string {
  return value === null ? '—' : String(value);
}

function entidadeIncompleta(item: ContrariusBase): boolean {
  return Object.keys(item.frontmatterRaw).length === 0;
}

function marcadorEntidade(item: ContrariusBase, marcadorExistente?: string): string | undefined {
  const marcadores: string[] = [];
  if (marcadorExistente !== undefined && marcadorExistente.trim() !== '') {
    marcadores.push(marcadorExistente);
  }
  if (entidadeIncompleta(item)) marcadores.push('Incompleta');
  return marcadores.length > 0 ? marcadores.join(' · ') : undefined;
}

export class ContrariusDashboardView extends ItemView {
  private readonly obsidianApp: App;
  private currentIndex: ContrariusIndex | null = null;
  private currentCronologia: CronologiaDuplaContrarius | null = null;
  private activeTab: ContrariusDashboardTab = 'resumo';
  private query = '';
  private naturezaFilter: FiltroNaturezaConsciencial = 'todas';
  private diagnosticFilter: FiltroDiagnostico = 'todos';
  private cronologiaMode: ModoCronologiaContrarius = 'cronologica';
  private cronologiaLivro: string = TODOS_OS_LIVROS_CRONOLOGIA;
  private loading = false;
  private lastIndexedAt: Date | null = null;
  private refreshTimer: number | null = null;
  private dashboardContentEl: HTMLElement | null = null;
  private detailNavState: ContrariusDetailNavigationState = criarEstadoNavegacaoDetalhe();
  private narrativaPlano: PlanoNarrativo | null = null;
  private narrativaEditando = false;
  private narrativaRevisando = false;
  private narrativaOcupado = false;
  private narrativaVaultMudou = false;
  private narrativaOrdemBruta: Map<string, string> = new Map();
  private narrativaRenumInicio = 1;
  private narrativaRenumPasso = 10;
  private narrativaVisualizacao: 'lista' | 'roteiro' = 'lista';
  private narrativaErroPreparacao: DescricaoErroSalvamentoNarrativo | null = null;
  private narrativaErroScaffold: string | null = null;

  constructor(leaf: WorkspaceLeaf, app: App) {
    super(leaf);
    this.obsidianApp = app;
  }

  getViewType(): string {
    return VIEW_TYPE_CONTRARIUS_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Contrarius';
  }

  getIcon(): string {
    return 'database';
  }

  async onOpen(): Promise<void> {
    this.registerVaultListeners();
    await this.reindex();
  }

  async onClose(): Promise<void> {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private registerVaultListeners(): void {
    const request = (file: unknown): void => {
      if (file instanceof TFile && file.extension === 'md' && this.isContrariusPath(file.path)) {
        this.requestRefresh();
      }
    };

    this.registerEvent(this.obsidianApp.vault.on('create', request));
    this.registerEvent(this.obsidianApp.vault.on('modify', request));
    this.registerEvent(this.obsidianApp.vault.on('delete', request));
    this.registerEvent(
      this.obsidianApp.vault.on('rename', (file, oldPath) => {
        if (
          (file instanceof TFile && this.isContrariusPath(file.path)) ||
          this.isContrariusPath(oldPath)
        ) {
          this.requestRefresh();
        }
      }),
    );
    this.registerEvent(
      this.obsidianApp.metadataCache.on('changed', (file) => {
        if (this.isContrariusPath(file.path)) this.requestRefresh();
      }),
    );
  }

  private isContrariusPath(path: string): boolean {
    const normalized = path.replace(/\\/g, '/').toLocaleLowerCase('pt-BR');
    return [
      '02_consciencias/',
      '03_retrovidas/',
      '04_relacoes/',
      '05_eventos/',
      '06_lugares/',
    ].some((folder) => normalized.startsWith(folder));
  }

  private requestRefresh(): void {
    if (this.narrativaEditando) {
      this.narrativaVaultMudou = true;
      this.render();
      return;
    }
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.reindex();
    }, 350);
  }

  private async reindex(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.render();
    try {
      this.currentIndex = await indexarContrarius({
        getMarkdownFiles: () => this.obsidianApp.vault.getMarkdownFiles(),
        getFileCache: (file) => this.obsidianApp.metadataCache.getFileCache(file),
        cachedRead: (file) => this.obsidianApp.vault.cachedRead(file),
        parseYaml,
      });
      this.currentCronologia = construirCronologiaDupla(this.currentIndex);
      this.lastIndexedAt = new Date();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Contrarius: falha ao indexar o Vault: ${message}`);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('contrarius-dashboard-view');
    applyStyles(root, {
      padding: '16px',
      overflowY: 'auto',
      height: '100%',
      background: 'var(--background-primary)',
    });

    this.renderHeader(root);
    this.renderToolbar(root);
    this.renderTabs(root);
    this.dashboardContentEl = root.createDiv();
    applyStyles(this.dashboardContentEl, { marginTop: '16px' });

    if (this.loading && this.currentIndex === null) {
      const loading = this.dashboardContentEl.createDiv({ text: 'Indexando o Vault…' });
      applyStyles(loading, { color: 'var(--text-muted)', padding: '24px 0' });
      return;
    }

    if (this.currentIndex === null) {
      const empty = this.dashboardContentEl.createDiv({ text: 'O índice ainda não está disponível.' });
      applyStyles(empty, { color: 'var(--text-muted)', padding: '24px 0' });
      return;
    }

    switch (this.activeTab) {
      case 'resumo': this.renderResumo(this.dashboardContentEl, this.currentIndex); break;
      case 'consciencias':
        if (this.detailNavState.currentKey !== null) {
          this.renderFicha(this.dashboardContentEl, this.currentIndex);
        } else {
          this.renderConsciencias(this.dashboardContentEl, this.currentIndex);
        }
        break;
      case 'retrovidas':
        if (this.detailNavState.currentKey !== null) {
          this.renderFicha(this.dashboardContentEl, this.currentIndex);
        } else {
          this.renderRetrovidas(this.dashboardContentEl, this.currentIndex);
        }
        break;
      case 'eventos':
        if (this.detailNavState.currentKey !== null) {
          this.renderFicha(this.dashboardContentEl, this.currentIndex);
        } else {
          this.renderEventos(this.dashboardContentEl, this.currentIndex);
        }
        break;
      case 'cronologia':
        if (this.detailNavState.currentKey !== null && !this.narrativaEditando) {
          this.renderFicha(this.dashboardContentEl, this.currentIndex);
        } else if (this.currentCronologia !== null) {
          this.renderCronologia(this.dashboardContentEl, this.currentCronologia);
        } else {
          const semCron = this.dashboardContentEl.createDiv({ text: 'Cronologia não disponível.' });
          applyStyles(semCron, { color: 'var(--text-muted)', padding: '24px 0' });
        }
        break;
      case 'lugares':
        if (this.detailNavState.currentKey !== null) {
          this.renderFicha(this.dashboardContentEl, this.currentIndex);
        } else {
          this.renderLugares(this.dashboardContentEl, this.currentIndex);
        }
        break;
      case 'relacoes':
        if (this.detailNavState.currentKey !== null) {
          this.renderFicha(this.dashboardContentEl, this.currentIndex);
        } else {
          this.renderRelacoes(this.dashboardContentEl, this.currentIndex);
        }
        break;
      case 'erros': this.renderDiagnosticos(this.dashboardContentEl, this.currentIndex); break;
    }
  }

  private renderHeader(root: HTMLElement): void {
    const header = root.createDiv();
    applyStyles(header, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      flexWrap: 'wrap',
    });
    const titleGroup = header.createDiv();
    const title = titleGroup.createEl('h2', { text: 'Contrarius' });
    applyStyles(title, { margin: '0' });
    const subtitle = titleGroup.createDiv({ text: 'Índice narrativo somente leitura do Vault' });
    applyStyles(subtitle, { color: 'var(--text-muted)', marginTop: '4px' });

    const status = header.createDiv();
    status.setText(
      this.lastIndexedAt === null
        ? 'Ainda não indexado'
        : `Atualizado às ${this.lastIndexedAt.toLocaleTimeString('pt-BR')}`,
    );
    applyStyles(status, {
      color: 'var(--text-muted)',
      fontSize: '0.85em',
      paddingTop: '6px',
    });
  }

  private renderToolbar(root: HTMLElement): void {
    const toolbar = root.createDiv();
    applyStyles(toolbar, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: '16px',
    });

    const refresh = toolbar.createEl('button', { attr: { 'aria-label': 'Reindexar o Vault' } });
    setIcon(refresh, 'refresh-cw');
    refresh.appendText(this.loading ? ' Indexando…' : ' Reindexar');
    refresh.disabled = this.loading || this.narrativaEditando;
    refresh.onclick = () => { void this.reindex(); };

    const search = toolbar.createEl('input', {
      type: 'search',
      placeholder: 'Filtrar entidades…',
      value: this.query,
    });
    applyStyles(search, {
      minWidth: '220px',
      flex: '1 1 260px',
      maxWidth: '520px',
    });
    search.oninput = () => {
      this.query = search.value;
      this.render();
      window.setTimeout(() => {
        const replacement = this.containerEl.querySelector<HTMLInputElement>('input[type="search"]');
        replacement?.focus();
        replacement?.setSelectionRange(this.query.length, this.query.length);
      }, 0);
    };
  }

  private renderTabs(root: HTMLElement): void {
    const tabs = root.createDiv();
    tabs.setAttr('role', 'tablist');
    applyStyles(tabs, {
      display: 'flex',
      gap: '6px',
      overflowX: 'auto',
      paddingBottom: '4px',
      marginTop: '14px',
      borderBottom: '1px solid var(--background-modifier-border)',
    });

    for (const tab of TAB_LABELS) {
      const button = tabs.createEl('button', { text: tab.label });
      button.setAttr('role', 'tab');
      button.setAttr('aria-selected', String(this.activeTab === tab.id));
      button.disabled = this.narrativaEditando;
      applyStyles(button, {
        whiteSpace: 'nowrap',
        background: this.activeTab === tab.id ? 'var(--interactive-accent)' : '',
        color: this.activeTab === tab.id ? 'var(--text-on-accent)' : '',
      });
      button.onclick = () => {
        this.activeTab = tab.id;
        this.detailNavState = criarEstadoNavegacaoDetalhe();
        this.render();
      };
    }
  }

  private renderResumo(container: HTMLElement, index: ContrariusIndex): void {
    const resumo = construirResumo(index);
    const grid = container.createDiv();
    applyStyles(grid, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
      gap: '10px',
    });

    const cards: ReadonlyArray<[string, number, ContrariusDashboardTab, string?]> = [
      ['Consciências', resumo.consciencias, 'consciencias', `${resumo.conscienciasPreHumanas} pré-humanas`],
      ['Retrovidas', resumo.retrovidas, 'retrovidas', `${resumo.retrovidasPreHumanas} pré-humanas`],
      ['Eventos', resumo.eventos, 'eventos'],
      ['Lugares', resumo.lugares, 'lugares'],
      ['Relações', resumo.relacoes, 'relacoes'],
      ['Diagnósticos', resumo.erros + resumo.avisosIndexacao + resumo.avisosInternos, 'erros'],
    ];

    for (const [label, value, tab, detail] of cards) {
      const card = grid.createEl('button');
      applyStyles(card, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '14px',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '8px',
        background: 'var(--background-secondary)',
      });
      const number = card.createEl('strong', { text: String(value) });
      applyStyles(number, { fontSize: '1.65em', lineHeight: '1.1' });
      const text = card.createSpan({ text: label });
      applyStyles(text, { color: 'var(--text-muted)', marginTop: '4px' });
      if (detail !== undefined) {
        const subtext = card.createSpan({ text: detail });
        applyStyles(subtext, { color: 'var(--text-faint)', marginTop: '2px', fontSize: '0.78em' });
      }
      card.onclick = () => {
        this.activeTab = tab;
        this.render();
      };
    }

    const note = container.createDiv();
    applyStyles(note, {
      marginTop: '16px',
      padding: '12px',
      borderRadius: '8px',
      background: 'var(--background-secondary-alt)',
      color: 'var(--text-muted)',
    });
    note.setText(
      `${resumo.totalEntidades} entidades indexadas. ${resumo.avisosInternos} avisos internos, ${resumo.avisosIndexacao} avisos de indexação e ${resumo.erros} erros. Nenhum arquivo é modificado por esta tela.`,
    );
  }

  private renderConsciencias(container: HTMLElement, index: ContrariusIndex): void {
    this.renderNaturezaFilter(container);
    const items = filtrarConsciencias(index.consciencias, this.query, this.naturezaFilter);
    const grouped = agruparRetrovidasPorConsciencia(index.retrovidas);
    this.renderSectionTitle(container, 'Consciências', items.length);
    if (items.length === 0) return this.renderEmpty(container);

    const sorted = [...items].sort((a, b) => nomeConsciencia(a).localeCompare(nomeConsciencia(b), 'pt-BR'));
    for (const item of sorted) {
      const details = container.createEl('details');
      applyStyles(details, this.cardStyles());
      const summary = details.createEl('summary');
      applyStyles(summary, { cursor: 'pointer', fontWeight: '600' });
      const lives = grouped.get(item.id) ?? [];
      const markers = marcadorEntidade(
        item,
        item.naturezaConsciencial === 'pre-humana' ? 'Pré-humana' : undefined,
      );
      summary.setText(`${nomeConsciencia(item)} · ${item.id} · ${lives.length} retrovida(s)${markers !== undefined ? ` · ${markers}` : ''}`);

      const body = details.createDiv();
      applyStyles(body, { paddingTop: '10px' });
      this.renderMetadata(body, [
        ['Identidade extrafísica', item.identExtraf || '—'],
        ['Núcleos geográficos', joinValues(item.nucleoGeo)],
        ['Grupocarma', joinValues(item.grupocarma)],
      ]);
      const fichaKeyC = createEntityKey(item);
      const btnRowC = body.createDiv();
      applyStyles(btnRowC, { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' });
      const openBtnC = btnRowC.createEl('button', { text: 'Abrir nota' });
      openBtnC.onclick = () => { void this.openFile(item.filePath); };
      const verFichaBtnC = btnRowC.createEl('button', { text: 'Ver ficha' });
      verFichaBtnC.onclick = () => {
        this.detailNavState = abrirDetalheRaiz(fichaKeyC);
        this.render();
      };

      if (lives.length > 0) {
        const heading = body.createEl('h4', { text: 'Retrovidas' });
        applyStyles(heading, { margin: '14px 0 6px' });
        for (const life of lives) {
          const lifeMarker = marcadorEntidade(
            life,
            life.naturezaConsciencial === 'pre-humana' ? 'Pré-humana' : undefined,
          );
          this.renderCompactRow(
            body,
            nomeRetrovida(life),
            `${lifeMarker !== undefined ? `${lifeMarker} · ` : ''}${life.vida || 'vida não informada'} · ${formatYear(life.nascimento)}–${formatYear(life.morte)}`,
            life.filePath,
          );
        }
      }
    }
  }

  private renderRetrovidas(container: HTMLElement, index: ContrariusIndex): void {
    this.renderNaturezaFilter(container);
    const items = filtrarRetrovidas(index.retrovidas, this.query, this.naturezaFilter);
    this.renderSectionTitle(container, 'Retrovidas', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => {
      if (a.nascimento !== null && b.nascimento !== null && a.nascimento !== b.nascimento) {
        return a.nascimento - b.nascimento;
      }
      return nomeRetrovida(a).localeCompare(nomeRetrovida(b), 'pt-BR');
    });
    for (const item of sorted) {
      const fichaKeyR = createEntityKey(item);
      this.renderEntityCard(container, nomeRetrovida(item), item.id, item.filePath, [
        ['Consciência', item.conscId || '—'],
        ['Vida', item.vida || '—'],
        ['Período', joinValues(item.periodo)],
        ['Nascimento / morte', `${formatYear(item.nascimento)} / ${formatYear(item.morte)}`],
        ['Livro', joinValues(item.livro)],
      ], marcadorEntidade(item, item.naturezaConsciencial === 'pre-humana' ? 'Pré-humana' : undefined),
      () => {
        this.detailNavState = abrirDetalheRaiz(fichaKeyR);
        this.render();
      });
    }
  }

  private renderEventos(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarEventos(index.eventos, this.query);
    this.renderSectionTitle(container, 'Eventos', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => {
      if (a.anoOrdem !== null && b.anoOrdem !== null && a.anoOrdem !== b.anoOrdem) {
        return a.anoOrdem - b.anoOrdem;
      }
      return nomeEvento(a).localeCompare(nomeEvento(b), 'pt-BR');
    });
    for (const item of sorted) {
      const fichaKeyE = createEntityKey(item);
      this.renderEntityCard(container, nomeEvento(item), item.id, item.filePath, [
        ['Ano de ordem', formatYear(item.anoOrdem)],
        ['Data', item.dataTextual || item.data || item.dataInicio || '—'],
        ['Local', joinValues(item.local)],
        ['Participantes', joinValues(item.participantes)],
        ['Livro', joinValues(item.livro)],
      ], marcadorEntidade(item), () => {
        this.detailNavState = abrirDetalheRaiz(fichaKeyE);
        this.render();
      });
    }
  }

  private renderLugares(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarLugares(index.lugares, this.query);
    this.renderSectionTitle(container, 'Lugares', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => nomeLugar(a).localeCompare(nomeLugar(b), 'pt-BR'));
    for (const item of sorted) {
      const fichaKeyL = createEntityKey(item);
      this.renderEntityCard(container, nomeLugar(item), item.id, item.filePath, [
        ['Nome atual', item.nomeAtual || '—'],
        ['Nomes históricos', joinValues(item.nomesHistoricos)],
        ['Região atual', item.regiaoAtual || '—'],
        ['País atual', item.paisAtual || '—'],
        ['Coordenadas', item.coordenadasGoogleEarth || item.coordenadas || '—'],
      ], marcadorEntidade(item), () => {
        this.detailNavState = abrirDetalheRaiz(fichaKeyL);
        this.render();
      });
    }
  }

  private renderRelacoes(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarRelacoes(index.relacoes, this.query);
    this.renderSectionTitle(container, 'Relações', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => nomeRelacao(a).localeCompare(nomeRelacao(b), 'pt-BR'));
    for (const item of sorted) {
      const fichaKeyRl = createEntityKey(item);
      this.renderEntityCard(container, nomeRelacao(item), item.id, item.filePath, [
        ['Consciência 1', item.consciencia1 || '—'],
        ['Consciência 2', item.consciencia2 || '—'],
        ['Tipo', joinValues(item.tipoRelacao)],
        ['Intensidade', item.intensidade || '—'],
        ['Estado', item.estado || '—'],
      ], marcadorEntidade(item), () => {
        this.detailNavState = abrirDetalheRaiz(fichaKeyRl);
        this.render();
      });
    }
  }

  private renderDiagnosticos(container: HTMLElement, index: ContrariusIndex): void {
    const allDiagnostics = construirDiagnosticos(index);
    const allGroups = agruparDiagnosticos(allDiagnostics);
    const counts = contarDiagnosticosPorCategoria(allDiagnostics);
    const filteredGroups = filtrarGruposDiagnostico(allGroups, this.diagnosticFilter, this.query);
    const totalOcorrencias = filteredGroups.reduce((sum, g) => sum + g.quantidade, 0);

    this.renderDiagnosticFilterBar(container, counts);

    const heading = container.createEl('h3');
    heading.setText(
      `Diagnóstico — ${totalOcorrencias} ocorrência${totalOcorrencias !== 1 ? 's' : ''} em ${filteredGroups.length} grupo${filteredGroups.length !== 1 ? 's' : ''}`,
    );
    applyStyles(heading, { marginTop: '0' });

    if (filteredGroups.length === 0) {
      const msg = allDiagnostics.length === 0
        ? 'Nenhum erro ou aviso encontrado.'
        : 'Nenhum resultado para o filtro atual.';
      const empty = container.createDiv({ text: msg });
      applyStyles(empty, { color: 'var(--text-muted)', padding: '12px 0' });
      return;
    }

    for (const group of filteredGroups) {
      this.renderGrupoDiagnostico(container, group);
    }
  }

  private renderDiagnosticFilterBar(
    container: HTMLElement,
    counts: Readonly<Record<FiltroDiagnostico, number>>,
  ): void {
    const group = container.createDiv();
    applyStyles(group, {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap',
      marginBottom: '14px',
    });
    const options: ReadonlyArray<[FiltroDiagnostico, string]> = [
      ['todos', `Todos (${counts.todos})`],
      ['erro', `Erros (${counts.erro})`],
      ['indexacao', `Indexação (${counts.indexacao})`],
      ['interno', `Internos (${counts.interno})`],
    ];
    for (const [value, label] of options) {
      const button = group.createEl('button', { text: label });
      const active = this.diagnosticFilter === value;
      button.setAttr('aria-pressed', String(active));
      applyStyles(button, {
        background: active ? 'var(--interactive-accent)' : '',
        color: active ? 'var(--text-on-accent)' : '',
      });
      button.onclick = () => {
        this.diagnosticFilter = value;
        this.render();
      };
    }
  }

  private renderGrupoDiagnostico(container: HTMLElement, group: GrupoDiagnostico): void {
    const color =
      group.categoria === 'erro'
        ? 'var(--text-error)'
        : group.categoria === 'indexacao'
          ? 'var(--text-warning)'
          : 'var(--interactive-accent)';

    const categoryLabel =
      group.categoria === 'erro' ? 'Erro' : group.categoria === 'indexacao' ? 'Indexação' : 'Interno';

    const details = container.createEl('details');
    applyStyles(details, {
      ...this.cardStyles(),
      borderLeft: `3px solid ${color}`,
    });

    const summary = details.createEl('summary');
    applyStyles(summary, { cursor: 'pointer' });

    const levelSpan = summary.createSpan({ text: categoryLabel });
    applyStyles(levelSpan, {
      color,
      fontSize: '0.78em',
      fontWeight: '600',
      textTransform: 'uppercase',
      marginRight: '8px',
    });

    summary.appendText(group.mensagem);

    if (group.tipoEntidade !== undefined) {
      const typeSpan = summary.createSpan({ text: ` · ${group.tipoEntidade}` });
      applyStyles(typeSpan, { color: 'var(--text-muted)', fontSize: '0.9em' });
    }

    const countSpan = summary.createSpan({ text: ` (${group.quantidade})` });
    applyStyles(countSpan, { color: 'var(--text-muted)', fontSize: '0.9em' });

    const body = details.createDiv();
    applyStyles(body, { paddingTop: '8px' });

    for (const item of group.itens) {
      this.renderCompactRow(body, item.filePath, item.campo ?? '', item.filePath);
    }
  }

  private renderNaturezaFilter(container: HTMLElement): void {
    const group = container.createDiv();
    applyStyles(group, {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap',
      marginBottom: '14px',
    });
    const options: ReadonlyArray<[FiltroNaturezaConsciencial, string]> = [
      ['todas', 'Todas'],
      ['humanas', 'Humanas'],
      ['pre-humanas', 'Pré-humanas'],
    ];
    for (const [value, label] of options) {
      const button = group.createEl('button', { text: label });
      const active = this.naturezaFilter === value;
      button.setAttr('aria-pressed', String(active));
      applyStyles(button, {
        background: active ? 'var(--interactive-accent)' : '',
        color: active ? 'var(--text-on-accent)' : '',
      });
      button.onclick = () => {
        this.naturezaFilter = value;
        this.render();
      };
    }
  }

  private renderSectionTitle(container: HTMLElement, title: string, count: number): void {
    const heading = container.createEl('h3', { text: `${title} (${count})` });
    applyStyles(heading, { marginTop: '0' });
  }

  private renderEmpty(container: HTMLElement): void {
    const empty = container.createDiv({ text: 'Nenhum registro corresponde ao filtro atual.' });
    applyStyles(empty, { color: 'var(--text-muted)', padding: '12px 0' });
  }

  private cardStyles(): Partial<CSSStyleDeclaration> {
    return {
      display: 'block',
      padding: '12px',
      marginBottom: '8px',
      border: '1px solid var(--background-modifier-border)',
      borderRadius: '8px',
      background: 'var(--background-secondary)',
    };
  }

  private renderEntityCard(
    container: HTMLElement,
    title: string,
    id: string,
    filePath: string,
    metadata: ReadonlyArray<readonly [string, string]>,
    badge?: string,
    onVerFicha?: () => void,
  ): void {
    const card = container.createDiv();
    applyStyles(card, this.cardStyles());
    const titleRow = card.createDiv();
    applyStyles(titleRow, { display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' });
    const heading = titleRow.createEl('h4', { text: title });
    applyStyles(heading, { margin: '0 0 3px' });
    if (badge !== undefined) this.renderBadge(titleRow, badge);
    const identifier = card.createDiv({ text: id });
    applyStyles(identifier, { color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '9px' });
    this.renderMetadata(card, metadata);
    const btnRow = card.createDiv();
    applyStyles(btnRow, { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' });
    const openBtn = btnRow.createEl('button', { text: 'Abrir nota' });
    openBtn.onclick = () => { void this.openFile(filePath); };
    if (onVerFicha !== undefined) {
      const verBtn = btnRow.createEl('button', { text: 'Ver ficha' });
      verBtn.onclick = onVerFicha;
    }
  }


  private renderBadge(container: HTMLElement, label: string): void {
    const badge = container.createSpan({ text: label });
    const incomplete = label.includes('Incompleta');
    applyStyles(badge, {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: '999px',
      background: incomplete ? 'var(--background-secondary)' : 'var(--background-modifier-success)',
      color: incomplete ? 'var(--text-warning)' : 'var(--text-normal)',
      border: incomplete ? '1px solid var(--text-warning)' : '1px solid transparent',
      fontSize: '0.72em',
      fontWeight: '600',
    });
  }
  private renderMetadata(
    container: HTMLElement,
    metadata: ReadonlyArray<readonly [string, string]>,
  ): void {
    const grid = container.createDiv();
    applyStyles(grid, {
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 0.35fr) 1fr',
      gap: '4px 10px',
      fontSize: '0.92em',
    });
    for (const [label, value] of metadata) {
      const key = grid.createDiv({ text: label });
      applyStyles(key, { color: 'var(--text-muted)' });
      grid.createDiv({ text: value });
    }
  }

  private renderCompactRow(
    container: HTMLElement,
    title: string,
    subtitle: string,
    filePath: string,
  ): void {
    const row = container.createEl('button');
    applyStyles(row, {
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      textAlign: 'left',
      marginTop: '5px',
      padding: '7px 9px',
    });
    const text = row.createSpan({ text: title });
    applyStyles(text, { fontWeight: '500' });
    const meta = row.createSpan({ text: subtitle });
    applyStyles(meta, { color: 'var(--text-muted)', fontSize: '0.85em' });
    row.onclick = () => { void this.openFile(filePath); };
  }

  private renderOpenButton(container: HTMLElement, filePath: string): void {
    const button = container.createEl('button', { text: 'Abrir nota' });
    applyStyles(button, { marginTop: '10px' });
    button.onclick = () => { void this.openFile(filePath); };
  }

  private async openFile(filePath: string): Promise<void> {
    const file = this.obsidianApp.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      new Notice(`Contrarius: nota não encontrada: ${filePath}`);
      return;
    }
    await this.obsidianApp.workspace.getLeaf(false).openFile(file);
  }

  private renderFicha(container: HTMLElement, index: ContrariusIndex): void {
    const navState = this.detailNavState;
    const key = navState.currentKey;
    if (key === null) return;

    const navRow = container.createDiv();
    applyStyles(navRow, { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' });

    if (navState.history.length > 0) {
      const backBtn = navRow.createEl('button', { text: '← Voltar' });
      backBtn.onclick = () => {
        this.detailNavState = voltarDetalhe(this.detailNavState);
        this.render();
      };
    }

    const backToListBtn = navRow.createEl('button', { text: 'Voltar à lista' });
    backToListBtn.onclick = () => {
      this.detailNavState = criarEstadoNavegacaoDetalhe();
      this.render();
    };

    const detail = buildEntityDetail(index, key);

    if (detail === null) {
      const msg = container.createDiv({
        text: 'Esta entidade não está mais disponível no índice. Volte à lista para continuar.',
      });
      applyStyles(msg, { color: 'var(--text-muted)', padding: '24px 0' });
      return;
    }

    const header = container.createDiv();
    applyStyles(header, { ...this.cardStyles(), marginBottom: '12px' });

    const typeLabel = header.createSpan({ text: rotuloTipoEntidade(detail.tipoEntidade) });
    applyStyles(typeLabel, {
      color: 'var(--text-muted)',
      fontSize: '0.78em',
      fontWeight: '600',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: '4px',
    });

    const titleEl = header.createEl('h3', { text: detail.title });
    applyStyles(titleEl, { margin: '0 0 10px' });

    const metaItems: Array<readonly [string, string]> = [];
    if (detail.id !== undefined) metaItems.push(['ID', detail.id] as const);
    metaItems.push(['Nota', detail.filePath] as const);
    this.renderMetadata(header, metaItems);

    if (detail.fields.length > 0) {
      const fieldsDiv = container.createDiv();
      applyStyles(fieldsDiv, { ...this.cardStyles(), marginBottom: '12px' });
      const fieldsHeading = fieldsDiv.createEl('h4', { text: 'Dados' });
      applyStyles(fieldsHeading, { margin: '0 0 8px' });
      this.renderMetadata(fieldsDiv, detail.fields.map((f) => [f.label, f.value] as const));
    }

    for (const section of detail.relatedSections) {
      const sectionDiv = container.createDiv();
      applyStyles(sectionDiv, { ...this.cardStyles(), marginBottom: '12px' });
      const sectionHeading = sectionDiv.createEl('h4', { text: section.label });
      applyStyles(sectionHeading, { margin: '0 0 8px' });
      for (const item of section.items) {
        this.renderRelatedItem(sectionDiv, item);
      }
    }

    if (detail.unresolvedReferences.length > 0) {
      const unresolvedDiv = container.createDiv();
      applyStyles(unresolvedDiv, {
        ...this.cardStyles(),
        marginBottom: '12px',
        borderLeft: '3px solid var(--text-warning)',
      });
      const unresolvedHeading = unresolvedDiv.createEl('h4', { text: 'Referências não resolvidas' });
      applyStyles(unresolvedHeading, { margin: '0 0 8px' });
      for (const ref of detail.unresolvedReferences) {
        this.renderUnresolvedReference(unresolvedDiv, ref);
      }
    }

    this.renderOpenButton(container, detail.filePath);
  }

  private renderRelatedItem(container: HTMLElement, item: ContrariusRelatedItem): void {
    const row = container.createDiv();
    applyStyles(row, {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      marginTop: '7px',
      flexWrap: 'wrap',
    });

    const info = row.createDiv();
    applyStyles(info, { flex: '1 1 auto' });
    const titleSpan = info.createSpan({ text: item.title });
    applyStyles(titleSpan, { fontWeight: '500' });
    const typeSpan = info.createSpan({ text: ` · ${rotuloTipoEntidade(item.tipoEntidade)}` });
    applyStyles(typeSpan, { color: 'var(--text-muted)', fontSize: '0.85em' });

    const btnGroup = row.createDiv();
    applyStyles(btnGroup, { display: 'flex', gap: '6px', flexShrink: '0' });

    if (temFichaDetalhadaNestaFase(item.tipoEntidade)) {
      const verBtn = btnGroup.createEl('button', { text: 'Ver ficha' });
      verBtn.onclick = () => {
        this.detailNavState = navegarParaDetalhe(this.detailNavState, item.key);
        this.render();
      };
    }

    const openBtn = btnGroup.createEl('button', { text: 'Abrir nota' });
    openBtn.onclick = () => { void this.openFile(item.filePath); };
  }

  private renderUnresolvedReference(
    container: HTMLElement,
    ref: ContrariusUnresolvedReference,
  ): void {
    const row = container.createDiv();
    applyStyles(row, {
      marginTop: '8px',
      paddingTop: '8px',
      borderTop: '1px solid var(--background-modifier-border)',
    });

    const statusLabel = ref.status === 'not-found' ? 'Não encontrada' : 'Ambígua';
    const statusColor = ref.status === 'not-found' ? 'var(--text-error)' : 'var(--text-warning)';
    const statusSpan = row.createSpan({ text: statusLabel });
    applyStyles(statusSpan, {
      fontWeight: '600',
      color: statusColor,
      fontSize: '0.78em',
      textTransform: 'uppercase',
      marginRight: '8px',
    });

    const refSpan = row.createSpan({ text: ref.reference });
    applyStyles(refSpan, { fontFamily: 'var(--font-monospace)', fontSize: '0.9em' });

    if (ref.context.trim() !== '') {
      const contextDiv = row.createDiv({ text: `Contexto: ${ref.context}` });
      applyStyles(contextDiv, { color: 'var(--text-muted)', fontSize: '0.85em', marginTop: '3px' });
    }

    if (ref.status === 'ambiguous' && ref.candidates.length > 0) {
      const candidatesDiv = row.createDiv();
      applyStyles(candidatesDiv, { fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '3px' });
      candidatesDiv.appendText('Candidatos: ');
      candidatesDiv.appendText(ref.candidates.map((c) => c.title).join(', '));
    }
  }

  // ─── Cronologia ─────────────────────────────────────────────────────────────

  private renderCronologia(container: HTMLElement, cronologia: CronologiaDuplaContrarius): void {
    const livros = construirVisaoCronologia(cronologia, {
      modo: this.cronologiaMode,
      livro: TODOS_OS_LIVROS_CRONOLOGIA,
      consulta: '',
    }).livros;

    const livroExiste = livros.some((l) => l.chave === this.cronologiaLivro);
    if (!livroExiste) this.cronologiaLivro = TODOS_OS_LIVROS_CRONOLOGIA;

    this.renderCronologiaModeBar(container);
    this.renderCronologiaLivroSelector(container, livros);

    if (this.narrativaEditando && this.narrativaPlano !== null) {
      if (this.narrativaRevisando) {
        this.renderCronologiaRevisao(container);
      } else {
        this.renderCronologiaEditor(container);
      }
      return;
    }

    const filtro: FiltroVisaoCronologia = {
      modo: this.cronologiaMode,
      livro: this.cronologiaLivro,
      consulta: this.query,
    };
    const visao = construirVisaoCronologia(cronologia, filtro);

    if (this.cronologiaMode === 'narrativa') {
      this.renderBotaoEditarNarrativa(container);
      this.renderSeletorVisualizacaoNarrativa(container);
    }

    this.renderCronologiaSummary(container, visao);
    const tituloSecao = this.cronologiaMode === 'narrativa' && this.narrativaVisualizacao === 'roteiro'
      ? 'Roteiro narrativo'
      : 'Cronologia';
    this.renderSectionTitle(container, tituloSecao, visao.totalVisivel);

    if (visao.totalAntesDosFiltros === 0) {
      const msg = container.createDiv({ text: 'Nenhum Evento indexado.' });
      applyStyles(msg, { color: 'var(--text-muted)', padding: '12px 0' });
      return;
    }

    if (visao.totalVisivel === 0) {
      const msg = container.createDiv({ text: 'Nenhum resultado para o filtro e busca atuais.' });
      applyStyles(msg, { color: 'var(--text-muted)', padding: '12px 0' });
    }

    if (this.cronologiaMode === 'narrativa' && this.narrativaVisualizacao === 'roteiro') {
      this.renderRoteiroPorCapitulo(container, visao);
    } else {
      this.renderCronologiaPosicionados(container, visao);
    }
    this.renderCronologiaNaoPosicionados(container, visao);

    if (visao.problemas.length > 0) {
      this.renderCronologiaProblemas(container, visao.problemas);
    }
  }

  private renderCronologiaModeBar(container: HTMLElement): void {
    const bar = container.createDiv();
    applyStyles(bar, { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' });

    const options: ReadonlyArray<[ModoCronologiaContrarius, string]> = [
      ['cronologica', 'Cronológica'],
      ['narrativa', 'Narrativa'],
    ];
    for (const [mode, label] of options) {
      const active = this.cronologiaMode === mode;
      const btn = bar.createEl('button', { text: label });
      btn.setAttr('aria-pressed', String(active));
      btn.disabled = this.narrativaEditando;
      applyStyles(btn, {
        background: active ? 'var(--interactive-accent)' : '',
        color: active ? 'var(--text-on-accent)' : '',
      });
      btn.onclick = () => {
        this.cronologiaMode = mode;
        this.render();
      };
    }
  }

  private renderCronologiaLivroSelector(
    container: HTMLElement,
    livros: readonly OpcaoLivroCronologia[],
  ): void {
    const wrapper = container.createDiv();
    applyStyles(wrapper, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '12px',
      flexWrap: 'wrap',
    });

    const label = wrapper.createEl('label', { text: 'Livro:' });
    applyStyles(label, { color: 'var(--text-muted)', fontSize: '0.92em' });

    const select = wrapper.createEl('select');
    select.disabled = this.narrativaEditando;
    for (const opcao of livros) {
      const option = select.createEl('option', {
        text: `${opcao.rotulo} (${opcao.quantidade})`,
        value: opcao.chave,
      });
      if (opcao.chave === this.cronologiaLivro) option.selected = true;
    }
    select.onchange = () => {
      this.cronologiaLivro = select.value;
      this.render();
    };
  }

  private renderCronologiaSummary(
    container: HTMLElement,
    visao: VisaoCronologiaContrarius,
  ): void {
    const bar = container.createDiv();
    applyStyles(bar, {
      display: 'flex',
      gap: '16px',
      marginBottom: '12px',
      padding: '8px 12px',
      background: 'var(--background-secondary)',
      borderRadius: '6px',
      fontSize: '0.88em',
      color: 'var(--text-muted)',
      flexWrap: 'wrap',
    });
    const pairs: ReadonlyArray<[string, number]> = [
      ['Posicionados', visao.posicionados.length],
      ['Não posicionados', visao.naoPosicionados.length],
      ['Problemas visíveis', visao.problemas.length],
    ];
    for (const [rotulo, count] of pairs) {
      const item = bar.createSpan();
      item.createEl('strong', { text: String(count) });
      item.appendText(` ${rotulo}`);
    }
  }

  private renderCronologiaPosicionados(
    container: HTMLElement,
    visao: VisaoCronologiaContrarius,
  ): void {
    if (visao.posicionados.length === 0 && visao.totalVisivel > 0) {
      const msg = container.createDiv({ text: 'Nenhum evento posicionado nos filtros atuais.' });
      applyStyles(msg, { color: 'var(--text-muted)', padding: '8px 0' });
      return;
    }
    for (const linha of visao.posicionados) {
      this.renderCronologiaCard(container, linha);
    }
  }

  private renderCronologiaNaoPosicionados(
    container: HTMLElement,
    visao: VisaoCronologiaContrarius,
  ): void {
    if (visao.naoPosicionados.length === 0) return;

    const heading = container.createEl('h4', { text: `Não posicionados (${visao.naoPosicionados.length})` });
    applyStyles(heading, {
      marginTop: '20px',
      marginBottom: '8px',
      paddingBottom: '6px',
      borderBottom: '1px solid var(--background-modifier-border)',
    });

    for (const linha of visao.naoPosicionados) {
      this.renderCronologiaCard(container, linha);
    }
  }

  private renderCronologiaCard(container: HTMLElement, linha: LinhaCronologiaContrarius): void {
    const { item, posicao, rotuloTemporal, rotuloContexto } = linha;

    const card = container.createDiv();
    applyStyles(card, { ...this.cardStyles(), position: 'relative' });

    const posEl = card.createSpan({ text: `#${posicao}` });
    applyStyles(posEl, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      color: 'var(--text-faint)',
      fontSize: '0.78em',
      fontWeight: '600',
    });

    const titleEl = card.createEl('h4', { text: item.titulo });
    applyStyles(titleEl, { margin: '0 0 3px', paddingRight: '36px' });

    const idEl = card.createDiv({ text: item.id });
    applyStyles(idEl, { color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '8px' });

    const metaPairs: ReadonlyArray<[string, string]> = rotuloContexto !== ''
      ? [['Quando', rotuloTemporal], ['Contexto', rotuloContexto]]
      : [['Quando', rotuloTemporal]];
    this.renderMetadata(card, metaPairs);

    const btnRow = card.createDiv();
    applyStyles(btnRow, { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' });

    const openBtn = btnRow.createEl('button', { text: 'Abrir nota' });
    openBtn.onclick = () => { void this.openFile(item.filePath); };

    const verBtn = btnRow.createEl('button', { text: 'Ver ficha' });
    verBtn.onclick = () => {
      const key: ContrariusEntityKey = { tipoEntidade: 'evento', filePath: item.filePath };
      this.detailNavState = abrirDetalheRaiz(key);
      this.render();
    };
  }

  // ─── Editor de ordem narrativa ───────────────────────────────────────────────

  private renderBotaoEditarNarrativa(container: HTMLElement): void {
    const bar = container.createDiv();
    applyStyles(bar, { marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' });

    const btnEditar = bar.createEl('button', {
      text: 'Editar ordem narrativa',
      attr: { 'aria-label': 'Editar ordem narrativa' },
    });
    btnEditar.onclick = () => { this.iniciarEdicaoNarrativa(); };

    const btnExportar = bar.createEl('button', {
      text: 'Exportar roteiro Markdown',
      attr: { 'aria-label': 'Exportar roteiro narrativo em Markdown' },
    });
    btnExportar.disabled = this.narrativaEditando || this.narrativaRevisando || this.narrativaOcupado;
    btnExportar.onclick = () => { void this.exportarRoteiroNarrativo(); };

    const btnScrivener = bar.createEl('button', {
      text: 'Exportar pacote Scrivener',
      attr: { 'aria-label': 'Exportar pacote de arquivos Markdown para o Scrivener' },
    });
    btnScrivener.disabled = this.narrativaEditando || this.narrativaRevisando || this.narrativaOcupado;
    btnScrivener.onclick = () => { void this.exportarPacoteScrivener(); };

    const btnComparar = bar.createEl('button', {
      text: 'Comparar pacote Scrivener',
      attr: { 'aria-label': 'Comparar pacote Scrivener retornado com manifesto de exportação' },
    });
    btnComparar.disabled = this.narrativaEditando || this.narrativaRevisando || this.narrativaOcupado;
    btnComparar.onclick = () => { void this.compararPacoteScrivener(); };

    const btnPlano = bar.createEl('button', {
      text: 'Gerar plano de retorno Scrivener',
      attr: { 'aria-label': 'Gerar plano de pré-importação Scrivener' },
    });
    btnPlano.disabled = this.narrativaEditando || this.narrativaRevisando || this.narrativaOcupado;
    btnPlano.onclick = () => { void this.gerarPlanoRetornoScrivener(); };
  }

  private renderSeletorVisualizacaoNarrativa(container: HTMLElement): void {
    const bar = container.createDiv();
    applyStyles(bar, { display: 'flex', gap: '6px', marginBottom: '12px' });

    const opcoes: ReadonlyArray<['lista' | 'roteiro', string]> = [
      ['lista', 'Lista narrativa'],
      ['roteiro', 'Roteiro por capítulo'],
    ];
    for (const [value, label] of opcoes) {
      const active = this.narrativaVisualizacao === value;
      const btn = bar.createEl('button', { text: label });
      btn.setAttr('aria-pressed', String(active));
      btn.disabled = this.narrativaEditando;
      applyStyles(btn, {
        background: active ? 'var(--interactive-accent)' : '',
        color: active ? 'var(--text-on-accent)' : '',
      });
      btn.onclick = () => {
        this.narrativaVisualizacao = value;
        this.render();
      };
    }
  }

  private itemParaEntradaRoteiro(item: ItemCronologiaContrarius): EntradaRoteiroNarrativo {
    const livro = item.livro.find((b) => b.trim() !== '') ?? '';
    const livroChave = livro !== ''
      ? livro.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim()
      : '';
    return {
      chave: `${item.filePath}:${item.id}`,
      id: item.id,
      titulo: item.titulo,
      filePath: item.filePath,
      livro,
      livroChave,
      ordemNarrativa: item.ordemNarrativa,
      capitulo: item.capitulo,
      cena: item.cena,
    };
  }

  private renderRoteiroPorCapitulo(
    container: HTMLElement,
    visao: VisaoCronologiaContrarius,
  ): void {
    if (visao.posicionados.length === 0 && visao.totalVisivel > 0) {
      const msg = container.createDiv({ text: 'Nenhum evento com ordem_narrativa preenchida. Edite a ordem narrativa para montar o roteiro.' });
      applyStyles(msg, { color: 'var(--text-muted)', padding: '8px 0' });
      return;
    }
    if (visao.posicionados.length === 0) return;

    const entradas = visao.posicionados.map((l) => this.itemParaEntradaRoteiro(l.item));
    const roteiro = construirRoteiroNarrativo(entradas);

    for (const livro of roteiro.livros) {
      this.renderRoteiroLivro(container, livro);
    }
  }

  private renderRoteiroLivro(container: HTMLElement, livro: LivroRoteiroNarrativo): void {
    const livroDiv = container.createDiv();
    livroDiv.addClass('ctr-roteiro-livro');
    const heading = livroDiv.createEl('h3', { text: `${livro.titulo} (${livro.total})` });
    applyStyles(heading, {
      marginTop: '16px',
      marginBottom: '8px',
      paddingBottom: '6px',
      borderBottom: '2px solid var(--background-modifier-border)',
    });
    for (const cap of livro.capitulos) {
      this.renderRoteiroCapitulo(livroDiv, cap);
    }
  }

  private renderRoteiroCapitulo(container: HTMLElement, cap: CapituloRoteiroNarrativo): void {
    const capDiv = container.createDiv();
    capDiv.addClass('ctr-roteiro-capitulo');
    const heading = capDiv.createEl('h4', { text: `${cap.titulo} (${cap.total})` });
    applyStyles(heading, { marginTop: '12px', marginBottom: '6px', color: 'var(--text-muted)' });
    for (const cena of cap.cenas) {
      this.renderRoteiroCena(capDiv, cena);
    }
    for (const item of cap.itensSemCena) {
      this.renderRoteiroItem(capDiv, item);
    }
  }

  private renderRoteiroCena(container: HTMLElement, cena: CenaRoteiroNarrativo): void {
    const cenaDiv = container.createDiv();
    cenaDiv.addClass('ctr-roteiro-cena');
    const heading = cenaDiv.createEl('h5', { text: `Cena: ${cena.titulo} (${cena.total})` });
    applyStyles(heading, {
      marginTop: '8px',
      marginBottom: '4px',
      fontWeight: '500',
      color: 'var(--text-muted)',
      fontSize: '0.9em',
    });
    for (const item of cena.itens) {
      this.renderRoteiroItem(cenaDiv, item);
    }
  }

  private renderRoteiroItem(container: HTMLElement, item: ItemRoteiroNarrativo): void {
    const card = container.createDiv();
    card.addClass('ctr-roteiro-item');
    applyStyles(card, { ...this.cardStyles(), position: 'relative' });

    if (item.ordemNarrativa !== null) {
      const posEl = card.createSpan({ text: `#${item.ordemNarrativa}` });
      applyStyles(posEl, {
        position: 'absolute',
        top: '12px',
        right: '12px',
        color: 'var(--text-faint)',
        fontSize: '0.78em',
        fontWeight: '600',
      });
    }

    const titleEl = card.createEl('h4', { text: item.titulo });
    applyStyles(titleEl, { margin: '0 0 3px', paddingRight: '36px' });

    const idEl = card.createDiv({ text: item.id });
    applyStyles(idEl, { color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '8px' });

    const btnRow = card.createDiv();
    applyStyles(btnRow, { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' });

    const openBtn = btnRow.createEl('button', { text: 'Abrir nota' });
    openBtn.onclick = () => { void this.openFile(item.filePath); };

    if (!this.narrativaEditando) {
      const verBtn = btnRow.createEl('button', { text: 'Ver ficha' });
      verBtn.onclick = () => {
        const key: ContrariusEntityKey = { tipoEntidade: 'evento', filePath: item.filePath };
        this.detailNavState = abrirDetalheRaiz(key);
        this.render();
      };
    }
  }

  private iniciarEdicaoNarrativa(): void {
    if (this.currentIndex === null) return;
    this.narrativaPlano = construirPlanoNarrativo(this.currentIndex, this.cronologiaLivro);
    this.narrativaEditando = true;
    this.narrativaRevisando = false;
    this.narrativaOcupado = false;
    this.narrativaVaultMudou = false;
    this.narrativaErroPreparacao = null;
    this.narrativaErroScaffold = null;
    this.narrativaOrdemBruta.clear();
    this.render();
  }

  private cancelarEdicaoNarrativa(): void {
    const reindexar = this.narrativaVaultMudou;
    this.narrativaPlano = null;
    this.narrativaEditando = false;
    this.narrativaRevisando = false;
    this.narrativaOcupado = false;
    this.narrativaVaultMudou = false;
    this.narrativaErroPreparacao = null;
    this.narrativaErroScaffold = null;
    this.narrativaOrdemBruta.clear();
    if (reindexar) {
      void this.reindex();
    } else {
      this.render();
    }
  }

  private async iniciarRevisaoNarrativa(): Promise<void> {
    const plano = this.narrativaPlano;
    if (!plano || this.narrativaOcupado) return;

    const alteracoes = gerarAlteracoesPlanoNarrativo(plano);
    this.narrativaErroPreparacao = null;
    this.narrativaRevisando = true;

    if (alteracoes.length === 0) {
      this.render();
      return;
    }

    this.narrativaOcupado = true;
    this.render();

    const storage = this.criarArmazenamentoObsidian();
    try {
      await prepararSalvamentoNarrativo(alteracoes, storage);
      this.narrativaOcupado = false;
      this.render();
    } catch (e) {
      this.narrativaOcupado = false;
      this.narrativaErroPreparacao = descreverErroSalvamentoNarrativo(e);
      this.render();
    }
  }

  private async salvarAlteracoesNarrativas(): Promise<void> {
    const plano = this.narrativaPlano;
    if (!plano || !this.narrativaRevisando || this.narrativaOcupado) return;

    const alteracoes = gerarAlteracoesPlanoNarrativo(plano);
    if (alteracoes.length === 0) return;

    const temErro = plano.problemas.some((p) => p.nivel === 'erro');
    if (temErro) return;

    this.narrativaOcupado = true;
    this.render();

    const storage = this.criarArmazenamentoObsidian();
    try {
      const resultado = await executarSalvamentoNarrativo(alteracoes, storage);
      new Notice(`Contrarius: ${resultado.arquivosAlterados.length} arquivo(s) atualizado(s).`);
      this.narrativaPlano = null;
      this.narrativaEditando = false;
      this.narrativaRevisando = false;
      this.narrativaOcupado = false;
      this.narrativaVaultMudou = false;
      this.narrativaOrdemBruta.clear();
      await this.reindex();
    } catch (e) {
      this.narrativaOcupado = false;
      const eRev = e instanceof ErroSalvamentoNarrativo && e.etapa === 'reversao';
      const msg = e instanceof ErroSalvamentoNarrativo
        ? `Contrarius: erro ao salvar (${e.etapa}): ${e.message}`
        : `Contrarius: erro inesperado ao salvar: ${e instanceof Error ? e.message : String(e)}`;
      new Notice(msg);
      if (eRev) {
        new Notice(
          'Contrarius: ATENÇÃO — falha na reversão! Verifique os arquivos manualmente.',
          0,
        );
      }
      this.render();
    }
  }

  private criarArmazenamentoObsidian(): ArmazenamentoNotasNarrativas {
    return {
      ler: async (filePath: string): Promise<string> => {
        const file = this.obsidianApp.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
          throw new Error(`Nota não encontrada: ${filePath}`);
        }
        return this.obsidianApp.vault.read(file);
      },
      escrever: async (filePath: string, conteudo: string): Promise<void> => {
        const file = this.obsidianApp.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
          throw new Error(`Nota não encontrada para escrita: ${filePath}`);
        }
        await this.obsidianApp.vault.modify(file, conteudo);
      },
    };
  }

  private renderPreservandoFoco(): void {
    const activeEl = document.activeElement;
    const chave = activeEl instanceof HTMLElement ? activeEl.getAttribute('data-item-chave') : null;
    const campo = activeEl instanceof HTMLElement ? activeEl.getAttribute('data-item-campo') : null;
    const selStart = activeEl instanceof HTMLInputElement ? activeEl.selectionStart : null;
    const selEnd = activeEl instanceof HTMLInputElement ? activeEl.selectionEnd : null;

    this.render();

    if (chave !== null && campo !== null) {
      window.setTimeout(() => {
        for (const el of Array.from(this.containerEl.querySelectorAll('[data-item-chave]'))) {
          if (
            el instanceof HTMLInputElement &&
            el.getAttribute('data-item-chave') === chave &&
            el.getAttribute('data-item-campo') === campo
          ) {
            el.focus();
            if (selStart !== null && selEnd !== null) {
              el.setSelectionRange(selStart, selEnd);
            }
            break;
          }
        }
      }, 0);
    }
  }

  private narrativaMatcheBusca(item: ItemPlanoNarrativo): boolean {
    const raw = this.query.trim();
    if (raw === '') return true;
    const q = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
    const campos = [item.titulo, item.id, item.livro, item.filePath, item.capituloAtual, item.cenaAtual];
    return campos.some((f) =>
      f.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').includes(q),
    );
  }

  private renderCronologiaEditor(container: HTMLElement): void {
    const plano = this.narrativaPlano!;

    if (this.narrativaVaultMudou) {
      const aviso = container.createDiv({
        text: 'O Vault mudou durante a edição. O salvamento relerá os arquivos atuais.',
      });
      applyStyles(aviso, {
        padding: '8px 12px',
        marginBottom: '12px',
        borderRadius: '6px',
        background: 'var(--background-modifier-message)',
        color: 'var(--text-warning)',
        fontSize: '0.9em',
      });
    }

    // Stats
    const stats = container.createDiv();
    applyStyles(stats, {
      display: 'flex',
      gap: '16px',
      marginBottom: '12px',
      padding: '8px 12px',
      background: 'var(--background-secondary)',
      borderRadius: '6px',
      fontSize: '0.88em',
      color: 'var(--text-muted)',
      flexWrap: 'wrap',
    });
    const livroLabel = plano.livro === TODOS_OS_LIVROS_PLANO_NARRATIVO
      ? 'Todos os livros'
      : plano.livro === SEM_LIVRO_PLANO_NARRATIVO
        ? 'Sem livro'
        : plano.livro;

    const statItems: ReadonlyArray<[string, string | number]> = [
      ['Livro', livroLabel],
      ['Total', plano.itens.length],
      ['Alterados', plano.totalAlterados],
      ['Problemas', plano.problemas.length],
    ];
    for (const [label, valor] of statItems) {
      const s = stats.createSpan();
      s.createEl('strong', { text: String(valor) });
      s.appendText(` ${label}`);
    }

    this.renderEditorProblemas(container, plano.problemas);
    this.renderEditorControles(container, plano);

    const helpNota = container.createDiv({ text: 'A ordem define a sequência; capítulo e cena organizam o roteiro.' });
    applyStyles(helpNota, { fontSize: '0.82em', color: 'var(--text-muted)', marginBottom: '10px' });

    // Items (filtrados pela busca para display, mas plan completo)
    for (let idx = 0; idx < plano.itens.length; idx++) {
      const item = plano.itens[idx];
      if (!this.narrativaMatcheBusca(item)) continue;
      this.renderEditorItem(container, item, idx, plano.itens.length);
    }
  }

  private renderEditorControles(container: HTMLElement, plano: PlanoNarrativo): void {
    const bar = container.createDiv();
    applyStyles(bar, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '14px',
      padding: '10px 12px',
      background: 'var(--background-secondary)',
      borderRadius: '6px',
    });

    // Renumerar
    const renumBtn = bar.createEl('button', {
      text: 'Renumerar',
      attr: { 'aria-label': 'Renumerar a ordem narrativa' },
    });
    renumBtn.disabled = this.narrativaOcupado;
    renumBtn.onclick = () => {
      this.narrativaPlano = renumerarPlanoNarrativo(this.narrativaPlano!, {
        inicio: this.narrativaRenumInicio,
        passo: this.narrativaRenumPasso,
      });
      this.narrativaRevisando = false;
      this.render();
    };

    const labelInicio = bar.createEl('label', { text: 'Início' });
    applyStyles(labelInicio, { color: 'var(--text-muted)', fontSize: '0.88em' });
    const inputInicio = bar.createEl('input', { type: 'text', value: String(this.narrativaRenumInicio) });
    applyStyles(inputInicio, { width: '52px' });
    inputInicio.setAttribute('aria-label', 'Início da renumeração');
    inputInicio.disabled = this.narrativaOcupado;
    inputInicio.oninput = () => {
      const n = Number(inputInicio.value.trim());
      if (Number.isFinite(n) && Number.isInteger(n)) this.narrativaRenumInicio = n;
    };

    const labelPasso = bar.createEl('label', { text: 'Passo' });
    applyStyles(labelPasso, { color: 'var(--text-muted)', fontSize: '0.88em' });
    const inputPasso = bar.createEl('input', { type: 'text', value: String(this.narrativaRenumPasso) });
    applyStyles(inputPasso, { width: '52px' });
    inputPasso.setAttribute('aria-label', 'Passo da renumeração');
    inputPasso.disabled = this.narrativaOcupado;
    inputPasso.oninput = () => {
      const n = Number(inputPasso.value.trim());
      if (Number.isFinite(n) && Number.isInteger(n) && n !== 0) this.narrativaRenumPasso = n;
    };

    const spacer = bar.createDiv();
    applyStyles(spacer, { flex: '1' });

    const btnRestTudo = bar.createEl('button', {
      text: 'Restaurar tudo',
      attr: { 'aria-label': 'Restaurar todos os itens' },
    });
    btnRestTudo.disabled = this.narrativaOcupado || plano.totalAlterados === 0;
    btnRestTudo.onclick = () => {
      this.narrativaPlano = restaurarPlanoNarrativo(this.narrativaPlano!);
      this.narrativaOrdemBruta.clear();
      this.narrativaRevisando = false;
      this.render();
    };

    const btnCancelar = bar.createEl('button', {
      text: 'Cancelar edição',
      attr: { 'aria-label': 'Cancelar edição da ordem narrativa' },
    });
    btnCancelar.disabled = this.narrativaOcupado;
    btnCancelar.onclick = () => { this.cancelarEdicaoNarrativa(); };

    const btnRevisar = bar.createEl('button', {
      text: 'Revisar alterações',
      attr: { 'aria-label': 'Revisar alterações antes de salvar' },
    });
    applyStyles(btnRevisar, {
      background: 'var(--interactive-accent)',
      color: 'var(--text-on-accent)',
    });
    const temInvalido = this.narrativaOrdemBruta.size > 0;
    btnRevisar.disabled = this.narrativaOcupado || plano.totalAlterados === 0 || temInvalido;
    btnRevisar.onclick = () => { void this.iniciarRevisaoNarrativa(); };
  }

  private renderEditorItem(
    container: HTMLElement,
    item: ItemPlanoNarrativo,
    idx: number,
    total: number,
  ): void {
    const card = container.createDiv();
    card.setAttribute('data-item-card-chave', item.chave);
    applyStyles(card, {
      ...this.cardStyles(),
      borderLeft: item.alterado ? '3px solid var(--interactive-accent)' : '',
    });

    // Cabeçalho
    const cabRow = card.createDiv();
    applyStyles(cabRow, { display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' });
    const titleEl = cabRow.createEl('h4', { text: item.titulo });
    applyStyles(titleEl, { margin: '0', flex: '1 1 auto' });
    if (item.alterado) {
      const badge = cabRow.createSpan({ text: 'Alterado' });
      applyStyles(badge, {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: '999px',
        background: 'var(--interactive-accent)',
        color: 'var(--text-on-accent)',
        fontSize: '0.72em',
        fontWeight: '600',
      });
    }

    const metaRow = card.createDiv();
    applyStyles(metaRow, { color: 'var(--text-muted)', fontSize: '0.82em', marginBottom: '10px' });
    metaRow.appendText(`${item.id}`);
    if (item.livro !== '') metaRow.appendText(` · ${item.livro}`);
    const pathSpan = metaRow.createSpan({ text: ` · ${item.filePath}` });
    applyStyles(pathSpan, { fontFamily: 'var(--font-monospace)', fontSize: '0.9em' });

    // Inputs
    const fieldsGrid = card.createDiv();
    applyStyles(fieldsGrid, { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' });

    // Ordem narrativa
    const ordemGroup = fieldsGrid.createDiv();
    const ordemLabel = ordemGroup.createEl('label', { text: 'Ordem narrativa (sequência)' });
    applyStyles(ordemLabel, { display: 'block', fontSize: '0.82em', color: 'var(--text-muted)', marginBottom: '3px' });
    const ordemBruta = this.narrativaOrdemBruta.get(item.chave);
    const ordemInput = ordemGroup.createEl('input', {
      type: 'text',
      value: ordemBruta !== undefined ? ordemBruta : (item.ordemAtual !== null ? String(item.ordemAtual) : ''),
    });
    ordemInput.setAttribute('placeholder', '10, 20, 30...');
    ordemInput.setAttribute('aria-label', `Ordem narrativa de ${item.titulo}`);
    ordemInput.setAttribute('data-item-chave', item.chave);
    ordemInput.setAttribute('data-item-campo', 'ordem');
    applyStyles(ordemInput, { width: '90px', borderColor: ordemBruta !== undefined ? 'var(--text-error)' : '' });
    ordemInput.disabled = this.narrativaOcupado;
    ordemInput.oninput = () => {
      const raw = ordemInput.value;
      const trimmed = raw.trim();
      if (trimmed === '') {
        this.narrativaOrdemBruta.delete(item.chave);
        this.narrativaPlano = editarItemPlanoNarrativo(this.narrativaPlano!, item.chave, { ordemNarrativa: null });
      } else {
        const num = Number(trimmed);
        if (Number.isFinite(num) && Number.isInteger(num)) {
          this.narrativaOrdemBruta.delete(item.chave);
          this.narrativaPlano = editarItemPlanoNarrativo(this.narrativaPlano!, item.chave, { ordemNarrativa: num });
        } else {
          this.narrativaOrdemBruta.set(item.chave, raw);
        }
      }
      this.narrativaRevisando = false;
      this.renderPreservandoFoco();
    };
    if (ordemBruta !== undefined) {
      const errMsg = ordemGroup.createDiv({ text: 'Valor inválido: use um número inteiro.' });
      applyStyles(errMsg, { color: 'var(--text-error)', fontSize: '0.78em', marginTop: '2px' });
    }

    // Capítulo
    const capGroup = fieldsGrid.createDiv();
    const capLabel = capGroup.createEl('label', { text: 'Capítulo' });
    applyStyles(capLabel, { display: 'block', fontSize: '0.82em', color: 'var(--text-muted)', marginBottom: '3px' });
    const capInput = capGroup.createEl('input', { type: 'text', value: item.capituloAtual });
    capInput.setAttribute('placeholder', 'Capítulo 1');
    capInput.setAttribute('aria-label', `Capítulo de ${item.titulo}`);
    capInput.setAttribute('data-item-chave', item.chave);
    capInput.setAttribute('data-item-campo', 'capitulo');
    applyStyles(capInput, { width: '120px' });
    capInput.disabled = this.narrativaOcupado;
    capInput.oninput = () => {
      this.narrativaPlano = editarItemPlanoNarrativo(this.narrativaPlano!, item.chave, { capitulo: capInput.value });
      this.narrativaRevisando = false;
      this.renderPreservandoFoco();
    };

    // Cena
    const cenaGroup = fieldsGrid.createDiv();
    const cenaLabel = cenaGroup.createEl('label', { text: 'Cena' });
    applyStyles(cenaLabel, { display: 'block', fontSize: '0.82em', color: 'var(--text-muted)', marginBottom: '3px' });
    const cenaInput = cenaGroup.createEl('input', { type: 'text', value: item.cenaAtual });
    cenaInput.setAttribute('placeholder', 'Cena ou bloco narrativo');
    cenaInput.setAttribute('aria-label', `Cena de ${item.titulo}`);
    cenaInput.setAttribute('data-item-chave', item.chave);
    cenaInput.setAttribute('data-item-campo', 'cena');
    applyStyles(cenaInput, { width: '120px' });
    cenaInput.disabled = this.narrativaOcupado;
    cenaInput.oninput = () => {
      this.narrativaPlano = editarItemPlanoNarrativo(this.narrativaPlano!, item.chave, { cena: cenaInput.value });
      this.narrativaRevisando = false;
      this.renderPreservandoFoco();
    };

    // Botões de ação
    const btnRow = card.createDiv();
    applyStyles(btnRow, { display: 'flex', gap: '6px', flexWrap: 'wrap' });

    const btnCima = btnRow.createEl('button', {
      text: 'Mover para cima',
      attr: { 'aria-label': `Mover ${item.titulo} para cima` },
    });
    btnCima.disabled = this.narrativaOcupado || idx === 0;
    btnCima.onclick = () => {
      this.narrativaPlano = moverItemPlanoNarrativo(this.narrativaPlano!, item.chave, idx - 1);
      this.narrativaRevisando = false;
      this.render();
      window.setTimeout(() => {
        const card2 = this.containerEl.querySelector(`[data-item-card-chave="${item.chave}"]`);
        (card2?.querySelector('button') as HTMLElement | null)?.focus();
      }, 0);
    };

    const btnBaixo = btnRow.createEl('button', {
      text: 'Mover para baixo',
      attr: { 'aria-label': `Mover ${item.titulo} para baixo` },
    });
    btnBaixo.disabled = this.narrativaOcupado || idx === total - 1;
    btnBaixo.onclick = () => {
      this.narrativaPlano = moverItemPlanoNarrativo(this.narrativaPlano!, item.chave, idx + 1);
      this.narrativaRevisando = false;
      this.render();
      window.setTimeout(() => {
        const card2 = this.containerEl.querySelector(`[data-item-card-chave="${item.chave}"]`);
        (card2?.querySelector('button') as HTMLElement | null)?.focus();
      }, 0);
    };

    const btnRestaurar = btnRow.createEl('button', {
      text: 'Restaurar',
      attr: { 'aria-label': `Restaurar ${item.titulo} ao valor original` },
    });
    btnRestaurar.disabled = this.narrativaOcupado || !item.alterado;
    btnRestaurar.onclick = () => {
      this.narrativaOrdemBruta.delete(item.chave);
      this.narrativaPlano = restaurarItemPlanoNarrativo(this.narrativaPlano!, item.chave);
      this.narrativaRevisando = false;
      this.render();
    };

    const btnAbrir = btnRow.createEl('button', {
      text: 'Abrir nota',
      attr: { 'aria-label': `Abrir nota de ${item.titulo}` },
    });
    btnAbrir.onclick = () => { void this.openFile(item.filePath); };
  }

  private renderEditorProblemas(
    container: HTMLElement,
    problemas: readonly ProblemaPlanoNarrativo[],
  ): void {
    if (problemas.length === 0) return;
    const box = container.createDiv();
    applyStyles(box, {
      padding: '8px 12px',
      marginBottom: '12px',
      borderRadius: '6px',
      background: 'var(--background-secondary)',
      borderLeft: '3px solid var(--text-warning)',
    });
    const heading = box.createEl('strong', { text: `Problemas (${problemas.length})` });
    applyStyles(heading, { display: 'block', marginBottom: '4px', fontSize: '0.88em' });
    for (const p of problemas) {
      const row = box.createDiv();
      applyStyles(row, { fontSize: '0.82em', marginTop: '3px' });
      const nivel = row.createSpan({ text: p.nivel === 'erro' ? 'Erro' : 'Aviso' });
      applyStyles(nivel, {
        fontWeight: '600',
        color: p.nivel === 'erro' ? 'var(--text-error)' : 'var(--text-warning)',
        marginRight: '6px',
        textTransform: 'uppercase',
        fontSize: '0.78em',
      });
      row.appendText(p.mensagem);
    }
  }

  private renderCronologiaRevisao(container: HTMLElement): void {
    const plano = this.narrativaPlano!;
    const alteracoes = gerarAlteracoesPlanoNarrativo(plano);
    const temErro = plano.problemas.some((p) => p.nivel === 'erro');
    const temErroPreparacao = this.narrativaErroPreparacao !== null;

    // Título
    const titulo = container.createEl('h3', { text: 'Revisão das alterações' });
    applyStyles(titulo, { marginTop: '0' });

    if (this.narrativaOcupado) {
      const loadDiv = container.createDiv({ text: 'Verificando compatibilidade dos arquivos…' });
      applyStyles(loadDiv, {
        padding: '8px 12px',
        marginBottom: '14px',
        borderRadius: '6px',
        background: 'var(--background-secondary)',
        color: 'var(--text-muted)',
        fontSize: '0.9em',
      });
    }

    this.renderEditorProblemas(container, plano.problemas);

    // Stats
    const statsDiv = container.createDiv();
    applyStyles(statsDiv, {
      padding: '8px 12px',
      marginBottom: '14px',
      background: 'var(--background-secondary)',
      borderRadius: '6px',
      fontSize: '0.88em',
      color: 'var(--text-muted)',
    });
    statsDiv.appendText(`Total de arquivos a modificar: `);
    statsDiv.createEl('strong', { text: String(alteracoes.length) });

    if (alteracoes.length === 0) {
      const msg = container.createDiv({ text: 'Nenhuma alteração para salvar.' });
      applyStyles(msg, { color: 'var(--text-muted)', padding: '12px 0' });
    } else {
      for (const alt of alteracoes) {
        const card = container.createDiv();
        applyStyles(card, { ...this.cardStyles(), marginBottom: '8px' });
        const fp = card.createDiv({ text: alt.filePath });
        applyStyles(fp, { fontFamily: 'var(--font-monospace)', fontSize: '0.82em', marginBottom: '8px', color: 'var(--text-muted)' });
        const grid = card.createDiv();
        applyStyles(grid, {
          display: 'grid',
          gridTemplateColumns: 'minmax(120px, 0.3fr) 1fr 1fr',
          gap: '4px 12px',
          fontSize: '0.88em',
        });
        const hCampo = grid.createDiv({ text: 'Campo' });
        applyStyles(hCampo, { fontWeight: '600', color: 'var(--text-muted)' });
        const hAntes = grid.createDiv({ text: 'Antes' });
        applyStyles(hAntes, { fontWeight: '600', color: 'var(--text-muted)' });
        const hDepois = grid.createDiv({ text: 'Depois' });
        applyStyles(hDepois, { fontWeight: '600', color: 'var(--text-muted)' });

        type Campo = { label: string; antes: string; depois: string };
        const campos: Campo[] = [];
        if (alt.antes.ordemNarrativa !== alt.depois.ordemNarrativa) {
          campos.push({
            label: 'Ordem narrativa',
            antes: alt.antes.ordemNarrativa !== null ? String(alt.antes.ordemNarrativa) : '(vazio)',
            depois: alt.depois.ordemNarrativa !== null ? String(alt.depois.ordemNarrativa) : '(vazio)',
          });
        }
        if (alt.antes.capitulo !== alt.depois.capitulo) {
          campos.push({
            label: 'Capítulo',
            antes: alt.antes.capitulo || '(vazio)',
            depois: alt.depois.capitulo || '(vazio)',
          });
        }
        if (alt.antes.cena !== alt.depois.cena) {
          campos.push({
            label: 'Cena',
            antes: alt.antes.cena || '(vazio)',
            depois: alt.depois.cena || '(vazio)',
          });
        }
        for (const c of campos) {
          grid.createDiv({ text: c.label });
          const antesEl = grid.createDiv({ text: c.antes });
          applyStyles(antesEl, { color: 'var(--text-muted)' });
          const depoisEl = grid.createDiv({ text: c.depois });
          applyStyles(depoisEl, { fontWeight: '500' });
        }
      }
    }

    if (temErro) {
      const errDiv = container.createDiv({ text: 'Problemas de nível erro bloqueiam o salvamento. Volte à edição para corrigi-los.' });
      applyStyles(errDiv, { color: 'var(--text-error)', padding: '8px 0', fontSize: '0.9em' });
    }

    if (temErroPreparacao) {
      const errDesc = this.narrativaErroPreparacao!;
      const errBox = container.createDiv();
      applyStyles(errBox, {
        padding: '10px 14px',
        marginTop: '12px',
        borderRadius: '6px',
        background: 'var(--background-secondary)',
        borderLeft: '3px solid var(--text-error)',
      });
      const errTitulo = errBox.createEl('strong', { text: errDesc.titulo });
      applyStyles(errTitulo, { display: 'block', color: 'var(--text-error)', marginBottom: '4px', fontSize: '0.9em' });
      if (errDesc.filePath !== '') {
        const errCaminho = errBox.createDiv({ text: errDesc.filePath });
        applyStyles(errCaminho, { fontFamily: 'var(--font-monospace)', fontSize: '0.82em', color: 'var(--text-muted)', marginBottom: '4px' });
      }
      errBox.createDiv({ text: errDesc.mensagem });
      const errAcao = errBox.createDiv({ text: errDesc.acaoSugerida });
      applyStyles(errAcao, { marginTop: '4px', fontSize: '0.88em', color: 'var(--text-muted)' });

      if (errDesc.codigoCausa === 'frontmatter_ausente') {
        const scaffoldFilePath = errDesc.filePath.replace(/\\/g, '/');
        const itemFalhado = this.narrativaPlano!.itens.find(
          (i) => i.filePath.replace(/\\/g, '/') === scaffoldFilePath,
        );
        if (itemFalhado !== undefined && itemFalhado.id.trim() !== '' && itemFalhado.titulo.trim() !== '') {
          const scaffoldDiv = errBox.createDiv();
          applyStyles(scaffoldDiv, {
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--background-modifier-border)',
          });
          const scaffoldBtn = scaffoldDiv.createEl('button', { text: 'Adicionar frontmatter mínimo' });
          scaffoldBtn.disabled = this.narrativaOcupado;
          const scaffoldDesc = scaffoldDiv.createDiv({
            text: 'A nota será estruturada com campos vazios, sem datas, livro ou participantes inventados.',
          });
          applyStyles(scaffoldDesc, { fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' });
          if (this.narrativaErroScaffold !== null) {
            const scaffoldErrDiv = scaffoldDiv.createDiv({ text: this.narrativaErroScaffold });
            applyStyles(scaffoldErrDiv, { color: 'var(--text-error)', fontSize: '0.85em', marginTop: '4px' });
          }
          scaffoldBtn.onclick = () => {
            void this.executarAdicionarFrontmatterMinimo(itemFalhado.id, itemFalhado.titulo, errDesc.filePath);
          };
        }
      }
    }

    // Botões de controle da revisão
    const btnRow = container.createDiv();
    applyStyles(btnRow, { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' });

    const btnVoltar = btnRow.createEl('button', {
      text: 'Voltar à edição',
      attr: { 'aria-label': 'Voltar à edição da ordem narrativa' },
    });
    btnVoltar.disabled = this.narrativaOcupado;
    btnVoltar.onclick = () => {
      this.narrativaRevisando = false;
      this.narrativaErroPreparacao = null;
      this.narrativaErroScaffold = null;
      this.render();
    };

    if (alteracoes.length > 0) {
      const btnSalvar = btnRow.createEl('button', {
        text: this.narrativaOcupado ? 'Aguarde…' : 'Salvar alterações',
        attr: { 'aria-label': 'Salvar alterações da ordem narrativa' },
      });
      applyStyles(btnSalvar, {
        background: (temErro || temErroPreparacao) ? '' : 'var(--interactive-accent)',
        color: (temErro || temErroPreparacao) ? '' : 'var(--text-on-accent)',
      });
      btnSalvar.disabled = this.narrativaOcupado || temErro || temErroPreparacao;
      btnSalvar.onclick = () => { void this.salvarAlteracoesNarrativas(); };
    }
  }

  private async executarAdicionarFrontmatterMinimo(
    idEvento: string,
    titulo: string,
    filePath: string,
  ): Promise<void> {
    if (this.narrativaOcupado) return;
    this.narrativaErroScaffold = null;
    this.narrativaOcupado = true;
    this.render();

    try {
      const file = this.obsidianApp.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        throw new Error(`Nota não encontrada: ${filePath}`);
      }
      const conteudoAtual = await this.obsidianApp.vault.read(file);
      const resultado = adicionarFrontmatterMinimoEvento(conteudoAtual, { idEvento, titulo });
      await this.obsidianApp.vault.modify(file, resultado.conteudo);
      new Notice('Frontmatter mínimo adicionado. Revise novamente antes de salvar.');
      this.narrativaOcupado = false;
      await this.iniciarRevisaoNarrativa();
    } catch (e) {
      this.narrativaOcupado = false;
      this.narrativaErroScaffold = 'Não foi possível adicionar o frontmatter mínimo.';
      this.render();
    }
  }

  private async exportarRoteiroNarrativo(): Promise<void> {
    if (this.currentCronologia === null) return;

    const filtroExportacao: FiltroVisaoCronologia = {
      modo: 'narrativa',
      livro: this.cronologiaLivro,
      consulta: '',
    };
    const visao = construirVisaoCronologia(this.currentCronologia, filtroExportacao);

    const opcaoLivro = visao.livros.find((l) => l.chave === this.cronologiaLivro);
    const filtroLivroRotulo =
      opcaoLivro !== undefined ? opcaoLivro.rotulo : this.cronologiaLivro;

    const eventosPosicionados: EventoExportacaoNarrativa[] = visao.posicionados.map((l) => {
      const item = l.item;
      const livro = item.livro.find((b) => b.trim() !== '') ?? '';
      return {
        chave: `${item.filePath}:${item.id}`,
        id: item.id,
        titulo: item.titulo,
        filePath: item.filePath,
        livro,
        ordemNarrativa: item.ordemNarrativa,
        capitulo: item.capitulo,
        cena: item.cena,
      };
    });

    const eventosSemOrdem: EventoExportacaoNarrativa[] = visao.naoPosicionados.map((l) => {
      const item = l.item;
      const livro = item.livro.find((b) => b.trim() !== '') ?? '';
      return {
        chave: `${item.filePath}:${item.id}`,
        id: item.id,
        titulo: item.titulo,
        filePath: item.filePath,
        livro,
        ordemNarrativa: item.ordemNarrativa,
        capitulo: item.capitulo,
        cena: item.cena,
      };
    });

    const problemas: ProblemaExportacaoNarrativa[] = visao.problemas.map((p) => ({
      nivel: p.nivel,
      mensagem: p.mensagem,
      relacionados: p.relacionados,
    }));

    const agora = new Date();
    const pad2 = (n: number): string => String(n).padStart(2, '0');
    const geradoEm = `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())} ${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;
    const tsArquivo = `${agora.getFullYear()}${pad2(agora.getMonth() + 1)}${pad2(agora.getDate())}-${pad2(agora.getHours())}${pad2(agora.getMinutes())}${pad2(agora.getSeconds())}`;

    const tituloExport =
      filtroLivroRotulo !== 'Todos os livros'
        ? `Roteiro narrativo — ${filtroLivroRotulo}`
        : 'Roteiro narrativo';

    const dados: DadosExportacaoRoteiroNarrativo = {
      titulo: tituloExport,
      filtroLivro: filtroLivroRotulo,
      busca: this.query.trim(),
      geradoEm,
      eventosPosicionados,
      eventosSemOrdem,
      problemas,
    };

    const conteudo = gerarMarkdownRoteiroNarrativo(dados);

    try {
      const pastaExport = '12_Export/Roteiros';
      if (this.obsidianApp.vault.getAbstractFileByPath(pastaExport) === null) {
        await this.obsidianApp.vault.createFolder(pastaExport);
      }

      const baseName = `roteiro-narrativo-${tsArquivo}`;
      let caminhoFinal = `${pastaExport}/${baseName}.md`;
      let sufixo = 2;
      while (this.obsidianApp.vault.getAbstractFileByPath(caminhoFinal) !== null) {
        caminhoFinal = `${pastaExport}/${baseName}-${sufixo}.md`;
        sufixo++;
      }

      await this.obsidianApp.vault.create(caminhoFinal, conteudo);
      new Notice(`Roteiro narrativo exportado: ${caminhoFinal}`);
    } catch (e) {
      new Notice('Não foi possível exportar o roteiro narrativo.');
    }
  }

  private async exportarPacoteScrivener(): Promise<void> {
    if (this.currentCronologia === null) return;

    const filtroExportacao: FiltroVisaoCronologia = {
      modo: 'narrativa',
      livro: this.cronologiaLivro,
      consulta: '',
    };
    const visao = construirVisaoCronologia(this.currentCronologia, filtroExportacao);

    const opcaoLivro = visao.livros.find((l) => l.chave === this.cronologiaLivro);
    const filtroLivroRotulo =
      opcaoLivro !== undefined ? opcaoLivro.rotulo : this.cronologiaLivro;

    const eventosPosicionados: EventoExportacaoScrivener[] = visao.posicionados.map((l) => {
      const item = l.item;
      const livro = item.livro.find((b) => b.trim() !== '') ?? '';
      return {
        chave: `${item.filePath}:${item.id}`,
        id: item.id,
        titulo: item.titulo,
        filePath: item.filePath,
        livro,
        ordemNarrativa: item.ordemNarrativa,
        capitulo: item.capitulo,
        cena: item.cena,
      };
    });

    const eventosSemOrdem: EventoExportacaoScrivener[] = visao.naoPosicionados.map((l) => {
      const item = l.item;
      const livro = item.livro.find((b) => b.trim() !== '') ?? '';
      return {
        chave: `${item.filePath}:${item.id}`,
        id: item.id,
        titulo: item.titulo,
        filePath: item.filePath,
        livro,
        ordemNarrativa: item.ordemNarrativa,
        capitulo: item.capitulo,
        cena: item.cena,
      };
    });

    const problemas: ProblemaExportacaoScrivener[] = visao.problemas.map((p) => ({
      nivel: p.nivel,
      mensagem: p.mensagem,
      relacionados: p.relacionados,
    }));

    const agora = new Date();
    const pad2 = (n: number): string => String(n).padStart(2, '0');
    const geradoEm = `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())} ${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;
    const tsArquivo = `${agora.getFullYear()}${pad2(agora.getMonth() + 1)}${pad2(agora.getDate())}-${pad2(agora.getHours())}${pad2(agora.getMinutes())}${pad2(agora.getSeconds())}`;

    const tituloExport =
      filtroLivroRotulo !== 'Todos os livros'
        ? `Pacote Scrivener — ${filtroLivroRotulo}`
        : 'Pacote Scrivener';

    const dados: DadosPacoteScrivener = {
      titulo: tituloExport,
      filtroLivro: filtroLivroRotulo,
      busca: this.query.trim(),
      geradoEm,
      eventosPosicionados,
      eventosSemOrdem,
      problemas,
    };

    const pacote = gerarPacoteScrivenerMarkdown(dados);

    const validacao = validarPacoteScrivenerMarkdown(pacote);
    if (validacao.erros.length > 0) {
      new Notice(`Pacote Scrivener inválido: ${resumirValidacaoPacoteScrivener(validacao)}`);
      for (const problema of validacao.erros) {
        console.error(`[Contrarius] ${problema.codigo}: ${problema.mensagem}${problema.caminhoRelativo !== undefined ? ` (${problema.caminhoRelativo})` : ''}`);
      }
      return;
    }

    if (validacao.avisos.length > 0) {
      for (const a of validacao.avisos) {
        console.warn(`[Contrarius] ${a.codigo}: ${a.mensagem}`);
      }
    }

    try {
      const pastaBase = '12_Export/Scrivener';
      await this.garantirPastaScrivener(pastaBase);

      const nomeSubpasta = `roteiro-scrivener-${tsArquivo}`;
      let pastaFinal = `${pastaBase}/${nomeSubpasta}`;
      let sufixo = 2;
      while (this.obsidianApp.vault.getAbstractFileByPath(pastaFinal) !== null) {
        pastaFinal = `${pastaBase}/${nomeSubpasta}-${String(sufixo).padStart(2, '0')}`;
        sufixo++;
      }
      await this.obsidianApp.vault.createFolder(pastaFinal);

      for (const arquivo of pacote.arquivos) {
        const caminhoCompleto = `${pastaFinal}/${arquivo.caminhoRelativo}`;
        const ultimaBarra = caminhoCompleto.lastIndexOf('/');
        if (ultimaBarra > 0) {
          await this.garantirPastaScrivener(caminhoCompleto.slice(0, ultimaBarra));
        }
        await this.obsidianApp.vault.create(caminhoCompleto, arquivo.conteudo);
      }

      new Notice(`Pacote Scrivener exportado: ${pastaFinal}`);
      if (validacao.avisos.length > 0) {
        new Notice(`Scrivener: ${resumirValidacaoPacoteScrivener(validacao)}`);
      }
    } catch (e) {
      new Notice('Não foi possível exportar o pacote Scrivener.');
    }
  }

  private async garantirPastaScrivener(caminho: string): Promise<void> {
    if (this.obsidianApp.vault.getAbstractFileByPath(caminho) !== null) return;
    const partes = caminho.split('/');
    let atual = '';
    for (const parte of partes) {
      atual = atual === '' ? parte : `${atual}/${parte}`;
      if (this.obsidianApp.vault.getAbstractFileByPath(atual) === null) {
        await this.obsidianApp.vault.createFolder(atual);
      }
    }
  }

  private async compararPacoteScrivener(): Promise<void> {
    try {
      const pastaBase = '12_Export/Scrivener';
      const pastaBaseAbs = this.obsidianApp.vault.getAbstractFileByPath(pastaBase);

      if (!(pastaBaseAbs instanceof TFolder)) {
        new Notice('Nenhum pacote Scrivener encontrado para comparar.');
        return;
      }

      let pastaEscolhida: TFolder | null = null;
      let maiorMtime = -Infinity;

      for (const filho of pastaBaseAbs.children) {
        if (!(filho instanceof TFolder)) continue;
        const manifestoPath = `${filho.path}/contrarius-manifest.json`;
        const manifestoFile = this.obsidianApp.vault.getAbstractFileByPath(manifestoPath);
        if (!(manifestoFile instanceof TFile)) continue;
        if (manifestoFile.stat.mtime > maiorMtime) {
          maiorMtime = manifestoFile.stat.mtime;
          pastaEscolhida = filho;
        }
      }

      if (pastaEscolhida === null) {
        new Notice('Nenhum pacote Scrivener encontrado para comparar.');
        return;
      }

      const arquivos: ArquivoPacoteScrivenerRetornado[] = [];
      await this.lerArquivosPacoteScrivener(pastaEscolhida, pastaEscolhida.path, arquivos);

      const manifestoFile = this.obsidianApp.vault.getAbstractFileByPath(
        `${pastaEscolhida.path}/contrarius-manifest.json`,
      );
      let manifestoJson = '';
      if (manifestoFile instanceof TFile) {
        manifestoJson = await this.obsidianApp.vault.read(manifestoFile);
      }

      const agora = new Date();
      const pad2 = (n: number): string => String(n).padStart(2, '0');
      const geradoEm = `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())} ${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;

      const dadosComparacao: DadosComparacaoPacoteScrivener = {
        manifestoJson,
        arquivos,
        geradoEm,
      };

      const resultado = compararPacoteScrivenerRetornado(dadosComparacao);

      const nomeBase = 'RELATORIO_COMPARACAO';
      let caminhoRelatorio = `${pastaEscolhida.path}/${nomeBase}.md`;
      let sufixo = 2;
      while (this.obsidianApp.vault.getAbstractFileByPath(caminhoRelatorio) !== null) {
        caminhoRelatorio = `${pastaEscolhida.path}/${nomeBase}-${sufixo}.md`;
        sufixo++;
      }

      await this.obsidianApp.vault.create(caminhoRelatorio, resultado.relatorioMarkdown);
      new Notice(`Relatório de comparação Scrivener gerado: ${caminhoRelatorio}`);
    } catch (e) {
      new Notice('Não foi possível comparar o pacote Scrivener.');
    }
  }

  private async lerArquivosPacoteScrivener(
    pasta: TFolder,
    pastaRaiz: string,
    arquivos: ArquivoPacoteScrivenerRetornado[],
  ): Promise<void> {
    for (const filho of pasta.children) {
      if (filho instanceof TFile && (filho.extension === 'md' || filho.extension === 'json')) {
        const caminhoRelativo = filho.path.slice(pastaRaiz.length + 1);
        const conteudo = await this.obsidianApp.vault.read(filho);
        arquivos.push({ caminhoRelativo, conteudo });
      } else if (filho instanceof TFolder) {
        await this.lerArquivosPacoteScrivener(filho, pastaRaiz, arquivos);
      }
    }
  }

  private async gerarPlanoRetornoScrivener(): Promise<void> {
    try {
      const pastaBase = '12_Export/Scrivener';
      const pastaBaseAbs = this.obsidianApp.vault.getAbstractFileByPath(pastaBase);

      if (!(pastaBaseAbs instanceof TFolder)) {
        new Notice('Nenhum pacote Scrivener encontrado para gerar plano.');
        return;
      }

      let pastaEscolhida: TFolder | null = null;
      let maiorMtime = -Infinity;

      for (const filho of pastaBaseAbs.children) {
        if (!(filho instanceof TFolder)) continue;
        const manifestoPath = `${filho.path}/contrarius-manifest.json`;
        const manifestoFile = this.obsidianApp.vault.getAbstractFileByPath(manifestoPath);
        if (!(manifestoFile instanceof TFile)) continue;
        if (manifestoFile.stat.mtime > maiorMtime) {
          maiorMtime = manifestoFile.stat.mtime;
          pastaEscolhida = filho;
        }
      }

      if (pastaEscolhida === null) {
        new Notice('Nenhum pacote Scrivener encontrado para gerar plano.');
        return;
      }

      const manifestoFile = this.obsidianApp.vault.getAbstractFileByPath(
        `${pastaEscolhida.path}/contrarius-manifest.json`,
      );
      let manifestoJson = '';
      if (manifestoFile instanceof TFile) {
        manifestoJson = await this.obsidianApp.vault.read(manifestoFile);
      }

      const arquivosScrivener: ArquivoScrivenerPreImportacao[] = [];
      await this.lerArquivosMarkdownPacote(pastaEscolhida, pastaEscolhida.path, arquivosScrivener);

      const notasOriginais: NotaOriginalPreImportacao[] = [];
      let manifestoRawPlano: unknown;
      try {
        manifestoRawPlano = JSON.parse(manifestoJson);
      } catch {
        manifestoRawPlano = null;
      }
      if (
        typeof manifestoRawPlano === 'object' &&
        manifestoRawPlano !== null &&
        !Array.isArray(manifestoRawPlano)
      ) {
        const arquivosM = (manifestoRawPlano as Record<string, unknown>)['arquivos'];
        if (Array.isArray(arquivosM)) {
          const notasLidas = new Set<string>();
          for (const entrada of arquivosM) {
            if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) continue;
            const fp = (entrada as Record<string, unknown>)['filePath'];
            if (typeof fp !== 'string' || fp.trim() === '') continue;
            if (notasLidas.has(fp)) continue;
            const notaFile = this.obsidianApp.vault.getAbstractFileByPath(fp);
            if (notaFile instanceof TFile) {
              const conteudo = await this.obsidianApp.vault.read(notaFile);
              notasOriginais.push({ filePath: fp, conteudo });
              notasLidas.add(fp);
            }
          }
        }
      }

      const agora = new Date();
      const pad2 = (n: number): string => String(n).padStart(2, '0');
      const geradoEm = `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())} ${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;

      const dadosPlano: DadosPlanoPreImportacaoScrivener = {
        manifestoJson,
        arquivosScrivener,
        notasOriginais,
        geradoEm,
      };

      const resultado = gerarPlanoPreImportacaoScrivener(dadosPlano);

      const nomeBase = 'PLANO_PRE_IMPORTACAO';
      let caminhoRelatorio = `${pastaEscolhida.path}/${nomeBase}.md`;
      let sufixo = 2;
      while (this.obsidianApp.vault.getAbstractFileByPath(caminhoRelatorio) !== null) {
        caminhoRelatorio = `${pastaEscolhida.path}/${nomeBase}-${sufixo}.md`;
        sufixo++;
      }

      await this.obsidianApp.vault.create(caminhoRelatorio, resultado.relatorioMarkdown);
      new Notice(`Plano de retorno Scrivener gerado: ${caminhoRelatorio}`);
    } catch (e) {
      new Notice('Não foi possível gerar o plano de retorno Scrivener.');
    }
  }

  private async lerArquivosMarkdownPacote(
    pasta: TFolder,
    pastaRaiz: string,
    arquivos: ArquivoScrivenerPreImportacao[],
  ): Promise<void> {
    for (const filho of pasta.children) {
      if (filho instanceof TFile && filho.extension === 'md') {
        const caminhoRelativo = filho.path.slice(pastaRaiz.length + 1);
        const conteudo = await this.obsidianApp.vault.read(filho);
        arquivos.push({ caminhoRelativo, conteudo });
      } else if (filho instanceof TFolder) {
        await this.lerArquivosMarkdownPacote(filho, pastaRaiz, arquivos);
      }
    }
  }

  private renderCronologiaProblemas(
    container: HTMLElement,
    problemas: readonly ProblemaCronologiaContrarius[],
  ): void {
    const details = container.createEl('details');
    applyStyles(details, { ...this.cardStyles(), marginTop: '16px' });

    const summary = details.createEl('summary');
    applyStyles(summary, { cursor: 'pointer', fontWeight: '600' });
    summary.appendText(`Problemas detectados (${problemas.length})`);

    const body = details.createDiv();
    applyStyles(body, { paddingTop: '10px' });

    let lastCodigo = '';
    for (const problema of problemas) {
      if (problema.codigo !== lastCodigo) {
        lastCodigo = problema.codigo;
        const groupHeading = body.createEl('h5', {
          text: rotuloProblemaCronologia(problema.codigo),
        });
        applyStyles(groupHeading, { margin: '12px 0 4px', color: 'var(--text-muted)', fontSize: '0.85em' });
      }

      const row = body.createDiv();
      const isError = problema.nivel === 'erro';
      applyStyles(row, {
        marginTop: '6px',
        padding: '8px 10px',
        borderRadius: '6px',
        borderLeft: `3px solid ${isError ? 'var(--text-error)' : 'var(--text-warning)'}`,
        background: 'var(--background-primary)',
      });

      const nivelSpan = row.createSpan({
        text: isError ? 'Erro' : 'Aviso',
      });
      applyStyles(nivelSpan, {
        fontSize: '0.72em',
        fontWeight: '600',
        textTransform: 'uppercase',
        color: isError ? 'var(--text-error)' : 'var(--text-warning)',
        marginRight: '8px',
      });

      row.appendText(problema.mensagem);

      const metaDiv = row.createDiv();
      applyStyles(metaDiv, { marginTop: '4px', fontSize: '0.85em', color: 'var(--text-muted)' });
      metaDiv.appendText(`Evento: ${problema.eventoId}`);
      if (problema.relacionados.length > 0) {
        metaDiv.appendText(` · Relacionados: ${problema.relacionados.join(', ')}`);
      }

      if (problema.filePath !== '') {
        const openBtn = row.createEl('button', { text: 'Abrir nota' });
        applyStyles(openBtn, { marginTop: '6px', fontSize: '0.85em' });
        openBtn.onclick = () => { void this.openFile(problema.filePath); };
      }
    }
  }
}
