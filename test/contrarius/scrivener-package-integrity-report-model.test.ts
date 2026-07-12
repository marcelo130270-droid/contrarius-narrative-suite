import { describe, it, expect } from 'vitest';
import {
    SCHEMA_RELATORIO_INTEGRIDADE_PACOTE_SCRIVENER,
    criarRelatorioIntegridadePacoteScrivener,
    criarArquivoRelatorioIntegridadePacoteScrivener,
} from '../../src/contrarius/scrivener-package-integrity-report-model';
import type { PlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';

function criarManifestoBase(): ManifestoScrivener {
    return {
        id: 'exportacao-livro-1',
        criadoEm: '2000-01-01T00:00:00.000Z',
        tipo: 'exportacao',
        origemVault: 'Contrarius Enantios',
        caminhoPacote: 'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package',
        livro: 'Livro 1',
        observacoes: 'Preview operacional',
        avisos: [],
        erros: [],
    };
}

function criarPlanoProvisorio(): PlanoPacoteScrivener {
    const manifesto = criarManifestoBase();
    const manifestoConteudo = JSON.stringify({
        id: manifesto.id,
        criadoEm: manifesto.criadoEm,
        tipo: manifesto.tipo,
        origemVault: manifesto.origemVault,
        caminhoPacote: manifesto.caminhoPacote,
        livro: manifesto.livro,
        observacoes: manifesto.observacoes,
        avisos: manifesto.avisos,
        erros: manifesto.erros,
    }, null, 2);
    const payloadConteudo = JSON.stringify({
        schema: 'contrarius-scrivener-payload/v1',
        manifestoId: manifesto.id,
        geradoEm: manifesto.criadoEm,
        totalItens: 0,
        itens: [],
    }, null, 2);
    const readmeConteudo = '# Contrarius Scrivener package\n\nNo payload items were exported.\n';

    const arquivos = [
        { caminhoRelativo: 'manifest.json', tipo: 'manifest' as const, conteudo: manifestoConteudo, tamanhoCaracteres: manifestoConteudo.length },
        { caminhoRelativo: 'payload/index.json', tipo: 'payload' as const, conteudo: payloadConteudo, tamanhoCaracteres: payloadConteudo.length },
        { caminhoRelativo: 'README.md', tipo: 'readme' as const, conteudo: readmeConteudo, tamanhoCaracteres: readmeConteudo.length },
    ];

    return {
        manifesto,
        arquivos,
        totalArquivos: arquivos.length,
        tamanhoTotalCaracteres: arquivos.reduce((t, a) => t + a.tamanhoCaracteres, 0),
    };
}

describe('scrivener-package-integrity-report-model', () => {
    describe('criarRelatorioIntegridadePacoteScrivener', () => {
        it('cria relatório com schema correto', () => {
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(relatorio.schema).toBe(SCHEMA_RELATORIO_INTEGRIDADE_PACOTE_SCRIVENER);
            expect(relatorio.schema).toBe('contrarius-scrivener-package-integrity/v1');
        });

        it('inclui geradoEm informado', () => {
            const geradoEm = '2024-01-15T12:00:00.000Z';
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio(), geradoEm);

            expect(relatorio.geradoEm).toBe(geradoEm);
        });

        it('usa data atual como geradoEm quando não informado', () => {
            const antes = new Date().toISOString();
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());
            const depois = new Date().toISOString();

            expect(relatorio.geradoEm >= antes).toBe(true);
            expect(relatorio.geradoEm <= depois).toBe(true);
        });

        it('inclui resultado de integridade', () => {
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(relatorio.resultado).toBeDefined();
            expect(typeof relatorio.resultado.nivel).toBe('string');
            expect(typeof relatorio.resultado.valido).toBe('boolean');
        });

        it('extrai manifestoId de manifest.json', () => {
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(relatorio.manifestoId).toBe('exportacao-livro-1');
        });

        it('extrai caminhoPacote de manifest.json', () => {
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(relatorio.caminhoPacote).toBe('contrarius-scrivener-packages/exportacao-livro-1.scrivener-package');
        });

        it('funciona mesmo com manifest.json inválido', () => {
            const plano = criarPlanoProvisorio();
            const arquivos = plano.arquivos.map(a =>
                a.caminhoRelativo === 'manifest.json'
                    ? { ...a, conteudo: 'json invalido {', tamanhoCaracteres: 'json invalido {'.length }
                    : a,
            );
            const planoComManifestoInvalido = { ...plano, arquivos };

            const relatorio = criarRelatorioIntegridadePacoteScrivener(planoComManifestoInvalido);

            expect(relatorio.manifestoId).toBeUndefined();
            expect(relatorio.caminhoPacote).toBeUndefined();
            expect(relatorio.resultado).toBeDefined();
            expect(relatorio.resultado.erros).toBeGreaterThan(0);
        });

        it('plano válido gera resultado ok', () => {
            const relatorio = criarRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(relatorio.resultado.nivel).toBe('ok');
            expect(relatorio.resultado.valido).toBe(true);
        });
    });

    describe('criarArquivoRelatorioIntegridadePacoteScrivener', () => {
        it('cria arquivo integrity/report.json', () => {
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(arquivo.caminhoRelativo).toBe('integrity/report.json');
        });

        it('tipo do arquivo é integrity-report', () => {
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(arquivo.tipo).toBe('integrity-report');
        });

        it('conteúdo é JSON parseável', () => {
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(() => JSON.parse(arquivo.conteudo)).not.toThrow();
        });

        it('tamanhoCaracteres bate com conteudo.length', () => {
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());

            expect(arquivo.tamanhoCaracteres).toBe(arquivo.conteudo.length);
        });

        it('conteúdo JSON contém schema correto', () => {
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());
            const parsed = JSON.parse(arquivo.conteudo);

            expect(parsed.schema).toBe(SCHEMA_RELATORIO_INTEGRIDADE_PACOTE_SCRIVENER);
        });

        it('conteúdo JSON contém geradoEm informado', () => {
            const geradoEm = '2024-06-01T00:00:00.000Z';
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio(), geradoEm);
            const parsed = JSON.parse(arquivo.conteudo);

            expect(parsed.geradoEm).toBe(geradoEm);
        });

        it('conteúdo JSON contém manifestoId correto', () => {
            const arquivo = criarArquivoRelatorioIntegridadePacoteScrivener(criarPlanoProvisorio());
            const parsed = JSON.parse(arquivo.conteudo);

            expect(parsed.manifestoId).toBe('exportacao-livro-1');
        });
    });

    describe('sem dependência de fs/path/obsidian', () => {
        it('importa e executa sem qualquer módulo externo de sistema de arquivos', () => {
            const fn = criarRelatorioIntegridadePacoteScrivener;
            expect(typeof fn).toBe('function');
            const resultado = fn(criarPlanoProvisorio());
            expect(resultado).toBeDefined();
        });

        it('criarArquivoRelatorioIntegridadePacoteScrivener não depende de fs/path/obsidian', () => {
            const fn = criarArquivoRelatorioIntegridadePacoteScrivener;
            expect(typeof fn).toBe('function');
            const arquivo = fn(criarPlanoProvisorio());
            expect(arquivo.caminhoRelativo).toBe('integrity/report.json');
        });
    });
});
