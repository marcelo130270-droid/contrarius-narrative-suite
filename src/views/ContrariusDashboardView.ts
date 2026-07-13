import { ItemView, Notice, WorkspaceLeaf } from 'obsidian';
import StorytellerSuitePlugin from '../main';
import { indexarVaultContrarius, type IndiceContrarius } from '../contrarius/indexer';
import { validarIndiceContrarius } from '../contrarius/validator';
import type { AlertaContrarius, SeveridadeAlertaContrarius } from '../contrarius/types';

export const VIEW_TYPE_CONTRARIUS_DASHBOARD = 'contrarius-narrative-suite-dashboard';

const ORDEM_SEVERIDADE: SeveridadeAlertaContrarius[] = ['erro', 'aviso', 'info'];
const LIMITE_ALERTAS_EXIBIDOS = 50;

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
      const texto = montarRelatorioTexto(indice, this.alertas);
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
    secaoAlertas.createEl('h3', { text: `Alertas (${this.alertas.length})` });

    if (this.alertas.length === 0) {
      secaoAlertas.createEl('p', { text: 'Nenhum alerta encontrado.' });
      return;
    }

    const alertasOrdenados = [...this.alertas].sort(
      (a, b) => ORDEM_SEVERIDADE.indexOf(a.severidade) - ORDEM_SEVERIDADE.indexOf(b.severidade),
    );

    const lista = secaoAlertas.createEl('ul');
    for (const alerta of alertasOrdenados.slice(0, LIMITE_ALERTAS_EXIBIDOS)) {
      const item = lista.createEl('li', { cls: `contrarius-alerta-${alerta.severidade}` });
      const campo = alerta.campo ? ` [${alerta.campo}]` : '';
      item.createEl('code', { text: alerta.path });
      item.createSpan({ text: `${campo}: ${alerta.mensagem}` });
    }

    if (this.alertas.length > LIMITE_ALERTAS_EXIBIDOS) {
      secaoAlertas.createEl('p', {
        text: `... e mais ${this.alertas.length - LIMITE_ALERTAS_EXIBIDOS} alerta(s). Use "Copiar relatório" para ver a lista completa.`,
      });
    }
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }
}
