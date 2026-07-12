import type { EstadoPainelScrivener, EstadoPacoteScrivener } from './scrivener-alerts-panel-model';
import {
  adicionarPacoteScrivener,
  criarPacoteDiagnosticoScrivener,
  limparPacotesScrivener,
  normalizarPacotesScrivener,
} from './scrivener-package-state-store';
import type { EntradaManifestoScrivener, ManifestoScrivener } from './scrivener-package-manifest';
import { manifestoParaEstadoPacoteScrivener, validarManifestoScrivener } from './scrivener-package-manifest';
import type { ContextoManifestoScrivenerOperacional } from './scrivener-package-manifest-factory';
import { criarEntradaManifestoOperacionalScrivener } from './scrivener-package-manifest-factory';
import type { ResultadoPlanoPacoteScrivenerOperacional } from './scrivener-package-plan-factory';
import { criarPlanoPacoteOperacionalScrivener } from './scrivener-package-plan-factory';
import type { PlanoEscritaPacoteScrivener } from './scrivener-package-write-plan-model';
import { criarPlanoEscritaPacoteScrivener } from './scrivener-package-write-plan-model';
import type { AdaptadorEscritaPacoteScrivener, ResultadoExecucaoEscritaPacoteScrivener } from './scrivener-package-write-executor';
import { executarPlanoEscritaPacoteScrivener } from './scrivener-package-write-executor';
import type { AdaptadorControladoEscritaScrivenerOptions, GravadorPacoteScrivener } from './scrivener-package-controlled-write-adapter';
import { criarAdaptadorControladoEscritaPacoteScrivener } from './scrivener-package-controlled-write-adapter';
import { criarGravadorPacoteScrivenerObsidian } from './scrivener-obsidian-write-adapter';
import type { DataAdapterEscritaScrivenerLike } from './scrivener-obsidian-write-adapter';
import type { FontePayloadContrariusScrivener, ResultadoExtracaoPayloadContrariusScrivener } from './scrivener-contrarius-payload-extractor';
import { extrairItensPayloadContrariusScrivener } from './scrivener-contrarius-payload-extractor';
import type {
  ArquivoMarkdownContrariusPayloadLike,
  MetadataCacheContrariusPayloadLike,
  VaultContrariusPayloadLike,
  OpcoesFonteVaultContrariusPayload,
} from './scrivener-contrarius-vault-payload-source';
import { criarFontePayloadContrariusScrivenerDoVault } from './scrivener-contrarius-vault-payload-source';
import type { ContextoPlanoPacoteScrivenerOperacional } from './scrivener-package-plan-factory';

export interface ScrivenerBridgeSettingsHost {
  settings: {
    scrivenerPacotes?: EstadoPacoteScrivener[];
  };
  saveSettings(): Promise<void>;
}

export interface ResultadoPlanoEscritaPacoteScrivenerOperacional {
    preview: ResultadoPlanoPacoteScrivenerOperacional;
    escrita: PlanoEscritaPacoteScrivener;
}

export interface ResultadoExecucaoPacoteScrivenerOperacional {
    planoEscrita: ResultadoPlanoEscritaPacoteScrivenerOperacional;
    execucao: ResultadoExecucaoEscritaPacoteScrivener;
}
export class ScrivenerBridgeService {
  constructor(private readonly host: ScrivenerBridgeSettingsHost) {}

  getEstadoPainel(): EstadoPainelScrivener {
    return { pacotes: this.listarPacotes() };
  }

  listarPacotes(): EstadoPacoteScrivener[] {
    return normalizarPacotesScrivener(this.host.settings.scrivenerPacotes);
  }

  async registrarPacote(pacote: EstadoPacoteScrivener): Promise<void> {
    this.host.settings.scrivenerPacotes = adicionarPacoteScrivener(
      this.host.settings.scrivenerPacotes,
      pacote,
    );
    await this.host.saveSettings();
  }

  async registrarPacoteDiagnostico(): Promise<void> {
    await this.registrarPacote(criarPacoteDiagnosticoScrivener());
  }

  async limparPacotes(): Promise<void> {
    this.host.settings.scrivenerPacotes = limparPacotesScrivener();
    await this.host.saveSettings();
  }

  async registrarManifestoInicial(input: EntradaManifestoScrivener): Promise<ManifestoScrivener> {
    const manifesto = validarManifestoScrivener(input);
    const pacote = manifestoParaEstadoPacoteScrivener(manifesto);
    await this.registrarPacote(pacote);
    return manifesto;
  }

  async registrarManifestoOperacional(
    contexto: ContextoManifestoScrivenerOperacional,
  ): Promise<ManifestoScrivener> {
    const entrada = criarEntradaManifestoOperacionalScrivener(contexto);
    return this.registrarManifestoInicial(entrada);
  }
    criarPreviewPacoteOperacional(
        contexto: ContextoManifestoScrivenerOperacional,
    ): ResultadoPlanoPacoteScrivenerOperacional {
        return criarPlanoPacoteOperacionalScrivener(contexto);
    }


    criarPlanoEscritaPacoteOperacional(
        contexto: ContextoManifestoScrivenerOperacional,
    ): ResultadoPlanoEscritaPacoteScrivenerOperacional {
        const preview = this.criarPreviewPacoteOperacional(contexto);
        const escrita = criarPlanoEscritaPacoteScrivener(preview.plano);

        return {
            preview,
            escrita,
        };
    }


    async executarEscritaPacoteOperacionalObsidian(
        contexto: ContextoManifestoScrivenerOperacional,
        adapter: DataAdapterEscritaScrivenerLike,
        options: AdaptadorControladoEscritaScrivenerOptions = {},
    ): Promise<ResultadoExecucaoPacoteScrivenerOperacional> {
        const gravador = criarGravadorPacoteScrivenerObsidian(adapter);
        return this.executarEscritaPacoteOperacionalControlada(contexto, gravador, options);
    }

    async executarEscritaPacoteOperacionalControlada(
        contexto: ContextoManifestoScrivenerOperacional,
        gravador: GravadorPacoteScrivener,
        options: AdaptadorControladoEscritaScrivenerOptions = {},
    ): Promise<ResultadoExecucaoPacoteScrivenerOperacional> {
        return this.executarEscritaPacoteOperacional(
            contexto,
            criarAdaptadorControladoEscritaPacoteScrivener(gravador, options),
        );
    }
    async executarEscritaPacoteOperacional(
        contexto: ContextoManifestoScrivenerOperacional,
        adaptador: AdaptadorEscritaPacoteScrivener,
    ): Promise<ResultadoExecucaoPacoteScrivenerOperacional> {
        const planoEscrita = this.criarPlanoEscritaPacoteOperacional(contexto);
        const execucao = await executarPlanoEscritaPacoteScrivener(planoEscrita.escrita, adaptador);

        return {
            planoEscrita,
            execucao,
        };
    }

    extrairPayloadContrarius(
        fonte: FontePayloadContrariusScrivener,
    ): ResultadoExtracaoPayloadContrariusScrivener {
        return extrairItensPayloadContrariusScrivener(fonte);
    }

    async extrairPayloadContrariusDoVault<TArquivo extends ArquivoMarkdownContrariusPayloadLike>(
        vault: VaultContrariusPayloadLike<TArquivo>,
        metadataCache: MetadataCacheContrariusPayloadLike<TArquivo>,
        opcoes?: OpcoesFonteVaultContrariusPayload,
    ): Promise<ResultadoExtracaoPayloadContrariusScrivener> {
        const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, metadataCache, opcoes);
        return this.extrairPayloadContrarius(fonte);
    }

    async executarEscritaPacoteOperacionalObsidianComPayloadDoVault<TArquivo extends ArquivoMarkdownContrariusPayloadLike>(
        contexto: ContextoManifestoScrivenerOperacional,
        vault: VaultContrariusPayloadLike<TArquivo>,
        metadataCache: MetadataCacheContrariusPayloadLike<TArquivo>,
        adapter: DataAdapterEscritaScrivenerLike,
        options: AdaptadorControladoEscritaScrivenerOptions = {},
        opcoesFonte: OpcoesFonteVaultContrariusPayload = {},
    ): Promise<ResultadoExecucaoPacoteScrivenerOperacional & { extracao: ResultadoExtracaoPayloadContrariusScrivener }> {
        const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, metadataCache, opcoesFonte);
        const extracao = this.extrairPayloadContrarius(fonte);
        const contextoComPayload: ContextoPlanoPacoteScrivenerOperacional = { ...contexto, itensPayload: extracao.itens };
        const execucao = await this.executarEscritaPacoteOperacionalObsidian(contextoComPayload, adapter, options);
        return { ...execucao, extracao };
    }

    criarPreviewPacoteOperacionalComPayloadContrarius(
        contexto: ContextoManifestoScrivenerOperacional,
        fonte: FontePayloadContrariusScrivener,
    ): ResultadoPlanoPacoteScrivenerOperacional {
        const resultado = extrairItensPayloadContrariusScrivener(fonte);
        return criarPlanoPacoteOperacionalScrivener({ ...contexto, itensPayload: resultado.itens });
    }

    criarPlanoEscritaPacoteOperacionalComPayloadContrarius(
        contexto: ContextoManifestoScrivenerOperacional,
        fonte: FontePayloadContrariusScrivener,
    ): ResultadoPlanoEscritaPacoteScrivenerOperacional {
        const resultado = extrairItensPayloadContrariusScrivener(fonte);
        const preview = criarPlanoPacoteOperacionalScrivener({ ...contexto, itensPayload: resultado.itens });
        const escrita = criarPlanoEscritaPacoteScrivener(preview.plano);
        return { preview, escrita };
    }

}
