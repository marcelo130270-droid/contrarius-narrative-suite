import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrivenerBridgeService } from '../../src/contrarius/scrivener-bridge-service';
import type { ScrivenerBridgeSettingsHost } from '../../src/contrarius/scrivener-bridge-service';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';
import type { ContextoManifestoScrivenerOperacional } from '../../src/contrarius/scrivener-package-manifest-factory';

function makeHost(pacotes?: EstadoPacoteScrivener[]): ScrivenerBridgeSettingsHost & { saveSettings: ReturnType<typeof vi.fn> } {
  return {
    settings: { scrivenerPacotes: pacotes },
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ScrivenerBridgeService', () => {
  describe('listarPacotes()', () => {
    it('returns [] when settings has no scrivenerPacotes', () => {
      const host = makeHost(undefined);
      const service = new ScrivenerBridgeService(host);
      expect(service.listarPacotes()).toEqual([]);
    });

    it('returns [] when scrivenerPacotes is an empty array', () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      expect(service.listarPacotes()).toEqual([]);
    });

    it('returns normalized copies of stored packages', () => {
      const original: EstadoPacoteScrivener = { manifesto: { valido: true }, aplicacao: { status: 'ok' } };
      const host = makeHost([original]);
      const service = new ScrivenerBridgeService(host);
      const result = service.listarPacotes();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(original);
    });

    it('does not expose original package object references', () => {
      const original: EstadoPacoteScrivener = { manifesto: { valido: true } };
      const host = makeHost([original]);
      const service = new ScrivenerBridgeService(host);
      const result = service.listarPacotes();
      expect(result[0]).not.toBe(original);
      expect(result[0].manifesto).not.toBe(original.manifesto);
    });
  });

  describe('getEstadoPainel()', () => {
    it('returns pacotes from settings', () => {
      const pacote: EstadoPacoteScrivener = { restauracao: { status: 'ok' } };
      const host = makeHost([pacote]);
      const service = new ScrivenerBridgeService(host);
      const estado = service.getEstadoPainel();
      expect(estado.pacotes).toHaveLength(1);
      expect(estado.pacotes![0]).toEqual(pacote);
    });

    it('returns { pacotes: [] } when no packages stored', () => {
      const host = makeHost(undefined);
      const service = new ScrivenerBridgeService(host);
      expect(service.getEstadoPainel()).toEqual({ pacotes: [] });
    });

    it('does not expose original package object references', () => {
      const original: EstadoPacoteScrivener = { manifesto: { valido: false } };
      const host = makeHost([original]);
      const service = new ScrivenerBridgeService(host);
      const estado = service.getEstadoPainel();
      expect(estado.pacotes![0]).not.toBe(original);
    });
  });

  describe('registrarPacote()', () => {
    it('appends a package and calls saveSettings once', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      const pacote: EstadoPacoteScrivener = { manifesto: { valido: true } };
      await service.registrarPacote(pacote);
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      expect(host.settings.scrivenerPacotes![0]).toEqual(pacote);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });

    it('normalizes and limits packages through the store', async () => {
      const existing: EstadoPacoteScrivener[] = Array.from({ length: 10 }, (_, i) => ({
        manifesto: { valido: true, comProblemas: i % 2 === 0 },
      }));
      const host = makeHost(existing);
      const service = new ScrivenerBridgeService(host);
      const extra: EstadoPacoteScrivener = { aplicacao: { status: 'ok' } };
      await service.registrarPacote(extra);
      // store keeps last 10 entries, so total stays at 10
      expect(host.settings.scrivenerPacotes).toHaveLength(10);
      expect(host.settings.scrivenerPacotes![9]).toEqual(extra);
    });
  });

  describe('registrarPacoteDiagnostico()', () => {
    it('stores a diagnostic package that has intentional warning/blocking data', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      await service.registrarPacoteDiagnostico();
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      const pkg = host.settings.scrivenerPacotes![0];
      // diagnostic package has comProblemas=true (warning) and bloqueada restauracao (blocking)
      expect(pkg.manifesto?.comProblemas).toBe(true);
      expect(pkg.restauracao?.status).toBe('bloqueada');
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('limparPacotes()', () => {
    it('clears the state and calls saveSettings once', async () => {
      const host = makeHost([{ manifesto: { valido: true } }]);
      const service = new ScrivenerBridgeService(host);
      await service.limparPacotes();
      expect(host.settings.scrivenerPacotes).toEqual([]);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('registrarManifestoOperacional()', () => {
    const CONTEXTO_VALIDO: ContextoManifestoScrivenerOperacional = {
      tipo: 'exportacao',
      origemVault: 'meu-vault',
      diretorioPacotes: '/pacotes',
      livro: 'Meu Livro',
      agora: new Date('2024-03-15T10:00:00.000Z'),
    };

    it('with valid operational context: returns clean manifest, stores one valid package, calls saveSettings once', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      const manifesto = await service.registrarManifestoOperacional(CONTEXTO_VALIDO);
      expect(manifesto.erros).toEqual([]);
      expect(manifesto.tipo).toBe('exportacao');
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      expect(host.settings.scrivenerPacotes![0].manifesto?.valido).toBe(true);
      expect(host.settings.scrivenerPacotes![0].manifesto?.comProblemas).toBe(false);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });

    it('with invalid operational context caused by empty origemVault: returns manifest with errors, stores one invalid package, calls saveSettings once', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      const manifesto = await service.registrarManifestoOperacional({
        ...CONTEXTO_VALIDO,
        origemVault: '',
        diretorioPacotes: '',
      });
      expect(manifesto.erros.length).toBeGreaterThan(0);
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      expect(host.settings.scrivenerPacotes![0].manifesto?.valido).toBe(false);
      expect(host.settings.scrivenerPacotes![0].manifesto?.comProblemas).toBe(true);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('registrarManifestoInicial()', () => {
    it('valid input returns no errors, stores package with valido=true and comProblemas=false, calls saveSettings once', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      const manifesto = await service.registrarManifestoInicial({
        id: 'pkg-001',
        criadoEm: '2024-03-15T10:00:00.000Z',
        tipo: 'exportacao',
        origemVault: 'meu-vault',
        caminhoPacote: 'exportacao.scrivener-package',
      });
      expect(manifesto.erros).toEqual([]);
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      expect(host.settings.scrivenerPacotes![0].manifesto?.valido).toBe(true);
      expect(host.settings.scrivenerPacotes![0].manifesto?.comProblemas).toBe(false);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });

    it('invalid input returns errors, stores package with valido=false and comProblemas=true, calls saveSettings once', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      const manifesto = await service.registrarManifestoInicial({});
      expect(manifesto.erros.length).toBeGreaterThan(0);
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      expect(host.settings.scrivenerPacotes![0].manifesto?.valido).toBe(false);
      expect(host.settings.scrivenerPacotes![0].manifesto?.comProblemas).toBe(true);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });
  });
});


describe('ScrivenerBridgeService package preview', () => {
    it('creates an operational package preview through the bridge service', () => {
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // No persistence is expected for previews.
            },
        });

        const preview = service.criarPreviewPacoteOperacional({
            tipo: 'exportacao',
            origemVault: 'Contrarius Enantios',
            diretorioPacotes: 'contrarius-scrivener-packages',
            livro: 'Livro 1',
            agora: '2000-01-01T00:00:00.000Z',
        });

        expect(preview.manifesto.id).toBe('exportacao-livro-1-2000-01-01t00-00-00-000z');
        expect(preview.plano.totalArquivos).toBe(3);
        expect(preview.plano.arquivos.map(arquivo => arquivo.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
        ]);
    });
});


describe('ScrivenerBridgeService write plan', () => {
    it('creates a planned write operation list through the bridge service', () => {
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // No persistence is expected for write plan previews.
            },
        });

        const resultado = service.criarPlanoEscritaPacoteOperacional({
            tipo: 'exportacao',
            origemVault: 'Contrarius Enantios',
            diretorioPacotes: 'contrarius-scrivener-packages',
            livro: 'Livro 1',
            agora: '2000-01-01T00:00:00.000Z',
        });

        expect(resultado.preview.manifesto.id).toBe('exportacao-livro-1-2000-01-01t00-00-00-000z');
        expect(resultado.escrita.totalOperacoes).toBe(3);
        expect(resultado.escrita.operacoes.map(operacao => operacao.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
        ]);
        expect(resultado.escrita.operacoes[0].caminhoDestino).toBe(
            'contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json',
        );
    });

    it('does not persist settings while creating a write plan preview', async () => {
        let saveCount = 0;
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                saveCount += 1;
            },
        });

        service.criarPlanoEscritaPacoteOperacional({
            tipo: 'aplicacao',
            origemVault: 'Vault',
            diretorioPacotes: 'pacotes',
            livro: 'Livro 2',
            agora: '2000-01-02T00:00:00.000Z',
        });

        expect(saveCount).toBe(0);
    });
});
