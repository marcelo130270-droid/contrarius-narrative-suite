import { describe, expect, it } from 'vitest';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarArquivoImportacaoMarkdownScrivener } from '../../src/contrarius/scrivener-import-markdown-model';
import { criarPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';

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

describe('criarArquivoImportacaoMarkdownScrivener', () => {
    it('payload vazio gera arquivo scrivener-import.md com titulo e total 0', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.caminhoRelativo).toBe('scrivener-import.md');
        expect(arquivo.conteudo).toContain('# Contrarius Scrivener Import');
        expect(arquivo.conteudo).toContain('**Total de itens:** 0');
        expect(arquivo.tamanhoCaracteres).toBe(arquivo.conteudo.length);
    });

    it('inclui vault do manifesto quando fornecido', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const manifesto = criarManifestoBase();
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload, manifesto);

        expect(arquivo.conteudo).toContain('Contrarius Enantios');
    });

    it('inclui data de criacao do payload', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            geradoEm: '2000-01-01T00:00:00.000Z',
            itens: [],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).toContain('2000-01-01T00:00:00.000Z');
    });

    it('nao inclui secoes quando payload esta vazio', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).not.toContain('## Consciências');
        expect(arquivo.conteudo).not.toContain('## Índice');
    });

    it('payload com itens gera secoes por tipo', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
                { id: 'e1', tipo: 'evento', titulo: 'Batalha' },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).toContain('## Consciências');
        expect(arquivo.conteudo).toContain('## Eventos');
        expect(arquivo.conteudo).not.toContain('## Notas');
    });

    it('gera headings de item com titulo', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{ id: 'n1', tipo: 'nota', titulo: 'Minha Nota' }],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).toContain('### Minha Nota');
    });

    it('inclui linhas de metadados basicos para cada item', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                {
                    id: 'e1',
                    tipo: 'evento',
                    titulo: 'Batalha',
                    caminhoFonte: 'eventos/batalha.md',
                    livro: 'Livro 1',
                    periodo: 'Seculo XV',
                    tags: ['guerra', 'medieval'],
                },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).toContain('- ID: e1');
        expect(arquivo.conteudo).toContain('- Tipo: evento');
        expect(arquivo.conteudo).toContain('- Fonte: eventos/batalha.md');
        expect(arquivo.conteudo).toContain('- Livro: Livro 1');
        expect(arquivo.conteudo).toContain('- Período: Seculo XV');
        expect(arquivo.conteudo).toContain('- Tags: guerra, medieval');
    });

    it('omite linhas opcionais ausentes', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{ id: 'e1', tipo: 'evento', titulo: 'Simples' }],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).not.toContain('- Fonte:');
        expect(arquivo.conteudo).not.toContain('- Livro:');
        expect(arquivo.conteudo).not.toContain('- Período:');
        expect(arquivo.conteudo).not.toContain('- Tags:');
    });

    it('inclui bloco json de metadata quando presente', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{
                id: 'c1',
                tipo: 'consciencia',
                titulo: 'Rogier',
                metadata: { idade: 30, ocupacao: 'cavaleiro' },
            }],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).toContain('```json');
        expect(arquivo.conteudo).toContain('"idade": 30');
        expect(arquivo.conteudo).toContain('"ocupacao": "cavaleiro"');
    });

    it('omite bloco json quando metadata ausente', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{ id: 'e1', tipo: 'evento', titulo: 'Sem meta' }],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).not.toContain('```json');
    });

    it('gera indice por tipo com links internos', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'l1', tipo: 'lugar', titulo: 'Roma' },
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.conteudo).toContain('## Índice');
        expect(arquivo.conteudo).toContain('[Consciências](#consciências)');
        expect(arquivo.conteudo).toContain('[Lugares](#lugares)');
        expect(arquivo.conteudo).not.toContain('[Eventos]');
    });

    it('ordena secoes na ordem correta: consciencia, retrovida, evento, lugar, relacao, grupo, objeto, nota', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'n1', tipo: 'nota', titulo: 'N' },
                { id: 'e1', tipo: 'evento', titulo: 'E' },
                { id: 'c1', tipo: 'consciencia', titulo: 'C' },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        const posConsciencia = arquivo.conteudo.indexOf('## Consciências');
        const posEvento = arquivo.conteudo.indexOf('## Eventos');
        const posNota = arquivo.conteudo.indexOf('## Notas');

        expect(posConsciencia).toBeLessThan(posEvento);
        expect(posEvento).toBeLessThan(posNota);
    });

    it('ordena itens dentro do tipo por ordemNarrativa, ordemCronologica, titulo, id', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'z', tipo: 'evento', titulo: 'Zeta', ordemNarrativa: 2 },
                { id: 'a', tipo: 'evento', titulo: 'Alpha', ordemNarrativa: 1 },
                { id: 'm', tipo: 'evento', titulo: 'Meio' },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        const posAlpha = arquivo.conteudo.indexOf('### Alpha');
        const posZeta = arquivo.conteudo.indexOf('### Zeta');
        const posMeio = arquivo.conteudo.indexOf('### Meio');

        expect(posAlpha).toBeLessThan(posZeta);
        expect(posZeta).toBeLessThan(posMeio);
    });

    it('ordena por ordemCronologica como desempate apos ordemNarrativa', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'b', tipo: 'evento', titulo: 'Beta', ordemCronologica: 2 },
                { id: 'a', tipo: 'evento', titulo: 'Alpha', ordemCronologica: 1 },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        const posAlpha = arquivo.conteudo.indexOf('### Alpha');
        const posBeta = arquivo.conteudo.indexOf('### Beta');

        expect(posAlpha).toBeLessThan(posBeta);
    });

    it('desempata por titulo quando ordem nao definida', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'z', tipo: 'nota', titulo: 'Zeta' },
                { id: 'a', tipo: 'nota', titulo: 'Alpha' },
            ],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        const posAlpha = arquivo.conteudo.indexOf('### Alpha');
        const posZeta = arquivo.conteudo.indexOf('### Zeta');

        expect(posAlpha).toBeLessThan(posZeta);
    });

    it('tamanhoCaracteres e igual ao comprimento do conteudo', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{ id: 'e1', tipo: 'evento', titulo: 'Alpha' }],
        });
        const arquivo = criarArquivoImportacaoMarkdownScrivener(payload);

        expect(arquivo.tamanhoCaracteres).toBe(arquivo.conteudo.length);
    });

    it('nao depende de fs, path ou obsidian', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        expect(() => criarArquivoImportacaoMarkdownScrivener(payload)).not.toThrow();
    });
});
