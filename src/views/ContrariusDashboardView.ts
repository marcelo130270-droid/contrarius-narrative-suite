import { ItemView, Notice, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import StorytellerSuitePlugin from '../main';
import { indexarVaultContrarius, type IndiceContrarius } from '../contrarius/indexer';
import { validarIndiceContrarius } from '../contrarius/validator';
import { classificarColecaoContrariusPorCaminho } from '../contrarius/reader';
import { CAMPOS_AGRUPAVEIS, rotuloEntidade } from '../contrarius/agrupamento';
import { gerarScrivenerImportMarkdown } from '../contrarius/scrivener-export-minimo';
import { construirPlanoPacoteScrivener, nomePastaPacote } from '../contrarius/scrivener-package-plano';
import { verificarPacoteScrivener, type ArquivoLidoPacote, type RelatorioVerificacaoPacote } from '../contrarius/scrivener-package-verificacao';
import {
  gerarDossieConsciencias,
  gerarDossieEventos,
  gerarDossieLugares,
  gerarDossieRelacoes,
  gerarDossieRetrovidas,
  gerarIndiceEstruturado,
  gerarIndicePorLivro,
  gerarIndicePorPeriodo,
  gerarTimelineCronologica,
  gerarTimelineNarrativa,
} from '../contrarius/scrivener-export-estruturado';
import {
  calcularRenumeracaoOrdem,
  ordenarEventosParaTimeline,
  rotuloEvento,
  type ModoOrdenacaoTimeline,
  type ModoRenumeravel,
} from '../contrarius/timeline';
import type {
  AlertaContrarius,
  SeveridadeAlertaContrarius,
  TipoColecaoContrarius,
} from '../contrarius/types';

export const VIEW_TYPE_CONTRARIUS_DASHBOARD = 'contrarius-narrative-suite-dashboard';

const ORDEM_SEVERIDADE: SeveridadeAlertaContrarius[] = ['erro', 'aviso', 'info'];
const TODAS_SEVERIDADES: SeveridadeAlertaContrarius[] = ['erro', 'aviso', 'info'];
const COLECOES_FILTRAVEIS: TipoColecaoContrarius[] = ['consciencias', 'retrovidas', 'eventos', 'lugares', 'relacoes'];
const LIMITE_ALERTAS_EXIBIDOS = 50;

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
  private modoTimeline: ModoOrdenacaoTimeline = 'cronologica';
  private ultimaVerificacao: { pasta: string; relatorio: RelatorioVerificacaoPacote } | null = null;

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

  // Etapa 11: exportação mínima — um único arquivo, sem pacote/verificação (isso vem depois,
  // já com a lição aprendida de nunca depender de estado efêmero de modal).
  private async exportarParaScrivener(indice: IndiceContrarius): Promise<void> {
    const CAMINHO_EXPORT = 'scrivener-import.md';
    try {
      const conteudo = gerarScrivenerImportMarkdown(indice);
      const existente = this.app.vault.getAbstractFileByPath(CAMINHO_EXPORT);
      if (existente instanceof TFile) {
        await this.app.vault.modify(existente, conteudo);
      } else {
        await this.app.vault.create(CAMINHO_EXPORT, conteudo);
      }
      new Notice(`Exportado para ${CAMINHO_EXPORT}.`);
    } catch (erro) {
      new Notice(`Falha ao exportar: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  // Etapa 14, sub-fase 1: índice estruturado, sempre reescrito por completo em scrivener/index.md
  // (mesmo mecanismo simples de create/modify da Etapa 11 — dossiê e timeline vêm em sub-fases futuras).
  private async atualizarIndiceEstruturado(indice: IndiceContrarius): Promise<void> {
    const CAMINHO = 'scrivener/index.md';
    try {
      const conteudo = gerarIndiceEstruturado(indice);
      await this.garantirPastas(CAMINHO);
      const existente = this.app.vault.getAbstractFileByPath(CAMINHO);
      if (existente instanceof TFile) {
        await this.app.vault.modify(existente, conteudo);
      } else {
        await this.app.vault.create(CAMINHO, conteudo);
      }
      new Notice(`Índice estruturado atualizado em ${CAMINHO}.`);
    } catch (erro) {
      new Notice(`Falha ao atualizar índice: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  private async escreverOuAtualizarArquivo(caminho: string, conteudo: string): Promise<void> {
    await this.garantirPastas(caminho);
    const existente = this.app.vault.getAbstractFileByPath(caminho);
    if (existente instanceof TFile) {
      await this.app.vault.modify(existente, conteudo);
    } else {
      await this.app.vault.create(caminho, conteudo);
    }
  }

  // Etapa 14, sub-fase 2: timeline exportável. Dois arquivos sempre reescritos por completo.
  private async atualizarTimelineExportavel(indice: IndiceContrarius): Promise<void> {
    try {
      await this.escreverOuAtualizarArquivo('scrivener/timeline/cronologia.md', gerarTimelineCronologica(indice));
      await this.escreverOuAtualizarArquivo('scrivener/timeline/eventos.md', gerarTimelineNarrativa(indice));
      new Notice('Timeline exportável atualizada em scrivener/timeline/.');
    } catch (erro) {
      new Notice(`Falha ao atualizar timeline: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  // Etapa 14, sub-fase 3: dossiê por tipo — 5 arquivos, um por coleção.
  private async atualizarDossies(indice: IndiceContrarius): Promise<void> {
    try {
      await this.escreverOuAtualizarArquivo('scrivener/dossier/consciencias.md', gerarDossieConsciencias(indice));
      await this.escreverOuAtualizarArquivo('scrivener/dossier/retrovidas.md', gerarDossieRetrovidas(indice));
      await this.escreverOuAtualizarArquivo('scrivener/dossier/eventos.md', gerarDossieEventos(indice));
      await this.escreverOuAtualizarArquivo('scrivener/dossier/lugares.md', gerarDossieLugares(indice));
      await this.escreverOuAtualizarArquivo('scrivener/dossier/relacoes.md', gerarDossieRelacoes(indice));
      new Notice('Dossiês atualizados em scrivener/dossier/.');
    } catch (erro) {
      new Notice(`Falha ao atualizar dossiês: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  // Etapa 14, sub-fase 4 (última): índices por livro/período.
  private async atualizarIndicesPorCampo(indice: IndiceContrarius): Promise<void> {
    try {
      await this.escreverOuAtualizarArquivo('scrivener/indices/por-livro.md', gerarIndicePorLivro(indice));
      await this.escreverOuAtualizarArquivo('scrivener/indices/por-periodo.md', gerarIndicePorPeriodo(indice));
      new Notice('Índices por livro/período atualizados em scrivener/indices/.');
    } catch (erro) {
      new Notice(`Falha ao atualizar índices: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  // Renumera ordem_narrativa OU ordem_cronologica (mesmo botão/mecânica pros dois eixos) pra sequência
  // limpa 1,2,3..., respeitando a ordem atual — nunca mexe em num_reg/título/nome do arquivo. Eventos sem
  // o campo do modo escolhido ficam de fora (posição não decidida ainda). Usa fileManager.processFrontMatter
  // (API do Obsidian), não edição manual de texto.
  private async renumerarOrdem(indice: IndiceContrarius, modo: ModoRenumeravel): Promise<void> {
    const rotuloModo = modo === 'cronologica' ? 'Ordem cronológica' : 'Ordem narrativa';
    try {
      const { campoUsado } = ordenarEventosParaTimeline(indice.eventos, modo);
      const renumeracao = calcularRenumeracaoOrdem(indice.eventos, modo);
      if (renumeracao.length === 0) {
        new Notice(`Nenhum evento com ${campoUsado} preenchido — nada para renumerar.`);
        return;
      }
      let alterados = 0;
      for (const item of renumeracao) {
        if (item.valorAntigo === item.valorNovo) continue;
        const arquivo = this.app.vault.getAbstractFileByPath(item.path);
        if (!(arquivo instanceof TFile)) continue;
        await this.app.fileManager.processFrontMatter(arquivo, (fm) => {
          fm[campoUsado] = item.valorNovo;
        });
        alterados++;
      }
      new Notice(`${rotuloModo} renumerada: ${alterados} evento(s) alterado(s) de ${renumeracao.length} no total.`);
      await this.reindexarERenderizar();
    } catch (erro) {
      new Notice(`Falha ao renumerar: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  // Etapa 12: pacote com manifest/README/integridade. Nome de pasta com timestamp — nunca sobrescreve
  // um pacote anterior. Write simples e sequencial, sem estado de modal: se falhar no meio, a Notice de
  // erro mostra exatamente onde parou, e o pacote parcial fica no disco pra inspeção (não é escondido).
  private async exportarPacoteScrivener(indice: IndiceContrarius): Promise<void> {
    const pasta = nomePastaPacote(new Date());
    try {
      const plano = construirPlanoPacoteScrivener(indice);
      for (const arquivo of plano) {
        const caminhoCompleto = `${pasta}/${arquivo.caminhoRelativo}`;
        await this.garantirPastas(caminhoCompleto);
        await this.app.vault.create(caminhoCompleto, arquivo.conteudo);
      }
      new Notice(`Pacote Scrivener exportado em ${pasta}/.`);
    } catch (erro) {
      new Notice(`Falha ao exportar pacote (parou em ${pasta}/): ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  private async garantirPastas(caminhoArquivo: string): Promise<void> {
    const segmentos = caminhoArquivo.split('/');
    segmentos.pop();
    let acumulado = '';
    for (const segmento of segmentos) {
      acumulado = acumulado ? `${acumulado}/${segmento}` : segmento;
      if (!this.app.vault.getAbstractFileByPath(acumulado)) {
        await this.app.vault.createFolder(acumulado);
      }
    }
  }

  // Etapa 13: Verify redesenhado. Regra que quebrou antes: nunca depender de estado em memória de
  // modal. Aqui não há modal nenhum — cada clique relê tudo do disco, do zero, mesmo que tenha
  // acabado de exportar na mesma sessão.
  private encontrarPastaPacoteMaisRecente(): string | null {
    const raiz = this.app.vault.getAbstractFileByPath('scrivener-package');
    if (!(raiz instanceof TFolder)) return null;
    const pastas = raiz.children.filter((f): f is TFolder => f instanceof TFolder).map((f) => f.path);
    if (pastas.length === 0) return null;
    return [...pastas].sort().at(-1)!;
  }

  private async lerArquivosPacote(pasta: string): Promise<ArquivoLidoPacote[]> {
    const caminhos = ['manifest.json', 'scrivener-import.md', 'README.md', 'integrity/report.json'];
    const resultado: ArquivoLidoPacote[] = [];
    for (const caminhoRelativo of caminhos) {
      const arquivo = this.app.vault.getAbstractFileByPath(`${pasta}/${caminhoRelativo}`);
      const conteudo = arquivo instanceof TFile ? await this.app.vault.read(arquivo) : null;
      resultado.push({ caminhoRelativo, conteudo });
    }
    return resultado;
  }

  private async verificarUltimoPacote(): Promise<void> {
    new Notice('Verificando pacote Scrivener...');
    try {
      const pasta = this.encontrarPastaPacoteMaisRecente();
      if (!pasta) {
        this.ultimaVerificacao = {
          pasta: '(nenhuma)',
          relatorio: {
            pacoteEncontrado: false,
            manifestoValido: false,
            itens: [],
            resumo: 'Nenhuma pasta scrivener-package/ encontrada no Vault. Exporte um pacote primeiro.',
          },
        };
        new Notice(this.ultimaVerificacao.relatorio.resumo);
        this.renderizar();
        return;
      }
      const arquivos = await this.lerArquivosPacote(pasta);
      const relatorio = verificarPacoteScrivener(arquivos);
      this.ultimaVerificacao = { pasta, relatorio };
      new Notice(relatorio.resumo);
      this.renderizar();
    } catch (erro) {
      new Notice(`Erro ao verificar: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  private renderizarVerificacao(container: HTMLElement): void {
    if (!this.ultimaVerificacao) return;
    const { pasta, relatorio } = this.ultimaVerificacao;

    const secao = container.createDiv({ cls: 'contrarius-dashboard-verificacao' });
    secao.createEl('h3', { text: 'Verificação do pacote Scrivener' });
    secao.createEl('p', { text: `Pasta: ${pasta}` });
    secao.createEl('p', { text: relatorio.resumo });

    if (relatorio.itens.length === 0) return;

    const lista = secao.createEl('ul');
    for (const item of relatorio.itens) {
      const li = lista.createEl('li', { cls: `contrarius-verificacao-${item.status}` });
      li.createEl('code', { text: item.caminhoRelativo });
      li.createSpan({ text: ` — ${item.status}${item.detalhe ? `: ${item.detalhe}` : ''}` });
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

    const botaoExportar = botoes.createEl('button', { text: 'Exportar para Scrivener' });
    botaoExportar.addEventListener('click', () => void this.exportarParaScrivener(indice));

    const botaoExportarPacote = botoes.createEl('button', { text: 'Exportar pacote Scrivener' });
    botaoExportarPacote.addEventListener('click', () => void this.exportarPacoteScrivener(indice));

    const botaoVerificar = botoes.createEl('button', { text: 'Verificar último pacote' });
    botaoVerificar.addEventListener('click', () => void this.verificarUltimoPacote());

    const botaoIndiceEstruturado = botoes.createEl('button', { text: 'Atualizar índice estruturado' });
    botaoIndiceEstruturado.addEventListener('click', () => void this.atualizarIndiceEstruturado(indice));

    const botaoTimeline = botoes.createEl('button', { text: 'Atualizar timeline exportável' });
    botaoTimeline.addEventListener('click', () => void this.atualizarTimelineExportavel(indice));

    const botaoDossies = botoes.createEl('button', { text: 'Atualizar dossiês' });
    botaoDossies.addEventListener('click', () => void this.atualizarDossies(indice));

    const botaoIndicesCampo = botoes.createEl('button', { text: 'Atualizar índices por livro/período' });
    botaoIndicesCampo.addEventListener('click', () => void this.atualizarIndicesPorCampo(indice));

    const botaoRenumerarNarrativa = botoes.createEl('button', { text: 'Renumerar ordem narrativa' });
    botaoRenumerarNarrativa.addEventListener('click', () => void this.renumerarOrdem(indice, 'narrativa'));

    const botaoRenumerarCronologica = botoes.createEl('button', { text: 'Renumerar ordem cronológica' });
    botaoRenumerarCronologica.addEventListener('click', () => void this.renumerarOrdem(indice, 'cronologica'));

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

    this.renderizarVisoes(container, indice);
    this.renderizarTimeline(container, indice);
    this.renderizarAlertas(container);
    this.renderizarVerificacao(container);
  }

  private renderizarAlertas(container: HTMLElement): void {
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
    const opcaoCronologica = seletor.createEl('option', { text: 'Ordem cronológica (ordem_cronologica)', value: 'cronologica' });
    const opcaoNarrativa = seletor.createEl('option', { text: 'Ordem narrativa (ordem_narrativa)', value: 'narrativa' });
    const opcaoEscrita = seletor.createEl('option', { text: 'Ordem de escrita (num_reg)', value: 'escrita' });
    const opcaoAtual = { cronologica: opcaoCronologica, narrativa: opcaoNarrativa, escrita: opcaoEscrita }[this.modoTimeline];
    opcaoAtual.selected = true;
    seletor.addEventListener('change', () => {
      this.modoTimeline = seletor.value as ModoOrdenacaoTimeline;
      this.renderizar();
    });

    const { comData, semData, campoUsado: chaveOrdenacao } = ordenarEventosParaTimeline(indice.eventos, this.modoTimeline);
    // data_inicio/data_textual são só informativos em todo modo (não usados pra ordenar em nenhum dos
    // três) — mostrados numa coluna à parte pra dar contexto, ver CLAUDE.md, decisão de 2026-08-03.
    // Eventos sem posição decidida (ordem_cronologica/ordem_narrativa vazios) entram no início da
    // listagem, em vez de ficarem de fora, pra serem fáceis de identificar e preencher — nos modos
    // cronológico e narrativo. No modo de escrita não se aplica (num_reg é obrigatório, sempre
    // preenchido). calcularRenumeracaoOrdem continua ignorando esses eventos, então "Renumerar" não
    // atribui número a eles (ver CLAUDE.md, decisão de 2026-08-03).
    const semOrdemNoTopo = this.modoTimeline !== 'escrita';
    const semPosicao = semOrdemNoTopo ? semData : [];
    const linhasTabela = [...semPosicao, ...comData];
    const semDataRestante = semOrdemNoTopo ? [] : semData;

    if (linhasTabela.length === 0) {
      secao.createEl('p', { text: 'Nenhum evento com dados suficientes para esta ordem.' });
    } else {
      const tabela = secao.createEl('table', { cls: 'contrarius-dashboard-timeline-tabela' });
      const cabecalho = tabela.createEl('tr');
      cabecalho.createEl('th', { text: 'Ordem', cls: 'contrarius-dashboard-timeline-col-ordem' });
      cabecalho.createEl('th', { text: 'num_reg', cls: 'contrarius-dashboard-timeline-col-num-reg' });
      cabecalho.createEl('th', { text: 'Parte', cls: 'contrarius-dashboard-timeline-col-parte' });
      cabecalho.createEl('th', { text: 'Evento', cls: 'contrarius-dashboard-timeline-col-evento' });
      cabecalho.createEl('th', { text: 'Data', cls: 'contrarius-dashboard-timeline-col-data' });
      cabecalho.createEl('th', { text: 'Livro', cls: 'contrarius-dashboard-timeline-col-livro' });
      for (const evento of linhasTabela) {
        const linha = tabela.createEl('tr');
        linha.createEl('td', { text: (evento[chaveOrdenacao] as string) ?? '', cls: 'contrarius-dashboard-timeline-col-ordem' });
        linha.createEl('td', { text: evento.num_reg ?? '', cls: 'contrarius-dashboard-timeline-col-num-reg' });
        linha.createEl('td', { text: evento.parte?.join(', ') ?? '', cls: 'contrarius-dashboard-timeline-col-parte' });
        const celulaEvento = linha.createEl('td', { cls: 'contrarius-dashboard-timeline-col-evento' });
        const link = celulaEvento.createEl('code', { text: rotuloEvento(evento), cls: 'contrarius-dashboard-caminho' });
        link.addEventListener('click', () => void this.abrirNota(evento.path));
        linha.createEl('td', { text: evento.data_textual ?? evento.data_inicio ?? '', cls: 'contrarius-dashboard-timeline-col-data' });
        linha.createEl('td', { text: evento.livro ?? '', cls: 'contrarius-dashboard-timeline-col-livro' });
      }
    }

    if (semDataRestante.length > 0) {
      secao.createEl('p', {
        cls: 'contrarius-dashboard-contagem',
        text: `${semDataRestante.length} evento(s) sem "${chaveOrdenacao}" — não entram nesta ordenação.`,
      });
    }
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }
}
