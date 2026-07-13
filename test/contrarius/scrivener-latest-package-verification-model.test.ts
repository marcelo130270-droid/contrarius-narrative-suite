import { describe, expect, it } from 'vitest';
import {
    MENSAGEM_PACOTE_NAO_ENCONTRADO,
    verificarPacoteScrivenerMaisRecente,
} from '../../src/contrarius/scrivener-latest-package-verification-model';
import type {
    EntradaArquivoPacoteScrivener,
    InputVerificacaoPacoteScrivenerMaisRecente,
} from '../../src/contrarius/scrivener-latest-package-verification-model';

function criarArquivosCompletos(): EntradaArquivoPacoteScrivener[] {
    return [
        { caminhoRelativo: 'manifest.json', conteudo: '{"version":"1"}' },
        { caminhoRelativo: 'payload/index.json', conteudo: '{"itens":[{"id":"1"},{"id":"2"}]}' },
        { caminhoRelativo: 'README.md', conteudo: '# Readme' },
        { caminhoRelativo: 'integrity/report.json', conteudo: '{"status":"ok"}' },
        { caminhoRelativo: 'scrivener-import.md', conteudo: '# Import' },
        { caminhoRelativo: 'scrivener/index.md', conteudo: '# Index' },
    ];
}

function criarInput(
    arquivos: EntradaArquivoPacoteScrivener[],
    arquivosDossier: string[] = [],
): InputVerificacaoPacoteScrivenerMaisRecente {
    return {
        caminhoPacote: 'contrarius-scrivener-packages/pkg-2024-01-15',
        arquivos,
        arquivosDossier,
    };
}

describe('verificarPacoteScrivenerMaisRecente', () => {
    it('todos os arquivos obrigatórios presentes retorna ok', () => {
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos()));

        expect(resultado.nivel).toBe('ok');
        expect(resultado.arquivosObrigatoriosVerificados).toBe(6);
        expect(resultado.arquivosAusentes).toBe(0);
        expect(resultado.erros).toHaveLength(0);
    });

    it('scrivener/index.md ausente gera erro com "missing"', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'scrivener/index.md'
                ? { caminhoRelativo: 'scrivener/index.md', conteudo: null }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.nivel).toBe('error');
        expect(resultado.arquivosAusentes).toBe(1);
        expect(resultado.erros.some(e => e.toLowerCase().includes('missing'))).toBe(true);
        expect(resultado.erros.some(e => e.includes('scrivener/index.md'))).toBe(true);
    });

    it('scrivener-import.md ausente é contabilizado como missing', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'scrivener-import.md'
                ? { caminhoRelativo: 'scrivener-import.md', conteudo: null }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.arquivosAusentes).toBe(1);
        const errosMissing = resultado.erros.filter(e => e.toLowerCase().includes('missing'));
        expect(errosMissing.length).toBeGreaterThan(0);
    });

    it('integrity/report.json ausente é contabilizado como missing', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'integrity/report.json'
                ? { caminhoRelativo: 'integrity/report.json', conteudo: null }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.arquivosAusentes).toBe(1);
        expect(resultado.erros.some(e => e.toLowerCase().includes('missing'))).toBe(true);
    });

    it('MENSAGEM_PACOTE_NAO_ENCONTRADO contém "No Scrivener package found"', () => {
        expect(MENSAGEM_PACOTE_NAO_ENCONTRADO).toContain('No Scrivener package found');
        expect(MENSAGEM_PACOTE_NAO_ENCONTRADO).toContain('Run Write controlled package first.');
    });

    it('todos os arquivos ausentes gera erros de missing para cada um', () => {
        const arquivos = criarArquivosCompletos().map(a => ({
            caminhoRelativo: a.caminhoRelativo,
            conteudo: null,
        }));
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.nivel).toBe('error');
        expect(resultado.arquivosAusentes).toBe(6);
        expect(resultado.arquivosObrigatoriosVerificados).toBe(0);
        const errosMissing = resultado.erros.filter(e => e.toLowerCase().includes('missing'));
        expect(errosMissing).toHaveLength(6);
    });

    it('payload/index.json com array itens extrai totalPayloadItens', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'payload/index.json'
                ? { caminhoRelativo: 'payload/index.json', conteudo: '{"itens":[1,2,3]}' }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.totalPayloadItens).toBe(3);
    });

    it('payload/index.json com array items (en) extrai totalPayloadItens', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'payload/index.json'
                ? { caminhoRelativo: 'payload/index.json', conteudo: '{"items":["a","b"]}' }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.totalPayloadItens).toBe(2);
    });

    it('payload/index.json com campo total numérico extrai totalPayloadItens', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'payload/index.json'
                ? { caminhoRelativo: 'payload/index.json', conteudo: '{"total":7}' }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.totalPayloadItens).toBe(7);
    });

    it('JSON inválido em manifest.json gera erro e aparece em diagnostics como invalid JSON', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'manifest.json'
                ? { caminhoRelativo: 'manifest.json', conteudo: 'not-valid{{{' }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.nivel).toBe('error');
        expect(resultado.erros.some(e => e.includes('manifest.json'))).toBe(true);
        expect(resultado.erros.some(e => e.toLowerCase().includes('invalid json'))).toBe(true);
        expect(resultado.diagnostics.some(d => d.toLowerCase().includes('invalid json'))).toBe(true);
        expect(resultado.diagnostics.some(d => d.includes('manifest.json'))).toBe(true);
    });

    it('JSON inválido em integrity/report.json gera erro em diagnostics como invalid JSON', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'integrity/report.json'
                ? { caminhoRelativo: 'integrity/report.json', conteudo: 'invalid' }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.nivel).toBe('error');
        expect(resultado.erros.some(e => e.includes('integrity/report.json'))).toBe(true);
        expect(resultado.diagnostics.some(d => d.toLowerCase().includes('invalid json'))).toBe(true);
    });

    it('arquivos opcionais de timeline encontrados são listados', () => {
        const arquivos = [
            ...criarArquivosCompletos(),
            { caminhoRelativo: 'scrivener/timeline/eventos.md', conteudo: '# Eventos' },
            { caminhoRelativo: 'scrivener/timeline/cronologia.md', conteudo: '# Cronologia' },
        ];
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.nivel).toBe('ok');
        expect(resultado.arquivosOpcionaisEncontrados).toContain(
            'scrivener/timeline/eventos.md',
        );
        expect(resultado.arquivosOpcionaisEncontrados).toContain(
            'scrivener/timeline/cronologia.md',
        );
    });

    it('arquivos opcionais ausentes não geram erro', () => {
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos()));

        expect(resultado.nivel).toBe('ok');
        expect(resultado.arquivosOpcionaisEncontrados).toHaveLength(0);
    });

    it('dossiersEncontrados reflete o tamanho da lista recebida', () => {
        const dossier = [
            'contrarius-scrivener-packages/pkg/scrivener/dossier/personagem-a.md',
            'contrarius-scrivener-packages/pkg/scrivener/dossier/personagem-b.md',
            'contrarius-scrivener-packages/pkg/scrivener/dossier/personagem-c.md',
        ];
        const resultado = verificarPacoteScrivenerMaisRecente(
            criarInput(criarArquivosCompletos(), dossier),
        );

        expect(resultado.dossiersEncontrados).toBe(3);
    });

    it('caminhoPacote é retornado no resultado', () => {
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos()));

        expect(resultado.caminhoPacote).toBe('contrarius-scrivener-packages/pkg-2024-01-15');
    });

    it('não depende de fs/path/obsidian — roda com dados em memória', () => {
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos()));

        expect(resultado).toBeDefined();
        expect(['ok', 'warning', 'error']).toContain(resultado.nivel);
    });

    it('campo diagnostics está presente e é array no resultado', () => {
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos()));

        expect(resultado.diagnostics).toBeDefined();
        expect(Array.isArray(resultado.diagnostics)).toBe(true);
    });

    it('diagnostics agrega erros — pacote completo tem diagnostics vazio', () => {
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos()));

        expect(resultado.diagnostics).toHaveLength(0);
    });

    it('scrivener/index.md ausente aparece em diagnostics como missing', () => {
        const arquivos = criarArquivosCompletos().map(a =>
            a.caminhoRelativo === 'scrivener/index.md'
                ? { caminhoRelativo: 'scrivener/index.md', conteudo: null }
                : a,
        );
        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(arquivos));

        expect(resultado.diagnostics.some(d => d.includes('scrivener/index.md'))).toBe(true);
        expect(resultado.diagnostics.some(d => d.toLowerCase().includes('missing'))).toBe(true);
    });

    it('dossier ausente (lista vazia) não lança exceção e nível mantém ok', () => {
        expect(() =>
            verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos(), [])),
        ).not.toThrow();

        const resultado = verificarPacoteScrivenerMaisRecente(criarInput(criarArquivosCompletos(), []));

        expect(resultado.diagnostics).toBeDefined();
        expect(resultado.dossiersEncontrados).toBe(0);
        expect(resultado.nivel).toBe('ok');
    });
});
