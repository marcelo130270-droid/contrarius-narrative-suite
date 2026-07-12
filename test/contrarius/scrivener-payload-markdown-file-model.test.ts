import { describe, expect, it } from 'vitest';
import {
    criarSlugArquivoPayloadScrivener,
    criarConteudoMarkdownItemPayloadScrivener,
    criarArquivoMarkdownItemPayloadScrivener,
    criarArquivosMarkdownPayloadScrivener,
} from '../../src/contrarius/scrivener-payload-markdown-file-model';
import type { ItemPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';
import { criarPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';

function criarItemBase(overrides: Partial<ItemPayloadScrivener> = {}): ItemPayloadScrivener {
    return {
        id: 'rogier-001',
        tipo: 'evento',
        titulo: 'Rogier',
        ...overrides,
    };
}

describe('criarSlugArquivoPayloadScrivener', () => {
    it('cria slug sem acentos', () => {
        expect(criarSlugArquivoPayloadScrivener('São João')).toBe('sao-joao');
    });

    it('converte para lower case', () => {
        expect(criarSlugArquivoPayloadScrivener('Rogier Favre')).toBe('rogier-favre');
    });

    it('troca sequencias nao alfanumericas por hifen', () => {
        expect(criarSlugArquivoPayloadScrivener('Hello   World!')).toBe('hello-world');
    });

    it('remove hifens no inicio e fim', () => {
        expect(criarSlugArquivoPayloadScrivener('  hello  ')).toBe('hello');
    });

    it('fallback item para slug vazio', () => {
        expect(criarSlugArquivoPayloadScrivener('')).toBe('item');
    });

    it('fallback item para slug com apenas caracteres especiais', () => {
        expect(criarSlugArquivoPayloadScrivener('---')).toBe('item');
    });

    it('slug com titulo simples', () => {
        expect(criarSlugArquivoPayloadScrivener('Rogier')).toBe('rogier');
    });
});

describe('criarArquivoMarkdownItemPayloadScrivener', () => {
    it('cria caminho payload/items/tipo/slug.md', () => {
        const item = criarItemBase({ tipo: 'evento', titulo: 'Rogier' });
        const arquivo = criarArquivoMarkdownItemPayloadScrivener(item);
        expect(arquivo.caminhoRelativo).toBe('payload/items/evento/rogier.md');
    });

    it('cria caminho correto para tipo lugar', () => {
        const item = criarItemBase({ tipo: 'lugar', titulo: 'Roma Antiga' });
        const arquivo = criarArquivoMarkdownItemPayloadScrivener(item);
        expect(arquivo.caminhoRelativo).toBe('payload/items/lugar/roma-antiga.md');
    });

    it('usa tipo correto no resultado', () => {
        const item = criarItemBase({ tipo: 'lugar', titulo: 'Roma' });
        const arquivo = criarArquivoMarkdownItemPayloadScrivener(item);
        expect(arquivo.tipo).toBe('lugar');
    });

    it('usa itemId correto', () => {
        const item = criarItemBase({ id: 'abc-123' });
        const arquivo = criarArquivoMarkdownItemPayloadScrivener(item);
        expect(arquivo.itemId).toBe('abc-123');
    });

    it('tamanhoCaracteres e igual ao tamanho do conteudo', () => {
        const item = criarItemBase();
        const arquivo = criarArquivoMarkdownItemPayloadScrivener(item);
        expect(arquivo.tamanhoCaracteres).toBe(arquivo.conteudo.length);
    });
});

describe('criarArquivosMarkdownPayloadScrivener', () => {
    it('retorna vazio para payload sem itens', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'test', itens: [] });
        expect(criarArquivosMarkdownPayloadScrivener(payload)).toHaveLength(0);
    });

    it('gera um arquivo por item', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'test',
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                { id: 'b', tipo: 'lugar', titulo: 'Beta' },
            ],
        });
        const arquivos = criarArquivosMarkdownPayloadScrivener(payload);
        expect(arquivos).toHaveLength(2);
    });

    it('resolve colisoes de slug por tipo', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'test',
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Rogier', ordemNarrativa: 1 },
                { id: 'b', tipo: 'evento', titulo: 'Rogier', ordemNarrativa: 2 },
                { id: 'c', tipo: 'evento', titulo: 'Rogier', ordemNarrativa: 3 },
            ],
        });
        const arquivos = criarArquivosMarkdownPayloadScrivener(payload);
        const caminhos = arquivos.map(a => a.caminhoRelativo);
        expect(caminhos).toContain('payload/items/evento/rogier.md');
        expect(caminhos).toContain('payload/items/evento/rogier-2.md');
        expect(caminhos).toContain('payload/items/evento/rogier-3.md');
    });

    it('nao colide entre tipos diferentes', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'test',
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Rogier' },
                { id: 'b', tipo: 'lugar', titulo: 'Rogier' },
            ],
        });
        const arquivos = criarArquivosMarkdownPayloadScrivener(payload);
        const caminhos = arquivos.map(a => a.caminhoRelativo);
        expect(caminhos).toContain('payload/items/evento/rogier.md');
        expect(caminhos).toContain('payload/items/lugar/rogier.md');
    });

    it('todos os arquivos tem tamanhoCaracteres correto', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'test',
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                { id: 'b', tipo: 'nota', titulo: 'Beta' },
            ],
        });
        const arquivos = criarArquivosMarkdownPayloadScrivener(payload);
        expect(arquivos.every(a => a.tamanhoCaracteres === a.conteudo.length)).toBe(true);
    });
});

describe('criarConteudoMarkdownItemPayloadScrivener', () => {
    it('inclui frontmatter com campos obrigatorios', () => {
        const item = criarItemBase({ id: 'abc', tipo: 'evento', titulo: 'Test' });
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).toContain('---');
        expect(conteudo).toContain('id: abc');
        expect(conteudo).toContain('tipo: evento');
        expect(conteudo).toContain('titulo: Test');
    });

    it('inclui apenas campos existentes no frontmatter', () => {
        const item = criarItemBase();
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).not.toContain('caminhoFonte');
        expect(conteudo).not.toContain('livro:');
        expect(conteudo).not.toContain('ordemNarrativa');
    });

    it('inclui campos opcionais quando presentes', () => {
        const item = criarItemBase({
            caminhoFonte: 'vault/personagens',
            livro: 'Livro 1',
            periodo: 'Seculo XV',
            ordemNarrativa: 5,
            ordemCronologica: 3,
        });
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).toContain('caminhoFonte: vault/personagens');
        expect(conteudo).toContain('livro: Livro 1');
        expect(conteudo).toContain('periodo: Seculo XV');
        expect(conteudo).toContain('ordemNarrativa: 5');
        expect(conteudo).toContain('ordemCronologica: 3');
    });

    it('inclui tags em YAML', () => {
        const item = criarItemBase({ tags: ['fantasia', 'batalha'] });
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).toContain('tags:');
        expect(conteudo).toContain('  - fantasia');
        expect(conteudo).toContain('  - batalha');
    });

    it('inclui H1 com titulo', () => {
        const item = criarItemBase({ titulo: 'Batalha de Rogier' });
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).toContain('# Batalha de Rogier');
    });

    it('inclui texto quando houver', () => {
        const item = criarItemBase({ texto: 'Era uma vez...' });
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).toContain('Era uma vez...');
        expect(conteudo).not.toContain('## Metadata');
    });

    it('cria secao Metadata quando nao houver texto', () => {
        const item = criarItemBase();
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).toContain('## Metadata');
    });

    it('nao inclui secao Metadata quando houver texto', () => {
        const item = criarItemBase({ texto: 'Conteudo do item.' });
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        expect(conteudo).not.toContain('## Metadata');
        expect(conteudo).toContain('Conteudo do item.');
    });

    it('frontmatter abre e fecha com ---', () => {
        const item = criarItemBase();
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
        const linhas = conteudo.split('\n');
        expect(linhas[0]).toBe('---');
        const fechamento = linhas.findIndex((l, i) => i > 0 && l === '---');
        expect(fechamento).toBeGreaterThan(0);
    });

    it('nao depende de fs path ou obsidian', () => {
        const item = criarItemBase();
        expect(() => criarConteudoMarkdownItemPayloadScrivener(item)).not.toThrow();
    });
});
