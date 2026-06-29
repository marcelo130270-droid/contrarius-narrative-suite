import {
  App,
  ItemView,
  Notice,
  parseYaml,
  setIcon,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import { indexarContrarius } from './indexer';
import type {
  Consciencia,
  ContrariusIndex,
  Evento,
  IndexError,
  Lugar,
  Relacao,
  Retrovida,
} from './types';
import {
  agruparRetrovidasPorConsciencia,
  construirResumo,
  filtrarConsciencias,
  filtrarEventos,
  filtrarLugares,
  filtrarRelacoes,
  filtrarRetrovidas,
  nomeConsciencia,
  nomeEvento,
  nomeLugar,
  nomeRelacao,
  nomeRetrovida,
  type ContrariusDashboardTab,
} from './dashboard-model';

export const VIEW_TYPE_CONTRARIUS_DASHBOARD = 'contrarius-knowledge-dashboard';

const TAB_LABELS: ReadonlyArray<{ id: ContrariusDashboardTab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'consciencias', label: 'Consciências' },
  { id: 'retrovidas', label: 'Retrovidas' },
  { id: 'eventos', label: 'Eventos' },
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

export class ContrariusDashboardView extends ItemView {
  private readonly obsidianApp: App;
  private currentIndex: ContrariusIndex | null = null;
  private activeTab: ContrariusDashboardTab = 'resumo';
  private query = '';
  private loading = false;
  private lastIndexedAt: Date | null = null;
  private refreshTimer: number | null = null;
  private dashboardContentEl: HTMLElement | null = null;

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
      case 'consciencias': this.renderConsciencias(this.dashboardContentEl, this.currentIndex); break;
      case 'retrovidas': this.renderRetrovidas(this.dashboardContentEl, this.currentIndex); break;
      case 'eventos': this.renderEventos(this.dashboardContentEl, this.currentIndex); break;
      case 'lugares': this.renderLugares(this.dashboardContentEl, this.currentIndex); break;
      case 'relacoes': this.renderRelacoes(this.dashboardContentEl, this.currentIndex); break;
      case 'erros': this.renderErros(this.dashboardContentEl, this.currentIndex.erros); break;
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
    refresh.disabled = this.loading;
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
      applyStyles(button, {
        whiteSpace: 'nowrap',
        background: this.activeTab === tab.id ? 'var(--interactive-accent)' : '',
        color: this.activeTab === tab.id ? 'var(--text-on-accent)' : '',
      });
      button.onclick = () => {
        this.activeTab = tab.id;
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

    const cards: ReadonlyArray<[string, number, ContrariusDashboardTab]> = [
      ['Consciências', resumo.consciencias, 'consciencias'],
      ['Retrovidas', resumo.retrovidas, 'retrovidas'],
      ['Eventos', resumo.eventos, 'eventos'],
      ['Lugares', resumo.lugares, 'lugares'],
      ['Relações', resumo.relacoes, 'relacoes'],
      ['Erros', resumo.erros, 'erros'],
    ];

    for (const [label, value, tab] of cards) {
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
      `${resumo.totalEntidades} entidades indexadas. ${resumo.avisos} avisos internos e ${resumo.erros} erros de indexação. Nenhum arquivo é modificado por esta tela.`,
    );
  }

  private renderConsciencias(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarConsciencias(index.consciencias, this.query);
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
      summary.setText(`${nomeConsciencia(item)} · ${item.id} · ${lives.length} retrovida(s)`);

      const body = details.createDiv();
      applyStyles(body, { paddingTop: '10px' });
      this.renderMetadata(body, [
        ['Identidade extrafísica', item.identExtraf || '—'],
        ['Núcleos geográficos', joinValues(item.nucleoGeo)],
        ['Grupocarma', joinValues(item.grupocarma)],
      ]);
      this.renderOpenButton(body, item.filePath);

      if (lives.length > 0) {
        const heading = body.createEl('h4', { text: 'Retrovidas' });
        applyStyles(heading, { margin: '14px 0 6px' });
        for (const life of lives) {
          this.renderCompactRow(
            body,
            nomeRetrovida(life),
            `${life.vida || 'vida não informada'} · ${formatYear(life.nascimento)}–${formatYear(life.morte)}`,
            life.filePath,
          );
        }
      }
    }
  }

  private renderRetrovidas(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarRetrovidas(index.retrovidas, this.query);
    this.renderSectionTitle(container, 'Retrovidas', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => {
      if (a.nascimento !== null && b.nascimento !== null && a.nascimento !== b.nascimento) {
        return a.nascimento - b.nascimento;
      }
      return nomeRetrovida(a).localeCompare(nomeRetrovida(b), 'pt-BR');
    });
    for (const item of sorted) {
      this.renderEntityCard(container, nomeRetrovida(item), item.id, item.filePath, [
        ['Consciência', item.conscId || '—'],
        ['Vida', item.vida || '—'],
        ['Período', joinValues(item.periodo)],
        ['Nascimento / morte', `${formatYear(item.nascimento)} / ${formatYear(item.morte)}`],
        ['Livro', joinValues(item.livro)],
      ]);
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
      this.renderEntityCard(container, nomeEvento(item), item.id, item.filePath, [
        ['Ano de ordem', formatYear(item.anoOrdem)],
        ['Data', item.dataTextual || item.data || item.dataInicio || '—'],
        ['Local', joinValues(item.local)],
        ['Participantes', joinValues(item.participantes)],
        ['Livro', joinValues(item.livro)],
      ]);
    }
  }

  private renderLugares(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarLugares(index.lugares, this.query);
    this.renderSectionTitle(container, 'Lugares', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => nomeLugar(a).localeCompare(nomeLugar(b), 'pt-BR'));
    for (const item of sorted) {
      this.renderEntityCard(container, nomeLugar(item), item.id, item.filePath, [
        ['Nome atual', item.nomeAtual || '—'],
        ['Nomes históricos', joinValues(item.nomesHistoricos)],
        ['Região atual', item.regiaoAtual || '—'],
        ['País atual', item.paisAtual || '—'],
        ['Coordenadas', item.coordenadasGoogleEarth || item.coordenadas || '—'],
      ]);
    }
  }

  private renderRelacoes(container: HTMLElement, index: ContrariusIndex): void {
    const items = filtrarRelacoes(index.relacoes, this.query);
    this.renderSectionTitle(container, 'Relações', items.length);
    if (items.length === 0) return this.renderEmpty(container);
    const sorted = [...items].sort((a, b) => nomeRelacao(a).localeCompare(nomeRelacao(b), 'pt-BR'));
    for (const item of sorted) {
      this.renderEntityCard(container, nomeRelacao(item), item.id, item.filePath, [
        ['Consciência 1', item.consciencia1 || '—'],
        ['Consciência 2', item.consciencia2 || '—'],
        ['Tipo', joinValues(item.tipoRelacao)],
        ['Intensidade', item.intensidade || '—'],
        ['Estado', item.estado || '—'],
      ]);
    }
  }

  private renderErros(container: HTMLElement, errors: readonly IndexError[]): void {
    this.renderSectionTitle(container, 'Diagnóstico', errors.length);
    if (errors.length === 0) {
      const ok = container.createDiv({ text: 'Nenhum erro de indexação encontrado.' });
      applyStyles(ok, { color: 'var(--text-success)', padding: '12px 0' });
      return;
    }
    for (const error of errors) {
      const card = container.createDiv();
      applyStyles(card, {
        ...this.cardStyles(),
        borderLeft: '3px solid var(--text-error)',
      });
      const message = card.createEl('strong', { text: error.mensagem });
      applyStyles(message, { display: 'block' });
      const path = card.createDiv({ text: error.filePath || 'Sem caminho associado' });
      applyStyles(path, { color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9em' });
      if (error.filePath) this.renderOpenButton(card, error.filePath);
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
  ): void {
    const card = container.createDiv();
    applyStyles(card, this.cardStyles());
    const heading = card.createEl('h4', { text: title });
    applyStyles(heading, { margin: '0 0 3px' });
    const identifier = card.createDiv({ text: id });
    applyStyles(identifier, { color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '9px' });
    this.renderMetadata(card, metadata);
    this.renderOpenButton(card, filePath);
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
}
