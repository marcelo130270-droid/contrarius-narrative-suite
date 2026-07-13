import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrivenerBridgeService } from '../../src/contrarius/scrivener-bridge-service';
import type { ScrivenerBridgeSettingsHost } from '../../src/contrarius/scrivener-bridge-service';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';
import type { ContextoManifestoScrivenerOperacional } from '../../src/contrarius/scrivener-package-manifest-factory';
import type { FontePayloadContrariusScrivener } from '../../src/contrarius/scrivener-contrarius-payload-extractor';
import { resumirExtracaoPayloadScrivener } from '../../src/contrarius/scrivener-payload-summary-model';
import type { ItemPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';

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
        expect(preview.plano.totalArquivos).toBe(8);
        expect(preview.plano.arquivos.map(arquivo => arquivo.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
            'scrivener-import.md',
            'scrivener/index.md',
            'scrivener/timeline/eventos.md',
            'scrivener/timeline/cronologia.md',
            'integrity/report.json',
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
        expect(resultado.escrita.totalOperacoes).toBe(8);
        expect(resultado.escrita.operacoes.map(operacao => operacao.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
            'scrivener-import.md',
            'scrivener/index.md',
            'scrivener/timeline/eventos.md',
            'scrivener/timeline/cronologia.md',
            'integrity/report.json',
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

describe('ScrivenerBridgeService write execution', () => {
    it('executes an operational package write plan through an injected adapter', async () => {
        const arquivos = new Map<string, string>();
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // No settings persistence is expected for injected write execution.
            },
        });

        const resultado = await service.executarEscritaPacoteOperacional(
            {
                tipo: 'exportacao',
                origemVault: 'Contrarius Enantios',
                diretorioPacotes: 'contrarius-scrivener-packages',
                livro: 'Livro 1',
                agora: '2000-01-01T00:00:00.000Z',
            },
            {
                async escreverArquivoTexto(caminhoDestino, conteudo) {
                    arquivos.set(caminhoDestino, conteudo);
                },
            },
        );

        expect(resultado.planoEscrita.preview.manifesto.id).toBe('exportacao-livro-1-2000-01-01t00-00-00-000z');
        expect(resultado.execucao.totalOperacoes).toBe(8);
        expect(resultado.execucao.operacoesOk).toBe(8);
        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(arquivos.size).toBe(8);
        expect(arquivos.get('contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json')).toContain('exportacao-livro-1');
    });

    it('returns write execution errors without throwing from the bridge service', async () => {
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // No settings persistence is expected for failed write execution previews.
            },
        });

        const resultado = await service.executarEscritaPacoteOperacional(
            {
                tipo: 'exportacao',
                origemVault: 'Contrarius Enantios',
                diretorioPacotes: 'contrarius-scrivener-packages',
                livro: 'Livro 1',
                agora: '2000-01-01T00:00:00.000Z',
            },
            {
                async escreverArquivoTexto(caminhoDestino) {
                    if (caminhoDestino.endsWith('payload/index.json')) {
                        throw new Error('Falha simulada pelo bridge');
                    }
                },
            },
        );

        expect(resultado.execucao.totalOperacoes).toBe(8);
        expect(resultado.execucao.operacoesOk).toBe(7);
        expect(resultado.execucao.operacoesErro).toBe(1);
        expect(resultado.execucao.resultados[1].erro).toBe('Falha simulada pelo bridge');
    });

    it('does not persist settings while executing through an injected adapter', async () => {
        let saveCount = 0;
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                saveCount += 1;
            },
        });

        await service.executarEscritaPacoteOperacional(
            {
                tipo: 'aplicacao',
                origemVault: 'Vault',
                diretorioPacotes: 'pacotes',
                livro: 'Livro 2',
                agora: '2000-01-02T00:00:00.000Z',
            },
            {
                async escreverArquivoTexto() {
                    // no-op
                },
            },
        );

        expect(saveCount).toBe(0);
    });
});

describe('ScrivenerBridgeService controlled write execution', () => {
    function criarGravadorMemoria(arquivosExistentes: Record<string, string> = {}) {
        const arquivos = new Map<string, string>(Object.entries(arquivosExistentes));
        const diretorios = new Set<string>();
        const mkdirs: string[] = [];

        return {
            arquivos,
            diretorios,
            mkdirs,
            gravador: {
                async exists(caminho: string) {
                    return arquivos.has(caminho) || diretorios.has(caminho);
                },
                async mkdir(caminho: string) {
                    diretorios.add(caminho);
                    mkdirs.push(caminho);
                },
                async write(caminho: string, conteudo: string) {
                    arquivos.set(caminho, conteudo);
                },
            },
        };
    }

    it('executes through the controlled writer adapter from the bridge service', async () => {
        const memoria = criarGravadorMemoria();
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // No settings persistence is expected for controlled write execution.
            },
        });

        const resultado = await service.executarEscritaPacoteOperacionalControlada(
            {
                tipo: 'exportacao',
                origemVault: 'Contrarius Enantios',
                diretorioPacotes: 'contrarius-scrivener-packages',
                livro: 'Livro 1',
                agora: '2000-01-01T00:00:00.000Z',
            },
            memoria.gravador,
        );

        expect(resultado.execucao.totalOperacoes).toBe(8);
        expect(resultado.execucao.operacoesOk).toBe(8);
        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(memoria.arquivos.get('contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json')).toContain('exportacao-livro-1');
        expect(memoria.mkdirs).toContain('contrarius-scrivener-packages');
    });

    it('blocks overwrite by default through the bridge service', async () => {
        const caminhoManifesto = "pacotes/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json";
        const memoria = criarGravadorMemoria({
            [caminhoManifesto]: "old",
        });
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // no-op
            },
        });

        const resultado = await service.executarEscritaPacoteOperacionalControlada(
            {
                tipo: 'exportacao',
                origemVault: 'Contrarius Enantios',
                diretorioPacotes: 'pacotes',
                livro: 'Livro 1',
                agora: '2000-01-01T00:00:00.000Z',
            },
            memoria.gravador,
        );

        expect(resultado.execucao.operacoesErro).toBe(1);
        expect(resultado.execucao.resultados[0].erro).toContain('sobrescrita esta bloqueada');
        expect(memoria.arquivos.get(caminhoManifesto)).toBe("old");
    });

    it('does not call saveSettings during controlled write', async () => {
        let saveCount = 0;
        const memoria = criarGravadorMemoria();
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                saveCount += 1;
            },
        });

        await service.executarEscritaPacoteOperacionalControlada(
            {
                tipo: 'exportacao',
                origemVault: 'Contrarius Enantios',
                diretorioPacotes: 'contrarius-scrivener-packages',
                livro: 'Livro 1',
                agora: '2000-01-01T00:00:00.000Z',
            },
            memoria.gravador,
        );

        expect(saveCount).toBe(0);
    });

    it('allows overwrite when controlled options explicitly enable it', async () => {
        const caminhoManifesto = "pacotes/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json";
        const memoria = criarGravadorMemoria({
            [caminhoManifesto]: "old",
        });
        const service = new ScrivenerBridgeService({
            settings: {},
            async saveSettings() {
                // no-op
            },
        });

        const resultado = await service.executarEscritaPacoteOperacionalControlada(
            {
                tipo: 'exportacao',
                origemVault: 'Contrarius Enantios',
                diretorioPacotes: 'pacotes',
                livro: 'Livro 1',
                agora: '2000-01-01T00:00:00.000Z',
            },
            memoria.gravador,
            { sobrescrever: true },
        );

        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(memoria.arquivos.get(caminhoManifesto)).toContain('exportacao-livro-1');
    });
});

describe('ScrivenerBridgeService Contrarius payload extraction', () => {
  const CONTEXTO: ContextoManifestoScrivenerOperacional = {
    tipo: 'exportacao',
    origemVault: 'Contrarius Enantios',
    diretorioPacotes: 'contrarius-scrivener-packages',
    livro: 'Livro 1',
    agora: '2000-01-01T00:00:00.000Z',
  };

  function makeService() {
    return new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
  }

  it('extrairPayloadContrarius retorna itens e avisos', () => {
    const service = makeService();
    const fonte: FontePayloadContrariusScrivener = {
      consciencias: [
        { id: 'c1', titulo: 'Consciência 1' },
        { id: 'c2', titulo: 'Consciência 2' },
      ],
      eventos: [{ id: 'ev1', titulo: 'Evento 1' }],
    };
    const resultado = service.extrairPayloadContrarius(fonte);
    expect(resultado.totalItens).toBe(3);
    expect(resultado.descartados).toBe(0);
    expect(resultado.avisos).toEqual([]);
    const tipos = resultado.itens.map(i => i.tipo);
    expect(tipos).toContain('consciencia');
    expect(tipos).toContain('evento');
  });

  it('item inválido aparece em avisos mas não no payload', () => {
    const service = makeService();
    const fonte: FontePayloadContrariusScrivener = {
      lugares: [
        { id: 'l1', titulo: 'Lugar Válido' },
        { titulo: 'Sem id' },
        null as unknown as Record<string, unknown>,
      ],
    };
    const resultado = service.extrairPayloadContrarius(fonte);
    expect(resultado.totalItens).toBe(1);
    expect(resultado.descartados).toBe(2);
    expect(resultado.avisos.length).toBe(2);
    expect(resultado.itens[0].id).toBe('l1');
  });

  it('criarPreviewPacoteOperacionalComPayloadContrarius injeta itens no payload/index.json', () => {
    const service = makeService();
    const fonte: FontePayloadContrariusScrivener = {
      consciencias: [{ id: 'c1', titulo: 'Personagem A' }],
      eventos: [{ id: 'ev1', titulo: 'Grande Evento' }],
    };
    const preview = service.criarPreviewPacoteOperacionalComPayloadContrarius(CONTEXTO, fonte);
    const payloadArquivo = preview.plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');
    expect(payloadArquivo).toBeDefined();
    const payload = JSON.parse(payloadArquivo!.conteudo);
    expect(payload.totalItens).toBe(2);
    const ids = payload.itens.map((i: { id: string }) => i.id);
    expect(ids).toContain('c1');
    expect(ids).toContain('ev1');
  });

  it('criarPlanoEscritaPacoteOperacionalComPayloadContrarius injeta itens no plano de escrita', () => {
    const service = makeService();
    const fonte: FontePayloadContrariusScrivener = {
      retrovidas: [{ id: 'rv1', titulo: 'Retrovida 1' }],
    };
    const resultado = service.criarPlanoEscritaPacoteOperacionalComPayloadContrarius(CONTEXTO, fonte);
    expect(resultado.preview.manifesto.id).toBe('exportacao-livro-1-2000-01-01t00-00-00-000z');
    expect(resultado.escrita.totalOperacoes).toBe(10);

    const payloadOp = resultado.escrita.operacoes.find(o => o.caminhoRelativo === 'payload/index.json');
    expect(payloadOp).toBeDefined();
    const payload = JSON.parse(payloadOp!.conteudo);
    expect(payload.totalItens).toBe(1);
    expect(payload.itens[0].id).toBe('rv1');
  });

  it('extrairPayloadContrarius não chama saveSettings', () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({
      settings: {},
      async saveSettings() { saveCount += 1; },
    });
    service.extrairPayloadContrarius({ notas: [{ id: 'n1', titulo: 'Nota' }] });
    expect(saveCount).toBe(0);
  });

  it('criarPreviewPacoteOperacionalComPayloadContrarius não chama saveSettings', () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({
      settings: {},
      async saveSettings() { saveCount += 1; },
    });
    service.criarPreviewPacoteOperacionalComPayloadContrarius(CONTEXTO, {});
    expect(saveCount).toBe(0);
  });

  it('criarPlanoEscritaPacoteOperacionalComPayloadContrarius não chama saveSettings', () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({
      settings: {},
      async saveSettings() { saveCount += 1; },
    });
    service.criarPlanoEscritaPacoteOperacionalComPayloadContrarius(CONTEXTO, {});
    expect(saveCount).toBe(0);
  });
});

describe('ScrivenerBridgeService Contrarius vault payload source', () => {
  const CONTEXTO: ContextoManifestoScrivenerOperacional = {
    tipo: 'exportacao',
    origemVault: 'Contrarius Enantios',
    diretorioPacotes: 'contrarius-scrivener-packages',
    livro: 'Livro 1',
    agora: new Date('2000-01-01T00:00:00.000Z'),
  };

  function makeVault(arquivos: Array<{ path: string; basename: string }>, conteudos?: Record<string, string>) {
    return {
      getMarkdownFiles: () => arquivos,
      cachedRead: conteudos ? async (a: { path: string }) => conteudos[a.path] ?? '' : undefined,
    };
  }

  function makeCache(frontmatters: Record<string, Record<string, unknown>>) {
    return {
      getFileCache: (arquivo: { path: string }) => {
        const fm = frontmatters[arquivo.path];
        return fm ? { frontmatter: fm } : null;
      },
    };
  }

  function criarAdapterMemoria(existentes: Record<string, string> = {}) {
    const arquivos = new Map<string, string>(Object.entries(existentes));
    const dirs = new Set<string>();
    return {
      arquivos,
      adapter: {
        async exists(c: string) { return arquivos.has(c) || dirs.has(c); },
        async mkdir(c: string) { dirs.add(c); },
        async write(c: string, v: string) { arquivos.set(c, v); },
      },
    };
  }

  it('extrairPayloadContrariusDoVault extrai itens a partir de vault/metadataCache em memória', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/Personagem.md', basename: 'Personagem' },
      { path: '05_Eventos/Batalha.md', basename: 'Batalha' },
    ]);
    const cache = makeCache({
      '02_Consciencias/Personagem.md': { id: 'p1', titulo: 'Personagem A' },
      '05_Eventos/Batalha.md': { id: 'ev1', titulo: 'Grande Batalha' },
    });

    const resultado = await service.extrairPayloadContrariusDoVault(vault, cache);

    expect(resultado.totalItens).toBe(2);
    expect(resultado.descartados).toBe(0);
    const tipos = resultado.itens.map(i => i.tipo);
    expect(tipos).toContain('consciencia');
    expect(tipos).toContain('evento');
  });

  it('retorna extracao com totalItens e avisos', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/P1.md', basename: 'P1' },
      { path: '02_Consciencias/P2.md', basename: 'P2' },
    ]);
    const cache = makeCache({
      '02_Consciencias/P1.md': { id: 'c1', titulo: 'Consciência 1' },
      '02_Consciencias/P2.md': { id: 'c2', titulo: 'Consciência 2' },
    });

    const resultado = await service.extrairPayloadContrariusDoVault(vault, cache);

    expect(resultado.totalItens).toBe(2);
    expect(resultado.avisos).toBeDefined();
    expect(typeof resultado.descartados).toBe('number');
  });

  it('extrairPayloadContrariusDoVault não chama saveSettings', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([{ path: '02_Consciencias/P.md', basename: 'P' }]);
    const cache = makeCache({ '02_Consciencias/P.md': { id: 'c1', titulo: 'C1' } });

    await service.extrairPayloadContrariusDoVault(vault, cache);

    expect(saveCount).toBe(0);
  });

  it('executarEscritaPacoteOperacionalObsidianComPayloadDoVault escreve pacote com payload vindo do vault', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/Personagem.md', basename: 'Personagem' },
    ]);
    const cache = makeCache({
      '02_Consciencias/Personagem.md': { id: 'c1', titulo: 'Personagem Chave' },
    });
    const memoria = criarAdapterMemoria();

    const resultado = await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVault(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    expect(resultado.execucao.totalOperacoes).toBe(10);
    expect(resultado.execucao.operacoesOk).toBe(10);
    expect(resultado.execucao.operacoesErro).toBe(0);
    expect(resultado.extracao.totalItens).toBe(1);
  });

  it('payload/index.json contém itens extraídos do vault', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
      { path: '05_Eventos/Ev1.md', basename: 'Ev1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'Consciência Um' },
      '05_Eventos/Ev1.md': { id: 'ev1', titulo: 'Evento Um' },
    });
    const memoria = criarAdapterMemoria();

    await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVault(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    const payloadPath = 'contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/payload/index.json';
    const conteudo = memoria.arquivos.get(payloadPath);
    expect(conteudo).toBeDefined();
    const payload = JSON.parse(conteudo!);
    expect(payload.totalItens).toBe(2);
    const ids = payload.itens.map((i: { id: string }) => i.id);
    expect(ids).toContain('c1');
    expect(ids).toContain('ev1');
  });

  it('não chama saveSettings durante execução com vault', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([{ path: '02_Consciencias/P.md', basename: 'P' }]);
    const cache = makeCache({ '02_Consciencias/P.md': { id: 'c1', titulo: 'C' } });
    const memoria = criarAdapterMemoria();

    await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVault(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    expect(saveCount).toBe(0);
  });

  it('não sobrescreve arquivos existentes por padrão', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([{ path: '02_Consciencias/P.md', basename: 'P' }]);
    const cache = makeCache({ '02_Consciencias/P.md': { id: 'c1', titulo: 'C' } });
    const manifestoCaminho = 'contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json';
    const memoria = criarAdapterMemoria({ [manifestoCaminho]: 'old' });

    const resultado = await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVault(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    expect(resultado.execucao.operacoesErro).toBeGreaterThan(0);
    expect(memoria.arquivos.get(manifestoCaminho)).toBe('old');
  });
});

describe('ScrivenerBridgeService Obsidian write execution', () => {
    function criarAdapterMemoria(arquivosExistentes: Record<string, string> = {}) {
        const arquivos = new Map<string, string>(Object.entries(arquivosExistentes));
        const diretorios = new Set<string>();

        return {
            arquivos,
            diretorios,
            adapter: {
                async exists(caminho: string) {
                    return arquivos.has(caminho) || diretorios.has(caminho);
                },
                async mkdir(caminho: string) {
                    diretorios.add(caminho);
                },
                async write(caminho: string, conteudo: string) {
                    arquivos.set(caminho, conteudo);
                },
            },
        };
    }

    const CONTEXTO: ContextoManifestoScrivenerOperacional = {
        tipo: 'exportacao',
        origemVault: 'Contrarius Enantios',
        diretorioPacotes: 'contrarius-scrivener-packages',
        livro: 'Livro 1',
        agora: new Date('2000-01-01T00:00:00.000Z'),
    };

    it('executa escrita operacional usando adapter Obsidian-like em memória', async () => {
        const memoria = criarAdapterMemoria();
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });

        const resultado = await service.executarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter);

        expect(resultado.execucao.totalOperacoes).toBe(8);
        expect(resultado.execucao.operacoesOk).toBe(8);
        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(memoria.arquivos.size).toBe(8);
    });

    it('cria diretórios intermediários', async () => {
        const memoria = criarAdapterMemoria();
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });

        await service.executarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter);

        expect(memoria.diretorios.size).toBeGreaterThan(0);
    });

    it('bloqueia sobrescrita por padrão', async () => {
        const caminhoManifesto = 'contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json';
        const memoria = criarAdapterMemoria({ [caminhoManifesto]: 'old' });
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });

        const resultado = await service.executarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter);

        expect(resultado.execucao.operacoesErro).toBe(1);
        expect(memoria.arquivos.get(caminhoManifesto)).toBe('old');
    });

    it('permite sobrescrita com { sobrescrever: true }', async () => {
        const caminhoManifesto = 'contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/manifest.json';
        const memoria = criarAdapterMemoria({ [caminhoManifesto]: 'old' });
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });

        const resultado = await service.executarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter, { sobrescrever: true });

        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(memoria.arquivos.get(caminhoManifesto)).toContain('exportacao-livro-1');
    });

    it('não chama saveSettings', async () => {
        const memoria = criarAdapterMemoria();
        let saveCount = 0;
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount += 1; } });

        await service.executarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter);

        expect(saveCount).toBe(0);
    });
});

describe('ScrivenerBridgeService Contrarius payload summary', () => {
  const CONTEXTO: ContextoManifestoScrivenerOperacional = {
    tipo: 'exportacao',
    origemVault: 'Contrarius Enantios',
    diretorioPacotes: 'contrarius-scrivener-packages',
    livro: 'Livro 1',
    agora: new Date('2000-01-01T00:00:00.000Z'),
  };

  function makeVault(arquivos: Array<{ path: string; basename: string }>) {
    return { getMarkdownFiles: () => arquivos };
  }

  function makeCache(frontmatters: Record<string, Record<string, unknown>>) {
    return {
      getFileCache: (arquivo: { path: string }) => {
        const fm = frontmatters[arquivo.path];
        return fm ? { frontmatter: fm } : null;
      },
    };
  }

  function criarAdapterMemoria(existentes: Record<string, string> = {}) {
    const arquivos = new Map<string, string>(Object.entries(existentes));
    const dirs = new Set<string>();
    return {
      arquivos,
      adapter: {
        async exists(c: string) { return arquivos.has(c) || dirs.has(c); },
        async mkdir(c: string) { dirs.add(c); },
        async write(c: string, v: string) { arquivos.set(c, v); },
      },
    };
  }

  it('resumirPayloadContrariusDoVault retorna contagem por tipo, livro e período', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
      { path: '02_Consciencias/C2.md', basename: 'C2' },
      { path: '05_Eventos/Ev1.md', basename: 'Ev1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'C1', livro: 'Livro Alpha', periodo: 'Era 1' },
      '02_Consciencias/C2.md': { id: 'c2', titulo: 'C2', livro: 'Livro Alpha', periodo: 'Era 2' },
      '05_Eventos/Ev1.md': { id: 'ev1', titulo: 'Ev1', livro: 'Livro Beta', periodo: 'Era 1' },
    });

    const resumo = await service.resumirPayloadContrariusDoVault(vault, cache);

    expect(resumo.totalItens).toBe(3);
    expect(resumo.nivel).toBe('ok');
    const tipoConsc = resumo.porTipo.find(c => c.chave === 'consciencia');
    const tipoEvento = resumo.porTipo.find(c => c.chave === 'evento');
    expect(tipoConsc?.total).toBe(2);
    expect(tipoEvento?.total).toBe(1);
    const livroAlpha = resumo.porLivro.find(c => c.chave === 'Livro Alpha');
    const livroBeta = resumo.porLivro.find(c => c.chave === 'Livro Beta');
    expect(livroAlpha?.total).toBe(2);
    expect(livroBeta?.total).toBe(1);
    const era1 = resumo.porPeriodo.find(c => c.chave === 'Era 1');
    const era2 = resumo.porPeriodo.find(c => c.chave === 'Era 2');
    expect(era1?.total).toBe(2);
    expect(era2?.total).toBe(1);
  });

  it('extrairEResumirPayloadContrariusDoVault retorna extracao e resumo coerentes', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
      { path: '05_Eventos/Ev1.md', basename: 'Ev1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'Consciência 1' },
      '05_Eventos/Ev1.md': { id: 'ev1', titulo: 'Evento 1' },
    });

    const { extracao, resumo } = await service.extrairEResumirPayloadContrariusDoVault(vault, cache);

    expect(extracao.totalItens).toBe(2);
    expect(resumo.totalItens).toBe(extracao.totalItens);
    expect(resumo.totalDescartados).toBe(extracao.descartados);
    expect(resumo.totalAvisos).toBe(extracao.avisos.length);
    expect(resumo.nivel).toBe('ok');
  });

  it('executarEscritaPacoteOperacionalObsidianComPayloadDoVault retorna resumo junto da extração', async () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'Personagem C1' },
    });
    const memoria = criarAdapterMemoria();

    const resultado = await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVault(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    expect(resultado.resumo).toBeDefined();
    expect(resultado.resumo.totalItens).toBe(resultado.extracao.totalItens);
    expect(resultado.resumo.totalDescartados).toBe(resultado.extracao.descartados);
    expect(resultado.resumo.totalAvisos).toBe(resultado.extracao.avisos.length);
    expect(resultado.resumo.nivel).toBe('ok');
  });

  it('resumirPayloadContrariusDoVault não chama saveSettings', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([{ path: '02_Consciencias/C.md', basename: 'C' }]);
    const cache = makeCache({ '02_Consciencias/C.md': { id: 'c1', titulo: 'C' } });

    await service.resumirPayloadContrariusDoVault(vault, cache);

    expect(saveCount).toBe(0);
  });

  it('extrairEResumirPayloadContrariusDoVault não chama saveSettings', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([{ path: '02_Consciencias/C.md', basename: 'C' }]);
    const cache = makeCache({ '02_Consciencias/C.md': { id: 'c1', titulo: 'C' } });

    await service.extrairEResumirPayloadContrariusDoVault(vault, cache);

    expect(saveCount).toBe(0);
  });

  it('descartados e avisos aparecem no resumo quando a fonte contém entidades inválidas', () => {
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    const fonte: FontePayloadContrariusScrivener = {
      consciencias: [
        { id: 'c1', titulo: 'Válido' },
        null as unknown as Record<string, unknown>,
        { titulo: 'Sem id' },
      ],
    };
    const extracao = service.extrairPayloadContrarius(fonte);
    const resumo = resumirExtracaoPayloadScrivener(extracao);

    expect(extracao.descartados).toBe(2);
    expect(extracao.avisos.length).toBe(2);
    expect(resumo.totalDescartados).toBe(2);
    expect(resumo.totalAvisos).toBe(2);
    expect(resumo.nivel).toBe('warning');
    expect(resumo.primeirosAvisos.length).toBe(2);
  });
});

describe('ScrivenerBridgeService payload filters', () => {
  const CONTEXTO: ContextoManifestoScrivenerOperacional = {
    tipo: 'exportacao',
    origemVault: 'Contrarius Enantios',
    diretorioPacotes: 'contrarius-scrivener-packages',
    livro: 'Livro 1',
    agora: new Date('2000-01-01T00:00:00.000Z'),
  };

  function makeService() {
    return new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
  }

  function makeItem(overrides?: Partial<ItemPayloadScrivener>): ItemPayloadScrivener {
    return { id: 'id-1', tipo: 'consciencia', titulo: 'Titulo', ...overrides };
  }

  function makeVault(arquivos: Array<{ path: string; basename: string }>) {
    return { getMarkdownFiles: () => arquivos };
  }

  function makeCache(frontmatters: Record<string, Record<string, unknown>>) {
    return {
      getFileCache: (arquivo: { path: string }) => {
        const fm = frontmatters[arquivo.path];
        return fm ? { frontmatter: fm } : null;
      },
    };
  }

  function criarAdapterMemoria(existentes: Record<string, string> = {}) {
    const arquivos = new Map<string, string>(Object.entries(existentes));
    const dirs = new Set<string>();
    return {
      arquivos,
      adapter: {
        async exists(c: string) { return arquivos.has(c) || dirs.has(c); },
        async mkdir(c: string) { dirs.add(c); },
        async write(c: string, v: string) { arquivos.set(c, v); },
      },
    };
  }

  it('filtrarPayloadScrivener por tipo retém apenas itens do tipo especificado', () => {
    const service = makeService();
    const itens: ItemPayloadScrivener[] = [
      makeItem({ id: 'c1', tipo: 'consciencia' }),
      makeItem({ id: 'ev1', tipo: 'evento' }),
      makeItem({ id: 'l1', tipo: 'lugar' }),
    ];
    const resultado = service.filtrarPayloadScrivener(itens, { tipos: ['evento'] });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('ev1');
    expect(resultado.totalOriginal).toBe(3);
    expect(resultado.totalFiltrado).toBe(1);
    expect(resultado.totalRemovido).toBe(2);
  });

  it('filtrarPayloadScrivener por livro', () => {
    const service = makeService();
    const itens: ItemPayloadScrivener[] = [
      makeItem({ id: 'i1', livro: 'Livro Alpha' }),
      makeItem({ id: 'i2', livro: 'Livro Beta' }),
      makeItem({ id: 'i3', livro: 'Livro Alpha' }),
    ];
    const resultado = service.filtrarPayloadScrivener(itens, { livros: ['Livro Alpha'] });
    expect(resultado.itens).toHaveLength(2);
    expect(resultado.itens.map(i => i.id)).toContain('i1');
    expect(resultado.itens.map(i => i.id)).toContain('i3');
  });

  it('filtrarPayloadScrivener por período', () => {
    const service = makeService();
    const itens: ItemPayloadScrivener[] = [
      makeItem({ id: 'i1', periodo: 'Era 1' }),
      makeItem({ id: 'i2', periodo: 'Era 2' }),
    ];
    const resultado = service.filtrarPayloadScrivener(itens, { periodos: ['Era 1'] });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
  });

  it('filtrarPayloadScrivener retorna totalOriginal, totalFiltrado e totalRemovido corretos', () => {
    const service = makeService();
    const itens: ItemPayloadScrivener[] = [
      makeItem({ id: 'i1', tipo: 'evento' }),
      makeItem({ id: 'i2', tipo: 'lugar' }),
      makeItem({ id: 'i3', tipo: 'evento' }),
      makeItem({ id: 'i4', tipo: 'nota' }),
    ];
    const resultado = service.filtrarPayloadScrivener(itens, { tipos: ['evento'] });
    expect(resultado.totalOriginal).toBe(4);
    expect(resultado.totalFiltrado).toBe(2);
    expect(resultado.totalRemovido).toBe(2);
  });

  it('filtrarPayloadScrivener não chama saveSettings', () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const itens: ItemPayloadScrivener[] = [makeItem({ id: 'i1', tipo: 'evento' })];
    service.filtrarPayloadScrivener(itens, { tipos: ['evento'] });
    expect(saveCount).toBe(0);
  });

  it('extrairFiltrarEResumirPayloadContrariusDoVault retorna resumo filtrado', async () => {
    const service = makeService();
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
      { path: '02_Consciencias/C2.md', basename: 'C2' },
      { path: '05_Eventos/Ev1.md', basename: 'Ev1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'C1', livro: 'Livro Alpha' },
      '02_Consciencias/C2.md': { id: 'c2', titulo: 'C2', livro: 'Livro Beta' },
      '05_Eventos/Ev1.md': { id: 'ev1', titulo: 'Ev1', livro: 'Livro Alpha' },
    });

    const { extracao, filtro, resumo } = await service.extrairFiltrarEResumirPayloadContrariusDoVault(
      vault, cache, { livros: ['Livro Alpha'] },
    );

    expect(extracao.totalItens).toBe(3);
    expect(filtro.totalOriginal).toBe(3);
    expect(filtro.totalFiltrado).toBe(2);
    expect(filtro.totalRemovido).toBe(1);
    expect(resumo.totalItens).toBe(filtro.totalFiltrado);
  });

  it('extrairFiltrarEResumirPayloadContrariusDoVault mantém avisos/descartados da extração original', async () => {
    const service = makeService();
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'C1' },
    });

    const { extracao } = await service.extrairFiltrarEResumirPayloadContrariusDoVault(
      vault, cache, { tipos: ['evento'] },
    );

    expect(extracao.totalItens).toBe(1);
    expect(Array.isArray(extracao.avisos)).toBe(true);
    expect(typeof extracao.descartados).toBe('number');
  });

  it('extrairFiltrarEResumirPayloadContrariusDoVault não chama saveSettings', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([{ path: '02_Consciencias/C.md', basename: 'C' }]);
    const cache = makeCache({ '02_Consciencias/C.md': { id: 'c1', titulo: 'C' } });

    await service.extrairFiltrarEResumirPayloadContrariusDoVault(vault, cache, { tipos: ['evento'] });

    expect(saveCount).toBe(0);
  });

  it('executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado grava apenas itens filtrados', async () => {
    const service = makeService();
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
      { path: '05_Eventos/Ev1.md', basename: 'Ev1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'Consciência 1' },
      '05_Eventos/Ev1.md': { id: 'ev1', titulo: 'Evento 1' },
    });
    const memoria = criarAdapterMemoria();

    const resultado = await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
      CONTEXTO, vault, cache, memoria.adapter, { tipos: ['evento'] },
    );

    expect(resultado.filtro.totalOriginal).toBe(2);
    expect(resultado.filtro.totalFiltrado).toBe(1);
    expect(resultado.filtro.totalRemovido).toBe(1);

    const payloadPath = 'contrarius-scrivener-packages/exportacao-livro-1-2000-01-01t00-00-00-000z.scrivener-package/payload/index.json';
    const conteudo = memoria.arquivos.get(payloadPath);
    expect(conteudo).toBeDefined();
    const payload = JSON.parse(conteudo!);
    expect(payload.totalItens).toBe(1);
    expect(payload.itens[0].id).toBe('ev1');
  });

  it('executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado não chama saveSettings', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([{ path: '02_Consciencias/C.md', basename: 'C' }]);
    const cache = makeCache({ '02_Consciencias/C.md': { id: 'c1', titulo: 'C' } });
    const memoria = criarAdapterMemoria();

    await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    expect(saveCount).toBe(0);
  });

  it('executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado mantém avisos/descartados da extração original', async () => {
    const service = makeService();
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'C1' },
    });
    const memoria = criarAdapterMemoria();

    const resultado = await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
      CONTEXTO, vault, cache, memoria.adapter, { tipos: ['evento'] },
    );

    expect(resultado.extracao.totalItens).toBe(1);
    expect(Array.isArray(resultado.extracao.avisos)).toBe(true);
    expect(typeof resultado.extracao.descartados).toBe('number');
    expect(resultado.filtro.totalFiltrado).toBe(0);
  });

  it('sem filtros retorna todos os itens extraídos', async () => {
    const service = makeService();
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
      { path: '05_Eventos/Ev1.md', basename: 'Ev1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'C1' },
      '05_Eventos/Ev1.md': { id: 'ev1', titulo: 'Ev1' },
    });
    const memoria = criarAdapterMemoria();

    const resultado = await service.executarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
      CONTEXTO, vault, cache, memoria.adapter,
    );

    expect(resultado.filtro.totalOriginal).toBe(2);
    expect(resultado.filtro.totalFiltrado).toBe(2);
    expect(resultado.filtro.totalRemovido).toBe(0);
  });
});

describe('ScrivenerBridgeService package write verification', () => {
    const CONTEXTO: ContextoManifestoScrivenerOperacional = {
        tipo: 'exportacao',
        origemVault: 'Contrarius Enantios',
        diretorioPacotes: 'contrarius-scrivener-packages',
        livro: 'Livro 1',
        agora: new Date('2000-01-01T00:00:00.000Z'),
    };

    function makeService() {
        return new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
    }

    function criarAdapterMemoria(existentes: Record<string, string> = {}) {
        const arquivos = new Map<string, string>(Object.entries(existentes));
        const dirs = new Set<string>();
        return {
            arquivos,
            adapter: {
                async exists(c: string) { return arquivos.has(c) || dirs.has(c); },
                async mkdir(c: string) { dirs.add(c); },
                async write(c: string, v: string) { arquivos.set(c, v); },
                async read(c: string) {
                    const conteudo = arquivos.get(c);
                    if (conteudo === undefined) throw new Error(`Arquivo não encontrado: ${c}`);
                    return conteudo;
                },
            },
        };
    }

    it('verificarEscritaPacoteOperacional retorna ok com leitor em memória pré-populado', async () => {
        const service = makeService();
        const plano = service.criarPlanoEscritaPacoteOperacional(CONTEXTO);
        const arquivos = new Map<string, string>(
            plano.escrita.operacoes.map(op => [op.caminhoDestino, op.conteudo]),
        );
        const leitor = {
            async existeArquivoTexto(caminho: string) { return arquivos.has(caminho); },
            async lerArquivoTexto(caminho: string) {
                const c = arquivos.get(caminho);
                if (c === undefined) throw new Error(`ausente: ${caminho}`);
                return c;
            },
        };

        const resultado = await service.verificarEscritaPacoteOperacional(CONTEXTO, leitor);

        expect(resultado.verificacao.nivel).toBe('ok');
        expect(resultado.verificacao.valido).toBe(true);
        expect(resultado.verificacao.erros).toBe(0);
        expect(resultado.verificacao.arquivosVerificados).toBe(8);
        expect(resultado.planoEscrita.escrita.totalOperacoes).toBe(8);
    });

    it('verificarEscritaPacoteOperacionalObsidian usa adapter exists e read', async () => {
        const service = makeService();
        const plano = service.criarPlanoEscritaPacoteOperacional(CONTEXTO);
        const existentes = Object.fromEntries(
            plano.escrita.operacoes.map(op => [op.caminhoDestino, op.conteudo]),
        );
        const memoria = criarAdapterMemoria(existentes);

        const resultado = await service.verificarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter);

        expect(resultado.verificacao.nivel).toBe('ok');
        expect(resultado.verificacao.valido).toBe(true);
        expect(resultado.verificacao.arquivosVerificados).toBe(8);
    });

    it('executarEVerificarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado escreve e verifica ok', async () => {
        const service = makeService();
        const vault = { getMarkdownFiles: () => [] };
        const cache = { getFileCache: () => null };
        const memoria = criarAdapterMemoria();

        const resultado = await service.executarEVerificarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
            CONTEXTO, vault, cache, memoria.adapter,
        );

        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(resultado.verificacao).toBeDefined();
        expect(resultado.verificacao.nivel).toBe('ok');
        expect(resultado.verificacao.valido).toBe(true);
        expect(resultado.verificacao.totalOperacoes).toBe(resultado.planoEscrita.escrita.totalOperacoes);
        expect(resultado.extracao).toBeDefined();
        expect(resultado.filtro).toBeDefined();
        expect(resultado.resumo).toBeDefined();
    });

    it('falha de leitura retorna verificacao error sem throw', async () => {
        const service = makeService();
        const vault = { getMarkdownFiles: () => [] };
        const cache = { getFileCache: () => null };
        const memoria = criarAdapterMemoria();
        const adapterComFalhaLeitura = {
            ...memoria.adapter,
            async read(_c: string) { throw new Error('Falha de leitura simulada'); },
        };

        const resultado = await service.executarEVerificarEscritaPacoteOperacionalObsidianComPayloadDoVaultFiltrado(
            CONTEXTO, vault, cache, adapterComFalhaLeitura,
        );

        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(resultado.verificacao.nivel).toBe('error');
        expect(resultado.verificacao.valido).toBe(false);
        expect(resultado.verificacao.erros).toBeGreaterThan(0);
    });

    it('verificarEscritaPacoteOperacional não chama saveSettings', async () => {
        let saveCount = 0;
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
        const plano = service.criarPlanoEscritaPacoteOperacional(CONTEXTO);
        const arquivos = new Map(plano.escrita.operacoes.map(op => [op.caminhoDestino, op.conteudo]));
        const leitor = {
            async existeArquivoTexto(c: string) { return arquivos.has(c); },
            async lerArquivoTexto(c: string) { return arquivos.get(c) ?? ''; },
        };

        await service.verificarEscritaPacoteOperacional(CONTEXTO, leitor);

        expect(saveCount).toBe(0);
    });

    it('verificarPlanoEscritaPacoteScrivenerObsidian verifica plano pré-construído sem reconstruir', async () => {
        const service = makeService();
        const memoria = criarAdapterMemoria();

        const resultadoEscrita = await service.executarEscritaPacoteOperacionalObsidian(CONTEXTO, memoria.adapter);
        const { verificacao, planoEscrita } = await service.verificarPlanoEscritaPacoteScrivenerObsidian(
            resultadoEscrita.planoEscrita,
            memoria.adapter,
        );

        expect(verificacao.nivel).toBe('ok');
        expect(verificacao.valido).toBe(true);
        expect(verificacao.erros).toBe(0);
        expect(verificacao.arquivosVerificados).toBe(resultadoEscrita.planoEscrita.escrita.totalOperacoes);
        expect(planoEscrita).toBe(resultadoEscrita.planoEscrita);
    });

    it('verificarPlanoEscritaPacoteScrivenerObsidian detecta arquivos ausentes no disco', async () => {
        const service = makeService();
        const memoriaVazia = criarAdapterMemoria();

        const planoEscrita = service.criarPlanoEscritaPacoteOperacional(CONTEXTO);
        const { verificacao } = await service.verificarPlanoEscritaPacoteScrivenerObsidian(
            planoEscrita,
            memoriaVazia.adapter,
        );

        expect(verificacao.nivel).toBe('error');
        expect(verificacao.valido).toBe(false);
        expect(verificacao.arquivosAusentes).toBeGreaterThan(0);
    });

    it('verificarPlanoEscritaPacoteScrivenerObsidian não chama saveSettings', async () => {
        let saveCount = 0;
        const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
        const memoria = criarAdapterMemoria();
        const planoEscrita = service.criarPlanoEscritaPacoteOperacional(CONTEXTO);

        await service.verificarPlanoEscritaPacoteScrivenerObsidian(planoEscrita, memoria.adapter);

        expect(saveCount).toBe(0);
    });
});

describe('ScrivenerBridgeService package integrity', () => {
  const CONTEXTO: ContextoManifestoScrivenerOperacional = {
    tipo: 'exportacao',
    origemVault: 'Contrarius Enantios',
    diretorioPacotes: 'contrarius-scrivener-packages',
    livro: 'Livro 1',
    agora: new Date('2000-01-01T00:00:00.000Z'),
  };

  function makeService() {
    return new ScrivenerBridgeService({ settings: {}, async saveSettings() {} });
  }

  function makeVault(arquivos: Array<{ path: string; basename: string }>) {
    return { getMarkdownFiles: () => arquivos };
  }

  function makeCache(frontmatters: Record<string, Record<string, unknown>>) {
    return {
      getFileCache: (arquivo: { path: string }) => {
        const fm = frontmatters[arquivo.path];
        return fm ? { frontmatter: fm } : null;
      },
    };
  }

  it('validarIntegridadePreviewPacoteOperacional retorna ok em preview básico sem payload', () => {
    const service = makeService();
    const resultado = service.validarIntegridadePreviewPacoteOperacional(CONTEXTO);

    expect(resultado.nivel).toBe('ok');
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toBe(0);
    expect(resultado.avisos).toBe(0);
    expect(resultado.totalArquivos).toBe(8);
    expect(resultado.totalItensPayload).toBe(0);
    expect(resultado.totalArquivosItens).toBe(0);
  });

  it('validarIntegridadePlanoEscritaPacoteOperacional retorna ok', () => {
    const service = makeService();
    const resultado = service.validarIntegridadePlanoEscritaPacoteOperacional(CONTEXTO);

    expect(resultado.nivel).toBe('ok');
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toBe(0);
    expect(resultado.totalArquivos).toBe(8);
  });

  it('validarIntegridadePayloadContrariusDoVault valida payload extraído do vault', async () => {
    const service = makeService();
    const vault = makeVault([
      { path: '02_Consciencias/C1.md', basename: 'C1' },
    ]);
    const cache = makeCache({
      '02_Consciencias/C1.md': { id: 'c1', titulo: 'Consciência 1' },
    });

    const resultado = await service.validarIntegridadePayloadContrariusDoVault(
      CONTEXTO, vault, cache,
    );

    expect(resultado.integridade).toBeDefined();
    expect(resultado.integridade.nivel).toBe('ok');
    expect(resultado.integridade.valido).toBe(true);
    expect(resultado.integridade.totalItensPayload).toBe(1);
    expect(resultado.integridade.totalArquivosItens).toBe(1);
  });

  it('retorno de validarIntegridadePayloadContrariusDoVault inclui extracao, filtro, resumo e integridade', async () => {
    const service = makeService();
    const vault = makeVault([]);
    const cache = makeCache({});

    const resultado = await service.validarIntegridadePayloadContrariusDoVault(
      CONTEXTO, vault, cache,
    );

    expect(resultado.extracao).toBeDefined();
    expect(resultado.filtro).toBeDefined();
    expect(resultado.resumo).toBeDefined();
    expect(resultado.integridade).toBeDefined();
  });

  it('validarIntegridadePayloadContrariusDoVault não chama saveSettings', async () => {
    let saveCount = 0;
    const service = new ScrivenerBridgeService({ settings: {}, async saveSettings() { saveCount++; } });
    const vault = makeVault([]);
    const cache = makeCache({});

    await service.validarIntegridadePayloadContrariusDoVault(CONTEXTO, vault, cache);

    expect(saveCount).toBe(0);
  });
});
