import type { EstadoPainelScrivener, EstadoPacoteScrivener } from './scrivener-alerts-panel-model';
import {
  adicionarPacoteScrivener,
  criarPacoteDiagnosticoScrivener,
  limparPacotesScrivener,
  normalizarPacotesScrivener,
} from './scrivener-package-state-store';

export interface ScrivenerBridgeSettingsHost {
  settings: {
    scrivenerPacotes?: EstadoPacoteScrivener[];
  };
  saveSettings(): Promise<void>;
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
}
