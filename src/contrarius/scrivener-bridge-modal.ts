import { App, Modal, Notice, Setting } from 'obsidian';
import { ScrivenerBridgeService } from './scrivener-bridge-service';
import type { ResultadoPlanoEscritaPacoteScrivenerOperacional } from './scrivener-bridge-service';
import type { ContextoManifestoScrivenerOperacional } from './scrivener-package-manifest-factory';
import type { FiltrosPayloadScrivener } from './scrivener-payload-filter-model';
import type { DataAdapterEscritaScrivenerLike, DataAdapterLeituraScrivenerLike } from './scrivener-obsidian-write-adapter';
import { FILTROS_PAYLOAD_SCRIVENER_VAZIOS, estadoFiltrosPayloadScrivenerParaFiltros } from './scrivener-payload-filter-settings-model';
import {
    MENSAGEM_PACOTE_NAO_ENCONTRADO,
    verificarPacoteScrivenerMaisRecente,
} from './scrivener-latest-package-verification-model';
import type { EntradaArquivoPacoteScrivener } from './scrivener-latest-package-verification-model';

interface DataAdapterListagemScrivenerLike {
    list(caminho: string): Promise<{ files: string[]; folders: string[] }>;
    exists(caminho: string): Promise<boolean>;
    read(caminho: string): Promise<string>;
}

const DIRETORIO_PACOTES = 'contrarius-scrivener-packages';

const ARQUIVOS_OBRIGATORIOS_VERIFICACAO = [
    'manifest.json',
    'payload/index.json',
    'README.md',
    'integrity/report.json',
    'scrivener-import.md',
    'scrivener/index.md',
];

const ARQUIVOS_OPCIONAIS_VERIFICACAO = [
    'scrivener/timeline/eventos.md',
    'scrivener/timeline/cronologia.md',
];

export class ScrivenerBridgeModal extends Modal {
  private statusEl: HTMLElement | null = null;
  private resultEl: HTMLElement | null = null;
  private lastPlanoEscrita: ResultadoPlanoEscritaPacoteScrivenerOperacional | null = null;

  constructor(
    app: App,
    private readonly bridge: ScrivenerBridgeService,
  ) {
    super(app);
  }

  private getContexto(): ContextoManifestoScrivenerOperacional {
    return {
      tipo: 'exportacao',
      origemVault: this.app.vault.getName(),
      diretorioPacotes: 'contrarius-scrivener-packages',
      livro: 'operational-preview',
      observacoes: 'Operational package generated from Contrarius Narrative Suite Scrivener Bridge.',
      agora: new Date(),
    };
  }

  private getFiltros(): FiltrosPayloadScrivener {
    return estadoFiltrosPayloadScrivenerParaFiltros(FILTROS_PAYLOAD_SCRIVENER_VAZIOS);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Contrarius Scrivener Bridge' });

    this.statusEl = contentEl.createEl('p', { text: 'Ready.' });

    const buttonsEl = contentEl.createDiv({ cls: 'contrarius-scrivener-bridge-buttons' });

    const previewBtn = buttonsEl.createEl('button', { text: 'Preview vault payload' });
    previewBtn.addEventListener('click', () => { void this.onPreview(); });

    const integrityBtn = buttonsEl.createEl('button', { text: 'Check package integrity' });
    integrityBtn.addEventListener('click', () => { void this.onCheckIntegrity(); });

    const writeBtn = buttonsEl.createEl('button', { text: 'Write controlled package' });
    writeBtn.addEventListener('click', () => { void this.onWrite(); });

    const verifyBtn = buttonsEl.createEl('button', { text: 'Verify package write' });
    verifyBtn.addEventListener('click', () => { void this.onVerify(); });

    this.resultEl = contentEl.createDiv({ cls: 'contrarius-scrivener-bridge-result' });
  }

  onClose(): void {
    this.contentEl.empty();
    this.statusEl = null;
    this.resultEl = null;
    this.lastPlanoEscrita = null;
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.setText(text);
  }

  private setResult(lines: string[]): void {
    if (!this.resultEl) return;
    this.resultEl.empty();
    for (const line of lines) {
      this.resultEl.createEl('p', { text: line });
    }
  }

  private async onPreview(): Promise<void> {
    this.setStatus('Extracting vault payload...');
    this.setResult([]);
    try {
      const { filtro, resumo } = await this.bridge.extrairFiltrarEResumirPayloadContrariusDoVault(
        this.app.vault,
        this.app.metadataCache,
        this.getFiltros(),
        { incluirTexto: false, incluirNotasSoltas: false },
      );
      this.setStatus('Preview complete.');
      this.setResult([
        `Total items: ${resumo.totalItens}`,
        `Filtered: ${filtro.totalFiltrado}`,
        `Discarded: ${resumo.totalDescartados}`,
        `Warnings: ${resumo.totalAvisos}`,
      ]);
      new Notice('Preview completed.');
    } catch (err) {
      this.setStatus('Error during preview.');
      new Notice(`Preview error: ${err}`);
    }
  }

  private async onCheckIntegrity(): Promise<void> {
    this.setStatus('Checking package integrity...');
    this.setResult([]);
    try {
      const contexto = this.getContexto();
      const { resumo, filtro, integridade } = await this.bridge.validarIntegridadePayloadContrariusDoVault(
        contexto,
        this.app.vault,
        this.app.metadataCache,
        this.getFiltros(),
        { incluirTexto: false, incluirNotasSoltas: false },
      );
      this.setStatus(`Integrity level: ${integridade.nivel}`);
      this.setResult([
        `Total items: ${resumo.totalItens}`,
        `Filtered: ${filtro.totalFiltrado}`,
        `Discarded: ${resumo.totalDescartados}`,
        `Integrity level: ${integridade.nivel}`,
        `Errors: ${integridade.erros}`,
        `Warnings: ${integridade.avisos}`,
        `Total files: ${integridade.totalArquivos}`,
        `Payload items: ${integridade.totalItensPayload}`,
      ]);
      new Notice(`Integrity check: ${integridade.nivel}`);
    } catch (err) {
      this.setStatus('Error during integrity check.');
      new Notice(`Integrity error: ${err}`);
    }
  }

  private async onWrite(): Promise<void> {
    this.setStatus('Validating integrity before writing...');
    this.setResult([]);
    try {
      const contexto = this.getContexto();
      const filtros = this.getFiltros();
      const opcoesFonte = { incluirTexto: false, incluirNotasSoltas: false };

      const { integridade } = await this.bridge.validarIntegridadePayloadContrariusDoVault(
        contexto,
        this.app.vault,
        this.app.metadataCache,
        filtros,
        opcoesFonte,
      );

      if (integridade.nivel === 'error') {
        this.setStatus(`Write blocked: integrity errors (${integridade.erros}).`);
        this.setResult([
          `Integrity level: ${integridade.nivel}`,
          `Errors: ${integridade.erros}`,
          `Warnings: ${integridade.avisos}`,
        ]);
        new Notice(`Write blocked: ${integridade.erros} integrity error(s).`);
        return;
      }

      this.setStatus('Writing controlled package...');
      const adapter = this.app.vault.adapter as unknown as DataAdapterEscritaScrivenerLike & DataAdapterLeituraScrivenerLike;
      const resultado = await this.bridge.executarEVerificarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
        contexto,
        this.app.vault,
        this.app.metadataCache,
        adapter,
        filtros,
        { sobrescrever: false },
        opcoesFonte,
      );

      this.lastPlanoEscrita = resultado.planoEscrita;
      const { execucao, verificacao, resumo, filtro } = resultado;
      const caminhoPacote = resultado.planoEscrita.preview.manifesto.caminhoPacote;

      if (execucao.operacoesErro === 0 && verificacao.valido) {
        await this.bridge.registrarManifestoOperacional(contexto);
      }

      this.setStatus(`Write complete. OK: ${execucao.operacoesOk}, errors: ${execucao.operacoesErro}.`);
      this.setResult([
        `Total items: ${resumo.totalItens}`,
        `Filtered: ${filtro.totalFiltrado}`,
        `Discarded: ${resumo.totalDescartados}`,
        `Integrity level: ${integridade.nivel}`,
        `Operations OK: ${execucao.operacoesOk}`,
        `Operations errors: ${execucao.operacoesErro}`,
        `Post-write verification: ${verificacao.valido ? 'valid' : 'invalid'} (${verificacao.nivel})`,
        `Verification errors: ${verificacao.erros}`,
        ...(caminhoPacote ? [`Package path: ${caminhoPacote}`] : []),
      ]);
      new Notice(
        execucao.operacoesErro === 0
          ? 'Package written successfully.'
          : `Package written with ${execucao.operacoesErro} error(s).`,
      );
    } catch (err) {
      this.setStatus('Error during write.');
      new Notice(`Write error: ${err}`);
    }
  }

  private async onVerify(): Promise<void> {
    this.setStatus('Verifying package write...');
    this.setResult([]);
    await this.verifyLatest();
  }

  private async verifyLatest(): Promise<void> {
    const adapter = this.app.vault.adapter as unknown as DataAdapterListagemScrivenerLike;

    let listagemPacotes: { files: string[]; folders: string[] };
    try {
      listagemPacotes = await adapter.list(DIRETORIO_PACOTES);
    } catch {
      this.setStatus('No Scrivener package found.');
      this.setResult([MENSAGEM_PACOTE_NAO_ENCONTRADO]);
      new Notice(MENSAGEM_PACOTE_NAO_ENCONTRADO);
      return;
    }

    const subpastas = [...listagemPacotes.folders].sort().reverse();
    if (subpastas.length === 0) {
      this.setStatus('No Scrivener package found.');
      this.setResult([MENSAGEM_PACOTE_NAO_ENCONTRADO]);
      new Notice(MENSAGEM_PACOTE_NAO_ENCONTRADO);
      return;
    }

    const caminhoPacote = subpastas[0];

    const arquivos: EntradaArquivoPacoteScrivener[] = [];
    for (const relativo of [...ARQUIVOS_OBRIGATORIOS_VERIFICACAO, ...ARQUIVOS_OPCIONAIS_VERIFICACAO]) {
      const caminhoCompleto = `${caminhoPacote}/${relativo}`;
      try {
        const existe = await adapter.exists(caminhoCompleto);
        if (!existe) {
          arquivos.push({ caminhoRelativo: relativo, conteudo: null });
        } else {
          const conteudo = await adapter.read(caminhoCompleto);
          arquivos.push({ caminhoRelativo: relativo, conteudo });
        }
      } catch {
        arquivos.push({ caminhoRelativo: relativo, conteudo: null });
      }
    }

    let arquivosDossier: string[] = [];
    try {
      const caminhosDossier = `${caminhoPacote}/scrivener/dossier`;
      const listaDossier = await adapter.list(caminhosDossier);
      arquivosDossier = listaDossier.files.filter(f => f.endsWith('.md'));
    } catch {
      // dossier directory absent — not an error
    }

    const resultado = verificarPacoteScrivenerMaisRecente({
      caminhoPacote,
      arquivos,
      arquivosDossier,
    });

    this.setStatus(`Verification: ${resultado.nivel}`);
    this.setResult([
      `Latest package: ${resultado.caminhoPacote}`,
      `Verification: ${resultado.nivel}`,
      `Required files checked: ${resultado.arquivosObrigatoriosVerificados}`,
      `Missing files: ${resultado.arquivosAusentes}`,
      `Dossier files: ${resultado.dossiersEncontrados}`,
      ...(resultado.totalPayloadItens !== null
        ? [`Payload items: ${resultado.totalPayloadItens}`]
        : []),
      ...(resultado.arquivosOpcionaisEncontrados.length > 0
        ? [`Optional files: ${resultado.arquivosOpcionaisEncontrados.join(', ')}`]
        : []),
      ...resultado.erros,
      ...resultado.avisos,
    ]);
    new Notice(`Package verification: ${resultado.nivel}`);
  }
}
