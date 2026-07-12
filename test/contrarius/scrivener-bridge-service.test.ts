import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrivenerBridgeService } from '../../src/contrarius/scrivener-bridge-service';
import type { ScrivenerBridgeSettingsHost } from '../../src/contrarius/scrivener-bridge-service';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';
import type { ContextoManifestoScrivenerOperacional } from '../../src/contrarius/scrivener-package-manifest-factory';
import type { FontePayloadContrariusScrivener } from '../../src/contrarius/scrivener-contrarius-payload-extractor';

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
        expect(resultado.execucao.totalOperacoes).toBe(3);
        expect(resultado.execucao.operacoesOk).toBe(3);
        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(arquivos.size).toBe(3);
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

        expect(resultado.execucao.totalOperacoes).toBe(3);
        expect(resultado.execucao.operacoesOk).toBe(2);
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

        expect(resultado.execucao.totalOperacoes).toBe(3);
        expect(resultado.execucao.operacoesOk).toBe(3);
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
    expect(resultado.escrita.totalOperacoes).toBe(3);

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

    expect(resultado.execucao.totalOperacoes).toBe(3);
    expect(resultado.execucao.operacoesOk).toBe(3);
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

        expect(resultado.execucao.totalOperacoes).toBe(3);
        expect(resultado.execucao.operacoesOk).toBe(3);
        expect(resultado.execucao.operacoesErro).toBe(0);
        expect(memoria.arquivos.size).toBe(3);
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
