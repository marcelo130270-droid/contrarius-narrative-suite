import { ItemView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import StorytellerSuitePlugin from '../main';
import { indexarVaultContrarius, type IndiceContrarius } from '../contrarius/indexer';
import { validarIndiceContrarius } from '../contrarius/validator';
import { classificarColecaoContrariusPorCaminho } from '../contrarius/reader';
import { CAMPOS_AGRUPAVEIS, type EntidadeAgrupavel } from '../contrarius/agrupamento';
import type {
  AlertaContrarius,
  Evento,
  SeveridadeAlertaContrarius,
  TipoColecaoContrarius,
} from '../contrarius/types';

export const VIEW_TYPE_CONTRARIUS_DASHBOARD = 'contrarius-narrative-suite-dashboard';

const ORDEM_SEVERIDADE: SeveridadeAlertaContrarius[] = ['erro', 'aviso', 'info'];
const TODAS_SEVERIDADES: SeveridadeAlertaContrarius[] = ['erro', 'aviso', 'info'];
const COLECOES_FILTRAVEIS: TipoColecaoContrarius[] = ['consciencias', 'retrovidas', 'eventos', 'lugares', 'relacoes'];
const LIMITE_ALERTAS_EXIBIDOS = 50;

function rotuloEntidade(item: EntidadeAgrupavel): string {
  if ('titulo' in item && item.titulo) return item.titulo;
  if ('nomes' in item && item.nomes && item.nomes.length > 0) return item.nomes[0];
  if ('nome_atual' in item && item.nome_atual) return item.nome_atual;
  const segmento = item.path.split('/').pop() ?? item.path;
  return segmento.endsWith('.md') ? segmento.slice(0, -3) : segmento;
}

type ModoTimeline = 'cronologica' | 'narrativa';

function rotuloEvento(evento: Evento): string {
  return evento.titulo || evento.codigo || rotuloEntidade(evento);
}

const ROTULO_COLECAO: Record<TipoColecaoContrarius, string> = {
  consciencias: 'Consciências',
  retrovidas: 'Retrovidas',
  eventos: 'Eventos',
  lugares: 'Lugares',
  relacoes: 'Relações',
  grupos: 'Grupos',
  objetos: 'Objetos',
  notas: 'Notas',
};

function montarRelatorioTexto(indice: IndiceContrarius, alertas: AlertaContrarius[]): string {
  const linhas: string[] = [];
  linhas.push('Contrarius Narrative Suite — Relatório do Vault');
  linhas.push('');
  linhas.push(`Consciências: ${indice.consciencias.length}`);
  linhas.push(`Retrovidas: ${indice.retrovidas.length}`);
  linhas.push(`Eventos: ${indice.eventos.length}`);
  linhas.push(`Lugares: ${indice.lugares.length}`);
  linhas.push(`Relações: ${indice.relacoes.length}`);
  linhas.push('');
  linhas.push(`Alertas (${alertas.length}):`);
  for (const alerta of alertas) {
    const campo = alerta.campo ? ` [${alerta.campo}]` : '';
    linhas.push(`- (${alerta.severidade}) ${alerta.path}${campo}: ${alerta.mensagem}`);
  }
  return linhas.join('\n');
}

export class ContrariusDashboardView extends ItemView {
  plugin: StorytellerSuitePlugin;
  private indice: IndiceContrarius | null = null;
  private alertas: AlertaContrarius[] = [];
  private filtroSeveridades: Set<SeveridadeAlertaContrarius> = new Set(TODAS_SEVERIDADES);
  private filtroColecoes: Set<TipoColecaoContrarius> = new Set(COLECOES_FILTRAVEIS);
  private dimensaoVisao: string = CAMPOS_AGRUPAVEIS[0].chave;
  private modoTimeline: ModoTimeline = 'cronologica';

  constructor(leaf: WorkspaceLeaf, plugin: StorytellerSuitePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CONTRARIUS_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Contrarius Dashboard';
  }

  getIcon(): string {
    return 'list-checks';
  }

  async onOpen(): Promise<void> {
    await this.reindexarERenderizar();
  }

  private async reindexarERenderizar(): Promise<void> {
    try {
      this.indice = await indexarVaultContrarius(this.app.vault, this.app.metadataCache);
      this.alertas = [...this.indice.alertas, ...validarIndiceContrarius(this.indice)];
    } catch (erro) {
      this.indice = null;
      this.alertas = [];
      this.renderizarErroFatal(erro);
      return;
    }
    this.renderizar();
  }

  private renderizarErroFatal(erro: unknown): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.createEl('h2', { text: 'Contrarius Dashboard' });
    container.createEl('p', {
      text: `Falha ao indexar o Vault: ${erro instanceof Error ? erro.message : String(erro)}`,
    });
  }

  private alertasFiltrados(): AlertaContrarius[] {
    return this.alertas.filter((alerta) => {
      if (!this.filtroSeveridades.has(alerta.severidade)) return false;
      const colecao = classificarColecaoContrariusPorCaminho(alerta.path);
      if (colecao === null) return true;
      if (!COLECOES_FILTRAVEIS.includes(colecao)) return true;
      return this.filtroColecoes.has(colecao);
    });
  }

  private async abrirNota(path: string): Promise<void> {
    const arquivo = this.app.vault.getAbstractFileByPath(path);
    if (arquivo instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(arquivo);
    } else {
      new Notice(`Não encontrei a nota: ${path}`);
    }
  }

  private renderizar(): void {
    const indice = this.indice;
    if (!indice) return;

    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('contrarius-dashboard-view');

    const header = container.createDiv({ cls: 'contrarius-dashboard-header' });
    header.createEl('h2', { text: 'Contrarius Dashboard' });

    const botoes = header.createDiv({ cls: 'contrarius-dashboard-botoes' });
    const botaoReindexar = botoes.createEl('button', { text: 'Reindexar' });
    botaoReindexar.addEventListener('click', () => void this.reindexarERenderizar());

    const botaoCopiar = botoes.createEl('button', { text: 'Copiar relatório' });
    botaoCopiar.addEventListener('click', () => {
      const texto = montarRelatorioTexto(indice, this.alertasFiltrados());
      void navigator.clipboard.writeText(texto).then(
        () => new Notice('Relatório Contrarius copiado.'),
        () => new Notice('Não foi possível copiar o relatório.'),
      );
    });

    const resumo = container.createDiv({ cls: 'contrarius-dashboard-resumo' });
    const totais: Array<[string, number]> = [
      ['Consciências', indice.consciencias.length],
      ['Retrovidas', indice.retrovidas.length],
      ['Eventos', indice.eventos.length],
      ['Lugares', indice.lugares.length],
      ['Relações', indice.relacoes.length],
    ];
    for (const [rotulo, total] of totais) {
      const item = resumo.createDiv({ cls: 'contrarius-dashboard-resumo-item' });
      item.createEl('strong', { text: String(total) });
      item.createEl('span', { text: rotulo });
    }

    const secaoAlertas = container.createDiv({ cls: 'contrarius-dashboard-alertas' });
    secaoAlertas.createEl('h3', { text: 'Alertas' });

    const filtros = secaoAlertas.createDiv({ cls: 'contrarius-dashboard-filtros' });

    const grupoSeveridade = filtros.createDiv({ cls: 'contrarius-dashboard-filtro-grupo' });
    grupoSeveridade.createEl('span', { text: 'Severidade: ', cls: 'contrarius-dashboard-filtro-rotulo' });
    for (const severidade of TODAS_SEVERIDADES) {
      const label = grupoSeveridade.createEl('label', { cls: 'contrarius-dashboard-filtro-item' });
      const checkbox = label.createEl('input', { type: 'checkbox' });
      checkbox.checked = this.filtroSeveridades.has(severidade);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) this.filtroSeveridades.add(severidade);
        else this.filtroSeveridades.delete(severidade);
        this.renderizar();
      });
      label.createSpan({ text: severidade });
    }

    const grupoColecao = filtros.createDiv({ cls: 'contrarius-dashboard-filtro-grupo' });
    grupoColecao.createEl('span', { text: 'Tipo: ', cls: 'contrarius-dashboard-filtro-rotulo' });
    for (const colecao of COLECOES_FILTRAVEIS) {
      const label = grupoColecao.createEl('label', { cls: 'contrarius-dashboard-filtro-item' });
      const checkbox = label.createEl('input', { type: 'checkbox' });
      checkbox.checked = this.filtroColecoes.has(colecao);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) this.filtroColecoes.add(colecao);
        else this.filtroColecoes.delete(colecao);
        this.renderizar();
      });
      label.createSpan({ text: ROTULO_COLECAO[colecao] });
    }

    const alertasFiltrados = this.alertasFiltrados();
    secaoAlertas.createEl('p', {
      cls: 'contrarius-dashboard-contagem',
      text: `${alertasFiltrados.length} de ${this.alertas.length} alerta(s) exibido(s).`,
    });

    if (alertasFiltrados.length === 0) {
      secaoAlertas.createEl('p', { text: 'Nenhum alerta com os filtros atuais.' });
      return;
    }

    const alertasOrdenados = [...alertasFiltrados].sort(
      (a, b) => ORDEM_SEVERIDADE.indexOf(a.severidade) - ORDEM_SEVERIDADE.indexOf(b.severidade),
    );

    const lista = secaoAlertas.createEl('ul');
    for (const alerta of alertasOrdenados.slice(0, LIMITE_ALERTAS_EXIBIDOS)) {
      const item = lista.createEl('li', { cls: `contrarius-alerta-${alerta.severidade}` });
      const campo = alerta.campo ? ` [${alerta.campo}]` : '';
      const link = item.createEl('code', { text: alerta.path, cls: 'contrarius-dashboard-caminho' });
      link.addEventListener('click', () => void this.abrirNota(alerta.path));
      item.createSpan({ text: `${campo}: ${alerta.mensagem}` });
    }

    if (alertasFiltrados.length > LIMITE_ALERTAS_EXIBIDOS) {
      secaoAlertas.createEl('p', {
        text: `... e mais ${alertasFiltrados.length - LIMITE_ALERTAS_EXIBIDOS} alerta(s). Use "Copiar relatório" para ver a lista completa.`,
      });
    }

    this.renderizarVisoes(container, indice);
    this.renderizarTimeline(container, indice);
  }

  private renderizarVisoes(container: HTMLElement, indice: IndiceContrarius): void {
    const secaoVisoes = container.createDiv({ cls: 'contrarius-dashboard-visoes' });
    secaoVisoes.createEl('h3', { text: 'Visões narrativas' });

    const seletor = secaoVisoes.createEl('select');
    for (const campo of CAMPOS_AGRUPAVEIS) {
      const opcao = seletor.createEl('option', { text: campo.rotulo, value: campo.chave });
      if (campo.chave === this.dimensaoVisao) opcao.selected = true;
    }
    seletor.addEventListener('change', () => {
      this.dimensaoVisao = seletor.value;
      this.renderizar();
    });

    const campoSelecionado = CAMPOS_AGRUPAVEIS.find((c) => c.chave === this.dimensaoVisao) ?? CAMPOS_AGRUPAVEIS[0];
    const mapa = campoSelecionado.extrair(indice);

    if (mapa.size === 0) {
      secaoVisoes.createEl('p', { text: 'Nenhum dado para esta visão.' });
      return;
    }

    const chaves = [...mapa.keys()].sort((a, b) => a.localeCompare(b));
    for (const chave of chaves) {
      const itens = mapa.get(chave) ?? [];
      const detalhes = secaoVisoes.createEl('details', { cls: 'contrarius-dashboard-visao-grupo' });
      detalhes.createEl('summary', { text: `${chave} (${itens.length})` });
      const lista = detalhes.createEl('ul');
      const itensOrdenados = [...itens].sort((a, b) => rotuloEntidade(a).localeCompare(rotuloEntidade(b)));
      for (const item of itensOrdenados) {
        const li = lista.createEl('li');
        const link = li.createEl('code', { text: rotuloEntidade(item), cls: 'contrarius-dashboard-caminho' });
        link.addEventListener('click', () => void this.abrirNota(item.path));
      }
    }
  }

  private renderizarTimeline(container: HTMLElement, indice: IndiceContrarius): void {
    const secao = container.createDiv({ cls: 'contrarius-dashboard-timeline' });
    secao.createEl('h3', { text: 'Timeline' });

    const seletor = secao.createEl('select');
    const opcaoCronologica = seletor.createEl('option', { text: 'Ordem cronológica (data_inicio)', value: 'cronologica' });
    const opcaoNarrativa = seletor.createEl('option', { text: 'Ordem narrativa (ano_ordem)', value: 'narrativa' });
    (this.modoTimeline === 'cronologica' ? opcaoCronologica : opcaoNarrativa).selected = true;
    seletor.addEventListener('change', () => {
      this.modoTimeline = seletor.value as ModoTimeline;
      this.renderizar();
    });

    const chaveOrdenacao = this.modoTimeline === 'cronologica' ? 'data_inicio' : 'ano_ordem';
    const comData = indice.eventos.filter((e) => e[chaveOrdenacao]);
    const semData = indice.eventos.filter((e) => !e[chaveOrdenacao]);

    comData.sort((a, b) => {
      const va = a[chaveOrdenacao] as string;
      const vb = b[chaveOrdenacao] as string;
      const na = Number(va);
      const nb = Number(vb);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return va.localeCompare(vb);
    });

    if (comData.length === 0) {
      secao.createEl('p', { text: 'Nenhum evento com dados suficientes para esta ordem.' });
    } else {
      const tabela = secao.createEl('table', { cls: 'contrarius-dashboard-timeline-tabela' });
      const cabecalho = tabela.createEl('tr');
      cabecalho.createEl('th', { text: this.modoTimeline === 'cronologica' ? 'Data' : 'Ordem' });
      cabecalho.createEl('th', { text: 'Evento' });
      cabecalho.createEl('th', { text: 'Livro' });
      for (const evento of comData) {
        const linha = tabela.createEl('tr');
        linha.createEl('td', { text: (evento[chaveOrdenacao] as string) ?? '' });
        const celulaEvento = linha.createEl('td');
        const link = celulaEvento.createEl('code', { text: rotuloEvento(evento), cls: 'contrarius-dashboard-caminho' });
        link.addEventListener('click', () => void this.abrirNota(evento.path));
        linha.createEl('td', { text: evento.livro ?? '' });
      }
    }

    if (semData.length > 0) {
      secao.createEl('p', {
        cls: 'contrarius-dashboard-contagem',
        text: `${semData.length} evento(s) sem "${chaveOrdenacao}" — não entram nesta ordenação.`,
      });
    }
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }
}
